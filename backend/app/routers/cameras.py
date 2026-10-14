import time
import os
import shutil
import cv2
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import CameraModel
from app.schemas import CameraCreate, CameraUpdate, CameraResponse
from app.ai.stream_processor import stream_manager

router = APIRouter(prefix="/cameras", tags=["Cameras"])

UPLOAD_VIDEOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "videos")
os.makedirs(UPLOAD_VIDEOS_DIR, exist_ok=True)

def _ensure_default_cameras(db: Session):
    if db.query(CameraModel).count() == 0:
        default_cams = [
            CameraModel(id="cam-01", name="CAM-01 - North Gate", rtsp_url="rtsp://arena.internal/cam01", location="North Gate", zone_id="zone-evt-arena-01-1", event_id="evt-arena-01", status="ready", enabled=False, playback_status="ready", resolution="1920x1080", fps=30, last_active="Ready for analysis", capacity=500, count=0, density=0.0, risk="low", health="green", source_type="rtsp", source_fps=30.0, processing_fps=30.0),
            CameraModel(id="cam-02", name="CAM-02 - West Entry", rtsp_url="rtsp://arena.internal/cam02", location="West Entry", zone_id="zone-evt-arena-01-1", event_id="evt-arena-01", status="ready", enabled=False, playback_status="ready", resolution="1920x1080", fps=30, last_active="Ready for analysis", capacity=500, count=0, density=0.0, risk="low", health="green", source_type="rtsp", source_fps=30.0, processing_fps=30.0),
            CameraModel(id="cam-03", name="CAM-03 - Main Arena", rtsp_url="rtsp://arena.internal/cam03", location="Main Arena", zone_id="zone-evt-arena-01-2", event_id="evt-arena-01", status="ready", enabled=False, playback_status="ready", resolution="1920x1080", fps=30, last_active="Ready for analysis", capacity=1500, count=0, density=0.0, risk="low", health="green", source_type="rtsp", source_fps=30.0, processing_fps=30.0),
            CameraModel(id="cam-04", name="CAM-04 - South Emergency Exit", rtsp_url="rtsp://arena.internal/cam04", location="South Emergency Exit", zone_id="zone-evt-arena-01-3", event_id="evt-arena-01", status="ready", enabled=False, playback_status="ready", resolution="1920x1080", fps=30, last_active="Ready for analysis", capacity=400, count=0, density=0.0, risk="low", health="green", source_type="rtsp", source_fps=30.0, processing_fps=30.0),
            CameraModel(id="cam-05", name="CAM-05 - Backstage", rtsp_url="rtsp://arena.internal/cam05", location="Backstage", zone_id="zone-evt-arena-01-4", event_id="evt-arena-01", status="ready", enabled=False, playback_status="ready", resolution="1920x1080", fps=30, last_active="Ready for analysis", capacity=200, count=0, density=0.0, risk="low", health="green", source_type="rtsp", source_fps=30.0, processing_fps=30.0),
            CameraModel(id="cam-06", name="CAM-06 - East Entry", rtsp_url="rtsp://arena.internal/cam06", location="East Entry", zone_id="zone-evt-arena-01-1", event_id="evt-arena-01", status="ready", enabled=False, playback_status="ready", resolution="1920x1080", fps=30, last_active="Ready for analysis", capacity=500, count=0, density=0.0, risk="low", health="green", source_type="rtsp", source_fps=30.0, processing_fps=30.0),
        ]
        db.add_all(default_cams)
        db.commit()

