import React, { useState, useEffect, useRef } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { GlassCard } from '../components/GlassCard';
import { apiService } from '../services/api';
import { 
  Film, 
  Upload, 
  Play, 
  RotateCcw, 
  FileText, 
  CheckCircle2, 
  HardDrive, 
  Tv
} from 'lucide-react';

export const ManualVideoAnalysis: React.FC = () => {
  const { hardwareInfo, fetchOfflineJobs } = useCrowdSystem();
  
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    resolution: string;
    duration: string;
    url?: string;
  } | null>(null);

  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRawFile(file);
      setSelectedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        resolution: '1920x1080 (HD)',
        duration: 'Detected on ingest',
        url: URL.createObjectURL(file)
      });
      setActiveJob(null);
      setIsAnalyzing(false);
      setReportGenerated(false);
      setUploadError(null);
    }
  };

  const handleStartAnalysis = async () => {
    if (!rawFile) return;
    setIsAnalyzing(true);
    setUploadError(null);
    try {
      const job = await apiService.uploadOfflineVideo(rawFile, {
        name: rawFile.name,
        conf_threshold: 0.35,
        sample_fps: 5
      });
      setActiveJob(job);
      fetchOfflineJobs();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to dispatch offline video analysis job.');
      setIsAnalyzing(false);
    }
  };

  // Poll status of active job
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      if (activeJob?.status === 'completed') {
        setIsAnalyzing(false);
        setReportGenerated(true);
      }
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const updated = await apiService.getOfflineJob(activeJob.id);
        if (updated) {
          setActiveJob(updated);
          if (updated.status === 'completed' || updated.status === 'failed') {
            setIsAnalyzing(false);
            if (updated.status === 'completed') setReportGenerated(true);
            fetchOfflineJobs();
          }
        }
      } catch (e) {}
    }, 1500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeJob?.id, activeJob?.status]);

  const handleReset = () => {
    if (activeJob && activeJob.status === 'processing') {
      apiService.cancelOfflineJob(activeJob.id).catch(() => {});
    }
    setActiveJob(null);
    setIsAnalyzing(false);
    setReportGenerated(false);
    setUploadError(null);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs mb-1">
            <Film className="w-4 h-4" />
            <span>OFFLINE VIDEO ANALYTICAL WORKSTATION</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Manual Video Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Upload pre-recorded CCTV footage (MP4, AVI) for offline computer vision detection, crowd density extraction, and post-event audit report generation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. Left Side: Upload & Video Player Preview (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Upload Dropzone */}
          <GlassCard className="p-6 border-dashed border-2 border-slate-800 hover:border-cyan-500/40 transition-colors text-center relative group cursor-pointer">
            <input 
              type="file" 
              accept="video/mp4,video/avi" 
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-10" 
            />
            <div className="flex flex-col items-center gap-3">
              <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Drag & Drop CCTV Recording or Click to Upload</h4>
                <p className="text-[11px] text-slate-500 mt-1">Supports high-res MP4 and AVI files up to 4GB</p>
              </div>
            </div>
          </GlassCard>

          {/* Video Preview Player & Timeline */}
          {selectedFile && (
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white truncate max-w-md">{selectedFile.name}</h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-500/20 px-2 py-0.5 rounded">
                  {selectedFile.resolution}
                </span>
              </div>

              {/* Video Frame Preview Display */}
              <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group">
                {selectedFile.url ? (
                  <video src={selectedFile.url} controls className="w-full h-full object-cover" />
                ) : (
                  <div className="relative w-full h-full">
                    <img 
                      src="https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=80" 
                      alt="Recording Preview" 
                      className="w-full h-full object-cover filter contrast-125 saturate-50" 
                    />
                    <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Play className="w-12 h-12 text-cyan-400 mx-auto fill-cyan-400/20" />
                        <span className="text-xs font-mono text-white block">Video Frame Preview Ready</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Detection Overlay Box if analyzing */}
                {isAnalyzing && (
                  <div className="absolute top-4 left-4 border border-cyan-500 bg-slate-950/80 p-2.5 rounded-lg text-[10px] font-mono text-cyan-300 pointer-events-none shadow-lg">
                    <span className="font-bold text-white block">AI BATCH ANALYSIS ACTIVE</span>
                    <span>Peak Count: {activeJob?.peak_count ?? 0} · Avg: {activeJob?.avg_count ?? 0}</span>
                  </div>
                )}
              </div>

              {/* Progress Bar & Frame Seekbar */}
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Analysis Progress: {activeJob?.progress ?? (reportGenerated ? 100 : 0)}%</span>
                  <span>
                    {activeJob ? `Frame ${activeJob.processed_frames} / ${activeJob.total_frames}` : 'Ready to start'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div 
                    style={{ width: `${activeJob?.progress ?? (reportGenerated ? 100 : 0)}%` }} 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300" 
                  />
                </div>
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
                  {uploadError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  {!isAnalyzing ? (
                    <button
                      onClick={handleStartAnalysis}
                      disabled={!rawFile}
                      className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Analyze Video
                    </button>
                  ) : (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
                    >
                      Cancel Analysis
                    </button>
                  )}

                  <button
                    onClick={handleReset}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </button>
                </div>

                <button
                  onClick={() => apiService.downloadPDFReport({ includeFca: true, includeCams: true, includeAlerts: true })}
                  className="px-4 py-2.5 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-400 hover:text-white font-bold text-xs transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Download Audit PDF
                </button>
              </div>
            </GlassCard>
          )}
        </div>

        {/* 2. Right Side: Video Information & Telemetry (Col 4) */}
        <div className="lg:col-span-4 space-y-6">
          {selectedFile && (
            <GlassCard className="p-6 space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span>Video Information</span>
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">File Name:</span>
                  <span className="text-white font-bold truncate max-w-[180px]">{selectedFile.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">File Size:</span>
                  <span className="text-slate-300 font-bold">{selectedFile.size}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">Inference Engine:</span>
                  <span className="text-cyan-400 font-bold">{hardwareInfo.engine}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">Hardware Device:</span>
                  <span className={`font-bold ${hardwareInfo.isCuda ? 'text-green-400' : 'text-amber-400'}`}>
                    {hardwareInfo.device.toUpperCase()} ({hardwareInfo.isCuda ? 'CUDA' : 'CPU'})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-500">Execution Provider:</span>
                  <span className="text-slate-300 text-[10px] text-right">{hardwareInfo.inferenceEngine}</span>
                </div>
                {activeJob && (
                  <>
                    <div className="flex justify-between border-b border-slate-900 pb-2">
                      <span className="text-slate-500">Job Status:</span>
                      <span className="text-cyan-400 font-bold uppercase">{activeJob.status}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-2">
                      <span className="text-slate-500">Peak Count:</span>
                      <span className="text-white font-bold">{activeJob.peak_count}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-2">
                      <span className="text-slate-500">Average Count:</span>
                      <span className="text-white font-bold">{activeJob.avg_count}</span>
                    </div>
                  </>
                )}
              </div>

              {reportGenerated && (
                <div className="p-3 rounded-xl bg-green-950/40 border border-green-500/30 text-green-400 text-[11px] space-y-1 animate-fade-in">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span>Analysis Complete</span>
                  </div>
                  <p className="text-slate-400 text-[10px]">
                    Video processed with YOLOv8. Peak and average crowd analytics derived.
                  </p>
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};
