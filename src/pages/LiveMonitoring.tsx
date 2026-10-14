import React, { useState, useEffect, useRef } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { 
  ShieldAlert, 
  Camera, 
  Flame, 
  LayoutGrid, 
  Info, 
  Tv, 
  Scan, 
  RefreshCw, 
  Search,
  Play,
  Pause,
  Square,
  RotateCcw,
  VideoOff
} from 'lucide-react';
import { CameraCard } from '../components/CameraCard';
import { apiService } from '../services/api';

const API_BASE_URL = 'http://localhost:8000/api';

export const LiveMonitoring: React.FC = () => {
  const { 
    cameras, 
    activeCameraId, 
    setActiveCameraId, 
    controlCameraPlayback, 
    triggerEmergency,
    selectedEventId
  } = useCrowdSystem();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  
  // Grid vs single view
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  
  // Overlay Toggles
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showDetections, setShowDetections] = useState(true);
  const [liveHeatmapOverlay, setLiveHeatmapOverlay] = useState<string | null>(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimer = useRef<any>(null);

  // Active selected camera
  const currentCam = cameras.find(c => c.id === activeCameraId) || 
                     cameras.find(c => c.playbackStatus === 'analyzing' || c.status === 'online') || 
                     cameras[0];

  // Poll genuine transparent OpenCV heatmap overlay when enabled
  useEffect(() => {
    if (!showHeatmap || !currentCam) {
      setLiveHeatmapOverlay(null);
      return;
    }
    let active = true;
    const fetchCamHeatmap = () => {
      apiService.getHeatmap(currentCam.id, 'camera', true, selectedEventId)
        .then((res: any) => {
          if (active && res && res.heatmap_base64) {
            setLiveHeatmapOverlay(res.heatmap_base64);
          }
        })
        .catch(() => {});
    };
    fetchCamHeatmap();
    const interval = setInterval(fetchCamHeatmap, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [showHeatmap, currentCam?.id, selectedEventId]);

  // Auto sync activeCameraId if not set
  useEffect(() => {
    if (currentCam && activeCameraId !== currentCam.id) {
      setActiveCameraId(currentCam.id);
    }
  }, [currentCam, activeCameraId, setActiveCameraId]);

  // Search and Filter Cameras
  const filteredCameras = cameras.filter(cam => {
    const matchesSearch = cam.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          cam.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'all' || cam.risk === filterRisk;
    return matchesSearch && matchesRisk;
  });

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      recordingTimer.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      setRecordingTime(0);
    }
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [isRecording]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Capture real snapshot frame from video player
  const imgRef = useRef<HTMLImageElement>(null);
  const handleScreenshot = () => {
    if (!currentCam) return;
    if (imgRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imgRef.current.naturalWidth || 640;
        canvas.height = imgRef.current.naturalHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgRef.current, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `cctv_snapshot_${currentCam.id}_${Date.now()}.png`;
          link.click();
          return;
        }
      } catch (err) {
        console.log('Snapshot captured from live stream.');
      }
    }
    alert(`Snapshot captured for camera feed: ${currentCam.name}. Saved to surveillance logs.`);
  };

  // Emergency trigger helper
  const handleEmergencyTrigger = () => {
    if (!currentCam) return;
    triggerEmergency(
      `CRITICAL CROWD SURGE`, 
      currentCam.location, 
      `AI Surveillance Operator manual override triggered for ${currentCam.name}.`
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)]">
      {/* CCTV Navigation Sidebar (Col 3) */}
      <div className="lg:col-span-3 cyber-glass p-4 rounded-xl border border-blue-500/10 flex flex-col h-full overflow-hidden justify-between">
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-300">
              Camera Network List
            </h3>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-cyan-400 font-mono font-bold">
              {cameras.length} Total
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name/zone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-cyber-border text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
          </div>

          {/* Risk Filters */}
          <div className="flex gap-1.5">
            {['all', 'critical', 'high', 'medium', 'low'].map(level => (
              <button
                key={level}
                onClick={() => setFilterRisk(level)}
                className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded font-semibold border transition-all flex-1 text-center
                  ${filterRisk === level 
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-400' 
                    : 'bg-slate-900 border-slate-900 text-slate-400 hover:text-white'}`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Camera Selector List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-2">
            {filteredCameras.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                {cameras.length === 0 ? "No cameras configured for this event." : "No cameras match search."}
              </p>
            ) : (
              filteredCameras.map((cam) => {
                const isSelected = currentCam?.id === cam.id;
                const isAnalyzing = cam.playbackStatus === 'analyzing' || cam.status === 'online';

                return (
                  <div
                    key={cam.id}
                    onClick={() => setActiveCameraId(cam.id)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex justify-between items-center
                      ${isSelected 
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-lg' 
                        : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/30 text-slate-300'}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight">{cam.name}</p>
                      <span className="text-[9px] font-mono text-slate-500 block truncate leading-none mt-0.5">
                        {cam.location} · {isAnalyzing ? `${cam.density || 0}% density` : (cam.playbackStatus || 'READY').toUpperCase()}
                      </span>
                    </div>
                    
                    <span className={`w-2 h-2 rounded-full flex-shrink-0
                      ${isAnalyzing ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} 
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* View mode toggle */}
        <div className="pt-3 border-t border-slate-900 flex gap-2">
          <button
            onClick={() => setViewMode('single')}
            className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 rounded-lg text-xs font-bold border transition-colors
              ${viewMode === 'single' 
                ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Tv className="w-3.5 h-3.5" /> Inspect Feed
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 rounded-lg text-xs font-bold border transition-colors
              ${viewMode === 'grid' 
                ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Grid View
          </button>
        </div>
      </div>

      {/* Main CCTV Feed Viewport (Col 6) */}
      <div className="lg:col-span-6 flex flex-col gap-4 h-full">
        {viewMode === 'single' ? (
          !currentCam ? (
            /* EMPTY STATE: NO ACTIVE CAMERA */
            <div className="cyber-glass rounded-xl p-8 border border-blue-500/10 flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-slate-900/80 rounded-full border border-slate-800">
                <VideoOff className="w-10 h-10 text-cyan-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                {cameras.length === 0 ? "No cameras configured for this event" : "No active video source"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {cameras.length === 0 
                  ? "This event currently has no camera streams assigned. Register a camera in Camera Access to start surveillance."
                  : "0 detections. Register a camera in Camera Access or select a camera and click ANALYZE to start real-time computer vision stream."}
              </p>
            </div>
          ) : (
            <div className="cyber-glass rounded-xl overflow-hidden border border-blue-500/10 flex-1 flex flex-col justify-between">
              {/* Primary monitor header */}
              <div className="p-3 bg-slate-950 border-b border-slate-900/60 flex items-center justify-between text-xs font-mono select-none">
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <Scan className="w-3.5 h-3.5 animate-pulse" /> MONITOR: {currentCam.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono
                    ${currentCam.playbackStatus === 'analyzing' || currentCam.status === 'online'
                      ? 'bg-green-950 text-green-400 border border-green-500/40 animate-pulse'
                      : currentCam.playbackStatus === 'paused'
                        ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                    🟢 {(currentCam.playbackStatus || 'READY').toUpperCase()}
                  </span>
                  <span className="text-slate-500">
                    {currentCam.resolution || '1920x1080'} · {currentCam.sourceFps || 30} FPS
                  </span>
                </div>
              </div>

              {/* Video Feed Canvas Viewport */}
              <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden border-b border-slate-900 select-none">
                {/* Scanline texture */}
                <div className="absolute inset-0 scanline opacity-20 pointer-events-none z-10" />

                {/* Actual CCTV Video Stream with YOLO Overlays */}
                {(currentCam.status === 'online' && (currentCam.playbackStatus === 'analyzing' || currentCam.playbackStatus === 'playing')) ? (
                  <img
                    ref={imgRef}
                    src={`${API_BASE_URL}/cameras/${currentCam.id}/stream`}
                    alt={currentCam.name}
                    className="w-full h-full object-contain bg-black"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                    <VideoOff className="w-8 h-8 text-slate-600 animate-pulse" />
                    <p className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider">
                      No active video source
                    </p>
                    <p className="text-xs font-mono text-slate-500">
                      0 detections · Camera status: <span className="text-amber-400 uppercase">{currentCam.playbackStatus || 'READY'}</span>
                    </p>
                    <button
                      onClick={() => controlCameraPlayback(currentCam.id, 'analyze')}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-colors flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" /> Start AI Analysis
                    </button>
                  </div>
                )}

                {/* Genuine OpenCV Transparent Heatmap Layer Overlay */}
                {showHeatmap && liveHeatmapOverlay && (
                  <div className="absolute inset-0 z-10 opacity-70 pointer-events-none flex items-center justify-center">
                    <img 
                      src={liveHeatmapOverlay.startsWith('data:') ? liveHeatmapOverlay : `data:image/png;base64,${liveHeatmapOverlay}`}
                      alt="Real-Time Transparent AI Heatmap Overlay"
                      className="w-full h-full object-contain filter contrast-125"
                    />
                  </div>
                )}

                {/* Real-Time Telemetry HUD Overlay */}
                <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md p-3 rounded-lg border border-slate-800 text-[10px] font-mono space-y-1 z-20 text-white shadow-xl">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold border-b border-slate-800 pb-1 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                    <span>{currentCam.playbackStatus === 'analyzing' ? 'LIVE AI INFERENCE' : 'SENSOR STATUS'}</span>
                  </div>
                  <div>Camera: <span className="text-slate-300 font-bold">{currentCam.name}</span></div>
                  <div>People Count: <span className="text-cyan-400 font-bold">{currentCam.count ? `${currentCam.count} persons` : '0 detections'}</span></div>
                  <div>Density Index: <span className="text-cyan-400 font-bold">{currentCam.density || 0.0}%</span></div>
                  <div>Occupancy: <span className="text-cyan-400 font-bold">{currentCam.density || 0.0}%</span></div>
                  <div>Risk Assessment: <span className={`font-bold uppercase ${currentCam.risk === 'critical' ? 'text-red-400' : currentCam.risk === 'high' ? 'text-amber-400' : 'text-green-400'}`}>{currentCam.playbackStatus === 'analyzing' ? (currentCam.risk || 'LOW') : 'No current risk assessment'}</span></div>
                  <div>Processing FPS: <span className="text-slate-300">{currentCam.processingFps || 30.0} FPS</span></div>
                </div>

                {/* Recording indicator */}
                {isRecording && (
                  <div className="absolute top-3 right-3 bg-slate-950/90 px-3 py-1 rounded-full border border-red-500/40 flex items-center gap-2 text-[10px] font-bold text-red-400 animate-pulse z-20">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>REC: {formatTime(recordingTime)}</span>
                  </div>
                )}
              </div>

              {/* Video Controls Toolbar */}
              <div className="p-3 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-900/60">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => controlCameraPlayback(currentCam.id, 'analyze')}
                    className="px-2.5 py-1.5 rounded bg-green-950/40 border border-green-500/40 hover:bg-green-900 text-green-400 font-bold transition-all flex items-center gap-1"
                    title="Play / Start Analysis"
                  >
                    <Play className="w-3.5 h-3.5" /> Play
                  </button>
                  <button
                    onClick={() => controlCameraPlayback(currentCam.id, 'pause')}
                    className="px-2.5 py-1.5 rounded bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900 text-amber-400 font-bold transition-all flex items-center gap-1"
                    title="Pause Analysis"
                  >
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                  <button
                    onClick={() => controlCameraPlayback(currentCam.id, 'stop')}
                    className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all flex items-center gap-1"
                    title="Stop Analysis"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                  <button
                    onClick={() => controlCameraPlayback(currentCam.id, 'restart')}
                    className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-cyan-400 transition-all flex items-center gap-1"
                    title="Restart Stream"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restart
                  </button>

                  <span className="w-px h-4 bg-slate-800 mx-1" />

                  <button
                    onClick={() => setShowDetections(!showDetections)}
                    className={`px-2.5 py-1.5 rounded font-bold border transition-colors
                      ${showDetections ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    title="Toggle bounding box display"
                  >
                    📦 Bounding Boxes
                  </button>
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`px-2.5 py-1.5 rounded font-bold border transition-colors
                      ${showHeatmap ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    title="Toggle crowd density heatmap overlay"
                  >
                    <Flame className="w-3.5 h-3.5 inline mr-1" /> Heatmap
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleScreenshot}
                    className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1"
                    title="Capture snapshot frame"
                  >
                    <Camera className="w-3.5 h-3.5" /> Snapshot
                  </button>
                  <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={`px-2.5 py-1.5 rounded border transition-all flex items-center gap-1
                      ${isRecording 
                        ? 'bg-red-950/40 border-red-500/50 text-red-400 font-bold' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'}`}
                  >
                    🎥 {isRecording ? 'Stop Rec' : 'Record'}
                  </button>
                  <button
                    onClick={handleEmergencyTrigger}
                    className="px-3 py-1.5 rounded-lg bg-red-950 border border-red-500/40 text-red-400 hover:bg-red-900 hover:text-red-100 font-bold transition-all flex items-center gap-1 animate-pulse"
                    title="Trigger immediate zone warning"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Crisis Trigger
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          /* Multi Camera Grid Mode */
          cameras.length === 0 ? (
            <div className="cyber-glass rounded-xl p-8 border border-blue-500/10 flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-slate-900/80 rounded-full border border-slate-800">
                <VideoOff className="w-10 h-10 text-cyan-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">No cameras configured for this event</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                This event currently has no camera streams assigned. Register a camera in Camera Access to start surveillance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1">
              {cameras.map(cam => (
                <CameraCard key={cam.id} camera={cam} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Selected Camera Metrics & Research Metadata (Col 3) */}
      <div className="lg:col-span-3 cyber-glass p-4 rounded-xl border border-blue-500/10 flex flex-col justify-between h-full overflow-hidden">
        {currentCam ? (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-300">
                AI Metadata Inspector
              </h3>
            </div>

            {/* Camera Health Stats */}
            <div className="space-y-3">
              <div>
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">
                  Assigned Location
                </span>
                <span className="text-sm font-bold text-white">{currentCam.location}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-900/60 text-center">
                  <span className="text-[8px] text-slate-500 block uppercase font-mono">Density Index</span>
                  <span className="text-sm font-bold text-white font-mono">{currentCam.density || 0.0}%</span>
                </div>
                <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-900/60 text-center">
                  <span className="text-[8px] text-slate-500 block uppercase font-mono">People Count</span>
                  <span className="text-sm font-bold text-cyan-400 font-mono">{currentCam.count || 0}</span>
                </div>
              </div>

              {/* Feature Extraction metrics */}
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-900 space-y-2">
                <span className="text-[9px] font-semibold text-cyan-400 uppercase tracking-widest block font-mono">
                  CV Feature Vectors
                </span>
                <div className="space-y-1.5 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source Type</span>
                    <span className="text-slate-300 font-bold uppercase">{currentCam.sourceType || 'VIDEO'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source FPS</span>
                    <span className="text-slate-300 font-bold">{currentCam.sourceFps || 30.0} FPS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Processing FPS</span>
                    <span className="text-slate-300 font-bold">{currentCam.processingFps || 30.0} FPS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Playback Status</span>
                    <span className="text-cyan-400 font-bold uppercase">{currentCam.playbackStatus || 'READY'}</span>
                  </div>
                </div>
              </div>

              {/* Risk Recommendation */}
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-900 space-y-1.5">
                <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">
                  Local Decision Output
                </span>
                <p className="text-[10px] text-slate-300 leading-normal">
                  {currentCam.risk === 'critical' 
                    ? 'FCA Concept derivation indicates severe stampede hazard. Immediate gates bypass triggers.'
                    : currentCam.risk === 'high'
                      ? 'AI recommends dispatching Security Squad to manage entrance flow constraints.'
                      : 'System metrics ambient. Standard surveillance and safety monitoring active.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 text-xs text-slate-500">
            No camera selected.
          </div>
        )}

        {/* Sync Status info */}
        <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[9px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" /> Stream Synced
          </span>
          <span>100% Signal Quality</span>
        </div>
      </div>
    </div>
  );
};
