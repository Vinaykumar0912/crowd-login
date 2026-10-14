import cv2
import numpy as np
import base64
from typing import Dict, List, Optional

class HeatmapGenerator:
    def __init__(self, width: int = 640, height: int = 480):
        self.width = width
        self.height = height
        self.grid = np.zeros((height, width), dtype=np.float32)

    def accumulate_points(self, boxes: list):
        """
        Accumulates centroid coordinates from bounding boxes onto spatial grid.
        boxes: List of [x1, y1, x2, y2, conf]
        """
        # Decays old heat points slightly so dynamic movement reflects accurately
        self.grid *= 0.92

        for box in boxes:
            x1, y1, x2, y2 = box[:4]
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)
            
            if 0 <= cx < self.width and 0 <= cy < self.height:
                # Add Gaussian heat spot around centroid
                cv2.circle(self.grid, (cx, cy), 28, (1.0,), -1)

    def accumulate_normalized_point(self, norm_x: float, norm_y: float, weight: float = 1.0):
        """
        Accumulates relative percentage point (0.0 to 100.0) onto grid.
        Useful for area/venue-wide map accumulation.
        """
        self.grid *= 0.94
        cx = int((norm_x / 100.0) * self.width)
        cy = int((norm_y / 100.0) * self.height)
        if 0 <= cx < self.width and 0 <= cy < self.height:
            cv2.circle(self.grid, (cx, cy), 35, (float(weight),), -1)

    def generate_heatmap_overlay(self, base_image: np.ndarray = None) -> np.ndarray:
        """Generates colorized OpenCV JET colormap matrix."""
        # Normalize grid between 0 and 255
        norm_grid = cv2.normalize(self.grid, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        
        # Apply Gaussian Blur for smooth spatial gradients
        blurred = cv2.GaussianBlur(norm_grid, (31, 31), 0)
        
        # Apply JET Colormap (Blue = Low, Yellow = Medium, Red = High Density)
        heatmap_color = cv2.applyColorMap(blurred, cv2.COLORMAP_JET)

        if base_image is not None:
            base_resized = cv2.resize(base_image, (self.width, self.height))
            blended = cv2.addWeighted(base_resized, 0.5, heatmap_color, 0.5, 0)
            return blended

        return heatmap_color

    def generate_base64_heatmap(self, transparent_zero: bool = False) -> str:
        """Generates Base64 encoded JPEG/PNG string for frontend web display."""
        norm_grid = cv2.normalize(self.grid, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        blurred = cv2.GaussianBlur(norm_grid, (31, 31), 0)

        if transparent_zero:
            # Generate RGBA image where low-density background is transparent
            heatmap_color = cv2.applyColorMap(blurred, cv2.COLORMAP_JET)
            b, g, r = cv2.split(heatmap_color)
            # Alpha mask proportional to heat intensity
            alpha = np.clip(blurred * 1.4, 0, 255).astype(np.uint8)
            rgba = cv2.merge([b, g, r, alpha])
            _, buffer = cv2.imencode('.png', rgba)
            base64_str = base64.b64encode(buffer).decode('utf-8')
            return f"data:image/png;base64,{base64_str}"
        else:
            heatmap_color = cv2.applyColorMap(blurred, cv2.COLORMAP_JET)
            _, buffer = cv2.imencode('.jpg', heatmap_color, [cv2.IMWRITE_JPEG_QUALITY, 85])
            base64_str = base64.b64encode(buffer).decode('utf-8')
            return f"data:image/jpeg;base64,{base64_str}"


class MultiLevelHeatmapManager:
    """Manages Camera-level, Zone-level, and Area-level heatmaps."""
    def __init__(self):
        self.camera_generators: Dict[str, HeatmapGenerator] = {}
        self.zone_generators: Dict[str, HeatmapGenerator] = {}
        self.area_generator = HeatmapGenerator(width=800, height=600)

    def get_camera_generator(self, camera_id: str) -> HeatmapGenerator:
        if camera_id not in self.camera_generators:
            self.camera_generators[camera_id] = HeatmapGenerator()
        return self.camera_generators[camera_id]

    def get_zone_generator(self, zone_id: str) -> HeatmapGenerator:
        if zone_id not in self.zone_generators:
            self.zone_generators[zone_id] = HeatmapGenerator()
        return self.zone_generators[zone_id]

    def accumulate_camera_boxes(self, camera_id: str, boxes: list, zone_id: Optional[str] = None):
        gen = self.get_camera_generator(camera_id)
        gen.accumulate_points(boxes)

        if zone_id:
            zone_gen = self.get_zone_generator(zone_id)
            zone_gen.accumulate_points(boxes)

    def accumulate_area_pin(self, x_pct: float, y_pct: float, count: int):
        weight = min(3.0, max(0.5, count / 50.0))
        self.area_generator.accumulate_normalized_point(x_pct, y_pct, weight=weight)


heatmap_manager = MultiLevelHeatmapManager()
# Backward compatible global instance
global_heatmap_gen = heatmap_manager.area_generator
