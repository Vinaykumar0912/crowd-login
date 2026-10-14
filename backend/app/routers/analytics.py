from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models import CameraModel, AlertModel, CrowdAnalyticsModel
from app.schemas import LiveStatusResponse
from app.ai.risk_engine import risk_engine

router = APIRouter(prefix="", tags=["Analytics & Status"])

@router.get("/live-status", response_model=LiveStatusResponse)
def get_live_status(event_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    cam_query = db.query(CameraModel)
    if event_id:
        cam_query = cam_query.filter(CameraModel.event_id == event_id)
    cameras = cam_query.all()

    if event_id:
        cam_names = [c.name for c in cameras]
        cam_ids = [c.id for c in cameras]
        all_refs = set(cam_names + cam_ids)
        alerts = db.query(AlertModel).filter(AlertModel.camera.in_(all_refs)).all() if all_refs else []
    else:
        alerts = db.query(AlertModel).all()

    cam_dicts = [c.__dict__ for c in cameras]
    alert_dicts = [a.__dict__ for a in alerts]

    active_cams = [c for c in cameras if c.enabled and c.status == "online" and c.playback_status in ["analyzing", "playing"]]
    total_count = sum(c.count for c in active_cams) if active_cams else 0
    avg_density = (sum(c.density for c in active_cams) / len(active_cams)) if active_cams else 0.0

    if active_cams:
        risk_score, category = risk_engine.evaluate_system_risk(cam_dicts, alert_dicts)
        system_risk_str = f"{risk_score}% {category}"
    else:
        system_risk_str = "0% LOW"

    return {
        "system_status": "ONLINE" if active_cams else "IDLE",
        "active_cameras": len(active_cams),
        "total_count": total_count,
        "average_density": round(avg_density, 1),
        "system_risk_level": system_risk_str,
        "timestamp": datetime.now().strftime("%H:%M:%S")
    }

@router.get("/crowd-analysis")
def get_crowd_analysis(camera_id: Optional[str] = Query(None), event_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Fetch real crowd analytics query from MySQL crowd_analytics table without artificial multipliers."""
    if camera_id and event_id:
        cam = db.query(CameraModel).filter(CameraModel.id == camera_id).first()
        if cam and cam.event_id != event_id:
            return {
                "total_count": 0,
                "entry_rate_per_min": None,
                "exit_rate_per_min": None,
                "average_walking_speed_ms": 0.0,
                "speed_status": "Speed unavailable — camera calibration required",
                "stagnation_points": [],
                "hourly_trend": []
            }

    query = db.query(CameraModel).filter(CameraModel.enabled == True, CameraModel.status == "online", CameraModel.playback_status.in_(["analyzing", "playing"]))
    if event_id:
        query = query.filter(CameraModel.event_id == event_id)
    if camera_id:
        query = query.filter(CameraModel.id == camera_id)
    
    active_cams = query.all()

    # Query actual historical analytics rows from crowd_analytics table
    analytics_query = db.query(CrowdAnalyticsModel)
    if event_id:
        analytics_query = analytics_query.filter(CrowdAnalyticsModel.event_id == event_id)
    if camera_id:
        analytics_query = analytics_query.filter(CrowdAnalyticsModel.camera_id == camera_id)
    
    rows = analytics_query.order_by(CrowdAnalyticsModel.timestamp.desc()).limit(100).all()

    if not active_cams and not rows:
        return {
            "total_count": 0,
            "entry_rate_per_min": None,
            "exit_rate_per_min": None,
            "average_walking_speed_ms": 0.0,
            "speed_status": "Speed unavailable — camera calibration required",
            "stagnation_points": [],
            "hourly_trend": []
        }

    total_count = active_cams[0].count if active_cams else (rows[0].count if rows else 0)
    
    speeds = [r.speed_avg for r in rows if r.speed_avg is not None and r.speed_avg > 0]
    avg_speed = round(sum(speeds) / len(speeds), 1) if speeds else 0.0

    hourly_trend = [
        {
            "timestamp": r.timestamp.strftime("%H:%M:%S") if hasattr(r.timestamp, "strftime") else str(r.timestamp),
            "camera_id": r.camera_id,
            "count": r.count,
            "density_pct": r.density_pct,
            "risk_level": r.risk_level,
            "flow_rate": r.flow_rate,
            "speed_avg": r.speed_avg
        } for r in reversed(rows)
    ]

    # Entry/Exit boundary tracking: If boundary line is unconfigured, return None (null in JSON)
    entry_rate = None
    exit_rate = None

    return {
        "total_count": total_count,
        "entry_rate_per_min": entry_rate,
        "exit_rate_per_min": exit_rate,
        "average_walking_speed_ms": avg_speed,
        "speed_status": "Speed unavailable — camera calibration required" if avg_speed == 0.0 else "Calibrated",
        "stagnation_points": [c.location for c in active_cams if (c.density or 0) > 75.0],
        "hourly_trend": hourly_trend
    }
