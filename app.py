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
app.config['MAX_CONTENT_LENGTH'] = 2048 * 1024 * 1024  # Allow up to 2GB orthophoto uploads

# Default image path (checks local full photo, fallback, then bundled demo photo)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_DATA_IMG = os.path.join(BASE_DIR, "data", "Jalan-Lintas-S5080iak-Tumang-3-7-2026-orthophoto-2.jpg")
LOCAL_DEMO_IMG = os.path.join(BASE_DIR, "data", "demo_palm_estate.jpg")
FALLBACK_IMG = r"D:\Downloads\Jalan-Lintas-S5080iak-Tumang-3-7-2026-orthophoto-2.jpg"

if os.path.exists(LOCAL_DATA_IMG):
    DEFAULT_IMAGE_PATH = LOCAL_DATA_IMG
elif os.path.exists(FALLBACK_IMG):
    DEFAULT_IMAGE_PATH = FALLBACK_IMG
elif os.path.exists(LOCAL_DEMO_IMG):
    DEFAULT_IMAGE_PATH = LOCAL_DEMO_IMG
else:
    DEFAULT_IMAGE_PATH = ""

# Global cache for loaded image metadata and thumbnail
CACHE: Dict[str, Any] = {
    "image_path": "",
    "full_image": None,
    "full_width": 0,
    "full_height": 0,
    "overview_image": None,
    "overview_width": 0,
    "overview_height": 0,
    "overview_jpeg_bytes": None,
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

    # Create scaled overview for fluid UI interaction (upgraded to 4096 px for sharp clarity)
    max_side = 4096
    scale = max_side / max(h, w)
    overview_w = int(round(w * scale))
    overview_h = int(round(h * scale))
    
    overview = cv2.resize(img, (overview_w, overview_h), interpolation=cv2.INTER_AREA)
    CACHE["overview_image"] = overview
    CACHE["overview_width"] = overview_w
    CACHE["overview_height"] = overview_h
    CACHE["scale_factor"] = CACHE["full_width"] / float(overview_w)
    CACHE["overview_jpeg_bytes"] = None  # Reset cached overview bytes

    print(f"[PalmSensus] Image loaded in {time.time() - t0:.2f}s: {w}x{h} px. Overview: {overview_w}x{overview_h} px (scale: {CACHE['scale_factor']:.3f})")
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

@app.route("/api/list-images", methods=["GET"])
def list_available_images():
    r"""
    Lists all orthophotos available in data/ directory
    """
    data_dir = os.path.join(BASE_DIR, "data")
    os.makedirs(data_dir, exist_ok=True)
    images = []
    valid_exts = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}

    if os.path.exists(data_dir):
        for f in os.listdir(data_dir):
            ext = os.path.splitext(f)[1].lower()
            if ext in valid_exts:
                full_p = os.path.join(data_dir, f)
                sz = round(os.path.getsize(full_p) / (1024 * 1024), 2)
                images.append({
                    "filename": f,
                    "path": full_p,
                    "size_mb": sz,
                    "is_current": (os.path.normpath(full_p) == os.path.normpath(CACHE.get("image_path", "")))
                })
    return jsonify({"success": True, "images": images, "current_image": CACHE.get("image_path")})

@app.route("/api/load-image", methods=["POST"])
def load_image_endpoint():
    """
    Loads an image either by direct file upload OR by local PC path!
    """
    # 1. Direct File Upload
    if "file" in request.files:
        f = request.files["file"]
        if f and f.filename:
            data_dir = os.path.join(BASE_DIR, "data")
            os.makedirs(data_dir, exist_ok=True)
            save_path = os.path.join(data_dir, f.filename)
            f.save(save_path)
            if get_or_load_image(save_path):
                return jsonify({
                    "success": True,
                    "message": f"Uploaded & Loaded {f.filename}",
                    "filename": f.filename,
                    "path": save_path
                })
            else:
                return jsonify({"success": False, "error": "Failed to decode uploaded image."}), 400

    # 2. Local PC Path
    data = request.json or {}
    path = data.get("path", "").strip().strip('"').strip("'")
    if path and os.path.exists(path):
        if get_or_load_image(path):
            return jsonify({
                "success": True,
                "message": f"Loaded {os.path.basename(path)}",
                "filename": os.path.basename(path),
                "path": path
            })
        else:
            return jsonify({"success": False, "error": "Failed to decode image at specified path."}), 400

    return jsonify({"success": False, "error": "Image path does not exist on your PC."}), 400

