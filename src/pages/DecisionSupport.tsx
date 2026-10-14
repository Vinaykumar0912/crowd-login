import React, { useState } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { 
  Cpu, 
  ShieldCheck, 
  XCircle, 
  User, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';

export const DecisionSupport: React.FC = () => {
  const { 
    cameras,
    recommendations, 
    approveRecommendation, 
    rejectRecommendation, 
    settings 
  } = useCrowdSystem();

  // Override Modal State
  const [overrideModalRecId, setOverrideModalRecId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const analyzingCams = cameras.filter(c => c.enabled && (c.playbackStatus === 'analyzing' || c.playbackStatus === 'playing'));
  const activeRecs = recommendations.filter(r => r.status === 'pending');
  const actionedRecs = recommendations.filter(r => r.status !== 'pending');

  const selectedRec = recommendations.find(r => r.id === overrideModalRecId);

  const handleRejectWithReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalRecId || !overrideReason.trim()) return;
    rejectRecommendation(overrideModalRecId, overrideReason);
    setOverrideModalRecId(null);
    setOverrideReason('');
  };

  const priorityColors = {
    high: 'text-red-400 border-red-500/20 bg-red-950/20',
    medium: 'text-orange-400 border-orange-500/20 bg-orange-950/20',
    low: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20',
  };

  return (
    <div className="space-y-6 pb-12 font-mono">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs mb-1">
            <Cpu className="w-4 h-4" />
            <span>FCA INTELLIGENT REASONING ENGINE</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            AI Decision Support & Action Directives
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Formal Concept Analysis (FCA) recommendation engine matches live camera conditions to physical dispatcher rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-500">Active Analyzing Streams: </span>
            <span className="text-cyan-400 font-extrabold text-sm ml-1">{analyzingCams.length}</span>
          </div>
        </div>
      </div>

      {/* AI Summary Banner */}
      <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-900/40 text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white">AI Executive Summary</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {analyzingCams.length > 0
                ? `Galois lattice derivations active for ${analyzingCams.length} streams. ${activeRecs.length} actionable directives output.`
                : 'No camera stream currently analyzing. Decision support engine idle until streams are active.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-slate-500">Auto-Dispatch:</span>
          <span className="text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-500/20 px-2 py-0.5 rounded">
            {settings.autoEscalation ? 'ACTIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Grid: Pending Action Cards vs Execution History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Suggestions List (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Pending AI Action Directives
            </h3>
            <span className="text-[10px] px-2 py-0.5 bg-orange-950 text-orange-400 border border-orange-500/20 rounded font-bold animate-pulse">
              {activeRecs.length} Directives Pending
            </span>
          </div>

          <div className="space-y-4">
            {activeRecs.length === 0 ? (
              <div className="cyber-glass p-8 text-center text-slate-500 text-xs">
                No pending AI action directives. All crowd zones within acceptable safety parameters.
              </div>
            ) : (
              activeRecs.map((rec) => (
                <div 
                  key={rec.id} 
                  className="cyber-glass p-5 rounded-xl border border-blue-500/10 flex flex-col justify-between gap-4 hover:border-cyan-500/30 transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${priorityColors[rec.priority]}`}>
                          {rec.priority} Priority
                        </span>
                        <span className="text-xs text-cyan-400 font-bold">
                          Confidence: {rec.confidence}%
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {rec.title}
                      </h4>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Detected Problems List */}
                  {rec.problemsDetected && (
                    <div className="p-3 bg-red-950/20 rounded-lg border border-red-500/20 space-y-1 text-xs">
                      <span className="text-[10px] font-bold uppercase text-red-400 block flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Hazard Premise:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                        {rec.problemsDetected.map((prob, i) => (
                          <li key={i}>{prob}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Math Derivation Basis */}
                  <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-900 text-[10px] text-slate-400">
                    <span className="text-[9px] text-cyan-500 font-semibold block uppercase tracking-wider mb-1">FCA Implication Premise:</span>
                    {rec.reason}
                  </div>

                  {/* Officer & Zone assignments */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-900/60">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Zone: <strong className="text-slate-300">{rec.zone}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-cyan-400" /> Dispatch Target: <strong className="text-slate-300">{rec.officer}</strong>
                    </span>
                  </div>

                  {/* Approve / Reject Controls */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => approveRecommendation(rec.id)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.2)] active:scale-98"
                    >
                      <CheckCircle2 className="w-4 h-4 fill-white" /> Approve Directive
                    </button>
                    
                    <button
                      onClick={() => setOverrideModalRecId(rec.id)}
                      className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/40 text-slate-300 hover:text-red-400 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject (Manual Override)
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Log / History List (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Resolved Action Audit Log
            </h3>
            <span className="text-[10px] text-slate-500">Archive Logs</span>
          </div>

          <div className="cyber-glass p-5 rounded-xl border border-blue-500/10 space-y-4 min-h-[300px]">
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {actionedRecs.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs italic">
                  No resolved operations in active session cache.
                </div>
              ) : (
                actionedRecs.map(rec => (
                  <div 
                    key={rec.id} 
                    className={`p-3.5 rounded-xl border text-xs space-y-2
                      ${rec.status === 'approved' || rec.status === 'completed'
                        ? 'bg-green-950/10 border-green-900/40 text-green-200' 
                        : 'bg-red-950/10 border-red-900/40 text-red-300'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold truncate">{rec.title}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase border
                        ${rec.status === 'approved' || rec.status === 'completed'
                          ? 'bg-green-950 border border-green-500/20 text-green-400' 
                          : 'bg-red-950 border border-red-500/20 text-red-400'}`}
                      >
                        {rec.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">{rec.reason}</p>
                    
                    {rec.overrideReason && (
                      <div className="p-2 rounded bg-slate-950 border border-red-500/20 text-[9px] text-red-300">
                        <strong>Override Reason:</strong> "{rec.overrideReason}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MANUAL OVERRIDE REASON MODAL */}
      {overrideModalRecId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md cyber-glass p-6 border border-red-500/30 rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold text-white">Manual Override - Reject Directive</h3>
              </div>
            </div>

            <form onSubmit={handleRejectWithReason} className="space-y-4 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Rejecting AI Recommendation: <strong className="text-white">"{selectedRec?.title}"</strong>. Please enter an operational justification for security audit logs.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block font-mono">Reason for Override</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Ground inspection confirms area clear..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-cyber-border text-white focus:outline-none focus:border-red-500/40 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setOverrideModalRecId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
                >
                  Confirm Override & Reject
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
