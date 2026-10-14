from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import time

from app.database import get_db
from app.models import SecurityStaffModel, InstructionLogModel
from app.schemas import SecurityStaffResponse, InstructionLogCreate, InstructionLogResponse

router = APIRouter(prefix="/staff", tags=["Security Staff & Communication"])

@router.get("", response_model=List[SecurityStaffResponse])
def get_security_staff(db: Session = Depends(get_db)):
    """Fetch security personnel records from database."""
    return db.query(SecurityStaffModel).all()

@router.get("/instructions", response_model=List[InstructionLogResponse])
def get_instruction_logs(db: Session = Depends(get_db)):
    """Fetch instruction logs from database."""
    return db.query(InstructionLogModel).order_by(InstructionLogModel.id.desc()).all()

@router.post("/instructions", response_model=InstructionLogResponse, status_code=status.HTTP_201_CREATED)
def create_instruction_log(data: InstructionLogCreate, db: Session = Depends(get_db)):
    """Create new dispatch instruction log in database."""
    inst_id = f"inst-{int(time.time() * 1000)}"
    timestamp_str = datetime.now().strftime("%H:%M:%S")

    db_inst = InstructionLogModel(
        id=inst_id,
        timestamp=timestamp_str,
        recipient=data.recipient,
        type=data.type or "individual",
        priority=data.priority or "normal",
        text=data.text,
        delivery_status="DELIVERED",
        read_status="READ"
    )
    db.add(db_inst)
    db.commit()
    db.refresh(db_inst)
    return db_inst
