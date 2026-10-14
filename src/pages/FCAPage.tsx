import React, { useState } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { ConceptLattice } from '../components/ConceptLattice';
import { FileSpreadsheet, Cpu, Info, Check, Activity } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';

export const FCAPage: React.FC = () => {
  const { cameras } = useCrowdSystem();
  const [activeStep, setActiveStep] = useState<number>(2);

  const analyzingCams = cameras.filter(c => c.enabled && (c.playbackStatus === 'analyzing' || c.playbackStatus === 'playing'));

  // Formal Context Data (G, M, I) derived from active analyzing cameras
  const objects = analyzingCams.length > 0 ? analyzingCams.map(c => `${c.name} (${c.location})`) : [];
  
  const attributes = [
    { key: 'density', label: 'High Density (>80%)' },
    { key: 'surge', label: 'Surge Rate Detected' },
    { key: 'critical', label: 'Critical Risk Level' },
    { key: 'warning', label: 'Warning Risk State' },
    { key: 'normal', label: 'Normal Safe Capacity' },
  ];

  // Dynamic Incidences Relation I based on actual YOLO analytics
  const contextMatrix: Record<string, Record<string, number>> = {};
  analyzingCams.forEach(c => {
    const key = `${c.name} (${c.location})`;
    contextMatrix[key] = {
      density: (c.density || 0) > 80 ? 1 : 0,
      surge: (c.count || 0) > (c.capacity * 0.75) ? 1 : 0,
      critical: c.risk === 'critical' ? 1 : 0,
      warning: c.risk === 'high' || c.risk === 'medium' ? 1 : 0,
      normal: c.risk === 'low' ? 1 : 0
    };
  });

  const steps = [
    { step: 1, label: 'Feature Extraction', desc: 'Computer Vision extracts bounding coordinates, vector velocity flows, and children attributes.' },
    { step: 2, label: 'Binary Context Creation', desc: 'Continuous counts are converted into binary attributes using threshold scaling.' },
    { step: 3, label: 'Lattice Construction', desc: 'Concept hierarchies are computed, identifying objects sharing subsets of characteristics.' },
    { step: 4, label: 'Decision Logic Rules', desc: 'Implication rules are matched to output intelligent security recommendations.' }
  ];

  return (
    <div className="space-y-6 font-mono">
      {/* Page Header */}
      <div className="flex justify-between items-center pb-2 border-b border-cyber-border/40">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>Formal Concept Analysis (FCA) Dashboard</span>
          </h2>
          <p className="text-[10px] text-slate-500">
            Algorithmic derivation of operational security decision rules via Galois Connections and Concept Lattices.
          </p>
        </div>
        <span className="text-[10px] text-slate-400">
          Algorithm: NextClosure (Ganter)
        </span>
      </div>

      {/* Workflow Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.map((st) => (
          <div 
            key={st.step}
            onClick={() => setActiveStep(st.step)}
            className={`p-3 rounded-lg border cursor-pointer transition-all
              ${activeStep === st.step 
                ? 'bg-cyan-950/30 border-cyan-500/40 text-white shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border
                ${activeStep === st.step ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                {st.step}
              </span>
              <span className="text-xs font-semibold">{st.label}</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-normal">{st.desc}</p>
          </div>
        ))}
      </div>

      {/* Main FCA Visualizer */}
      {analyzingCams.length > 0 ? (
        <ConceptLattice />
      ) : (
        <GlassCard className="p-8 text-center space-y-2 border border-slate-900">
          <h3 className="text-sm font-bold text-white uppercase">No FCA Analysis Available</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Connect and click <strong>[ ANALYZE ]</strong> on a camera stream in Camera Access to compute Formal Concept Galois lattices from live YOLO crowd metrics.
          </p>
        </GlassCard>
      )}

      {/* Formal Context Matrix Table (G, M, I) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Binary Table Grid */}
        <div className="lg:col-span-7 cyber-glass p-5 rounded-xl border border-blue-500/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Formal Binary Context Table \( (G, M, I) \)
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 mb-4">
              Columns represent Monitored Attributes (Intent \( M \)); Rows represent Active Camera Locations (Extent \( G \)).
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-900 bg-slate-950/40">
            {objects.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-900/60 font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    <th className="p-3">Camera Location (G)</th>
                    {attributes.map(attr => (
                      <th key={attr.key} className="p-3 text-center">{attr.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-mono">
                  {objects.map(obj => (
                    <tr key={obj} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-300 font-sans">{obj}</td>
                      {attributes.map(attr => {
                        const active = contextMatrix[obj]?.[attr.key] === 1;
                        return (
                          <td key={attr.key} className="p-3 text-center">
                            {active ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-cyan-950/50 text-cyan-400 border border-cyan-500/30">
                                X
                              </span>
                            ) : (
                              <span className="text-slate-700">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                No active camera objects in context matrix.
              </div>
            )}
          </div>
        </div>

        {/* Math & Derivation Explanation Panel */}
        <div className="lg:col-span-5 cyber-glass p-5 rounded-xl border border-blue-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                Mathematical Rationale
              </h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300 font-sans">
              <p>
                Formal Concept Analysis (FCA) relies on <strong>Galois Connections</strong> to map objects (cameras) to their corresponding attributes (crowd states). A concept is a pair \( (A, B) \) where:
              </p>
              <ul className="list-disc pl-4 space-y-1.5 font-mono text-[10px] text-cyan-300">
                <li>\( A' = B \) (attributes shared by all cameras in A)</li>
                <li>\( B' = A \) (cameras sharing all attributes in B)</li>
              </ul>
              <p>
                By building this lattice hierarchy, the decision engine identifies subset implications. E.g., concept derivations show that whenever a camera stream exhibits high density and surge rates, security dispatch rules execute automatically.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Decision Engine Secure
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-green-400" /> Verified Concept Rules
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
