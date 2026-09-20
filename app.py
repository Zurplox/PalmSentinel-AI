import os
import io
import json
import math
import time
from typing import Dict, Any, List, Optional
import numpy as np
import cv2
from PIL import Image

import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Prevent DecompressionBombWarning for ultra large orthophotos
Image.MAX_IMAGE_PIXELS = None

from flask import Flask, render_template, request, jsonify, send_file, Response
from engine.detector import PalmDetector, PRESETS, DetectionPreset
from engine.roi_utils import calculate_polygon_area, calculate_sph, filter_points_by_polygon
from engine.tiler import TiledProcessor

app = Flask(__name__, template_folder="templates", static_folder="static")

# Default image path (checks local data folder first, falls back to original download)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_DATA_IMG = os.path.join(BASE_DIR, "data", "Jalan-Lintas-S5080iak-Tumang-3-7-2026-orthophoto-2.jpg")
FALLBACK_IMG = r"D:\Downloads\Jalan-Lintas-S5080iak-Tumang-3-7-2026-orthophoto-2.jpg"
DEFAULT_IMAGE_PATH = LOCAL_DATA_IMG if os.path.exists(LOCAL_DATA_IMG) else FALLBACK_IMG

# Global cache for loaded image metadata and thumbnail
CACHE: Dict[str, Any] = {
    "image_path": "",
    "full_image": None,
    "full_width": 0,
    "full_height": 0,
    "overview_image": None,
    "overview_width": 0,
    "overview_height": 0,
    "scale_factor": 1.0,  # full_size / overview_size
}

def get_or_load_image(path: Optional[str] = None) -> bool:
    target_path = path if (path and os.path.exists(path)) else DEFAULT_IMAGE_PATH
    if not os.path.exists(target_path):
        return False
    
    if CACHE["image_path"] == target_path and CACHE["full_image"] is not None:
        return True

    print(f"[PalmSensus] Loading drone orthophoto: {target_path}")
    t0 = time.time()
    img = cv2.imread(target_path)
    if img is None:
        return False
    
    h, w = img.shape[:2]
    CACHE["image_path"] = target_path
    CACHE["full_image"] = img
    CACHE["full_width"] = w
    CACHE["full_height"] = h

    # Create scaled overview for fluid UI interaction (max 2048 px)
    max_side = 2048
    scale = max_side / max(h, w)
    overview_w = int(round(w * scale))
    overview_h = int(round(h * scale))
    
    overview = cv2.resize(img, (overview_w, overview_h), interpolation=cv2.INTER_AREA)
    CACHE["overview_image"] = overview
    CACHE["overview_width"] = overview_w
    CACHE["overview_height"] = overview_h
    CACHE["scale_factor"] = w / float(overview_w)

    print(f"[PalmSensus] Image loaded in {time.time()-t0:.2f}s: {w}x{h} px. Overview: {overview_w}x{overview_h} px (scale: {CACHE['scale_factor']:.3f})")
    return True

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/info", methods=["GET"])
def get_image_info():
    path = request.args.get("path", DEFAULT_IMAGE_PATH)
    if not get_or_load_image(path):
        return jsonify({"success": False, "error": f"Image file not found: {path}"}), 404

    return jsonify({
        "success": True,
        "image_path": CACHE["image_path"],
        "filename": os.path.basename(CACHE["image_path"]),
        "full_width": CACHE["full_width"],
        "full_height": CACHE["full_height"],
        "overview_width": CACHE["overview_width"],
        "overview_height": CACHE["overview_height"],
        "scale_factor": CACHE["scale_factor"],
        "presets": {
            k: {
                "name": v.name,
                "blur_ksize": v.blur_ksize,
                "dilation_radius": v.dilation_radius,
                "min_distance_px": v.min_distance_px,
                "vegetation_threshold": v.vegetation_threshold,
                "index_type": v.index_type
            }
            for k, v in PRESETS.items()
        }
    })

