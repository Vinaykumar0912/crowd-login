import React, { useState, useEffect } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { apiService } from '../services/api';
import { 
  Cpu, 
  ShieldCheck, 
  XCircle, 
  User, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2,
  GitBranch,
  ArrowRight,
  Activity,
  Compass
} from 'lucide-react';
import { motion } from 'framer-motion';

export const DecisionSupport: React.FC = () => {
  const { 
    cameras,
    recommendations, 
    approveRecommendation, 
    rejectRecommendation, 
    selectedEventId
  } = useCrowdSystem();

  // Override Modal State
  const [overrideModalRecId, setOverrideModalRecId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  // Active Research Tab
  const [activeTab, setActiveTab] = useState<'directives' | 'algorithms' | 'lattices'>('directives');

  // Research FCA State
  const [researchData, setResearchData] = useState<any>(null);

  const analyzingCams = cameras.filter(c => c.enabled && (c.playbackStatus === 'analyzing' || c.playbackStatus === 'playing'));
  const activeRecs = recommendations.filter(r => r.status === 'pending');
  const actionedRecs = recommendations.filter(r => r.status !== 'pending');

  const selectedRec = recommendations.find(r => r.id === overrideModalRecId);

  const fetchResearchData = async () => {
    try {
      const data = await apiService.getFCAResearchLattice(selectedEventId || undefined);
      setResearchData(data);
    } catch (err) {
      console.warn("Could not fetch research FCA lattice data:", err);
    }
  };

  useEffect(() => {
    fetchResearchData();
    const interval = setInterval(fetchResearchData, 10000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

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

  const crowdedAreas = researchData?.crowded_areas || [];
  const preventionPlans = researchData?.prevention_plans || [];
  const crowdLattice = researchData?.crowd_lattice;
  const areaLattice = researchData?.area_lattice;
  const fuzzySummary = researchData?.fuzzy_context_summary || {};

  return (
    <div className="space-y-6 pb-12 font-mono">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs mb-1">
            <Cpu className="w-4 h-4" />
            <span>AI INTELLIGENT DECISION ENGINE — IEEE ACCESS 2025</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Formal Concept Analysis Decision Support
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Synergy between machine learning and formal concept analysis: Fuzzy Formal Contexts, 
            Algorithm 1 crowded-area extraction, and Algorithm 2 crowd-prevention plan generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-500">Active Streams: </span>
            <span className="text-cyan-400 font-extrabold text-sm ml-1">{analyzingCams.length}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
        <button
          onClick={() => setActiveTab('directives')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'directives'
              ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Action Directives ({activeRecs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('algorithms')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'algorithms'
              ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Algorithms 1 & 2 ({crowdedAreas.length} CA / {preventionPlans.length} Plans)</span>
        </button>

        <button
          onClick={() => setActiveTab('lattices')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'lattices'
              ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Concept Lattices (Lc & La)</span>
        </button>
      </div>

      {/* TAB 1: PENDING DIRECTIVES & EXECUTION AUDIT */}
      {activeTab === 'directives' && (
        <div className="space-y-6">
          {/* AI Summary Banner */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-900/40 text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white">FCA Decision Engine Status</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {analyzingCams.length > 0
                    ? `Galois lattice derivations active across ${analyzingCams.length} streams. ${activeRecs.length} actionable directives pending human verification.`
                    : 'Decision support engine operating in standby. Live cameras or stored telemetry active.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-500">Human Approval Safety:</span>
              <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded">
                ENFORCED (NO AUTO-EVAC)
              </span>
            </div>
          </div>

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

                      {/* Derivation Basis */}
                      <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-900 text-[10px] text-slate-400">
                        <span className="text-[9px] text-cyan-500 font-semibold block uppercase tracking-wider mb-1">
                          Galois Derivation Rationale & Connectivity:
                        </span>
                        {rec.reason}
                      </div>

                      {/* Officer & Zone assignments */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-900/60">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Target Zone: <strong className="text-slate-300">{rec.zone}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-cyan-400" /> Dispatch Unit: <strong className="text-slate-300">{rec.officer}</strong>
                        </span>
                      </div>

                      {/* Approve / Reject Controls */}
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={() => approveRecommendation(rec.id)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.2)] active:scale-98"
                        >
                          <CheckCircle2 className="w-4 h-4 fill-white" /> Authorize & Dispatch
                        </button>
                        
                        <button
                          onClick={() => setOverrideModalRecId(rec.id)}
                          className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/40 text-slate-300 hover:text-red-400 text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" /> Reject (Officer Override)
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
                <span className="text-[10px] text-slate-500">Security Archive</span>
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
        </div>
      )}

      {/* TAB 2: ALGORITHM 1 & ALGORITHM 2 RESEARCH EXECUTION */}
      {activeTab === 'algorithms' && (
        <div className="space-y-6">
          {/* Algorithm 1 Panel */}
          <div className="cyber-glass p-6 rounded-2xl border border-cyan-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase block">
                  IEEE Access 2025 — Algorithm 1
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  Extraction of Crowded Areas (Threshold T = 0.70)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Identified High-Crowd Areas:</span>
                <span className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/30 text-red-400 font-extrabold text-xs">
                  {crowdedAreas.length} Areas
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Parses the crowd lattice <code className="text-cyan-300">Lc</code> in decreasing size of Intent,
              evaluating multi-criteria fuzzy membership degrees <code className="text-cyan-300">Kc[a]</code>.
              Areas satisfying crowd criteria above threshold T=0.70 are categorized into set <code className="text-cyan-300">CA</code>,
              while non-crowded and low-crowd areas are systematically filtered out.
            </p>

            {/* Table 2: Fuzzy Formal Context Kc (Paper Section V, Table 2) */}
            {Object.keys(fuzzySummary).length > 0 && (
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Table 2 — Fuzzy Formal Context Kc of Monitored Areas:
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                        <th className="py-1.5 px-2">Monitored Area</th>
                        <th className="py-1.5 px-2 text-center">D (Density)</th>
                        <th className="py-1.5 px-2 text-center">P (Protocol Risk)</th>
                        <th className="py-1.5 px-2 text-center">M (Movement)</th>
                        <th className="py-1.5 px-2 text-center">E (Emergency)</th>
                        <th className="py-1.5 px-2 text-center">S (Speed Anomaly)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {Object.entries(fuzzySummary).map(([areaName, attrs]: [string, any]) => (
                        <tr key={areaName} className="hover:bg-slate-800/20">
                          <td className="py-1.5 px-2 font-bold text-slate-300">{areaName}</td>
                          <td className="py-1.5 px-2 text-center font-mono">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${attrs.D >= 0.7 ? 'bg-red-950 text-red-400 font-bold' : 'text-slate-400'}`}>
                              {(attrs.D || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${attrs.P >= 0.7 ? 'bg-red-950 text-red-400 font-bold' : 'text-slate-400'}`}>
                              {(attrs.P || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${attrs.M >= 0.7 ? 'bg-orange-950 text-orange-400 font-bold' : 'text-slate-400'}`}>
                              {(attrs.M || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${attrs.E >= 0.7 ? 'bg-red-950 text-red-400 font-bold' : 'text-slate-400'}`}>
                              {(attrs.E || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${attrs.S >= 0.7 ? 'bg-amber-950 text-amber-400 font-bold' : 'text-slate-400'}`}>
                              {(attrs.S || 0).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {crowdedAreas.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs border border-slate-900 rounded-xl">
                No high-crowd areas extracted. All monitored areas have crowd level c &le; 0.70.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {crowdedAreas.map((ca: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-red-500/20 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-white block">{ca.area}</span>
                        <span className="text-[10px] text-cyan-400 font-mono">Matched Concept: {ca.concept_id}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-red-900/40 text-red-300 font-bold text-xs border border-red-500/30">
                        Score c = {ca.crowd_score} &gt; 0.70
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Satisfied Crowd Intent:</span>
                      <div className="flex flex-wrap gap-1">
                        {ca.satisfied_intent?.map((attr: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/20 text-cyan-300 text-[10px]">
                            {attr === 'D' && 'Density (D)'}
                            {attr === 'P' && 'Protocol Risk (P)'}
                            {attr === 'M' && 'Movement (M)'}
                            {attr === 'E' && 'Emergency (E)'}
                            {attr === 'S' && 'Speed Anomaly (S)'}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1 pt-2 border-t border-slate-900 text-center">
                      {['D', 'P', 'M', 'E', 'S'].map((k) => (
                        <div key={k} className="p-1 rounded bg-slate-900/60 border border-slate-800">
                          <span className="text-[9px] text-slate-500 block">{k}</span>
                          <span className={`text-[10px] font-bold ${
                            (ca.attribute_scores?.[k] || 0) >= 0.7 ? 'text-red-400' : 'text-slate-300'
                          }`}>
                            {(ca.attribute_scores?.[k] || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] text-slate-400 pt-1 leading-normal italic">
                      {ca.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Algorithm 2 Panel */}
          <div className="cyber-glass p-6 rounded-2xl border border-purple-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-purple-400 tracking-wider uppercase block">
                  IEEE Access 2025 — Algorithm 2
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  Crowd-Prevention Plan Generation
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Generated Prevention Subplans:</span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-300 font-extrabold text-xs">
                  {preventionPlans.length} Plans
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Parses the Area Lattice <code className="text-purple-300">La</code> in decreasing size of Extent,
              identifying candidate migration corridors. The function <code className="text-purple-300">cover(A', cpt.Intent)</code> verifies
              that destination zones are non-crowded, unblocked, and possess adequate absorption capacity.
            </p>

            {preventionPlans.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs border border-slate-900 rounded-xl">
                No prevention subplans currently active. Either no areas exceed crowding threshold, or all areas are balanced.
              </div>
            ) : (
              <div className="space-y-4">
                {preventionPlans.map((plan: any, idx: number) => (
                  <div key={idx} className="p-5 rounded-xl bg-slate-950/80 border border-purple-500/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 font-bold text-xs border border-purple-500/30">
                          {plan.plan_id}
                        </span>
                        <span className="text-xs font-bold text-white">
                          Area Lattice Concept: {plan.concept_id}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded">
                        STATUS: PENDING HUMAN APPROVAL
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <div className="flex-1 text-center sm:text-left">
                        <span className="text-[10px] text-red-400 uppercase font-bold block">Overcrowded Sources (A')</span>
                        <strong className="text-sm text-white">{plan.crowded_sources?.join(', ')}</strong>
                      </div>
                      <ArrowRight className="w-5 h-5 text-purple-400 hidden sm:block" />
                      <div className="flex-1 text-center sm:text-left">
                        <span className="text-[10px] text-emerald-400 uppercase font-bold block">Safe Divert Targets (cpt.Intent)</span>
                        <strong className="text-sm text-white">{plan.recommended_destinations?.join(', ')}</strong>
                      </div>
                      <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                        <span className="text-[10px] text-slate-500 block">Absorption Capacity</span>
                        <span className="text-xs font-bold text-cyan-400">{plan.mitigation_capacity} persons</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-normal">
                      {plan.reason}
                    </p>

                    <div className="p-2.5 rounded bg-amber-950/20 border border-amber-500/20 text-[10px] text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{plan.warning || "Candidate prevention plan requires operational review before executing physical crowd diversion."}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONCEPT LATTICE VISUALIZER (Lc and La) */}
      {activeTab === 'lattices' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Crowd Lattice Lc */}
            <div className="cyber-glass p-5 rounded-2xl border border-cyan-500/20 space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Definition 7 — Crowd Lattice (Lc)
                </span>
                <h4 className="text-base font-bold text-white">Crowd Characteristics Hierarchy</h4>
              </div>

              <p className="text-[11px] text-slate-400">
                Derived from Crowd Fuzzy Context <code className="text-cyan-300">Kc = (A, F, R)</code>. 
                Groups areas that share common crowd criteria (D, P, M, E, S) via Galois closure.
              </p>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 max-h-[360px] overflow-y-auto space-y-2">
                {crowdLattice?.nodes?.map((node: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cyan-300">{node.id}</span>
                      <span className="text-[10px] text-slate-500">{node.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      <strong>Extent:</strong> [{node.extent?.join(', ')}]
                    </div>
                    <div className="text-[10px] text-cyan-400">
                      <strong>Intent:</strong> [{node.intent?.join(', ')}]
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Area Lattice La */}
            <div className="cyber-glass p-5 rounded-2xl border border-purple-500/20 space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Definition 6 — Area Lattice (La)
                </span>
                <h4 className="text-base font-bold text-white">Physical Connectivity Hierarchy</h4>
              </div>

              <p className="text-[11px] text-slate-400">
                Derived from Area Formal Context <code className="text-purple-300">Ka = (A, A, R)</code>. 
                Extent groups areas connected to all areas in the Intent, identifying migration hubs.
              </p>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 max-h-[360px] overflow-y-auto space-y-2">
                {areaLattice?.nodes?.map((node: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-purple-300">{node.id}</span>
                      <span className="text-[10px] text-slate-500">{node.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      <strong>Connected Extent:</strong> [{node.extent?.join(', ')}]
                    </div>
                    <div className="text-[10px] text-purple-400">
                      <strong>Shared Targets:</strong> [{node.intent?.join(', ')}]
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
