import os
import time
import json
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

from engine.detector import PalmDetector
from engine.tiler import TiledProcessor
from engine.roi_utils import calculate_polygon_area, calculate_sph

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_DATA_IMG = os.path.join(BASE_DIR, "data", "Jalan-Lintas-S5080iak-Tumang-3-7-2026-orthophoto-2.jpg")
FALLBACK_IMG = r"D:\Downloads\Jalan-Lintas-S5080iak-Tumang-3-7-2026-orthophoto-2.jpg"
IMAGE_PATH = LOCAL_DATA_IMG if os.path.exists(LOCAL_DATA_IMG) else FALLBACK_IMG

OUTPUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Define real plantation block boundaries from the orthophoto
BLOCKS = [
    {
        "id": "blok_tm_utara",
        "name": "Blok 1 - TM Utara (Mature Oil Palm)",
        "preset": "mature",
        "gsd_cm": 4.0,
        "polygon": [
            (300, 1200),
            (4200, 400),
            (9000, 1000),
            (8600, 8600),
            (4200, 9300),
            (300, 7800)
        ],
        "params": {
            "blur_ksize": 31,
            "min_distance_px": 70,
            "vegetation_threshold": 75
        }
    },
    {
        "id": "blok_tbm_selatan",
        "name": "Blok 2 - TBM Selatan (Young Oil Palm / Parit)",
        "preset": "young",
        "gsd_cm": 4.0,
        "polygon": [
            (600, 10600),
            (3300, 9900),
            (3800, 14100),
            (1000, 14600)
        ],
        "params": {
            "blur_ksize": 21,
            "min_distance_px": 48,
            "vegetation_threshold": 72
        }
    },
    {
        "id": "blok_timur_selatan",
        "name": "Blok 3 - Timur Selatan (Mixed & Shrub)",
        "preset": "young",
        "gsd_cm": 4.0,
        "polygon": [
            (6300, 9600),
            (8300, 9200),
            (7800, 13800),
            (6400, 13500)
        ],
        "params": {
            "blur_ksize": 21,
            "min_distance_px": 50,
            "vegetation_threshold": 72
        }
    }
]

def run_estate_sensus():
    print("="*65)
    print("[PALMSENSUS AI] FULL ESTATE SENSUS AUDIT")
    print(f"[-] Source: {IMAGE_PATH}")
    print("="*65)

    if not os.path.exists(IMAGE_PATH):
        print(f"Error: Image not found at {IMAGE_PATH}")
        return

    t_start = time.time()
    print("[-] Loading full 138-megapixel orthophoto into memory...")
    img = cv2.imread(IMAGE_PATH)
    h, w = img.shape[:2]
    print(f"[OK] Loaded: {w} x {h} pixels (RGB, {round(os.path.getsize(IMAGE_PATH)/(1024*1024), 1)} MB)")

    total_estate_palms = 0
    total_estate_hectares = 0.0
    estate_results = []

    for blk in BLOCKS:
        print(f"\n[*] Processing {blk['name']}...")
        t_b0 = time.time()

        poly = blk["polygon"]
        area_info = calculate_polygon_area(poly, gsd_cm_per_pixel=blk["gsd_cm"])
        
        detector = PalmDetector(blk["preset"])
        tiler = TiledProcessor(detector, tile_size=2048, overlap=256)

        res = tiler.process_roi(
            full_image=img,
            polygon_coords=poly,
            **blk["params"]
        )

        count = res["total_count"]
        sph_info = calculate_sph(count, area_info["area_hectares"])
        elapsed = round(time.time() - t_b0, 2)

        total_estate_palms += count
        total_estate_hectares += area_info["area_hectares"]

        print(f"   * Palms Counted:    {count:,} pokok")
        print(f"   * Hectarage:        {area_info['area_hectares']} Ha ({area_info['area_acres']} Acres)")
        print(f"   * Stand Density:    {sph_info['sph']} SPH (Palms/Ha)")
        print(f"   * Status:           {sph_info['status']}")
        print(f"   * Compute Time:     {elapsed}s")

        # Save CSV for block
        csv_file = os.path.join(OUTPUT_DIR, f"{blk['id']}_coordinates.csv")
        with open(csv_file, "w", encoding="utf-8") as f:
            f.write("id,x,y,confidence,radius_px\n")
            for p in res["palms"]:
                f.write(f"{p['id']},{p['x']},{p['y']},{p['confidence']},{p['radius']}\n")

        estate_results.append({
            "block_id": blk["id"],
            "block_name": blk["name"],
            "count": count,
            "area_ha": area_info["area_hectares"],
            "sph": sph_info["sph"],
            "status": sph_info["status"],
            "compute_time_s": elapsed,
            "csv_path": csv_file
        })

    total_time = round(time.time() - t_start, 2)
    avg_sph = round(total_estate_palms / total_estate_hectares, 1) if total_estate_hectares > 0 else 0

    print("\n" + "="*65)
    print("FINAL CONSOLIDATED ESTATE SENSUS REPORT")
    print("="*65)
    print(f"TOTAL ESTATE PALM COUNT:   {total_estate_palms:,} POKOK")
    print(f"TOTAL ESTIMATED HECTARES:  {round(total_estate_hectares, 2)} Ha ({round(total_estate_hectares * 2.47105, 2)} Acres)")
    print(f"AVERAGE ESTATE SPH:        {avg_sph} SPH")
    print(f"TOTAL PROCESSING TIME:     {total_time}s")
    print("="*65)

    # Save summary report JSON
    summary_path = os.path.join(OUTPUT_DIR, "estate_sensus_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "image": IMAGE_PATH,
            "total_estate_palms": total_estate_palms,
            "total_estate_hectares": round(total_estate_hectares, 2),
            "average_sph": avg_sph,
            "blocks": estate_results,
            "total_time_seconds": total_time
        }, f, indent=2)

    print(f"\n💾 Full Estate Audit JSON Report saved to: {summary_path}")

if __name__ == "__main__":
    run_estate_sensus()
