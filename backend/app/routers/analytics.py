from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models import CameraModel, AlertModel, CrowdAnalyticsModel, EventModel, User
from app.schemas import LiveStatusResponse
from app.ai.risk_engine import risk_engine
from app.ai.stream_processor import stream_manager
from app.auth_utils import decode_access_token

router = APIRouter(prefix="", tags=["Analytics & Status"])
security = HTTPBearer(auto_error=False)

def get_current_user_from_auth(auth: Optional[HTTPAuthorizationCredentials], db: Session) -> Optional[User]:
    if not auth or not auth.credentials:
        return None
    try:
        payload = decode_access_token(auth.credentials)
        if payload and payload.get("sub"):
            return db.query(User).filter(User.email == payload["sub"]).first()
    except Exception:
        pass
    return None

@router.get("/live-status", response_model=LiveStatusResponse)
def get_live_status(
    event_id: Optional[str] = Query(None),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_auth(auth, db)
    target_event_id = event_id

    if user and event_id:
        evt = db.query(EventModel).filter(EventModel.id == event_id).first()
        if evt and evt.manager_id and evt.manager_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You cannot read live status for an event owned by another account."
            )
    elif not target_event_id and user:
        evt = db.query(EventModel).filter(EventModel.manager_id == user.id).first()
        if evt:
            target_event_id = evt.id
        else:
            return {
                "system_status": "IDLE",
                "active_cameras": 0,
                "total_count": 0,
                "average_density": 0.0,
                "system_risk_level": "0% LOW",
                "timestamp": datetime.now().strftime("%H:%M:%S")
            }

    cam_query = db.query(CameraModel)
    if target_event_id:
        cam_query = cam_query.filter(CameraModel.event_id == target_event_id)
    cameras = cam_query.all()

    if target_event_id:
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
def get_crowd_analysis(
    camera_id: Optional[str] = Query(None),
    event_id: Optional[str] = Query(None),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """Fetch real crowd analytics query from MySQL crowd_analytics table without artificial multipliers."""
    user = get_current_user_from_auth(auth, db)
    target_event_id = event_id

    if user and event_id:
        evt = db.query(EventModel).filter(EventModel.id == event_id).first()
        if evt and evt.manager_id and evt.manager_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You cannot read crowd analysis for an event owned by another account."
            )
    elif not target_event_id and user:
        evt = db.query(EventModel).filter(EventModel.manager_id == user.id).first()
        if evt:
            target_event_id = evt.id
        else:
            return {
                "total_count": 0,
                "entry_rate_per_min": None,
                "exit_rate_per_min": None,
                "average_walking_speed_ms": 0.0,
                "flow_turbulence": 0.0,
                "speed_status": "Speed unavailable — no active event configured",
                "hourly_trend": [0] * 12
            }
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
            "flow_decomposition": {
                "X_neg": 0.0, "X_pos": 0.0, "Y_neg": 0.0, "Y_pos": 0.0, "lambda_out": 0.0, "avg_speed_mps": 0.0
            },
            "unique_tracked_window": 0,
            "cumulative_entries": 0,
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

    active_worker = None
    if camera_id and camera_id in stream_manager.workers:
        active_worker = stream_manager.workers[camera_id]
    elif active_cams:
        for c in active_cams:
            if c.id in stream_manager.workers:
                active_worker = stream_manager.workers[c.id]
                break

    flow_metrics = active_worker.flow_metrics if active_worker else {
        "X_neg": 0.0, "X_pos": 0.0, "Y_neg": 0.0, "Y_pos": 0.0, "lambda_out": 0.0, "avg_speed_mps": avg_speed
    }
    unique_window = active_worker.unique_window_count if active_worker else total_count
    cumulative_cnt = active_worker.cumulative_count if active_worker else total_count

    return {
        "total_count": total_count,
        "entry_rate_per_min": entry_rate,
        "exit_rate_per_min": exit_rate,
        "average_walking_speed_ms": avg_speed,
        "speed_status": "Speed unavailable — camera calibration required" if avg_speed == 0.0 else "Calibrated",
        "stagnation_points": [c.location for c in active_cams if (c.density or 0) > 75.0],
        "flow_decomposition": flow_metrics,
        "unique_tracked_window": unique_window,
        "cumulative_entries": cumulative_cnt,
        "hourly_trend": hourly_trend
    }
