import os
import argparse
import json
import time
import cv2
import numpy as np
from PIL import Image

import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

Image.MAX_IMAGE_PIXELS = None

from engine.detector import PalmDetector, PRESETS
from engine.tiler import TiledProcessor
from engine.roi_utils import calculate_polygon_area, calculate_sph

def main():
    parser = argparse.ArgumentParser(description="PalmSensus AI - High Precision Drone Oil Palm Counter")
    parser.add_argument("--image", "-i", type=str, required=True, help="Path to input orthophoto image (.jpg, .png, .tif)")
    parser.add_argument("--preset", "-p", type=str, default="mature", choices=["mature", "young", "custom"], help="Detection preset")
    parser.add_argument("--gsd", "-g", type=float, default=4.0, help="Ground Sampling Distance in cm/pixel (default: 4.0)")
    parser.add_argument("--min-dist", type=int, default=None, help="Override minimum tree spacing in pixels")
    parser.add_argument("--blur", type=int, default=None, help="Override Gaussian blur kernel size")
    parser.add_argument("--thresh", type=int, default=None, help="Override vegetation sensitivity threshold")
    parser.add_argument("--bbox", nargs=4, type=int, default=None, metavar=('X1', 'Y1', 'X2', 'Y2'), help="Bounding box ROI in pixels")
    parser.add_argument("--output", "-o", type=str, default="output", help="Output directory for results")

    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"Error: Image not found at {args.image}")
        return 1

    os.makedirs(args.output, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(args.image))[0]

    print(f"\n🌴 [PalmSensus AI] Initializing processing...")
    print(f"📁 Image: {args.image}")
    print(f"⚙️  Preset: {args.preset} (GSD: {args.gsd} cm/px)")

    t0 = time.time()
    img = cv2.imread(args.image)
    if img is None:
        print("Error: Could not decode image.")
        return 1

    h, w = img.shape[:2]
    print(f"📐 Orthophoto Dimensions: {w} × {h} pixels ({round(w*h/1e6, 1)} Megapixels)")

    detector = PalmDetector(args.preset)
    tiler = TiledProcessor(detector)

    bbox = tuple(args.bbox) if args.bbox else None

    print("🔍 Executing high-resolution tiled crown detection...")
    res = tiler.process_roi(
        full_image=img,
        bounding_box=bbox,
        blur_ksize=args.blur,
        min_distance_px=args.min_dist,
        vegetation_threshold=args.thresh
    )

    palms = res["palms"]
    count = len(palms)
    elapsed = round(time.time() - t0, 2)

    # Calculate Area and SPH
    roi_coords = [
        (res["bbox"][0], res["bbox"][1]),
        (res["bbox"][2], res["bbox"][1]),
        (res["bbox"][2], res["bbox"][3]),
        (res["bbox"][0], res["bbox"][3])
    ]
    area_info = calculate_polygon_area(roi_coords, gsd_cm_per_pixel=args.gsd)
    sph_info = calculate_sph(count, area_info["area_hectares"])

    print("\n" + "="*50)
    print(f"📊 SENSUS RESULTS SUMMARY")
    print("="*50)
    print(f"🌴 Total Palms Counted: {count:,} palms")
    print(f"📏 Estimated Area:     {area_info['area_hectares']} Hectares ({area_info['area_acres']} Acres)")
    print(f"📈 Stand Density:       {sph_info['sph']} SPH (Palms/Ha)")
    print(f"🌱 Plantation Status:   {sph_info['status']}")
    print(f"⏱️  Processing Time:    {elapsed} seconds")
    print("="*50)

    # Export CSV
    csv_path = os.path.join(args.output, f"{base_name}_sensus.csv")
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write("tree_id,x,y,confidence,crown_radius_px\n")
        for p in palms:
            f.write(f"{p['id']},{p['x']},{p['y']},{p['confidence']},{p['radius']}\n")
    print(f"💾 Coordinates CSV saved to: {csv_path}")

    # Export Summary JSON
    json_path = os.path.join(args.output, f"{base_name}_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "image": args.image,
            "dimensions": {"width": w, "height": h},
            "total_palms": count,
            "area": area_info,
            "sph": sph_info,
            "processing_time_s": elapsed
        }, f, indent=2)
    print(f"💾 Sensus JSON summary saved to: {json_path}")

    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
