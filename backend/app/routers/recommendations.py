from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.models import CameraModel, AlertModel, RecommendationModel, ZoneModel, EventModel, User
from app.schemas import RecommendationResponse
from app.ai.fca_engine import fca_solver
from app.auth_utils import decode_access_token

router = APIRouter(prefix="/recommendations", tags=["Decision Support"])
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

@router.get("", response_model=List[RecommendationResponse])
def get_recommendations(
    camera_id: Optional[str] = None, 
    event_id: Optional[str] = None, 
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """Fetch decision recommendations derived exclusively from active cameras and alerts."""
    user = get_current_user_from_auth(auth, db)
    target_event_id = event_id

    if user and event_id:
        evt = db.query(EventModel).filter(EventModel.id == event_id).first()
        if evt and evt.manager_id and evt.manager_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You cannot read recommendations for an event owned by another account."
            )
    elif not target_event_id and user:
        evt = db.query(EventModel).filter(EventModel.manager_id == user.id).first()
        if evt:
            target_event_id = evt.id
        else:
            return []

    query = db.query(CameraModel).filter(CameraModel.enabled == True, CameraModel.status == "online")
    if target_event_id:
        query = query.filter(CameraModel.event_id == target_event_id)
    if camera_id:
        query = query.filter((CameraModel.id == camera_id) | (CameraModel.location == camera_id))
    
    cameras = query.all()
    if target_event_id:
        cam_names = [c.name for c in db.query(CameraModel).filter(CameraModel.event_id == target_event_id).all()]
        cam_ids = [c.id for c in db.query(CameraModel).filter(CameraModel.event_id == target_event_id).all()]
        zone_names = [z.name for z in db.query(ZoneModel).filter(ZoneModel.event_id == target_event_id).all()]
        zone_codes = [z.code for z in db.query(ZoneModel).filter(ZoneModel.event_id == target_event_id).all() if z.code]
        all_refs = set(cam_names + cam_ids + zone_names + zone_codes)
        alerts = db.query(AlertModel).filter(AlertModel.resolved == False, (AlertModel.camera.in_(all_refs)) | (AlertModel.zone.in_(all_refs))).all() if all_refs else []
        zones = db.query(ZoneModel).filter(ZoneModel.event_id == target_event_id).all()
    else:
        alerts = db.query(AlertModel).filter(AlertModel.resolved == False).all()
        zones = db.query(ZoneModel).all()

    if not cameras:
        # If no camera is currently analyzing, return existing stored recommendations or empty list
        if event_id:
            return db.query(RecommendationModel).filter(RecommendationModel.event_id == event_id).all()
        if camera_id:
            return db.query(RecommendationModel).filter(RecommendationModel.zone == camera_id).all()
        return db.query(RecommendationModel).all()
    
    cam_dicts = [c.__dict__ for c in cameras]
    alert_dicts = [a.__dict__ for a in alerts]
    zone_dicts = [z.__dict__ for z in zones]
    
    # Evaluate live FCA context to derive fresh concepts and decision recommendations
    objects, relation = fca_solver.build_formal_context(cam_dicts, alert_dicts, zone_dicts)
    concepts = fca_solver.derive_formal_concepts(objects, relation)
    fca_recs = fca_solver.generate_recommendations_from_fca(concepts, event_id=event_id)
    
    # Store any new FCA derived recommendations into database
    for fr in fca_recs:
        existing = db.query(RecommendationModel).filter(RecommendationModel.id == fr["id"]).first()
        if not existing:
            db.add(RecommendationModel(**fr))
    db.commit()

    if event_id:
        return db.query(RecommendationModel).filter(RecommendationModel.event_id == event_id).all()

    return db.query(RecommendationModel).all()

@router.post("/{rec_id}/approve")
def approve_recommendation(rec_id: str, db: Session = Depends(get_db)):
    rec = db.query(RecommendationModel).filter(RecommendationModel.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.status = "approved"
    db.commit()
    return {"id": rec.id, "status": "approved"}

@router.post("/{rec_id}/reject")
def reject_recommendation(rec_id: str, reason: Optional[str] = Body(None, embed=True), db: Session = Depends(get_db)):
    rec = db.query(RecommendationModel).filter(RecommendationModel.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.status = "rejected"
    rec.override_reason = reason or "Manual officer override"
    db.commit()
    return {"id": rec.id, "status": "rejected", "override_reason": rec.override_reason}

@router.post("/{rec_id}/dismiss")
def dismiss_recommendation(rec_id: str, db: Session = Depends(get_db)):
    rec = db.query(RecommendationModel).filter(RecommendationModel.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.status = "dismissed"
    db.commit()
    return {"id": rec.id, "status": "dismissed"}
