import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from .detector import PalmDetector
from .roi_utils import filter_points_by_polygon, point_in_polygon_mask

class TiledProcessor:
    """
    Tiled inference manager for ultra-high-resolution drone orthophotos (100MP+).
    Breaks large ROIs into overlapping tiles to manage memory footprint while
    eliminating edge-boundary truncation artifacts via margin deduplication.
    """

    def __init__(self, detector: PalmDetector, tile_size: int = 2048, overlap: int = 256):
        self.detector = detector
        self.tile_size = tile_size
        self.overlap = overlap

    def process_roi(
        self,
        full_image: np.ndarray,
        polygon_coords: Optional[List[Tuple[float, float]]] = None,
        bounding_box: Optional[Tuple[int, int, int, int]] = None,
        **detector_kwargs
    ) -> Dict[str, Any]:
        """
        Process a Region of Interest (ROI) defined by a polygon or bounding box.
        full_image: loaded image array (H, W, C).
        polygon_coords: list of (x, y) global coordinates.
        bounding_box: (min_x, min_y, max_x, max_y) global coordinates.
        """
        img_h, img_w = full_image.shape[:2]

        # Determine processing bounding box
        if polygon_coords and len(polygon_coords) >= 3:
            xs = [p[0] for p in polygon_coords]
            ys = [p[1] for p in polygon_coords]
            min_x = max(0, int(math_floor(min(xs))))
            max_x = min(img_w, int(math_ceil(max(xs))))
            min_y = max(0, int(math_floor(min(ys))))
            max_y = min(img_h, int(math_ceil(max(ys))))
        elif bounding_box:
            min_x = max(0, int(bounding_box[0]))
            min_y = max(0, int(bounding_box[1]))
            max_x = min(img_w, int(bounding_box[2]))
            max_y = min(img_h, int(bounding_box[3]))
        else:
            min_x, min_y, max_x, max_y = 0, 0, img_w, img_h

        roi_w = max_x - min_x
        roi_h = max_y - min_y

        if roi_w <= 0 or roi_h <= 0:
            return {"palms": [], "total_count": 0, "bbox": (min_x, min_y, max_x, max_y)}

        all_detections: List[Dict[str, Any]] = []

        # If ROI is small enough to fit comfortably in RAM (< 4000x4000), process directly
        if roi_w <= 4096 and roi_h <= 4096:
            roi_patch = full_image[min_y:max_y, min_x:max_x]
            
            # Local mask for the patch
            local_mask = None
            if polygon_coords and len(polygon_coords) >= 3:
                local_mask = point_in_polygon_mask(roi_h, roi_w, polygon_coords, offset_x=min_x, offset_y=min_y)

            all_detections = self.detector.detect(
                roi_patch,
                mask=local_mask,
                offset_x=min_x,
                offset_y=min_y,
                **detector_kwargs
            )
        else:
            # Tiled Processing across large ROI
            step = self.tile_size - self.overlap
            y_starts = list(range(min_y, max_y, step))
            x_starts = list(range(min_x, max_x, step))

            raw_points: List[Dict[str, Any]] = []

            for ys in y_starts:
                ye = min(max_y, ys + self.tile_size)
                for xs in x_starts:
                    xe = min(max_x, xs + self.tile_size)

                    tile = full_image[ys:ye, xs:xe]
                    tile_dets = self.detector.detect(
                        tile,
                        offset_x=xs,
                        offset_y=ys,
                        **detector_kwargs
                    )
                    raw_points.extend(tile_dets)

            # Global spatial deduplication across tile margins with 2D Grid Binning
            min_dist = detector_kwargs.get("min_distance_px", self.detector.config.min_distance_px)
            thresh_dist = min_dist * 0.8
            min_dist_sq = thresh_dist ** 2
            cell_size = max(5, int(thresh_dist))

            raw_points.sort(key=lambda p: p.get("peak_intensity", 100), reverse=True)
            grid: Dict[Tuple[int, int], List[Tuple[int, int]]] = {}
            deduped = []

            for p in raw_points:
                px, py = p["x"], p["y"]
                gx, gy = px // cell_size, py // cell_size
                too_close = False

                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        cell = (gx + dx, gy + dy)
                        if cell in grid:
                            for ax, ay in grid[cell]:
                                if (px - ax) ** 2 + (py - ay) ** 2 < min_dist_sq:
                                    too_close = True
                                    break
                        if too_close:
                            break
                    if too_close:
                        break

                if not too_close:
                    deduped.append(p)
                    if (gx, gy) not in grid:
                        grid[(gx, gy)] = []
                    grid[(gx, gy)].append((px, py))

            # Filter with polygon mask if provided
            if polygon_coords and len(polygon_coords) >= 3:
                all_detections = filter_points_by_polygon(deduped, polygon_coords)
            else:
                all_detections = deduped

        # Re-index IDs sequentially
        for i, p in enumerate(all_detections, 1):
            p["id"] = i

        return {
            "palms": all_detections,
            "total_count": len(all_detections),
            "bbox": (min_x, min_y, max_x, max_y),
            "roi_width": roi_w,
            "roi_height": roi_h
        }

def math_floor(x: float) -> int:
    import math
    return int(math.floor(x))

def math_ceil(x: float) -> int:
    import math
    return int(math.ceil(x))
