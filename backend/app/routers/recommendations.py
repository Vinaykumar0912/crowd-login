from fastapi import APIRouter, Depends, HTTPException, Body, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional, Dict, Any, Set, Tuple

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.models import CameraModel, AlertModel, RecommendationModel, ZoneModel, EventModel, User, ZoneConnectionModel
from app.schemas import (
    RecommendationResponse,
    CrowdedAreaResult,
    PreventionPlanItem,
    PreventionPlanResponse,
    ResearchLatticeResponse,
    FCALatticeResponse,
    FCANode,
    FCALink
)
from app.ai.fca_engine import fca_solver, CROWD_ATTRIBUTES
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

def _run_research_fca_pipeline(
    db: Session,
    target_event_id: Optional[str] = None
) -> Tuple[List[Dict], Dict[str, Dict[str, float]], List[Dict], List[Dict], Dict[str, Any], List[Dict]]:
    """
    Executes the IEEE Access 2025 FCA pipeline:
    1. Fuzzy crowd context Kc and crowd lattice Lc
    2. Algorithm 1: Extract crowded areas CA
    3. Area connectivity context Ka and area lattice La
    4. Algorithm 2: Generate crowd prevention plan P
    """
    # Fetch cameras
    cam_q = db.query(CameraModel).filter(CameraModel.enabled == True, CameraModel.status == "online")
    if target_event_id:
        cam_q = cam_q.filter(CameraModel.event_id == target_event_id)
    cameras = cam_q.all()

    # Fetch zones
    zone_q = db.query(ZoneModel)
    if target_event_id:
        zone_q = zone_q.filter(ZoneModel.event_id == target_event_id)
    zones = zone_q.all()

    # Fetch alerts
    alert_q = db.query(AlertModel).filter(AlertModel.resolved == False)
    if target_event_id:
        alert_q = alert_q.filter(AlertModel.event_id == target_event_id)
    alerts = alert_q.all()

    # Fetch zone connections
    conn_q = db.query(ZoneConnectionModel)
    if target_event_id:
        conn_q = conn_q.filter(ZoneConnectionModel.event_id == target_event_id)
    connections = conn_q.all()

    cam_dicts = [c.__dict__ for c in cameras]
    zone_dicts = [z.__dict__ for z in zones]
    alert_dicts = [a.__dict__ for a in alerts]
    conn_dicts = [cn.__dict__ for cn in connections]

    # 1. Crowd Fuzzy Context Kc (Paper Definition 5)
    c_objects, Kc = fca_solver.build_fuzzy_crowd_context(zone_dicts, cam_dicts, alert_dicts)

    # 2. Crowd Lattice Lc (Paper Definition 7)
    # Threshold Kc at alpha = 0.5 for concept incidence
    binary_crowd_rel: Dict[str, Set[str]] = {}
    for obj, scores in Kc.items():
        binary_crowd_rel[obj] = set(k for k, v in scores.items() if v >= 0.5)
    crowd_concepts = fca_solver.derive_closed_concepts(c_objects, binary_crowd_rel, ["D", "P", "M", "E", "S"])

    # 3. Algorithm 1: Extract Crowded Areas (Paper p. 11, T = 0.7)
    CA = fca_solver.extract_crowded_areas(crowd_concepts, Kc, threshold=0.7)

    # 4. Area Formal Context Ka & Area Lattice La (Paper Definitions 4 & 6)
    a_objects, Ka = fca_solver.build_area_context(zone_dicts, conn_dicts)
    area_concepts = fca_solver.derive_closed_concepts(a_objects, Ka, a_objects)

    # Zone states dictionary for capacity checks
    zone_states: Dict[str, dict] = {}
    for z in zones:
        z_name = z.name or z.id
        zone_states[z_name] = {
            "capacity": z.capacity or 500,
            "density": z.density or 0.0,
            "current_count": z.current_count or 0
        }

    blocked_edges: Set[Tuple[str, str]] = set()
    for cn in connections:
        if cn.is_blocked:
            from_z = next((z.name for z in zones if z.id == cn.from_zone_id), cn.from_zone_id)
            to_z = next((z.name for z in zones if z.id == cn.to_zone_id), cn.to_zone_id)
            blocked_edges.add((from_z, to_z))
            if cn.bidirectional:
                blocked_edges.add((to_z, from_z))

    # 5. Algorithm 2: Crowd Prevention Plan P (Paper p. 12)
    plan_result = fca_solver.generate_crowd_prevention_plan(
        area_concepts, CA, zone_states=zone_states, blocked_edges=blocked_edges
    )

    # Legacy binary concepts for backward compatibility
    legacy_objects, legacy_rel = fca_solver.build_formal_context(cam_dicts, alert_dicts, zone_dicts)
    legacy_concepts = fca_solver.derive_formal_concepts(legacy_objects, legacy_rel)

    return crowd_concepts, Kc, CA, area_concepts, plan_result, legacy_concepts


