from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models import CameraModel, ZoneModel
from app.schemas import HeatmapResponse
from app.ai.heatmap import heatmap_manager

router = APIRouter(prefix="/heatmap", tags=["Heatmap"])

@router.get("", response_model=HeatmapResponse)
def get_live_heatmap(
    cam_id: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    scope: str = Query("camera"), # camera, zone, area
    transparent: bool = Query(False),
    event_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    target_id = "area-wide"
    density = 0.0

    if scope == "zone" and zone_id:
        zone = db.query(ZoneModel).filter(ZoneModel.id == zone_id).first()
        gen = heatmap_manager.get_zone_generator(zone_id)
        target_id = zone.id if zone else zone_id
        density = zone.density if zone else 0.0
        base64_str = gen.generate_base64_heatmap(transparent_zero=transparent)

    elif scope == "area":
        gen = heatmap_manager.area_generator
        target_id = "area-wide"
        query_cams = db.query(CameraModel).filter(CameraModel.enabled == True, CameraModel.status == "online")
        if event_id:
            query_cams = query_cams.filter(CameraModel.event_id == event_id)
        analyzing_cams = query_cams.all()
        if not analyzing_cams:
            return {
                "camera_id": "none",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "peak_density": 0.0,
                "heatmap_base64": "",
                "image": ""
            }
        density = (sum(c.density for c in analyzing_cams) / len(analyzing_cams)) if analyzing_cams else 0.0
        base64_str = gen.generate_base64_heatmap(transparent_zero=transparent)

    else:
        # Camera scope
        if cam_id:
            cam = db.query(CameraModel).filter(CameraModel.id == cam_id).first()
            if cam and event_id and cam.event_id != event_id:
                cam = None
        else:
            q = db.query(CameraModel).filter(CameraModel.enabled == True, CameraModel.status == "online")
            if event_id:
                q = q.filter(CameraModel.event_id == event_id)
            cam = q.first()
            if not cam and not event_id:
                cam = db.query(CameraModel).first()

        target_id = cam.id if cam else "none"
        density = cam.density if cam else 0.0
        if cam:
            gen = heatmap_manager.get_camera_generator(cam.id)
            base64_str = gen.generate_base64_heatmap(transparent_zero=transparent)
        else:
            base64_str = ""

    return {
        "camera_id": target_id,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "peak_density": density,
        "heatmap_base64": base64_str,
        "image": base64_str
    }
