import unittest
import numpy as np
import cv2
from engine.detector import PalmDetector, PRESETS
from engine.roi_utils import calculate_polygon_area, calculate_sph, filter_points_by_polygon
from engine.tiler import TiledProcessor

class TestPalmDetector(unittest.TestCase):

    def setUp(self):
        # Create a synthetic 500x500 green canopy image with 4 distinct bright tree crowns
        self.img = np.zeros((500, 500, 3), dtype=np.uint8)
        # Background: brown soil (B=40, G=70, R=110)
        self.img[:] = (40, 70, 110)

        # Plant 4 synthetic oil palms at known coordinates
        self.known_trees = [(120, 120), (380, 120), (120, 380), (380, 380)]
        for x, y in self.known_trees:
            # Outer green fronds (B=30, G=180, R=50)
            cv2.circle(self.img, (x, y), 35, (30, 180, 50), -1)
            # Bright apical bud / spear leaf (B=60, G=240, R=100)
            cv2.circle(self.img, (x, y), 10, (60, 240, 100), -1)

    def test_vegetation_index(self):
        detector = PalmDetector("mature")
        exg = detector.compute_vegetation_index(self.img, "exg")
        self.assertEqual(exg.shape, (500, 500))
        # Tree centers should have high ExG values
        for x, y in self.known_trees:
            self.assertGreater(exg[y, x], 150)

    def test_detection_count(self):
        detector = PalmDetector("mature")
        detections = detector.detect(
            self.img,
            blur_ksize=15,
            dilation_radius=20,
            min_distance_px=40,
            vegetation_threshold=60
        )
        self.assertEqual(len(detections), 4, f"Expected 4 trees, got {len(detections)}")

    def test_area_and_sph(self):
        # 100m x 100m square = 10,000 m2 = 1.0 Hectare
        # At GSD = 4.0 cm/px, 100m = 2,500 px
        poly = [(0, 0), (2500, 0), (2500, 2500), (0, 2500)]
        res = calculate_polygon_area(poly, gsd_cm_per_pixel=4.0)
        self.assertAlmostEqual(res["area_hectares"], 1.0, places=2)

        sph_info = calculate_sph(136, res["area_hectares"])
        self.assertEqual(sph_info["sph"], 136.0)
        self.assertIn("Optimal", sph_info["status"])

    def test_filter_points_by_polygon(self):
        points = [
            {"id": 1, "x": 100, "y": 100},
            {"id": 2, "x": 400, "y": 400},
            {"id": 3, "x": 900, "y": 900}, # outside
        ]
        poly = [(0, 0), (500, 0), (500, 500), (0, 500)]
        filtered = filter_points_by_polygon(points, poly)
        self.assertEqual(len(filtered), 2)
        self.assertEqual([p["id"] for p in filtered], [1, 2])

if __name__ == "__main__":
    unittest.main()