@router.get("", response_model=List[RecommendationResponse])
def get_recommendations(
    camera_id: Optional[str] = None, 
    event_id: Optional[str] = None, 
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Fetch decision recommendations derived from live camera feeds, alerts,
    and FCA Algorithms 1 and 2 (IEEE Access 2025).
    """
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
    if not cameras:
        if event_id:
            return db.query(RecommendationModel).filter(RecommendationModel.event_id == event_id).all()
        if camera_id:
            return db.query(RecommendationModel).filter(RecommendationModel.zone == camera_id).all()
        return db.query(RecommendationModel).all()

    # Execute Research FCA Pipeline
    crowd_concepts, Kc, CA, area_concepts, plan_result, legacy_concepts = _run_research_fca_pipeline(db, target_event_id)

    # 1. Base legacy recommendations from closures
    recs = fca_solver.generate_recommendations_from_fca(legacy_concepts, event_id=target_event_id)

    # 2. Integrate Algorithm 2 crowd prevention subplans
    prefix = f"rec-fca-{target_event_id}" if target_event_id else "rec-fca"
    for plan in plan_result.get("plans", []):
        src_str = ", ".join(plan["crowded_sources"])
        dst_str = ", ".join(plan["recommended_destinations"])
        plan_rec_id = f"{prefix}-{plan['plan_id']}"
        recs.append({
            "id": plan_rec_id,
            "event_id": target_event_id,
            "title": f"FCA Mitigation Plan: Divert crowd from {src_str} to {dst_str}",
            "priority": "high",
            "reason": plan["reason"] + f" [Algorithm 2 Verified Route: Capacity={plan['mitigation_capacity']}]",
            "confidence": 96,
            "zone": plan["crowded_sources"][0] if plan["crowded_sources"] else "Monitored Zone",
            "officer": "On-Duty Operations Dispatch",
            "status": "pending"
        })

    # Store any new FCA derived recommendations into database
    for fr in recs:
        existing = db.query(RecommendationModel).filter(RecommendationModel.id == fr["id"]).first()
        if not existing:
            db.add(RecommendationModel(**fr))
    db.commit()

    if target_event_id:
        return db.query(RecommendationModel).filter(RecommendationModel.event_id == target_event_id).all()

    return db.query(RecommendationModel).all()


@router.get("/fca-lattice", response_model=ResearchLatticeResponse)
def get_fca_research_lattice(
    event_id: Optional[str] = None,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Returns both the Crowd Lattice Lc and Area Lattice La DAG structures,
    along with Algorithm 1 crowded areas and Algorithm 2 prevention plans.
    """
    user = get_current_user_from_auth(auth, db)
    target_event_id = event_id
    if user and not target_event_id:
        evt = db.query(EventModel).filter(EventModel.manager_id == user.id).first()
        if evt:
            target_event_id = evt.id

    crowd_concepts, Kc, CA, area_concepts, plan_result, legacy_concepts = _run_research_fca_pipeline(db, target_event_id)

    # Build Hasse diagram nodes & links for Crowd Lattice Lc
    c_nodes, c_links = fca_solver.build_lattice_graph(crowd_concepts)
    crowd_lattice_resp = {
        "objects": list(Kc.keys()),
        "attributes": CROWD_ATTRIBUTES,
        "nodes": c_nodes,
        "connections": [{"from": link["from"], "to": link["to"]} for link in c_links],
        "recommendations": []
    }

    # Build Hasse diagram nodes & links for Area Lattice La
    a_nodes, a_links = fca_solver.build_lattice_graph(area_concepts)
    area_lattice_resp = {
        "objects": list(Kc.keys()),
        "attributes": [{"key": k, "label": k, "weight": 1} for k in Kc.keys()],
        "nodes": a_nodes,
        "connections": [{"from": link["from"], "to": link["to"]} for link in a_links],
        "recommendations": []
    }

    return {
        "event_id": target_event_id,
        "crowd_lattice": crowd_lattice_resp,
        "area_lattice": area_lattice_resp,
        "fuzzy_context_summary": Kc,
        "crowded_areas": CA,
        "prevention_plans": plan_result.get("plans", [])
    }


@router.get("/crowded-areas", response_model=List[CrowdedAreaResult])
def get_crowded_areas(
    event_id: Optional[str] = None,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """Direct execution and retrieval of Algorithm 1: Extraction of Crowded Areas."""
    target_event_id = event_id
    user = get_current_user_from_auth(auth, db)
    if user and not target_event_id:
        evt = db.query(EventModel).filter(EventModel.manager_id == user.id).first()
        if evt:
            target_event_id = evt.id

    _, _, CA, _, _, _ = _run_research_fca_pipeline(db, target_event_id)
    return CA


@router.get("/prevention-plans", response_model=PreventionPlanResponse)
def get_prevention_plans(
    event_id: Optional[str] = None,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    """Direct execution and retrieval of Algorithm 2: Generation of Crowd Prevention Plan."""
    target_event_id = event_id
    user = get_current_user_from_auth(auth, db)
    if user and not target_event_id:
        evt = db.query(EventModel).filter(EventModel.manager_id == user.id).first()
        if evt:
            target_event_id = evt.id

    _, _, CA, _, plan_result, _ = _run_research_fca_pipeline(db, target_event_id)
    return {
        "event_id": target_event_id,
        "total_crowded_areas": plan_result.get("total_crowded_areas", 0),
        "resolved_count": plan_result.get("resolved_count", 0),
        "unresolved_areas": plan_result.get("unresolved_areas", []),
        "plans": plan_result.get("plans", []),
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }


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
