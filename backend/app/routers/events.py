from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import time

from app.database import get_db
from app.models import EventModel, ZoneModel, VenuePinModel, CameraModel
from app.schemas import EventCreate, EventUpdate, EventResponse

router = APIRouter(prefix="/events", tags=["Events"])

def init_default_events(db: Session):
    """Seed a default operational event if database has no events."""
    if db.query(EventModel).count() == 0:
        default_evt = EventModel(
            id="evt-arena-01",
            title="Smart City Arena Security Operation",
            venue_name="Smart City Arena & Convention Center",
            capacity=15000,
            staff=120,
            risk="medium",
            start_time="08:00 AM",
            end_time="11:00 PM",
            limits=12000,
            map_url="https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&q=80&w=1200"
        )
        db.add(default_evt)
        db.commit()

@router.get("", response_model=List[EventResponse])
def get_events(db: Session = Depends(get_db)):
    """Fetch user-created event records from database."""
    init_default_events(db)
    return db.query(EventModel).all()

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(evt: EventCreate, db: Session = Depends(get_db)):
    """Create event record in database."""
    evt_id = f"evt-{int(time.time() * 1000)}"
    db_evt = EventModel(
        id=evt_id,
        title=evt.title,
        venue_name=evt.venue_name or "Main Arena Complex",
        capacity=evt.capacity,
        staff=evt.staff or 20,
        risk=evt.risk or "medium",
        start_time=evt.start_time or "08:00 AM",
        end_time=evt.end_time or "08:00 PM",
        limits=evt.limits or int(evt.capacity * 0.85),
        map_url=evt.map_url
    )
    db.add(db_evt)
    db.commit()
    db.refresh(db_evt)
    return db_evt

@router.put("/{evt_id}", response_model=EventResponse)
def update_event(evt_id: str, evt_data: EventUpdate, db: Session = Depends(get_db)):
    """Update event attributes."""
    evt = db.query(EventModel).filter(EventModel.id == evt_id).first()
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    if evt_data.title is not None:
        evt.title = evt_data.title
    if evt_data.venue_name is not None:
        evt.venue_name = evt_data.venue_name
    if evt_data.capacity is not None:
        evt.capacity = evt_data.capacity
    if evt_data.staff is not None:
        evt.staff = evt_data.staff
    if evt_data.risk is not None:
        evt.risk = evt_data.risk
    if evt_data.start_time is not None:
        evt.start_time = evt_data.start_time
    if evt_data.end_time is not None:
        evt.end_time = evt_data.end_time
    if evt_data.limits is not None:
        evt.limits = evt_data.limits
    if evt_data.map_url is not None:
        evt.map_url = evt_data.map_url

    db.commit()
    db.refresh(evt)
    return evt

@router.delete("/{evt_id}")
def delete_event(evt_id: str, db: Session = Depends(get_db)):
    """Delete event record and clean dependent spatial entities."""
    evt = db.query(EventModel).filter(EventModel.id == evt_id).first()
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Safely clean dependent entities
    db.query(ZoneModel).filter(ZoneModel.event_id == evt_id).delete()
    db.query(VenuePinModel).filter(VenuePinModel.event_id == evt_id).delete()
    db.query(CameraModel).filter(CameraModel.event_id == evt_id).delete()
    db.delete(evt)
    db.commit()
    return {"message": "Event deleted successfully", "id": evt_id}
