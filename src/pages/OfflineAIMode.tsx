import React, { useState } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { GlassCard } from '../components/GlassCard';
import { apiService } from '../services/api';
import { 
  Cpu, 
  Download, 
  Server, 
  Activity, 
  Radio, 
  FileVideo
} from 'lucide-react';

export const OfflineAIMode: React.FC = () => {
  const { offlineJobs, hardwareInfo } = useCrowdSystem();
  const [selectedModel, setSelectedModel] = useState('YOLOv8-Crowd-Enterprise-v4.2');

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Visual Distinction between Live AI and Offline AI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border pb-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs mb-1">
            <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-400 font-bold uppercase tracking-wider">
              OFFLINE BATCH AI MODE
            </span>
            <span className="text-slate-500 font-mono">· NO LIVE CCTV REQUIRED</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Offline AI Batch Analytics Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Process recorded video archives through high-throughput offline GPUs without requiring active network camera streams.
          </p>
        </div>

        {/* Live vs Offline Indicator Badge */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3 font-mono text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Radio className="w-3.5 h-3.5" /> Live AI: Idle
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5 text-purple-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" /> Offline AI: Processing
            </span>
          </div>
        </div>
      </div>

      {/* Model Selection & Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <GlassCard className="lg:col-span-8 p-6 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>Offline AI Model Selector & Pipeline</span>
            </h3>
            <span className="text-[10px] text-purple-400 bg-purple-950/40 border border-purple-500/20 px-2 py-0.5 rounded font-bold">
              v4.2.0-OFFLINE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 block">Active Inference Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-cyber-border text-white text-xs focus:outline-none"
              >
                <option value="YOLOv8-Crowd-Enterprise-v4.2">YOLOv8-Crowd-Enterprise-v4.2 (High Accuracy)</option>
                <option value="FCA-Galois-Lattice-Solver-v2">FCA-Galois-Lattice-Solver-v2 (Formal Concept Engine)</option>
                <option value="Spatial-Density-Net-Fast">Spatial-Density-Net-Fast (High Speed Batch)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 block">Hardware Acceleration Mode</label>
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-900 text-slate-300 font-bold">
                {hardwareInfo.isCuda ? 'NVIDIA CUDA Hardware Acceleration Active' : 'Host CPU PyTorch Execution Engine (Standard)'}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Offline Engine Telemetry */}
        <GlassCard className="lg:col-span-4 p-6 space-y-3 font-mono text-xs">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>Engine Hardware Telemetry</span>
          </h3>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span className="text-slate-500">Device Type:</span>
              <span className={`font-bold ${hardwareInfo.isCuda ? 'text-green-400' : 'text-amber-400'}`}>
                {hardwareInfo.device.toUpperCase()} ({hardwareInfo.isCuda ? 'CUDA' : 'CPU'})
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span className="text-slate-500">Inference Core:</span>
              <span className="text-cyan-400 font-bold">{hardwareInfo.engine}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span className="text-slate-500">Queue Jobs:</span>
              <span className="text-purple-400 font-bold">{offlineJobs.length} Jobs</span>
            </div>
            <div className="text-[10px] text-slate-500 pt-1">
              {hardwareInfo.message}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Processing Queue & Completed Jobs Table */}
      <GlassCard className="p-6 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Offline AI Processing Queue & Completed Results</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="pb-3">Recording File</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Resolution</th>
                <th className="pb-3">Progress</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action / Results</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-xs">
              {offlineJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <p>No offline video analysis jobs queued.</p>
                    <p className="text-[10px] text-slate-600 mt-1">Upload pre-recorded CCTV footage in Manual Video Analysis to dispatch offline batch jobs.</p>
                  </td>
                </tr>
              ) : (
                offlineJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-900/40">
                    <td className="py-3 font-bold text-white flex items-center gap-2">
                      <FileVideo className="w-4 h-4 text-purple-400" />
                      <span>{job.fileName}</span>
                    </td>
                    <td className="py-3 text-slate-400">{job.duration}</td>
                    <td className="py-3 text-slate-400">{job.resolution}</td>
                    <td className="py-3">
                      <div className="w-28 space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-400">
                          <span>{job.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                          <div style={{ width: `${job.progress}%` }} className="h-full bg-purple-500" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        job.status === 'completed' ? 'bg-green-950/40 border-green-500/20 text-green-400' : 'bg-purple-950/40 border-purple-500/20 text-purple-400 animate-pulse'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {job.status === 'completed' ? (
                        <button 
                          onClick={() => apiService.downloadPDFReport({ includeFca: true, includeCams: true, includeAlerts: true })}
                          className="px-3 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-cyan-400 hover:text-white text-[10px] font-bold flex items-center gap-1 ml-auto"
                        >
                          <Download className="w-3 h-3" /> Audit Log PDF
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Processing...</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