@router.get("", response_model=List[CameraResponse])
def get_cameras(event_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch camera records directly from database, optionally filtered by event_id."""
    _ensure_default_cameras(db)
    query = db.query(CameraModel)
    if event_id:
        query = query.filter(CameraModel.event_id == event_id)
    return query.all()

@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
def create_camera(cam: CameraCreate, db: Session = Depends(get_db)):
    """Register new IP/RTSP camera record in READY status (Requires user to click ANALYZE)."""
    cam_id = f"cam-{int(time.time() * 1000)}"
    
    db_cam = CameraModel(
        id=cam_id,
        name=cam.name,
        rtsp_url=cam.rtsp_url,
        location=cam.location,
        zone_id=cam.zone_id,
        event_id=cam.event_id,
        status="ready",
        enabled=False,
        resolution=cam.resolution or "1920x1080",
        fps=cam.fps or 30,
        last_active="Ready for analysis",
        capacity=cam.capacity or 200,
        count=0,
        density=0.0,
        risk="low",
        health="green",
        source_type="rtsp",
        source_fps=30.0,
        processing_fps=30.0,
        playback_status="ready"
    )
    db.add(db_cam)
    db.commit()
    db.refresh(db_cam)

    print(f"[CAMERA][REGISTERED] Camera ID: {cam_id} | Name: {cam.name} | Status: READY")
    return db_cam

@router.post("/webcam", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
def add_webcam_camera(
    name: Optional[str] = Form("Web Camera 01"),
    location: Optional[str] = Form("Local Station"),
    capacity: Optional[int] = Form(100),
    zone_id: Optional[str] = Form(None),
    event_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Register PC/Laptop Live Webcam in READY status."""
    cam_id = f"cam-webcam-{int(time.time() * 1000)}"
    
    db_cam = CameraModel(
        id=cam_id,
        name=name,
        rtsp_url="0",
        location=location,
        zone_id=zone_id,
        event_id=event_id,
        status="ready",
        enabled=False,
        resolution="1280x720",
        fps=30,
        last_active="Ready for analysis",
        capacity=capacity,
        count=0,
        density=0.0,
        risk="low",
        health="green",
        source_type="webcam",
        source_fps=30.0,
        processing_fps=30.0,
        playback_status="ready"
    )
    db.add(db_cam)
    db.commit()
    db.refresh(db_cam)

    print(f"[CAMERA][WEBCAM REGISTERED] Camera ID: {cam_id} | Name: {name} | Status: READY")
    return db_cam

@router.post("/upload-video", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def upload_video_camera(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    location: Optional[str] = Form("Uploaded Video Source"),
    capacity: Optional[int] = Form(200),
    zone_id: Optional[str] = Form(None),
    event_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload CCTV video file (MP4, AVI, MOV, MKV) and create virtual camera record in READY status."""
    cam_id = f"cam-vid-{int(time.time() * 1000)}"
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext not in [".mp4", ".avi", ".mov", ".mkv"]:
        raise HTTPException(status_code=400, detail="Unsupported video format. Allowed: MP4, AVI, MOV, MKV")

    filename = f"{cam_id}{ext}"
    file_path = os.path.join(UPLOAD_VIDEOS_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    camera_name = name if name and name.strip() else f"CCTV Footage ({file.filename})"

    db_cam = CameraModel(
        id=cam_id,
        name=camera_name,
        rtsp_url=file_path,
        location=location,
        zone_id=zone_id,
        event_id=event_id,
        status="ready",
        enabled=False,
        resolution="1920x1080",
        fps=30,
        last_active="Ready for analysis",
        capacity=capacity,
        count=0,
        density=0.0,
        risk="low",
        health="green",
        source_type="video",
        source_fps=30.0,
        processing_fps=30.0,
        playback_status="ready"
    )
    db.add(db_cam)
    db.commit()
    db.refresh(db_cam)

    print(f"[VIDEO][VIRTUAL CAMERA CREATED] Video: {file.filename} | Camera ID: {cam_id} | Name: {camera_name} | Status: READY")
    return db_cam

@router.get("/{cam_id}/stream")
def stream_camera_video(cam_id: str, db: Session = Depends(get_db)):
    """Live MJPEG video stream displaying actual CCTV frames with real-time YOLO person detection and tracking overlays."""
    cam = db.query(CameraModel).filter(CameraModel.id == cam_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    worker = stream_manager.workers.get(cam_id)
    if not worker:
        worker = stream_manager.get_or_create_worker(
            cam_id, cam.rtsp_url, cam.source_type or "video", cam.capacity or 200
        )

    def generate_frames():
        target_delay = 1.0 / max(1.0, worker.source_fps)
        last_seq = -1
        while True:
            if not worker.is_running:
                break
            if worker.last_annotated_frame is not None and worker.frame_seq != last_seq:
                last_seq = worker.frame_seq
                ret, jpeg = cv2.imencode('.jpg', worker.last_annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            time.sleep(min(0.015, target_delay / 2.0))

    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@router.post("/{cam_id}/analyze", response_model=CameraResponse)
def analyze_camera(cam_id: str, db: Session = Depends(get_db)):
    """Explicitly start AI analysis pipeline for camera."""
    cam = db.query(CameraModel).filter(CameraModel.id == cam_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    cam.playback_status = "analyzing"
    cam.status = "online"
    cam.enabled = True
    cam.last_active = "Just now"

    worker = stream_manager.workers.get(cam_id)
    if worker:
        worker.resume()
    else:
        stream_manager.get_or_create_worker(cam_id, cam.rtsp_url, cam.source_type, cam.capacity)

    db.commit()
    db.refresh(cam)
    print(f"[CAMERA][ANALYZE] Camera ID: {cam_id} | Name: {cam.name} | Status: ANALYZING")
    return cam

@router.put("/{cam_id}/playback", response_model=CameraResponse)
def control_camera_playback(cam_id: str, action: str, db: Session = Depends(get_db)):
    """Control camera/video playback (analyze, play, pause, stop, restart)."""
    cam = db.query(CameraModel).filter(CameraModel.id == cam_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    worker = stream_manager.workers.get(cam_id)

    if action in ["analyze", "start_analysis", "play"]:
        cam.playback_status = "analyzing"
        cam.status = "online"
        cam.enabled = True
        cam.last_active = "Just now"
        if worker:
            worker.resume()
        else:
            stream_manager.get_or_create_worker(cam_id, cam.rtsp_url, cam.source_type, cam.capacity)

    elif action == "pause":
        cam.playback_status = "paused"
        if worker:
            worker.pause()

    elif action in ["stop", "stop_analysis"]:
        cam.playback_status = "stopped"
        cam.status = "ready"
        cam.enabled = False
        if worker:
            worker.stop()

    elif action == "restart":
        cam.playback_status = "analyzing"
        cam.status = "online"
        cam.enabled = True
        cam.last_active = "Just now"
        if worker:
            worker.stop()
        stream_manager.get_or_create_worker(cam_id, cam.rtsp_url, cam.source_type, cam.capacity)

    db.commit()
    db.refresh(cam)
    return cam

@router.put("/{cam_id}", response_model=CameraResponse)
def update_camera(cam_id: str, cam_data: CameraUpdate, db: Session = Depends(get_db)):
    """Update camera attributes in MySQL database."""
    cam = db.query(CameraModel).filter(CameraModel.id == cam_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    if cam_data.name is not None:
        cam.name = cam_data.name
    if cam_data.rtsp_url is not None:
        cam.rtsp_url = cam_data.rtsp_url
    if cam_data.location is not None:
        cam.location = cam_data.location
    if cam_data.status is not None:
        cam.status = cam_data.status
    if cam_data.enabled is not None:
        cam.enabled = cam_data.enabled
    if cam_data.resolution is not None:
        cam.resolution = cam_data.resolution
    if cam_data.fps is not None:
        cam.fps = cam_data.fps
    if cam_data.capacity is not None:
        cam.capacity = cam_data.capacity
    if cam_data.zone_id is not None:
        cam.zone_id = cam_data.zone_id
    if cam_data.event_id is not None:
        cam.event_id = cam_data.event_id

    db.commit()
    db.refresh(cam)
    return cam

@router.put("/{cam_id}/toggle-enabled", response_model=CameraResponse)
def toggle_camera_enabled(cam_id: str, db: Session = Depends(get_db)):
    """Toggle enabled status in MySQL database."""
    cam = db.query(CameraModel).filter(CameraModel.id == cam_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    cam.enabled = not cam.enabled
    if not cam.enabled and stream_manager.workers.get(cam_id):
        stream_manager.stop_worker(cam_id)
        cam.playback_status = "stopped"
    db.commit()
    db.refresh(cam)
    return cam

@router.put("/{cam_id}/toggle-status", response_model=CameraResponse)
def toggle_camera_status(cam_id: str, db: Session = Depends(get_db)):
    """Toggle online/offline status in MySQL database."""
    cam = db.query(CameraModel).filter(CameraModel.id == cam_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    cam.status = "offline" if cam.status == "online" else "online"
    db.commit()
    db.refresh(cam)
    return cam

@router.delete("/{cam_id}")
def delete_camera(cam_id: str, db: Session = Depends(get_db)):
    """Delete camera row from MySQL database."""
    cam = db.query(CameraModel).filter(CameraModel.id == cam_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    stream_manager.stop_worker(cam_id)
    db.delete(cam)
    db.commit()
    return {"message": "Camera deleted successfully", "id": cam_id}
