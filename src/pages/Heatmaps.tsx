import React, { useState, useEffect } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { apiService } from '../services/api';
import { Flame, MapPin, RefreshCw, Layers, Camera as CameraIcon } from 'lucide-react';

export const Heatmaps: React.FC = () => {
  const { cameras, activeCameraId, setActiveCameraId } = useCrowdSystem();
  const [heatmapImg, setHeatmapImg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const analyzingCams = cameras.filter(c => c.enabled && (c.playbackStatus === 'analyzing' || c.playbackStatus === 'playing'));
  const selectedCam = cameras.find(c => c.id === activeCameraId) || analyzingCams[0] || cameras[0];

  useEffect(() => {
    if (!selectedCam) {
      setHeatmapImg('');
      return;
    }
    
    let isSubscribed = true;
    const fetchHeatmap = () => {
      apiService.getHeatmap(selectedCam.id)
        .then(res => {
          if (isSubscribed && res && res.heatmap_base64) {
            setHeatmapImg(res.heatmap_base64);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isSubscribed) setLoading(false);
        });
    };

    setLoading(true);
    fetchHeatmap();
    const interval = setInterval(fetchHeatmap, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedCam?.id]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)] font-mono">
      {/* Sidebar Control (Col 4) */}
      <div className="lg:col-span-4 cyber-glass p-5 rounded-xl border border-blue-500/10 flex flex-col justify-between h-full overflow-hidden">
        <div className="space-y-5 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
            <Flame className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-300">
              Heatmap Control Hub
            </h3>
          </div>

          {/* Camera Selection Dropdown */}
          <div className="space-y-2">
            <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block">
              Select Monitored Camera
            </label>
            <select
              value={selectedCam?.id || ''}
              onChange={(e) => setActiveCameraId(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-cyber-border text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
            >
              {cameras.length === 0 ? (
                <option value="">No cameras registered</option>
              ) : (
                cameras.map(c => (
                  <option key={c.id} value={c.id}>
                    📹 {c.name} ({c.sourceType.toUpperCase()}) - {c.playbackStatus.toUpperCase()}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Heat Legend */}
          <div className="p-3.5 bg-slate-950/40 rounded-lg border border-slate-900 space-y-2">
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block">
              Density Scale Indicator
            </span>
            <div className="flex justify-between items-center text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-full" /> Safe (0-45%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" /> Warning (45-80%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" /> Critical (80%+)</span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[9px] text-slate-500">
          <span className="flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> YOLO Heat Sync
          </span>
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> OpenCV Colormap
          </span>
        </div>
      </div>

      {/* Interactive Map Layout Panel (Col 8) */}
      <div className="lg:col-span-8 cyber-glass p-5 rounded-xl border border-blue-500/10 flex flex-col justify-between h-full overflow-hidden">
        <div>
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Spatial Crowd Heatmap ({selectedCam ? selectedCam.name : 'No Camera Selected'})</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Heat intensity colormap generated from actual YOLO person centroid tracking.
              </p>
            </div>
            {selectedCam && (
              <span className="text-[10px] bg-cyan-950 text-cyan-400 font-bold px-2 py-0.5 rounded border border-cyan-500/30">
                {selectedCam.location}
              </span>
            )}
          </div>
        </div>

        {/* Heatmap Canvas Display */}
        <div className="relative flex-1 bg-slate-950 rounded-xl p-4 border border-slate-900 mt-4 overflow-hidden min-h-[300px] flex items-center justify-center">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.25)_1px,transparent_1px)] bg-[size:16px_16px]" />

          {!selectedCam || selectedCam.playbackStatus === 'ready' || selectedCam.playbackStatus === 'stopped' ? (
            <div className="text-center text-slate-500 text-xs space-y-2 z-10 font-mono">
              <CameraIcon className="w-10 h-10 mx-auto text-slate-600" />
              <p className="font-bold text-white uppercase tracking-wider">No live AI density observations available</p>
              <p className="text-[10px] text-slate-500">
                0 detections · Connect & click <strong>[ ANALYZE ]</strong> on your camera in Camera Access to generate real-time spatial heatmaps.
              </p>
            </div>
          ) : heatmapImg ? (
            <img 
              src={heatmapImg.startsWith('data:') ? heatmapImg : `data:image/png;base64,${heatmapImg}`} 
              alt="Camera Density Heatmap" 
              className="w-full h-full object-contain rounded-lg z-10" 
            />
          ) : (
            <div className="text-center text-slate-500 text-xs z-10 font-mono">
              {loading ? 'Generating OpenCV Heatmap Colormap...' : 'No live AI density observations available'}
            </div>
          )}
        </div>

        {/* Selected Zone Inspector Summary */}
        <div className="mt-4 pt-4 border-t border-slate-900 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[10px] block">ACTIVE CAMERA</span>
            <span className="font-semibold text-white truncate block">{selectedCam ? selectedCam.name : 'No active video source'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">DETECTIONS</span>
            <span className="font-semibold text-cyan-400 font-mono">
              {selectedCam?.playbackStatus === 'analyzing' && selectedCam.count ? `${selectedCam.count} persons` : '0 detections'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">CALCULATED DENSITY</span>
            <span className="font-semibold text-yellow-400 font-mono">
              {selectedCam?.playbackStatus === 'analyzing' ? `${selectedCam.density ?? 0}%` : '0%'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">RISK ASSESSMENT</span>
            <span className="font-semibold text-slate-300 uppercase font-mono">
              {selectedCam?.playbackStatus === 'analyzing' ? selectedCam.risk : 'No current risk assessment'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
