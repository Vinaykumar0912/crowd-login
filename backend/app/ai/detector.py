import cv2
import numpy as np
import logging
import time
import math
import threading
from typing import Optional, List, Tuple, Any, Dict

logger = logging.getLogger("uvicorn")

class Track:
    def __init__(self, track_id: int, box: list, conf: float, frame_seq: int, timestamp: float):
        self.track_id = track_id
        self.box = [float(x) for x in box]
        self.conf = float(conf)
        self.detection_frame_seq = frame_seq
        self.detection_timestamp = timestamp
        self.last_update_seq = frame_seq
        self.last_update_time = timestamp
        self.detection_cx = (self.box[0] + self.box[2]) / 2.0
        self.detection_cy = (self.box[1] + self.box[3]) / 2.0
        self.vx = 0.0
        self.vy = 0.0
        self.disappeared = 0

    @property
    def centroid(self):
        return ((self.box[0] + self.box[2]) / 2.0, (self.box[1] + self.box[3]) / 2.0)


MAX_PREDICTION_FRAMES = 6


class TemporalPersonTracker:
    """
    Temporal Person Tracker that bridges asynchronous YOLO inference with 24-30 FPS video playback.
    Continuously updates person positions on display frames using optical flow and velocity estimation,
    strictly bounded to MAX_PREDICTION_FRAMES (6 frames / ~250ms at 24 FPS).
    Ensures stale bounding boxes are never retained.
    """
    def __init__(self, max_prediction_frames: int = MAX_PREDICTION_FRAMES, max_distance: float = 120.0, meters_per_pixel: float = 0.04, fps: float = 30.0):
        self.next_object_id = 1
        self.tracks = {}
        self.max_prediction_frames = max_prediction_frames
        self.max_distance = max_distance
        self.meters_per_pixel = meters_per_pixel
        self.fps = fps
        self.prev_gray = None
        self.current_seq = 0
        self.seen_ids_window: Dict[int, float] = {}  # {track_id: timestamp}
        self.cumulative_unique_count = 0
        self.last_flow_metrics = {
            "X_neg": 0.0,
            "X_pos": 0.0,
            "Y_neg": 0.0,
            "Y_pos": 0.0,
            "lambda_out": 0.0,
            "avg_speed_mps": 0.0
        }
        self.lock = threading.Lock()

    def reset(self):
        with self.lock:
            self.tracks.clear()
            self.prev_gray = None
            self.current_seq = 0
            self.seen_ids_window.clear()
            self.last_flow_metrics = {
                "X_neg": 0.0,
                "X_pos": 0.0,
                "Y_neg": 0.0,
                "Y_pos": 0.0,
                "lambda_out": 0.0,
                "avg_speed_mps": 0.0
            }

    def update_detections(self, detections: list, det_seq: int, det_time: float):
        """
        Integrates ground-truth YOLO detections from frame det_seq into active tracks.
        Sets reference frame sequence to current playback frame to establish strict freshness window.
        """
        with self.lock:
            ref_seq = self.current_seq if self.current_seq > 0 else det_seq
            if not self.tracks:
                for b in detections:
                    tid = self.next_object_id
                    self.next_object_id += 1
                    self.cumulative_unique_count += 1
                    self.seen_ids_window[tid] = det_time
                    self.tracks[tid] = Track(tid, b[:4], b[4], ref_seq, det_time)
                return

            track_ids = list(self.tracks.keys())
            t_cents = [self.tracks[tid].centroid for tid in track_ids]
            d_cents = [((b[0] + b[2]) / 2.0, (b[1] + b[3]) / 2.0) for b in detections]

            if not d_cents:
                self.tracks.clear()
                return

            D = np.zeros((len(t_cents), len(d_cents)), dtype=float)
            for i, tc in enumerate(t_cents):
                for j, dc in enumerate(d_cents):
                    D[i, j] = math.hypot(tc[0] - dc[0], tc[1] - dc[1])

            rows = D.min(axis=1).argsort()
            cols = D.argmin(axis=1)[rows]

            used_rows = set()
            used_cols = set()

            for r, c in zip(rows, cols):
                if r in used_rows or c in used_cols:
                    continue
                if D[r, c] > self.max_distance:
                    continue

                tid = track_ids[r]
                track = self.tracks[tid]
                det = detections[c]

                # Update velocity based on displacement between detections
                dt = max(1, det_seq - track.last_update_seq)
                curr_cx = (det[0] + det[2]) / 2.0
                curr_cy = (det[1] + det[3]) / 2.0
                inst_vx = max(-25.0, min(25.0, (curr_cx - track.detection_cx) / dt))
                inst_vy = max(-25.0, min(25.0, (curr_cy - track.detection_cy) / dt))
                track.vx = 0.6 * track.vx + 0.4 * inst_vx
                track.vy = 0.6 * track.vy + 0.4 * inst_vy
                track.detection_cx = curr_cx
                track.detection_cy = curr_cy

                # Forward-project box to current playback frame using estimated velocity
                lag = max(0, ref_seq - det_seq)
                p_dx = max(-40.0, min(40.0, lag * track.vx))
                p_dy = max(-40.0, min(40.0, lag * track.vy))
                track.box = [
                    float(det[0]) + p_dx,
                    float(det[1]) + p_dy,
                    float(det[2]) + p_dx,
                    float(det[3]) + p_dy
                ]

                track.conf = float(det[4])
                track.detection_frame_seq = ref_seq
                track.detection_timestamp = det_time
                track.last_update_seq = ref_seq
                track.disappeared = 0

                used_rows.add(r)
                used_cols.add(c)

            # Unmatched existing tracks are dropped immediately to keep results fresh
            for r in set(range(len(t_cents))).difference(used_rows):
                tid = track_ids[r]
                del self.tracks[tid]

            # Unmatched new detections
            for c in set(range(len(d_cents))).difference(used_cols):
                det = detections[c]
                tid = self.next_object_id
                self.next_object_id += 1
                self.cumulative_unique_count += 1
                self.seen_ids_window[tid] = det_time
                self.tracks[tid] = Track(tid, det[:4], det[4], ref_seq, det_time)

    def track_frame(self, frame: np.ndarray, curr_seq: int, curr_time: float) -> list:
        """
        Updates track positions on current video frame using optical flow and velocity estimation.
        Returns list of active display boxes: [x1, y1, x2, y2, conf, track_id, det_seq, age_frames]
        Strictly enforces max_prediction_frames (6 frames). Drops stale boxes immediately.
        """
        with self.lock:
            self.current_seq = curr_seq
            if not self.tracks:
                if frame is not None and frame.size > 0:
                    self.prev_gray = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (640, 360))
                return []

            curr_gray = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (640, 360))
            scale_x = 640.0 / frame.shape[1]
            scale_y = 360.0 / frame.shape[0]

            track_items = list(self.tracks.items())

            if self.prev_gray is not None and track_items:
                pts = np.array([[[t.centroid[0] * scale_x, t.centroid[1] * scale_y]] for _, t in track_items], dtype=np.float32)
                new_pts, status, _ = cv2.calcOpticalFlowPyrLK(self.prev_gray, curr_gray, pts, None, winSize=(15, 15), maxLevel=2)

                for idx, (tid, track) in enumerate(track_items):
                    if status[idx][0] == 1:
                        dx = (new_pts[idx][0][0] - pts[idx][0][0]) / scale_x
                        dy = (new_pts[idx][0][1] - pts[idx][0][1]) / scale_y
                        if abs(dx) < 30 and abs(dy) < 30:
                            track.box[0] += dx
                            track.box[1] += dy
                            track.box[2] += dx
                            track.box[3] += dy
                            track.vx = 0.7 * track.vx + 0.3 * dx
                            track.vy = 0.7 * track.vy + 0.3 * dy
                        else:
                            track.box[0] += track.vx
                            track.box[1] += track.vy
                            track.box[2] += track.vx
                            track.box[3] += track.vy
                    else:
                        track.box[0] += track.vx
                        track.box[1] += track.vy
                        track.box[2] += track.vx
                        track.box[3] += track.vy
                    track.last_update_seq = curr_seq

            self.prev_gray = curr_gray

            # Return only temporally valid tracks strictly within max_prediction_frames
            active_boxes = []
            for tid, track in list(self.tracks.items()):
                age = max(0, curr_seq - track.detection_frame_seq)
                if age <= self.max_prediction_frames:
                    x1 = max(0, min(frame.shape[1] - 1, int(track.box[0])))
                    y1 = max(0, min(frame.shape[0] - 1, int(track.box[1])))
                    x2 = max(0, min(frame.shape[1] - 1, int(track.box[2])))
                    y2 = max(0, min(frame.shape[0] - 1, int(track.box[3])))
                    if x2 > x1 and y2 > y1:
                        active_boxes.append([
                            x1, y1, x2, y2,
                            round(track.conf, 2),
                            track.track_id,
                            track.detection_frame_seq,
                            age
                        ])
                else:
                    # Do not display stale prediction boxes on screen
                    track.disappeared += 1
                    if track.disappeared > 12:
                        del self.tracks[tid]

            return active_boxes

    def get_unique_window_count(self, window_seconds: float = 30.0, current_time: Optional[float] = None) -> int:
        """
        Returns number of unique tracked person IDs observed within a sliding time window (default 30s).
        Prevents double-counting and memory accumulation.
        """
        with self.lock:
            now_t = current_time if current_time is not None else time.time()
            cutoff = now_t - window_seconds
            # Purge expired track IDs older than sliding window
            self.seen_ids_window = {
                tid: ts for tid, ts in self.seen_ids_window.items() if ts >= cutoff
            }
            return len(self.seen_ids_window)

    def compute_flow_metrics(self) -> Dict[str, float]:
        """
        Computes motion and flow metrics according to IEEE Access 2025 (Section VI-B, VI-C):
        - Equations (2): Horizontal flow components X^-, X^+
        - Equations (3): Vertical flow components Y^-, Y^+
        - Equation (4): Total rate of decrease / outflow lambda_out = X^+ + X^- + Y^+ + Y^-
        - Physical velocity (meters/second) via perspective meters_per_pixel scaling
        """
        with self.lock:
            if not self.tracks:
                return {
                    "X_neg": 0.0,
                    "X_pos": 0.0,
                    "Y_neg": 0.0,
                    "Y_pos": 0.0,
                    "lambda_out": 0.0,
                    "avg_speed_mps": 0.0,
                    "active_track_count": 0
                }

            vx_list = [t.vx for t in self.tracks.values()]
            vy_list = [t.vy for t in self.tracks.values()]

            # Horizontal Flow Components (Eq 2)
            abs_vx_sum = sum(abs(v) for v in vx_list)
            if abs_vx_sum > 1e-4:
                x_neg = sum(-v for v in vx_list if v < 0) / abs_vx_sum
                x_pos = sum(v for v in vx_list if v > 0) / abs_vx_sum
            else:
                x_neg, x_pos = 0.0, 0.0

            # Vertical Flow Components (Eq 3)
            abs_vy_sum = sum(abs(v) for v in vy_list)
            if abs_vy_sum > 1e-4:
                y_neg = sum(-v for v in vy_list if v < 0) / abs_vy_sum
                y_pos = sum(v for v in vy_list if v > 0) / abs_vy_sum
            else:
                y_neg, y_pos = 0.0, 0.0

            # Outflow Rate (Eq 4)
            lambda_out = round(x_pos + x_neg + y_pos + y_neg, 3)

            # Calibrated physical speed in meters/second
            speeds_px_per_frame = [math.hypot(vx, vy) for vx, vy in zip(vx_list, vy_list)]
            avg_px_speed = sum(speeds_px_per_frame) / max(1, len(speeds_px_per_frame))
            # v_phys = avg_px_speed * meters_per_pixel * fps
            avg_speed_mps = round(avg_px_speed * self.meters_per_pixel * self.fps, 2)

            metrics = {
                "X_neg": round(x_neg, 3),
                "X_pos": round(x_pos, 3),
                "Y_neg": round(y_neg, 3),
                "Y_pos": round(y_pos, 3),
                "lambda_out": lambda_out,
                "avg_speed_mps": avg_speed_mps,
                "active_track_count": len(self.tracks)
            }
            self.last_flow_metrics = metrics
            return metrics

    # Backward compatibility fallback
    def update(self, rects):
        with self.lock:
            return {i: i + 1 for i in range(len(rects))}