@app.route("/api/overview-image", methods=["GET"])
def get_overview_image():
    if not get_or_load_image():
        return "Image not found", 404
    
    # Return pre-encoded JPEG bytes for blistering 0ms response time
    if CACHE.get("overview_jpeg_bytes") is None:
        _, buffer = cv2.imencode(".jpg", CACHE["overview_image"], [cv2.IMWRITE_JPEG_QUALITY, 85])
        CACHE["overview_jpeg_bytes"] = buffer.tobytes()

    return Response(
        CACHE["overview_jpeg_bytes"],
        mimetype="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"}
    )

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
    healthy_count = 0
    stressed_count = 0
    critical_count = 0

    for p in palms:
        h_status = p.get("health_status", "healthy")
        h_label = p.get("health_label", "Optimal Green")
        if h_status == "healthy":
            healthy_count += 1
        elif h_status == "stressed":
            stressed_count += 1
        else:
            critical_count += 1

        overview_palms.append({
            "id": p["id"],
            "full_x": p["x"],
            "full_y": p["y"],
            "x": round(p["x"] / scale, 2),
            "y": round(p["y"] / scale, 2),
            "radius": round(p["radius"] / scale, 2),
            "confidence": p["confidence"],
            "peak_intensity": p.get("peak_intensity", 0),
            "health_status": h_status,
            "health_label": h_label
        })

    total_safe = total_count or 1
    health_summary = {
        "healthy_count": healthy_count,
        "healthy_pct": round((healthy_count / total_safe) * 100, 1),
        "stressed_count": stressed_count,
        "stressed_pct": round((stressed_count / total_safe) * 100, 1),
        "critical_count": critical_count,
        "critical_pct": round((critical_count / total_safe) * 100, 1)
    }

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
        "health_summary": health_summary,
        "bbox": result["bbox"]
    })

@app.route("/api/export-csv", methods=["POST"])
def export_csv():
    data = request.json or {}
    palms = data.get("palms", [])
    block_name = data.get("block_name", "Blok-Utama")
    scale = CACHE.get("scale_factor", 1.0)

    output = io.StringIO()
    output.write("id,block_name,x_full,y_full,x_overview,y_overview,confidence,crown_radius_full_px,health_status,health_label\n")
    for i, p in enumerate(palms, 1):
        fx = p.get("full_x", round(p.get("x", 0) * scale))
        fy = p.get("full_y", round(p.get("y", 0) * scale))
        ox = p.get("x", round(fx / scale))
        oy = p.get("y", round(fy / scale))
        conf = p.get("confidence", 1.0)
        r = round(p.get("radius", 25) * scale)
        hs = p.get("health_status", "healthy")
        hl = p.get("health_label", "Optimal Green")
        output.write(f"{i},{block_name},{fx},{fy},{ox},{oy},{conf},{r},{hs},{hl}\n")

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
    block_name = data.get("block_name", "Blok-Utama").strip() or "Blok-Utama"
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

    _, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return Response(
        buf.tobytes(),
        mimetype="image/jpeg",
        headers={"Content-Disposition": f"attachment;filename=annotated_{block_name}.jpg"}
    )

