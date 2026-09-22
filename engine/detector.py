import cv2
import numpy as np
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple, Optional

@dataclass
class DetectionPreset:
    name: str
    blur_ksize: int
    dilation_radius: int
    min_distance_px: int
    vegetation_threshold: int
    peak_prominence: int = 5
    index_type: str = "exg"

PRESETS = {
    "mature": DetectionPreset(
        name="Mature Palm (TM / Tanaman Menghasilkan)",
        blur_ksize=31,
        dilation_radius=33,
        min_distance_px=68,
        vegetation_threshold=75,
        peak_prominence=4,
        index_type="exg"
    ),
    "young": DetectionPreset(
        name="Young Palm (TBM / Tanaman Belum Menghasilkan)",
        blur_ksize=19,
        dilation_radius=21,
        min_distance_px=46,
        vegetation_threshold=70,
        peak_prominence=5,
        index_type="exg"
    ),
    "custom": DetectionPreset(
        name="Custom Parameters",
        blur_ksize=25,
        dilation_radius=27,
        min_distance_px=55,
        vegetation_threshold=72,
        peak_prominence=4,
        index_type="exg"
    )
}

class PalmDetector:
    """
    High-Precision Drone Agri-Vision Detector for Oil Palm (Elaeis guineensis) crowns.
    Utilizes vegetation index decomposition, apical bud peak isolation via morphological
    dilation, and spatial Non-Maximum Suppression (NMS).
    """

    def __init__(self, preset: Optional[str] = "mature"):
        if preset and preset in PRESETS:
            self.config = PRESETS[preset]
        else:
            self.config = PRESETS["mature"]

    @staticmethod
    def compute_vegetation_index(image_bgr: np.ndarray, index_type: str = "exg") -> np.ndarray:
        """
        Compute normalized (0-255 uint8) vegetation index from BGR aerial image.
        """
        b = image_bgr[:, :, 0].astype(np.float32)
        g = image_bgr[:, :, 1].astype(np.float32)
        r = image_bgr[:, :, 2].astype(np.float32)

        if index_type == "vari":
            # Visible Atmospherically Resistant Index: (G - R) / (G + R - B + eps)
            denom = g + r - b
            denom[denom == 0] = 1e-5
            idx = (g - r) / denom
        elif index_type == "gli":
            # Green Leaf Index: (2G - R - B) / (2G + R + B + eps)
            denom = 2 * g + r + b
            denom[denom == 0] = 1e-5
            idx = (2 * g - r - b) / denom
        else:
            # Excess Green Index (ExG): 2G - R - B
            idx = 2 * g - r - b

        # Normalize to 0-255
        idx_norm = cv2.normalize(idx, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        return idx_norm

    def detect(
        self,
        image_bgr: np.ndarray,
        blur_ksize: Optional[int] = None,
        dilation_radius: Optional[int] = None,
        min_distance_px: Optional[int] = None,
        vegetation_threshold: Optional[int] = None,
        index_type: Optional[str] = None,
        mask: Optional[np.ndarray] = None,
        offset_x: int = 0,
        offset_y: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Execute palm crown detection on an image patch or full orthophoto tile.
        Returns list of detected palms with global coordinates, crown radius, and confidence score.
        """
        ksize = blur_ksize if blur_ksize is not None else self.config.blur_ksize
        # Ensure ksize is odd and positive
        if ksize % 2 == 0:
            ksize += 1
        ksize = max(3, ksize)

        dil_r = dilation_radius if dilation_radius is not None else self.config.dilation_radius
        dil_ksize = max(3, dil_r * 2 + 1)

        min_dist = min_distance_px if min_distance_px is not None else self.config.min_distance_px
        min_dist_sq = max(5, min_dist) ** 2

        veg_thresh = vegetation_threshold if vegetation_threshold is not None else self.config.vegetation_threshold
        idx_t = index_type if index_type is not None else self.config.index_type

        # 1. Compute Vegetation Index Map
        veg_map = self.compute_vegetation_index(image_bgr, index_type=idx_t)

        # 2. Gaussian smoothing to consolidate canopy fronds into a central crown apex
        smoothed = cv2.GaussianBlur(veg_map, (ksize, ksize), 0)

        # 3. Morphological Dilation Peak Isolation
        se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dil_ksize, dil_ksize))
        dilated = cv2.dilate(smoothed, se)

        # 4. Peaks are local maxima where smoothed equals dilated and above green threshold
        peak_mask = (smoothed == dilated) & (smoothed >= veg_thresh)

        if mask is not None:
            peak_mask = peak_mask & (mask > 0)

        ys, xs = np.where(peak_mask)
        if len(xs) == 0:
            return []

        # 5. Extract candidate points and sort by peak intensity (prominence)
        candidates = []
        for x, y in zip(xs, ys):
            score = float(smoothed[y, x])
            candidates.append((int(x), int(y), score))
            
        candidates.sort(key=lambda item: item[2], reverse=True)

        # 6. Fast Spatial Non-Maximum Suppression (NMS) with 2D Grid Binning
        cell_size = max(5, min_dist)
        grid: Dict[Tuple[int, int], List[Tuple[int, int]]] = {}
        accepted_local: List[Tuple[int, int, float]] = []

        for cx, cy, cscore in candidates:
            gx, gy = cx // cell_size, cy // cell_size
            too_close = False
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    neighbor_cell = (gx + dx, gy + dy)
                    if neighbor_cell in grid:
                        for ax, ay in grid[neighbor_cell]:
                            if (cx - ax) ** 2 + (cy - ay) ** 2 < min_dist_sq:
                                too_close = True
                                break
                    if too_close:
                        break
                if too_close:
                    break

            if not too_close:
                accepted_local.append((cx, cy, cscore))
                if (gx, gy) not in grid:
                    grid[(gx, gy)] = []
                grid[(gx, gy)].append((cx, cy))

        # 7. Package detections with global offsets and crown radius estimates
        detected_palms = []
        estimated_crown_radius = max(15, int(min_dist * 0.45))

        for idx, (lx, ly, score) in enumerate(accepted_local, 1):
            # Scale-invariant crown health grading based on Green Leaf Index (GLI) at apex
            # GLI = (2G - R - B) / (2G + R + B + eps), which is invariant to tile NORM_MINMAX
            wy1 = max(0, int(ly) - 2)
            wy2 = min(image_bgr.shape[0], int(ly) + 3)
            wx1 = max(0, int(lx) - 2)
            wx2 = min(image_bgr.shape[1], int(lx) + 3)
            patch = image_bgr[wy1:wy2, wx1:wx2].astype(np.float32)
            
            b_mean = float(np.mean(patch[:, :, 0]))
            g_mean = float(np.mean(patch[:, :, 1]))
            r_mean = float(np.mean(patch[:, :, 2]))
            denom = 2.0 * g_mean + r_mean + b_mean + 1e-5
            gli = (2.0 * g_mean - r_mean - b_mean) / denom

            if gli >= 0.08 or score >= 88:
                health_status = "healthy"
                health_label = "Optimal Green"
            elif gli >= 0.02 or score >= 68:
                health_status = "stressed"
                health_label = "Mild Chlorosis"
            else:
                health_status = "critical"
                health_label = "Defoliated / Stunted"

            detected_palms.append({
                "id": idx,
                "x": int(lx + offset_x),
                "y": int(ly + offset_y),
                "local_x": int(lx),
                "local_y": int(ly),
                "radius": estimated_crown_radius,
                "confidence": round(min(1.0, score / 255.0), 3),
                "peak_intensity": int(score),
                "health_status": health_status,
                "health_label": health_label
            })

        return detected_palms

    @staticmethod
    def draw_annotations(
        image_bgr: np.ndarray,
        detections: List[Dict[str, Any]],
        circle_color: Tuple[int, int, int] = (0, 255, 0),
        center_color: Tuple[int, int, int] = (0, 0, 255),
        show_numbers: bool = True,
        thickness: int = 2,
        offset_x: int = 0,
        offset_y: int = 0
    ) -> np.ndarray:
        """
        Overlay numbered circle markers and apex crosshairs onto image.
        """
        annotated = image_bgr.copy()
        h, w = annotated.shape[:2]

        for p in detections:
            # Map global coordinate to local image coordinate if offsets applied
            x = int(p.get("local_x", p["x"] - offset_x))
            y = int(p.get("local_y", p["y"] - offset_y))
            r = int(p.get("radius", 25))
            pid = p.get("id", "")

            if 0 <= x < w and 0 <= y < h:
                # Outer crown circle
                cv2.circle(annotated, (x, y), r, circle_color, thickness, cv2.LINE_AA)
                # Apical bud center point
                cv2.circle(annotated, (x, y), 3, center_color, -1, cv2.LINE_AA)

                if show_numbers and pid:
                    text = str(pid)
                    cv2.putText(
                        annotated,
                        text,
                        (x - 12, max(15, y - r - 4)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.42,
                        (255, 255, 255),
                        1,
                        cv2.LINE_AA
                    )

        return annotated


# ---------------------------------------------------------------------------
# FEATURE A: Planting Row Bearing Detector
# ---------------------------------------------------------------------------
def detect_row_bearing(palms: List[Dict[str, Any]], max_neighbour_dist: float = 200.0) -> Dict[str, Any]:
    """
    Detect the dominant planting row azimuth (bearing) of a palm stand by analysing
    the angle histogram of all short inter-palm vectors.

    Returns dict with:
        row_bearing_deg  – dominant bearing in [0, 180) degrees (symmetric axes)
        row_confidence   – 0.0–1.0 quality score (peak prominence ratio in histogram)
        secondary_deg    – secondary orthogonal bearing (perpendicular row/column axis)
    """
    if len(palms) < 4:
        return {"row_bearing_deg": 0.0, "row_confidence": 0.0, "secondary_deg": 90.0}

    pts = np.array([[p["x"], p["y"]] for p in palms], dtype=np.float32)

    angles = []
    for i in range(len(pts)):
        diffs = pts - pts[i]           # vectors from palm i to all others
        dists = np.hypot(diffs[:, 0], diffs[:, 1])
        mask = (dists > 0) & (dists < max_neighbour_dist)
        if not np.any(mask):
            continue
        near_diffs = diffs[mask]
        raw_angles = np.degrees(np.arctan2(near_diffs[:, 1], near_diffs[:, 0]))
        # Fold to [0, 180) — rows are symmetric axes, not rays
        sym_angles = raw_angles % 180.0
        angles.extend(sym_angles.tolist())

    if len(angles) < 3:
        return {"row_bearing_deg": 0.0, "row_confidence": 0.0, "secondary_deg": 90.0}

    # Build histogram with 1° resolution
    hist, bins = np.histogram(angles, bins=180, range=(0, 180))
    # Smooth with a 5° window to reduce noise
    from numpy.lib.stride_tricks import sliding_window_view
    kernel = np.ones(5) / 5.0
    hist_smooth = np.convolve(hist.astype(float), kernel, mode='same')

    peak_idx = int(np.argmax(hist_smooth))
    dominant_bearing = float(bins[peak_idx] + 0.5)

    # Confidence: peak height vs mean height ratio
    mean_val = float(np.mean(hist_smooth)) or 1.0
    confidence = min(1.0, float(hist_smooth[peak_idx]) / (mean_val * 3.0))

    # Secondary axis is perpendicular (90° offset, wrapped)
    secondary = (dominant_bearing + 90.0) % 180.0

    return {
        "row_bearing_deg": round(dominant_bearing, 1),
        "row_confidence": round(confidence, 3),
        "secondary_deg": round(secondary, 1)
    }


# ---------------------------------------------------------------------------
# FEATURE B: Palm Age / Maturity Class Estimator
# ---------------------------------------------------------------------------
# Crown diameter thresholds in metres (GSD-normalised)
# TBM (Tanaman Belum Menghasilkan) < 3.0m diameter
# Immature  3.0 – 5.5m
# Mature TM 5.5 – 9.5m
# Old / Senescent > 9.5m
_AGE_THRESHOLDS_M = [3.0, 5.5, 9.5]
_AGE_LABELS = ["TBM (Young)", "Immature (3–5yr)", "Mature TM", "Old / Senescent"]
_AGE_COLORS = ["#60a5fa", "#34d399", "#22c55e", "#a3e635"]   # blue, mint, green, lime

def classify_age_summary(palms: List[Dict[str, Any]], gsd_cm: float = 4.0) -> Dict[str, Any]:
    """
    Classify each palm by crown diameter (radius_px * 2 * gsd_cm / 100 metres)
    into age/maturity tiers and return a summary dictionary.
    """
    gsd_m = gsd_cm / 100.0
    counts = [0, 0, 0, 0]

    per_palm = []
    for p in palms:
        r_px = p.get("radius", 0) or 0
        diameter_m = r_px * 2.0 * gsd_m
        if diameter_m < _AGE_THRESHOLDS_M[0]:
            tier = 0
        elif diameter_m < _AGE_THRESHOLDS_M[1]:
            tier = 1
        elif diameter_m < _AGE_THRESHOLDS_M[2]:
            tier = 2
        else:
            tier = 3
        counts[tier] += 1
        per_palm.append({"id": p.get("id"), "age_tier": tier, "age_label": _AGE_LABELS[tier]})

    total = len(palms) or 1
    classes = []
    for i, (label, color, count) in enumerate(zip(_AGE_LABELS, _AGE_COLORS, counts)):
        classes.append({
            "label": label,
            "count": count,
            "pct": round(count / total * 100, 1),
            "color": color
        })

    dominant_tier = int(np.argmax(counts))
    return {
        "classes": classes,
        "dominant_class": _AGE_LABELS[dominant_tier],
        "total": total,
        "per_palm": per_palm
    }