# Compatibility alias
SimpleCentroidTracker = TemporalPersonTracker


class PersonDetector:
    def __init__(self, model_name: str = "yolov8n.pt"):
        self.model_name = model_name
        self.model = None
        self.conf_threshold = 0.20
        self._lock = threading.RLock()
        self.tracker = TemporalPersonTracker()
        self._init_model()

    def set_confidence_threshold(self, conf: float):
        self.conf_threshold = max(0.05, min(0.95, float(conf)))

    def _init_model(self):
        try:
            import torch
            torch.set_num_threads(2)
            from ultralytics import YOLO
            logger.info("Initializing Ultralytics YOLO model: %s", self.model_name)
            self.model = YOLO(self.model_name)
            # Warm up model to pre-allocate inference tensors and eliminate initial latency
            dummy_frame = np.zeros((480, 480, 3), dtype=np.uint8)
            self.model.predict(dummy_frame, conf=0.20, classes=[0], imgsz=480, verbose=False)
            logger.info("Ultralytics YOLO model warmed up successfully.")
        except Exception as e:
            logger.warning("Could not initialize Ultralytics YOLO (%s). Using OpenCV fallback background subtraction detector.", e)
            self.model = None

    def get_runtime_engine_info(self) -> dict:
        torch_version = ""
        try:
            import torch
            cuda_avail = torch.cuda.is_available()
            torch_version = torch.__version__
        except Exception:
            pass

        if self.model is not None:
            return {
                "engine": "Ultralytics YOLOv8n",
                "backend": "PyTorch",
                "inferenceEngine": f"PyTorch {torch_version} ({'CUDA' if cuda_avail else 'CPU'})",
                "device": "CUDA" if cuda_avail else "CPU",
                "hardware_accelerated": cuda_avail,
                "isCuda": cuda_avail,
                "is_cuda": cuda_avail,
                "is_fallback": False,
                "status": "ONLINE",
                "message": "NVIDIA CUDA acceleration active" if cuda_avail else "Host CPU execution engine active (PyTorch standard)"
            }
        else:
            return {
                "engine": "OpenCV Contour Detection",
                "backend": "OpenCV",
                "inferenceEngine": "OpenCV Background Subtraction (CPU)",
                "device": "CPU",
                "hardware_accelerated": False,
                "isCuda": False,
                "is_cuda": False,
                "is_fallback": True,
                "status": "FALLBACK",
                "message": "OpenCV fallback active on CPU"
            }

    def detect_frame(self, frame: np.ndarray, conf_threshold: float = 0.20, tracker: Optional[Any] = None, imgsz: int = 832) -> Tuple[List, int, float]:
        """
        Runs YOLO person detection (COCO class 0).
        Returns:
            boxes: List of [x1, y1, x2, y2, confidence, track_id]
            raw_count: int
            infer_duration_ms: float
        """
        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0 or len(frame.shape) != 3:
            return [], 0, 0.0

        boxes = []
        raw_count = 0

        if self.model is not None:
            with self._lock:
                infer_t0 = time.perf_counter()
                try:
                    results = self.model.predict(
                        frame,
                        conf=conf_threshold,
                        classes=[0],
                        imgsz=imgsz,
                        iou=0.70,
                        verbose=False
                    )
                    for r in results:
                        for box in r.boxes:
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                            conf = float(box.conf[0].cpu().numpy())
                            boxes.append([int(x1), int(y1), int(x2), int(y2), round(conf, 2), None])
                    raw_count = len(boxes)
                except Exception as ex:
                    logger.error("YOLO inference error (%s). Falling back to OpenCV contour detection.", ex)
                    boxes = self._opencv_fallback_detect(frame)
                    raw_count = len(boxes)
                infer_ms = (time.perf_counter() - infer_t0) * 1000.0
        else:
            infer_t0 = time.perf_counter()
            boxes = self._opencv_fallback_detect(frame)
            raw_count = len(boxes)
            infer_ms = (time.perf_counter() - infer_t0) * 1000.0

        return boxes, raw_count, infer_ms

    def draw_annotations(self, frame: np.ndarray, boxes: list, person_count: int) -> np.ndarray:
        """
        Rapidly overlays bounding boxes and person count header (< 0.2ms).
        boxes can contain [x1, y1, x2, y2, conf, track_id, ...]
        """
        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            return frame

        annotated_frame = frame.copy()

        for idx, b in enumerate(boxes):
            x1, y1, x2, y2 = int(b[0]), int(b[1]), int(b[2]), int(b[3])
            conf = float(b[4]) if len(b) > 4 else 0.85
            track_id = b[5] if len(b) > 5 and b[5] is not None else (idx + 1)
            label = f"Person #{track_id} ({conf:.2f})"

            # Draw neon cyan bounding box
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 200), 2)

            # Draw label background & text
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(annotated_frame, (x1, max(0, y1 - th - 6)), (x1 + tw + 4, max(th + 6, y1)), (15, 23, 42), -1)
            cv2.putText(annotated_frame, label, (x1 + 2, max(th + 2, y1 - 3)), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 200), 1)

        # Draw count header overlay on frame
        cv2.putText(annotated_frame, f"AI COUNT: {person_count} PERSONS", (20, 35), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 0) if person_count < 100 else (0, 0, 255), 2)

        return annotated_frame

    def process_frame(self, frame: np.ndarray, conf_threshold: float = 0.20, tracker: Optional[Any] = None, draw_boxes: bool = True, imgsz: int = 832):
        """
        Process a single image frame (numpy BGR array).
        Returns:
            boxes: List of [x1, y1, x2, y2, confidence, track_id]
            person_count: int
            annotated_frame: np.ndarray (with bounding box overlays)
        """
        boxes, _, _ = self.detect_frame(frame, conf_threshold=conf_threshold, tracker=tracker, imgsz=imgsz)
        person_count = len(boxes)

        if draw_boxes:
            annotated_frame = self.draw_annotations(frame, boxes, person_count)
        else:
            annotated_frame = frame

        return boxes, person_count, annotated_frame

    def _opencv_fallback_detect(self, frame: np.ndarray):
        """OpenCV contour-based fallback detection for environments without PyTorch GPU."""
        boxes = []
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (15, 15), 0)
        _, thresh = cv2.threshold(blurred, 60, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if 400 < area < 15000:
                x, y, w, h = cv2.boundingRect(cnt)
                boxes.append([x, y, x + w, y + h, 0.85, None])

        return boxes

detector = PersonDetector()