@app.route("/api/export-report", methods=["POST"])
def export_estate_report():
    """
    Generates a publication-grade, printable Executive Sensus & Agronomy Report
    complete with yield projections, canopy health distribution, and multi-block audits.
    """
    data = request.json or {}
    estate_name = data.get("estate_name", "Perkebunan Kelapa Sawit").strip() or "Perkebunan Kelapa Sawit"
    block_name = data.get("block_name", "Blok Utama").strip() or "Blok Utama"
    total_palms = int(data.get("total_palms", 0))
    area_ha = float(data.get("area_ha", 0.0))
    sph = float(data.get("sph", 0.0))
    sph_status = data.get("sph_status", "N/A")
    health = data.get("health_summary", {})
    gaps_count = int(data.get("gaps_count", 0))
    mortality_pct = float(data.get("mortality_pct", 0.0))
    saved_blocks = data.get("saved_blocks", [])

    optimal_target_trees = round(area_ha * 136)
    variance = total_palms - optimal_target_trees
    est_ffb_tonnes_ha = round(24.0 * (min(143.0, max(80.0, sph)) / 136.0), 1) if area_ha > 0 else 0.0
    est_total_ffb_tonnes = round(est_ffb_tonnes_ha * area_ha, 1)
    est_annual_loss_idr = gaps_count * 450000

    report_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Executive Drone Sensus Report — {estate_name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {{
            body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
            .no-print {{ display: none !important; }}
        }}
    </style>
</head>
<body class="bg-slate-50 text-slate-900 p-8 font-sans max-w-5xl mx-auto">
    <!-- Action Bar -->
    <div class="no-print flex justify-between items-center mb-6 bg-slate-900 text-white p-4 rounded-xl shadow-md">
        <div>
            <h2 class="font-bold text-sm text-emerald-400">🌴 PalmSentinel AI Pro — Executive Report Preview</h2>
            <p class="text-xs text-slate-400">Save as branded PDF or print for plantation management</p>
        </div>
        <button onclick="window.print()" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer">
            <span>🖨️ Print / Save as PDF</span>
        </button>
    </div>

    <!-- Official Report Header -->
    <div class="border-b-2 border-emerald-600 pb-4 mb-6 flex justify-between items-end">
        <div>
            <span class="text-xs font-bold uppercase tracking-widest text-emerald-700">Official Drone Sensus & Agronomy Audit</span>
            <h1 class="text-2xl font-black tracking-tight text-slate-900">{estate_name}</h1>
            <p class="text-xs text-slate-600 mt-0.5">Active Block: <strong>{block_name}</strong> | Sensor GSD: <strong>{data.get('gsd_cm', 4.0)} cm/px</strong></p>
        </div>
        <div class="text-right text-xs text-slate-500">
            <p>Report Date: <strong>{time.strftime('%d %B %Y')}</strong></p>
            <p>Verification: <strong class="text-emerald-700">100% Native Orthomosaic Audit</strong></p>
        </div>
    </div>

    <!-- Executive KPI Grid -->
    <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Total Palm Sensus</span>
            <p class="text-3xl font-black text-emerald-900 mt-1">{total_palms:,}</p>
            <span class="text-[10px] text-emerald-700">Canopy Detected</span>
        </div>
        <div class="bg-slate-100 border border-slate-200 rounded-xl p-3.5">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Total Block Area</span>
            <p class="text-3xl font-black text-slate-900 mt-1">{area_ha:.2f} <span class="text-base font-normal">Ha</span></p>
            <span class="text-[10px] text-slate-500">Polygon Ground Area</span>
        </div>
        <div class="bg-slate-100 border border-slate-200 rounded-xl p-3.5">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Stand Density (SPH)</span>
            <p class="text-3xl font-black text-slate-900 mt-1">{sph:.0f} <span class="text-base font-normal">SPH</span></p>
            <span class="text-[10px] text-emerald-700 font-medium">{sph_status}</span>
        </div>
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Titik Sisipan / Gaps</span>
            <p class="text-3xl font-black text-amber-900 mt-1">{gaps_count:,}</p>
            <span class="text-[10px] text-amber-700">{mortality_pct:.1f}% Mortality Rate</span>
        </div>
    </div>

    <!-- Health Distribution & Agronomic Assessment -->
    <div class="grid grid-cols-2 gap-6 mb-6">
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 class="font-bold text-sm text-slate-800 mb-3 flex items-center gap-1.5">
                <span>🌿 Canopy Health Distribution (ExG/VARI)</span>
            </h3>
            <div class="space-y-2.5 text-xs">
                <div>
                    <div class="flex justify-between font-semibold text-emerald-800 mb-1">
                        <span>Healthy TM Canopy</span>
                        <span>{health.get('healthy_pct', 0)}% ({health.get('healthy_count', 0):,} palms)</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-2.5">
                        <div class="bg-emerald-500 h-2.5 rounded-full" style="width: {health.get('healthy_pct', 0)}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between font-semibold text-amber-800 mb-1">
                        <span>Mild Chlorosis / Yellowing</span>
                        <span>{health.get('stressed_pct', 0)}% ({health.get('stressed_count', 0):,} palms)</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-2.5">
                        <div class="bg-amber-500 h-2.5 rounded-full" style="width: {health.get('stressed_pct', 0)}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between font-semibold text-red-800 mb-1">
                        <span>Severe Defoliation / Dieback</span>
                        <span>{health.get('critical_pct', 0)}% ({health.get('critical_count', 0):,} palms)</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-2.5">
                        <div class="bg-red-500 h-2.5 rounded-full" style="width: {health.get('critical_pct', 0)}%"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 class="font-bold text-sm text-slate-800 mb-3 flex items-center gap-1.5">
                <span>📈 Agronomic Yield Projections</span>
            </h3>
            <div class="space-y-2 text-xs text-slate-700">
                <div class="flex justify-between border-b pb-1">
                    <span>Benchmark Stand Per Hectare:</span>
                    <strong class="font-mono">136 - 143 SPH</strong>
                </div>
                <div class="flex justify-between border-b pb-1">
                    <span>Target Planting Count for {area_ha:.1f} Ha:</span>
                    <strong class="font-mono">{optimal_target_trees:,} palms</strong>
                </div>
                <div class="flex justify-between border-b pb-1">
                    <span>Stand Density Variance:</span>
                    <strong class="font-mono {'text-emerald-700' if variance >= 0 else 'text-red-700'}">{variance:+,} palms</strong>
                </div>
                <div class="flex justify-between border-b pb-1">
                    <span>Projected Fresh Fruit Bunch (FFB):</span>
                    <strong class="font-mono text-emerald-800">{est_ffb_tonnes_ha} Tonnes / Ha / Year</strong>
                </div>
                <div class="flex justify-between border-b pb-1">
                    <span>Estimated Annual Estate FFB:</span>
                    <strong class="font-mono text-emerald-800">{est_total_ffb_tonnes:,.1f} Tonnes / Year</strong>
                </div>
                <div class="flex justify-between pt-0.5">
                    <span>Estimated Vacancy Opportunity Loss:</span>
                    <strong class="font-mono text-red-700">Rp {est_annual_loss_idr:,.0f} / Year</strong>
                </div>
            </div>
        </div>
    </div>
"""

    if saved_blocks:
        report_html += """
    <!-- Multi-Block Partitioning Table -->
    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
        <h3 class="font-bold text-sm text-slate-800 mb-3">📑 Multi-Block Sensus Breakdown (Afdeling)</h3>
        <table class="w-full text-xs text-left border-collapse">
            <thead>
                <tr class="bg-slate-100 border-b border-slate-200 text-slate-700">
                    <th class="py-2 px-3">#</th>
                    <th class="py-2 px-3">Block Name</th>
                    <th class="py-2 px-3 text-right">Area (Ha)</th>
                    <th class="py-2 px-3 text-right">Palm Count</th>
                    <th class="py-2 px-3 text-right">SPH</th>
                    <th class="py-2 px-3">Agronomic Status</th>
                </tr>
            </thead>
            <tbody>
        """
        for i, b in enumerate(saved_blocks, 1):
            b_area = float(b.get('area_ha', b.get('areaHa', 0.0)))
            b_palms = int(b.get('total_palms', b.get('palmCount', b.get('palms', 0))))
            b_sph = float(b.get('sph', 0.0))
            b_status = b.get('sphStatus', b.get('status', 'Audited'))
            report_html += f"""
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="py-2 px-3 font-mono">{i}</td>
                    <td class="py-2 px-3 font-bold text-slate-800">{b.get('name', f'Block {i}')}</td>
                    <td class="py-2 px-3 text-right font-mono">{b_area:.2f} Ha</td>
                    <td class="py-2 px-3 text-right font-mono font-bold text-emerald-700">{b_palms:,}</td>
                    <td class="py-2 px-3 text-right font-mono">{b_sph:.0f}</td>
                    <td class="py-2 px-3 text-slate-600">{b_status}</td>
                </tr>
            """
        report_html += """
            </tbody>
        </table>
    </div>
        """

    report_html += """
    <!-- Signatures -->
    <div class="border-t border-slate-300 pt-6 mt-8 grid grid-cols-3 gap-8 text-xs text-slate-600">
        <div>
            <p class="font-bold text-slate-800 mb-8">Prepared by (Drone Pilot):</p>
            <div class="border-b border-slate-400 w-40 mb-1"></div>
            <p>GIS & Remote Sensing Unit</p>
        </div>
        <div>
            <p class="font-bold text-slate-800 mb-8">Agronomy Verification:</p>
            <div class="border-b border-slate-400 w-40 mb-1"></div>
            <p>Head Agronomist / Asisten Kebun</p>
        </div>
        <div>
            <p class="font-bold text-slate-800 mb-8">Estate Approval:</p>
            <div class="border-b border-slate-400 w-40 mb-1"></div>
            <p>Estate Manager / Askep</p>
        </div>
    </div>
</body>
</html>
"""
    return Response(report_html, mimetype="text/html")

@app.route("/api/viewport-patch", methods=["GET"])
def get_viewport_patch():
    """
    Returns a crisp 100% native full-resolution image crop for the visible viewport.
    Eliminates all blurriness when zoomed in!
    """
    if not get_or_load_image():
        return "Image not loaded", 500

    try:
        x1 = max(0, int(float(request.args.get("x1", 0))))
        y1 = max(0, int(float(request.args.get("y1", 0))))
        x2 = min(CACHE["full_width"], int(float(request.args.get("x2", CACHE["full_width"]))))
        y2 = min(CACHE["full_height"], int(float(request.args.get("y2", CACHE["full_height"]))))
        
        # Max resolution to return in single patch (for bandwidth and speed)
        max_dim = int(request.args.get("max_dim", 2560))

        if x2 <= x1 or y2 <= y1:
            return "Invalid bounds", 400

        crop = CACHE["full_image"][y1:y2, x1:x2]
        ch, cw = crop.shape[:2]

        if max(ch, cw) > max_dim:
            s = max_dim / float(max(ch, cw))
            crop = cv2.resize(crop, (int(round(cw * s)), int(round(ch * s))), interpolation=cv2.INTER_AREA)

        _, buffer = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 88])
        return Response(
            buffer.tobytes(),
            mimetype="image/jpeg",
            headers={"Cache-Control": "public, max-age=3600"}
        )
    except Exception as e:
        return f"Error: {str(e)}", 500

@app.route("/api/tree-sample", methods=["GET"])
def get_tree_sample():
    """
    Returns a 100% native full-resolution crop centered at (x, y) for the live 1-tree loupe.
    """
    if not get_or_load_image():
        return "Image not loaded", 500

    try:
        # Check if coordinates are given in overview or full scale
        scale = CACHE["scale_factor"]
        is_overview = request.args.get("coord_scale", "overview") == "overview"
        
        raw_x = float(request.args.get("x", CACHE["full_width"] // 2))
        raw_y = float(request.args.get("y", CACHE["full_height"] // 2))

        fx = int(round(raw_x * scale)) if is_overview else int(round(raw_x))
        fy = int(round(raw_y * scale)) if is_overview else int(round(raw_y))

        # Size of the sample box in native pixels (e.g. 260x260 px)
        box_size = int(request.args.get("size", 260))
        half = box_size // 2

        x1 = max(0, fx - half)
        y1 = max(0, fy - half)
        x2 = min(CACHE["full_width"], fx + half)
        y2 = min(CACHE["full_height"], fy + half)

        patch = CACHE["full_image"][y1:y2, x1:x2]
        
        # Ensure square shape with black border if near boundary
        if patch.shape[0] != box_size or patch.shape[1] != box_size:
            square = np.zeros((box_size, box_size, 3), dtype=np.uint8)
            ph, pw = patch.shape[:2]
            square[:ph, :pw] = patch
            patch = square

        _, buffer = cv2.imencode(".jpg", patch, [cv2.IMWRITE_JPEG_QUALITY, 95])
        return Response(
            buffer.tobytes(),
            mimetype="image/jpeg",
            headers={"Cache-Control": "public, max-age=3600"}
        )
    except Exception as e:
        return f"Error: {str(e)}", 500

@app.route("/api/auto-calibrate", methods=["POST"])
def auto_calibrate():
    """
    1-Click Visual Auto-Calibration:
    Analyzes the user-selected palm tree crown, computes the radial profile,
    and returns recommended Crown Radius, Spacing, and Vegetation Threshold!
    """
    if not get_or_load_image():
        return jsonify({"success": False, "error": "Image not loaded"}), 500

    data = request.json or {}
    scale = CACHE["scale_factor"]
    is_overview = data.get("coord_scale", "overview") == "overview"

    raw_x = float(data.get("x", 0))
    raw_y = float(data.get("y", 0))

    fx = int(round(raw_x * scale)) if is_overview else int(round(raw_x))
    fy = int(round(raw_y * scale)) if is_overview else int(round(raw_y))

    # Crop 320x320 patch around clicked palm
    half = 160
    x1 = max(0, fx - half)
    y1 = max(0, fy - half)
    x2 = min(CACHE["full_width"], fx + half)
    y2 = min(CACHE["full_height"], fy + half)

    patch = CACHE["full_image"][y1:y2, x1:x2]
    if patch.shape[0] < 50 or patch.shape[1] < 50:
        return jsonify({"success": False, "error": "Point too close to image edge."}), 400

    # Compute ExG vegetation map
    b, g, r = cv2.split(patch.astype(np.float32))
    exg = 2 * g - r - b
    exg_norm = cv2.normalize(exg, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # Find peak near center
    cy, cx = fy - y1, fx - x1
    local_window = exg_norm[max(0, cy-30):min(patch.shape[0], cy+30), max(0, cx-30):min(patch.shape[1], cx+30)]
    
    # Measure radial gradient falloff from center to find crown boundary
    smooth = cv2.GaussianBlur(exg_norm, (21, 21), 0)
    center_val = float(smooth[cy, cx])
    background_val = float(np.percentile(smooth, 25))

    # Find radius where intensity drops by 45% towards background
    threshold_falloff = background_val + (center_val - background_val) * 0.55
    
    # Sample concentric circles from r=15 to r=90
    detected_r = 30
    for r_test in range(15, 90, 2):
        mask_ring = np.zeros(smooth.shape, dtype=np.uint8)
        cv2.circle(mask_ring, (cx, cy), r_test, 255, 2)
        vals = smooth[mask_ring > 0]
        if len(vals) > 0 and np.mean(vals) < threshold_falloff:
            detected_r = r_test
            break

    # Convert detected radius to parameters
    detected_r = max(18, min(65, detected_r))
    
    # Recommended settings
    rec_blur = int(round(detected_r * 0.9))
    if rec_blur % 2 == 0:
        rec_blur += 1
    rec_spacing = int(round(detected_r * 2.1))
    rec_thresh = int(np.clip(background_val + 5, 60, 95))

    # Tree category
    if detected_r < 25:
        category = "Young Palm (TBM / Tanaman Belum Menghasilkan)"
        palm_type = "young"
    elif detected_r < 40:
        category = "Semi-Mature Palm (TM Muda)"
        palm_type = "semi_mature"
    else:
        category = "Fully Mature Palm (TM Dewasa / Interlocking Canopies)"
        palm_type = "mature"

    return jsonify({
        "success": True,
        "calibrated_tree": {
            "full_x": fx,
            "full_y": fy,
            "overview_x": round(fx / scale, 2),
            "overview_y": round(fy / scale, 2),
            "crown_radius_px": detected_r,
            "category": category,
            "palm_type": palm_type
        },
        "recommended_parameters": {
            "blur_ksize": rec_blur,
            "min_distance_px": rec_spacing,
            "vegetation_threshold": rec_thresh,
            "crown_radius_px": detected_r
        }
    })

@app.route("/api/detect-gaps", methods=["POST"])
def detect_planting_gaps():
    """
    Identifies vacant planting holes / missing trees (Titik Sisipan / Pokok Mati)
    by analyzing missing regular grid intersections inside the active polygon.
    """
    data = request.json or {}
    palms = data.get("palms", [])
    raw_polygon = data.get("polygon", [])
    expected_spacing = float(data.get("expected_spacing", 70.0))

    if len(palms) < 10 or len(raw_polygon) < 3:
        return jsonify({"success": True, "gaps": [], "total_gaps": 0, "mortality_percent": 0.0})

    # Find missing spots where a tree should exist according to neighbor distances
    coords = np.array([[p["x"], p["y"]] for p in palms], dtype=np.float32)
    poly_arr = np.array(raw_polygon, dtype=np.float32)

    gaps = []
    min_gap_dist = expected_spacing * 0.8
    max_gap_dist = expected_spacing * 1.5

    # Check inter-palm midpoints and empty grid spaces
    for i in range(min(len(coords), 300)):
        pt1 = coords[i]
        dists = np.hypot(coords[:, 0] - pt1[0], coords[:, 1] - pt1[1])
        neighbors = np.where((dists > min_gap_dist) & (dists < max_gap_dist))[0]

        for n_idx in neighbors:
            mid = (pt1 + coords[n_idx]) * 0.5
            # Check if inside polygon
            if cv2.pointPolygonTest(poly_arr, (float(mid[0]), float(mid[1])), False) >= 0:
                # Check if there is already a palm near midpoint
                dist_to_any = np.min(np.hypot(coords[:, 0] - mid[0], coords[:, 1] - mid[1]))
                if dist_to_any > expected_spacing * 0.65:
                    if not any(np.hypot(g["x"] - mid[0], g["y"] - mid[1]) < min_gap_dist * 0.5 for g in gaps):
                        gaps.append({
                            "id": len(gaps) + 1,
                            "x": round(float(mid[0]), 2),
                            "y": round(float(mid[1]), 2),
                            "status": "Titik Sisipan (Missing Palm)"
                        })

    mortality = round((len(gaps) / max(1, len(palms) + len(gaps))) * 100, 1)

    return jsonify({
        "success": True,
        "gaps": gaps[:100],  # cap at 100 for display
        "total_gaps": len(gaps),
        "mortality_percent": mortality
    })

if __name__ == "__main__":
    get_or_load_image()
    print("\n" + "="*60)
    print("🌴 PalmSensus AI Server Running!")
    print("👉 Open your browser at: http://127.0.0.1:5000")
    print("="*60 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
