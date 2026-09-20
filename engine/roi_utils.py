import math
import numpy as np
import cv2
from typing import List, Tuple, Dict, Any, Optional

def polygon_pixel_area(polygon_coords: List[Tuple[float, float]]) -> float:
    """
    Calculate polygon area in pixels squared using the Shoelace formula.
    polygon_coords: list of (x, y) tuples.
    """
    if len(polygon_coords) < 3:
        return 0.0
    
    x = [p[0] for p in polygon_coords]
    y = [p[1] for p in polygon_coords]
    return 0.5 * abs(sum(x[i] * y[i + 1] - x[i + 1] * y[i] for i in range(-1, len(x) - 1)))

def calculate_polygon_area(
    polygon_coords: List[Tuple[float, float]],
    gsd_cm_per_pixel: float = 4.0
) -> Dict[str, float]:
    """
    Calculate polygon area in pixels^2, square meters, and hectares based on GSD.
    gsd_cm_per_pixel: Ground Sampling Distance in cm per pixel (default: 4.0 cm/px).
    """
    pixel_area = polygon_pixel_area(polygon_coords)
    # 1 pixel = (gsd / 100) meters in width and height
    gsd_m = gsd_cm_per_pixel / 100.0
    area_m2 = pixel_area * (gsd_m ** 2)
    area_ha = area_m2 / 10000.0
    area_acres = area_ha * 2.47105

    return {
        "pixel_area": round(pixel_area, 2),
        "area_m2": round(area_m2, 2),
        "area_hectares": round(area_ha, 4),
        "area_acres": round(area_acres, 4),
    }

def calculate_sph(palm_count: int, area_ha: float) -> Dict[str, Any]:
    """
    Calculate Stand Per Hectare (SPH / Kerapatan Pokok per Hektar)
    and compare against commercial agronomic benchmarks.
    """
    if area_ha <= 0.0001:
        return {
            "sph": 0,
            "status": "Unknown (Area too small)",
            "benchmark": "Standard: 128 - 143 palms/ha",
            "percent_standard": 0.0
        }
    
    sph = round(palm_count / area_ha, 1)
    
    # Agronomic evaluation for oil palm:
    # Standard triangular planting (jarak tanam 9.0m x 7.8m segitiga sama sisi) = 143 SPH
    # or 9.2m x 7.96m = 136 SPH
    # or 8.5m x 7.36m = 160 SPH (high density)
    if sph < 110:
        status = "Underpopulated / High Vacancy (Banyak Titik Kosong / Sisipan Dibutuhkan)"
    elif 110 <= sph <= 125:
        status = "Slightly Low Density / Normal Peat Ground Margin"
    elif 126 <= sph <= 145:
        status = "Optimal Plantation Density (Standar SPH Industri Kelapa Sawit)"
    elif 146 <= sph <= 165:
        status = "High Density / Compact Planting Pattern"
    else:
        status = "Very High Density / Check Crown Spacing Setting"
        
    percent_standard = round((sph / 136.0) * 100, 1)

    return {
        "sph": sph,
        "status": status,
        "benchmark": "Standard Industrial Target: 136 - 143 palms/ha",
        "percent_standard": percent_standard
    }

def point_in_polygon_mask(
    height: int,
    width: int,
    polygon_coords: List[Tuple[float, float]],
    offset_x: int = 0,
    offset_y: int = 0
) -> np.ndarray:
    """
    Create a binary mask (uint8 255/0) for an image region of shape (height, width)
    given polygon coordinates in global coordinates.
    offset_x, offset_y: origin of the local sub-image in global coordinates.
    """
    mask = np.zeros((height, width), dtype=np.uint8)
    if len(polygon_coords) < 3:
        mask.fill(255)
        return mask
    
    local_pts = []
    for x, y in polygon_coords:
        local_pts.append([int(round(x - offset_x)), int(round(y - offset_y))])
    
    pts_arr = np.array([local_pts], dtype=np.int32)
    cv2.fillPoly(mask, pts_arr, 255)
    return mask

def filter_points_by_polygon(
    points: List[Dict[str, Any]],
    polygon_coords: List[Tuple[float, float]]
) -> List[Dict[str, Any]]:
    """
    Filter points (each with 'x' and 'y') to only those inside the polygon.
    """
    if len(polygon_coords) < 3:
        return points
    
    pts_arr = np.array(polygon_coords, dtype=np.float32)
    filtered = []
    for pt in points:
        # cv2.pointPolygonTest returns > 0 if inside, 0 on edge, < 0 outside
        dist = cv2.pointPolygonTest(pts_arr, (float(pt["x"]), float(pt["y"])), False)
        if dist >= 0:
            filtered.append(pt)
    return filtered