@app.route("/api/overview-image", methods=["GET"])
def get_overview_image():
    if not get_or_load_image():
        return "Image not found", 404
    
    # Encode overview to JPEG
    _, buffer = cv2.imencode(".jpg", CACHE["overview_image"], [cv2.IMWRITE_JPEG_QUALITY, 85])
    return Response(buffer.tobytes(), mimetype="image/jpeg")

@app.route("/api/count", methods=["POST"])
def count_trees():
    """
    Accepts polygon coordinates in either overview or full image scale,
    runs full-resolution detection on the ROI, and returns detected palms.
    """
    data = request.json or {}
    scale_from = data.get("coord_scale", "overview")  # 'overview' or 'full'
    raw_polygon = data.get("polygon", [])
    gsd_cm = float(data.get("gsd_cm", 4.0))

    if not get_or_load_image():
        return jsonify({"success": False, "error": "Could not load orthophoto."}), 500

    scale = CACHE["scale_factor"]
    
    # Convert polygon to full-resolution coordinates if given in overview scale
    full_polygon = []
    if raw_polygon:
        for pt in raw_polygon:
            if scale_from == "overview":
                fx = pt[0] * scale
                fy = pt[1] * scale
            else:
                fx = float(pt[0])
                fy = float(pt[1])
            full_polygon.append((fx, fy))

    # Read slider parameters or preset
    preset_name = data.get("preset", "mature")
    detector = PalmDetector(preset_name)

    blur_ksize = data.get("blur_ksize")
    if blur_ksize is not None:
        blur_ksize = int(blur_ksize)

    dilation_r = data.get("dilation_radius")
    if dilation_r is not None:
        dilation_r = int(dilation_r)

    min_dist = data.get("min_distance_px")
    if min_dist is not None:
        min_dist = int(min_dist)

    veg_thresh = data.get("vegetation_threshold")
    if veg_thresh is not None:
        veg_thresh = int(veg_thresh)

    tiler = TiledProcessor(detector)
    t0 = time.time()
    
    result = tiler.process_roi(
        full_image=CACHE["full_image"],
        polygon_coords=full_polygon if len(full_polygon) >= 3 else None,
        blur_ksize=blur_ksize,
        dilation_radius=dilation_r,
        min_distance_px=min_dist,
        vegetation_threshold=veg_thresh
    )
    process_time = round(time.time() - t0, 3)

    palms = result["palms"]
    total_count = len(palms)

    # Convert coordinates back to overview scale for client canvas rendering
    overview_palms = []
    for p in palms:
        overview_palms.append({
            "id": p["id"],
            "full_x": p["x"],
            "full_y": p["y"],
            "x": round(p["x"] / scale, 2),
            "y": round(p["y"] / scale, 2),
            "radius": round(p["radius"] / scale, 2),
            "confidence": p["confidence"],
            "peak_intensity": p.get("peak_intensity", 0)
        })

    # Calculate real-world Area & SPH
    if len(full_polygon) >= 3:
        area_info = calculate_polygon_area(full_polygon, gsd_cm_per_pixel=gsd_cm)
    else:
        # Full image area
        area_info = calculate_polygon_area([
            (0, 0), (CACHE["full_width"], 0),
            (CACHE["full_width"], CACHE["full_height"]), (0, CACHE["full_height"])
        ], gsd_cm_per_pixel=gsd_cm)

    sph_info = calculate_sph(total_count, area_info["area_hectares"])

    return jsonify({
        "success": True,
        "total_count": total_count,
        "process_time_s": process_time,
        "palms": overview_palms,
        "area_info": area_info,
        "sph_info": sph_info,
        "bbox": result["bbox"]
    })

