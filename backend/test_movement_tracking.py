"""
Unit & Algorithmic Tests for Task 5 (Movement & Flow Analysis) and Task 6 (Tracking Reliability)
IEEE Access 2025 Base Paper:
- Equations (2): Horizontal flow components X^-, X^+
- Equations (3): Vertical flow components Y^-, Y^+
- Equation (4): Total outflow rate lambda_out = X^+ + X^- + Y^+ + Y^-
- Equation (5): Boundary inflow lambda_in
- Speed Calibration: Pixel displacement to physical m/s
- Tracking Reliability: Persistent IDs, bounded age (6 frames), isolated state, sliding window counting
"""

import unittest
import time
import numpy as np
from app.ai.detector import TemporalPersonTracker, Track

class TestMovementAndTrackingReliability(unittest.TestCase):
    def setUp(self):
        self.tracker = TemporalPersonTracker(max_prediction_frames=6, meters_per_pixel=0.05, fps=30.0)

    # =========================================================================
    # TASK 5: MOVEMENT & FLOW ANALYSIS (Equations 2, 3, 4, 5)
    # =========================================================================

    def test_flow_vector_equations_horizontal(self):
        """
        Verify Equation (2):
        X^- = sum(-v_xi if v_xi < 0) / sum(|v_xi|)
        X^+ = sum(v_xi if v_xi > 0) / sum(|v_xi|)
        X^- + X^+ == 1.0 when motion is present.
        """
        # Inject synthetic tracks with known horizontal velocities
        # Track 1: moving left, vx = -4.0
        # Track 2: moving left, vx = -6.0
        # Track 3: moving right, vx = +10.0
        # Total |vx| = |-4| + |-6| + |10| = 20.0
        # Expected X^- = (4 + 6) / 20 = 10 / 20 = 0.50
        # Expected X^+ = 10 / 20 = 0.50
        t1 = Track(1, [100, 100, 140, 180], 0.9, 1, time.time())
        t1.vx = -4.0
        t1.vy = 0.0

        t2 = Track(2, [200, 100, 240, 180], 0.9, 1, time.time())
        t2.vx = -6.0
        t2.vy = 0.0

        t3 = Track(3, [300, 100, 340, 180], 0.9, 1, time.time())
        t3.vx = 10.0
        t3.vy = 0.0

        self.tracker.tracks = {1: t1, 2: t2, 3: t3}
        metrics = self.tracker.compute_flow_metrics()

        self.assertAlmostEqual(metrics["X_neg"], 0.50, places=2)
        self.assertAlmostEqual(metrics["X_pos"], 0.50, places=2)
        self.assertAlmostEqual(metrics["X_neg"] + metrics["X_pos"], 1.0, places=2)

    def test_flow_vector_equations_vertical(self):
        """
        Verify Equation (3):
        Y^- = sum(-v_yi if v_yi < 0) / sum(|v_yi|)
        Y^+ = sum(v_yi if v_yi > 0) / sum(|v_yi|)
        """
        # Track 1: moving upward (negative Y in screen coords), vy = -8.0
        # Track 2: moving downward (positive Y in screen coords), vy = +2.0
        # Total |vy| = 8 + 2 = 10.0
        # Expected Y^- = 8 / 10 = 0.80
        # Expected Y^+ = 2 / 10 = 0.20
        t1 = Track(1, [100, 100, 140, 180], 0.9, 1, time.time())
        t1.vx = 0.0
        t1.vy = -8.0

        t2 = Track(2, [200, 100, 240, 180], 0.9, 1, time.time())
        t2.vx = 0.0
        t2.vy = 2.0

        self.tracker.tracks = {1: t1, 2: t2}
        metrics = self.tracker.compute_flow_metrics()

        self.assertAlmostEqual(metrics["Y_neg"], 0.80, places=2)
        self.assertAlmostEqual(metrics["Y_pos"], 0.20, places=2)

    def test_outflow_rate_lambda_out(self):
        """
        Verify Equation (4):
        lambda_out = X^+ + X^- + Y^+ + Y^-
        """
        t1 = Track(1, [100, 100, 140, 180], 0.9, 1, time.time())
        t1.vx = 5.0
        t1.vy = 5.0

        self.tracker.tracks = {1: t1}
        metrics = self.tracker.compute_flow_metrics()

        expected_lambda = metrics["X_pos"] + metrics["X_neg"] + metrics["Y_pos"] + metrics["Y_neg"]
        self.assertAlmostEqual(metrics["lambda_out"], expected_lambda, places=2)

    def test_speed_calibration_physical_units(self):
        """
        Verify physical speed conversion from pixel displacement to meters/sec:
        v_phys = avg_px_speed * meters_per_pixel * fps.
        """
        # Track moving at 10 pixels per frame.
        # With fps=30 and meters_per_pixel=0.05:
        # v_phys = 10 * 0.05 * 30 = 15.0 m/s.
        t1 = Track(1, [100, 100, 140, 180], 0.9, 1, time.time())
        t1.vx = 6.0
        t1.vy = 8.0  # hypot = 10.0 px/frame

        self.tracker.tracks = {1: t1}
        metrics = self.tracker.compute_flow_metrics()

        expected_speed = 10.0 * 0.05 * 30.0
        self.assertAlmostEqual(metrics["avg_speed_mps"], expected_speed, delta=0.5)

    # =========================================================================
    # TASK 6: TRACKING RELIABILITY & ISOLATION
    # =========================================================================

    def test_tracking_id_persistence_across_frames(self):
        """Verify that track ID persists across consecutive frames for moving detections."""
        t0 = time.time()
        # Frame 1: Detection at (100, 100, 150, 200)
        detections_f1 = [[100, 100, 150, 200, 0.95]]
        self.tracker.update_detections(detections_f1, det_seq=1, det_time=t0)

        active_tracks = list(self.tracker.tracks.values())
        self.assertEqual(len(active_tracks), 1)
        initial_id = active_tracks[0].track_id

        # Frame 2: Person moved slightly to (105, 102, 155, 202)
        detections_f2 = [[105, 102, 155, 202, 0.93]]
        self.tracker.update_detections(detections_f2, det_seq=2, det_time=t0 + 0.033)

        self.assertEqual(len(self.tracker.tracks), 1)
        self.assertIn(initial_id, self.tracker.tracks, "Track ID must persist across consecutive frames")

    def test_tracker_reset_clears_state(self):
        """Verify that tracker reset cleanly purges tracks and seen window."""
        self.tracker.update_detections([[50, 50, 90, 120, 0.88]], det_seq=1, det_time=time.time())
        self.assertGreater(len(self.tracker.tracks), 0)

        self.tracker.reset()
        self.assertEqual(len(self.tracker.tracks), 0)
        self.assertEqual(len(self.tracker.seen_ids_window), 0)
        self.assertEqual(self.tracker.last_flow_metrics["lambda_out"], 0.0)

    def test_camera_tracking_isolation(self):
        """Verify that separate tracker instances maintain complete state isolation (no leak)."""
        tracker_cam1 = TemporalPersonTracker()
        tracker_cam2 = TemporalPersonTracker()

        tracker_cam1.update_detections([[10, 10, 50, 80, 0.9]], det_seq=1, det_time=time.time())
        
        self.assertEqual(len(tracker_cam1.tracks), 1)
        self.assertEqual(len(tracker_cam2.tracks), 0, "Tracker 2 must not receive Tracker 1 state")

    def test_unique_sliding_window_counting(self):
        """Verify that unique track IDs are counted in a rolling time window and expired IDs are purged."""
        now = time.time()
        # Add 3 IDs at current time
        self.tracker.seen_ids_window = {
            1: now - 10.0,  # 10s old (inside 30s window)
            2: now - 20.0,  # 20s old (inside 30s window)
            3: now - 45.0   # 45s old (outside 30s window)
        }

        count = self.tracker.get_unique_window_count(window_seconds=30.0, current_time=now)
        self.assertEqual(count, 2, "Only IDs within last 30s should be counted")
        self.assertNotIn(3, self.tracker.seen_ids_window, "Expired ID must be purged")

if __name__ == "__main__":
    unittest.main()
