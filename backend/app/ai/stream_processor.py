import cv2
import time
import threading
import numpy as np
import os
import math
from typing import Optional, Dict, Any, List

from app.ai.detector import detector, TemporalPersonTracker, SimpleCentroidTracker
from app.ai.density import CrowdDensityEvaluator
from app.ai.risk_engine import risk_engine
from app.ai.heatmap import global_heatmap_gen

class CameraStreamWorker:
    """
    Decoupled AI video detection & temporal tracking pipeline:
    - VIDEO PLAYBACK LOOP: Plays video sequentially at source video's natural FPS (e.g. 24-30 FPS)
      without waiting for YOLO inference. Tracks and overlays current valid tracks on every playback frame.
    - BACKGROUND YOLO INFERENCE LOOP: Asynchronously executes YOLO person detection on freshest
      available video frames, continuously updating the per-camera TemporalPersonTracker.
    - TEMPORAL TRACKER SAFEGUARD: Strictly bounds prediction age to 6 frames (~250ms), dropping stale boxes.
    """
    def __init__(self, camera_id: str, source: str, source_type: str = "rtsp", capacity: int = 200, event_id: str = "evt-1790793930112"):
        self.camera_id = camera_id
        self.event_id = event_id
        self.source = source
        self.source_type = source_type
        self.capacity = capacity
        
        self.is_running = False
        self.is_paused = False
        self.playback_status = "ready"
        self.error_message = None
        
        self.playback_thread = None
        self.inference_thread = None
        
        self.source_fps = 30.0
        self.processing_fps = 0.0
        self.playback_fps = 30.0
        self.last_count = 0
        self.yolo_detection_count = 0
        self.tracker_track_count = 0
        self.render_track_count = 0
        self.last_density = 0.0
        self.last_risk = "LOW"
        self.last_flow_rate = 0.0
        self.last_speed_avg = 0.0
        self.prev_centroids: List[tuple] = []
        self.latest_boxes: List = []
        self.active_tracks: List = []
        self.last_annotated_frame = None
        self.frame_seq = 0
        self.last_detection_frame_seq = 0
        self.last_detection_age_frames = 0
        self.last_observation_timestamp = time.time()
        
        # Threading coordination
        self.state_lock = threading.Lock()
        self.frame_cond = threading.Condition()
        self.pending_frame_data = None  # (frame, frame_seq, timestamp)
        
        # Dedicated per-camera temporal tracker bounded strictly to 6 frames
        self.tracker = TemporalPersonTracker(max_prediction_frames=6)

    @property
    def worker_thread(self):
        return self.playback_thread

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.is_paused = False
        self.playback_status = "playing"
        self.error_message = None

        self.playback_thread = threading.Thread(target=self._playback_loop, daemon=True)
        self.inference_thread = threading.Thread(target=self._inference_loop, daemon=True)
        self.playback_thread.start()
        self.inference_thread.start()
        print(f"[CAMERA][START] Camera ID: {self.camera_id} | Event: {self.event_id} | Type: {self.source_type} | Source: {self.source}")

    def pause(self):
        self.is_paused = True
        self.playback_status = "paused"
        print(f"[CAMERA][PAUSE] Camera ID: {self.camera_id} paused.")

    def resume(self):
        self.is_paused = False
        self.playback_status = "playing"
        print(f"[CAMERA][RESUME] Camera ID: {self.camera_id} resumed.")

    def stop(self):
        self.is_running = False
        self.playback_status = "stopped"
        with self.frame_cond:
            self.frame_cond.notify_all()
        self.tracker.reset()
        print(f"[CAMERA][STOP] Camera ID: {self.camera_id} stopped and tracker reset.")

    def _playback_loop(self):
        """
        Playback loop: delivers frames strictly at the source video's natural FPS.
        Decoupled from YOLO inference to eliminate playback slowdowns.
        Continuously updates TemporalPersonTracker on each playback frame.
        """
        cap = None
        try:
            if str(self.source).isdigit():
                cap = cv2.VideoCapture(int(self.source))
            else:
                cap = cv2.VideoCapture(self.source)
        except Exception:
            cap = None

        if cap is not None and cap.isOpened():
            fps_val = cap.get(cv2.CAP_PROP_FPS)
            if fps_val and fps_val > 0:
                self.source_fps = round(float(fps_val), 1)
            print(f"[CAMERA][CONNECTED] Camera ID: {self.camera_id} | Source: {self.source} | Source FPS: {self.source_fps}")
        else:
            print(f"[CAMERA][ERROR] Camera ID: {self.camera_id} | Could not open {self.source}")
            self.playback_status = "error"
            self.error_message = f"VIDEO SOURCE ERROR: Could not open camera source '{self.source}'"
            self.is_running = False
            with self.frame_cond:
                self.frame_cond.notify_all()
            return

        target_interval = 1.0 / max(1.0, self.source_fps)
        next_frame_time = time.perf_counter()
        last_playback_tick = time.perf_counter()
        playback_frame_count = 0

        while self.is_running:
            if self.is_paused:
                time.sleep(0.05)
                next_frame_time = time.perf_counter()
                continue

            ret, frame = cap.read()
            if not ret or frame is None:
                if self.source_type in ["video", "uploaded_video"]:
                    # Clean loop to start of uploaded CCTV video
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    # CRITICAL: Reset per-camera tracker temporal state on loop
                    self.tracker.reset()
                    with self.state_lock:
                        self.prev_centroids = []
                        self.latest_boxes = []
                        self.active_tracks = []
                    ret_loop, frame_loop = cap.read()
                    if ret_loop and frame_loop is not None:
                        frame = frame_loop
                        next_frame_time = time.perf_counter()
                        print(f"[AI-E2E][LOOP] Camera {self.camera_id} looped to start. Tracker state reset successfully.")
                    else:
                        print(f"[CAMERA][EOF] Camera ID: {self.camera_id} reached end of video stream.")
                        self.playback_status = "stopped"
                        self.is_running = False
                        with self.frame_cond:
                            self.frame_cond.notify_all()
                        break
                else:
                    time.sleep(0.02)
                    continue

            self.frame_seq += 1
            now_t = time.time()
            self.last_observation_timestamp = now_t
            playback_frame_count += 1

            # Measure real-time playback FPS
            if playback_frame_count >= 30:
                dt_p = time.perf_counter() - last_playback_tick
                if dt_p > 0:
                    self.playback_fps = round(playback_frame_count / dt_p, 1)
                playback_frame_count = 0
                last_playback_tick = time.perf_counter()

            # Dispatch freshest frame to background YOLO inference thread
            with self.frame_cond:
                self.pending_frame_data = (frame.copy(), self.frame_seq, now_t)
                self.frame_cond.notify()

            # Update tracker on current playback frame using optical flow and velocity estimation
            active_tracks = self.tracker.track_frame(frame, self.frame_seq, now_t)
            # active_tracks: [x1, y1, x2, y2, conf, track_id, det_seq, age_frames]

            with self.state_lock:
                self.active_tracks = active_tracks
                self.tracker_track_count = len(active_tracks)
                self.render_track_count = len(active_tracks)
                current_count = self.last_count if self.last_count > 0 else len(active_tracks)
                if active_tracks:
                    self.last_detection_age_frames = active_tracks[0][7] if len(active_tracks[0]) > 7 else 0
                else:
                    self.last_detection_age_frames = 0

            # Draw active tracked bounding boxes onto this exact current frame
            # If no active tracks (or expired > 6 frames), draw_annotations draws clean frame without boxes
            annotated = detector.draw_annotations(frame, active_tracks, current_count)
            self.last_annotated_frame = annotated

            # Rate-limited structured diagnostic logging
            if self.frame_seq % 60 == 0:
                print(f"[AI-E2E][PLAYBACK] camera_id={self.camera_id} event_id={self.event_id} frame_seq={self.frame_seq} yolo_count={self.yolo_detection_count} track_count={self.tracker_track_count} render_count={self.render_track_count} age_frames={self.last_detection_age_frames} playback_fps={self.playback_fps} infer_fps={self.processing_fps}")

            # Precision pacing to match source video's original FPS
            next_frame_time += target_interval
            sleep_duration = next_frame_time - time.perf_counter()
            if sleep_duration > 0:
                time.sleep(sleep_duration)
            elif sleep_duration < -0.1:
                # If behind schedule by more than 100ms, resync clock
                next_frame_time = time.perf_counter()

        if cap is not None:
            cap.release()

    def _inference_loop(self):
        """
        Background YOLO inference worker:
        Runs independently at its natural processing speed (~15-25 FPS).
        Continuously updates latest_boxes, count, density, heatmap, and feeds tracker.
        """
        while self.is_running:
            frame_data = None
            with self.frame_cond:
                while self.pending_frame_data is None and self.is_running:
                    self.frame_cond.wait(timeout=0.05)
                if not self.is_running:
                    break
                frame_data = self.pending_frame_data
                self.pending_frame_data = None

            if frame_data is None:
                continue

            frame_to_detect, infer_seq, infer_time = frame_data

            # 1. Run YOLO person detection on the captured frame using configured conf_threshold
            conf_thresh = getattr(detector, "conf_threshold", 0.20)
            boxes, count, infer_ms = detector.detect_frame(frame_to_detect, conf_threshold=conf_thresh, imgsz=480)

            # 2. Feed ground-truth detections to per-camera TemporalPersonTracker
            self.tracker.update_detections(boxes, infer_seq, infer_time)

            # 3. Calculate density and risk from current YOLO result
            density = CrowdDensityEvaluator.calculate_density(count, self.capacity)
            _, risk, _ = risk_engine.calculate_camera_risk(density, density)

            # 4. Processing FPS calculation
            instant_fps = 1000.0 / max(1.0, infer_ms)
            if self.processing_fps <= 0.0:
                new_proc_fps = round(instant_fps, 1)
            else:
                new_proc_fps = round(0.8 * self.processing_fps + 0.2 * instant_fps, 1)

            # 5. Centroids for flow calculation
            curr_centroids = [((b[0] + b[2]) // 2, (b[1] + b[3]) // 2) for b in boxes]
            if self.prev_centroids and curr_centroids:
                displacements = []
                for cx, cy in curr_centroids:
                    min_dist = min([math.hypot(cx - px, cy - py) for px, py in self.prev_centroids])
                    if min_dist < 100:
                        displacements.append(min_dist)
                flow_rate = round(float(len(displacements) * 0.5), 1) if displacements else 0.0
            else:
                flow_rate = 0.0

            # 6. Thread-safe state update
            with self.state_lock:
                self.latest_boxes = boxes
                self.yolo_detection_count = count
                self.last_count = count
                self.last_density = density
                self.last_risk = risk
                self.processing_fps = new_proc_fps
                self.prev_centroids = curr_centroids
                self.last_flow_rate = flow_rate
                self.last_detection_frame_seq = infer_seq

            # Accumulate spatial points into global heatmap
            global_heatmap_gen.accumulate_points(boxes)

            if infer_seq % 60 == 0 or infer_seq < 5:
                print(f"[AI-E2E][INFERENCE] camera_id={self.camera_id} event_id={self.event_id} infer_seq={infer_seq} yolo_count={count} infer_ms={infer_ms:.1f} infer_fps={new_proc_fps} conf_thresh={conf_thresh}")


class ActiveStreamManager:
    """Manages active camera stream workers for IP cameras, Webcams, and Uploaded Videos."""
    def __init__(self):
        self.workers: Dict[str, CameraStreamWorker] = {}

    def get_or_create_worker(self, camera_id: str, source: str, source_type: str, capacity: int = 200, event_id: str = None) -> CameraStreamWorker:
        if camera_id not in self.workers:
            worker = CameraStreamWorker(camera_id, source, source_type, capacity, event_id or "evt-1790793930112")
            worker.start()
            self.workers[camera_id] = worker
        elif not self.workers[camera_id].is_running:
            self.workers[camera_id].start()
        return self.workers[camera_id]

    def stop_worker(self, camera_id: str):
        if camera_id in self.workers:
            self.workers[camera_id].stop()
            del self.workers[camera_id]

stream_manager = ActiveStreamManager()