@app.route("/api/export-csv", methods=["POST"])
def export_csv():
    data = request.json or {}
    palms = data.get("palms", [])
    block_name = data.get("block_name", "Blok-Utama")
    scale = CACHE.get("scale_factor", 1.0)

    output = io.StringIO()
    output.write("id,block_name,x_full,y_full,x_overview,y_overview,confidence,crown_radius_full_px\n")
    for i, p in enumerate(palms, 1):
        fx = p.get("full_x", round(p.get("x", 0) * scale))
        fy = p.get("full_y", round(p.get("y", 0) * scale))
        ox = p.get("x", round(fx / scale))
        oy = p.get("y", round(fy / scale))
        conf = p.get("confidence", 1.0)
        r = round(p.get("radius", 25) * scale)
        output.write(f"{i},{block_name},{fx},{fy},{ox},{oy},{conf},{r}\n")

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename=sensus_pokok_{block_name}.csv"}
    )

@app.route("/api/export-geojson", methods=["POST"])
def export_geojson():
    data = request.json or {}
    palms = data.get("palms", [])
    block_name = data.get("block_name", "Blok-Utama")
    scale = CACHE.get("scale_factor", 1.0)

    features = []
    for i, p in enumerate(palms, 1):
        fx = p.get("full_x", round(p.get("x", 0) * scale))
        fy = p.get("full_y", round(p.get("y", 0) * scale))
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [fx, fy]
            },
            "properties": {
                "tree_id": i,
                "block": block_name,
                "confidence": p.get("confidence", 1.0)
            }
        })

    geojson = {
        "type": "FeatureCollection",
        "name": f"PalmSensus_{block_name}",
        "features": features
    }

    return jsonify(geojson)

@app.route("/api/export-annotated-image", methods=["POST"])
def export_annotated_image():
    """
    Renders high-resolution annotated image with numbered markers for the active block.
    """
    data = request.json or {}
    palms = data.get("palms", [])
    raw_polygon = data.get("polygon", [])
    scale = CACHE["scale_factor"]

    if CACHE["full_image"] is None:
        return "Image not loaded", 500

    # Determine bounding box
    if raw_polygon and len(raw_polygon) >= 3:
        xs = [pt[0] * scale for pt in raw_polygon]
        ys = [pt[1] * scale for pt in raw_polygon]
        min_x = max(0, int(min(xs)) - 100)
        max_x = min(CACHE["full_width"], int(max(xs)) + 100)
        min_y = max(0, int(min(ys)) - 100)
        max_y = min(CACHE["full_height"], int(max(ys)) + 100)
    else:
        min_x, min_y, max_x, max_y = 0, 0, CACHE["full_width"], CACHE["full_height"]

    crop = CACHE["full_image"][min_y:max_y, min_x:max_x].copy()

    # Draw markers on the crop
    for i, p in enumerate(palms, 1):
        fx = int(p.get("full_x", p.get("x", 0) * scale)) - min_x
        fy = int(p.get("full_y", p.get("y", 0) * scale)) - min_y
        r = int(p.get("radius", 25) * (scale if "full_x" not in p else 1.0))
        r = max(18, min(40, r))

        if 0 <= fx < crop.shape[1] and 0 <= fy < crop.shape[0]:
            cv2.circle(crop, (fx, fy), r, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.circle(crop, (fx, fy), 3, (0, 0, 255), -1, cv2.LINE_AA)
            cv2.putText(
                crop,
                str(i),
                (fx - 12, max(15, fy - r - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (255, 255, 255),
                1,
                cv2.LINE_AA
            )

    # Downscale for smooth download if the crop is massive (> 4000px)
    max_export = 3500
    ch, cw = crop.shape[:2]
    if max(ch, cw) > max_export:
        down_scale = max_export / max(ch, cw)
        crop = cv2.resize(crop, (int(cw * down_scale), int(ch * down_scale)), interpolation=cv2.INTER_AREA)

    _, buffer = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return Response(
        buffer.tobytes(),
        mimetype="image/jpeg",
        headers={"Content-Disposition": "attachment;filename=annotated_sensus_block.jpg"}
    )

if __name__ == "__main__":
    get_or_load_image()
    print("\n" + "="*60)
    print("🌴 PalmSensus AI Server Running!")
    print("👉 Open your browser at: http://127.0.0.1:5000")
    print("="*60 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
