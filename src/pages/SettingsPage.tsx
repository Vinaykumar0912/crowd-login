import React from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { Sliders, Volume2, Monitor, Moon, Sun } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useCrowdSystem();

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex justify-between items-center pb-2 border-b border-cyber-border/40">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Surveillance System Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tune computer vision parameters, customize dispatcher alerts, and configure application theme preferences.
          </p>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CV & AI Tuning parameters (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Computer Vision & AI Thresholds
            </h3>
          </div>

          <GlassCard className="p-5 space-y-5">
            {/* Slider 1: AI Confidence Sensitivity */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">YOLO Model Confidence Threshold</label>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                  {settings.aiSensitivity}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                value={settings.aiSensitivity}
                onChange={(e) => updateSettings({ aiSensitivity: parseInt(e.target.value) })}
                className="w-full accent-cyan-500"
              />
              <p className="text-[10px] text-slate-500 leading-normal font-mono">
                Decreasing threshold increases detection rate but elevates false positive indicators (noise).
              </p>
            </div>

            {/* Slider 2: Crowd density alerts */}
            <div className="space-y-2 pt-3 border-t border-slate-900">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">Crowd Density Warning Limit</label>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                  {settings.crowdThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="95"
                value={settings.crowdThreshold}
                onChange={(e) => updateSettings({ crowdThreshold: parseInt(e.target.value) })}
                className="w-full accent-cyan-500"
              />
              <p className="text-[10px] text-slate-500 leading-normal font-mono">
                Triggers visual orange warnings immediately on camera grids when local pixel density occupancy surpasses limit.
              </p>
            </div>
          </GlassCard>

          {/* Theme Selector */}
          <div className="flex items-center gap-2 pt-2">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Application Theme Configuration
            </h3>
          </div>

          <GlassCard className="p-5 space-y-3">
            <span className="text-xs text-slate-400 block font-mono">Select Application Color Theme:</span>
            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              {[
                { id: 'dark', label: 'Dark Cyber', icon: Moon, desc: 'Enterprise Dark Mode' },
                { id: 'light', label: 'Light Clean', icon: Sun, desc: 'High Contrast Light Mode' },
                { id: 'system', label: 'System Default', icon: Monitor, desc: 'OS Match' }
              ].map(t => {
                const Icon = t.icon;
                const isSelected = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => updateSettings({ theme: t.id as any })}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                      isSelected 
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                        : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div>
                      <span className="font-bold block text-white">{t.label}</span>
                      <span className="text-[9px] text-slate-500 block leading-tight">{t.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Dispatcher Actions Preferences (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Alerts & Notifications
            </h3>
          </div>

          <GlassCard className="p-5 space-y-4 text-xs">
            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-950/60 border border-slate-900">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-300 block">Sound Alert Warnings</span>
                <span className="text-[10px] text-slate-500 block leading-normal font-mono">Play alarm sirens inside the dashboard layout</span>
              </div>
              <input
                type="checkbox"
                checked={settings.soundAlerts}
                onChange={() => updateSettings({ soundAlerts: !settings.soundAlerts })}
                className="rounded bg-slate-950 border-slate-800 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-950/60 border border-slate-900">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-300 block">Auto Emergency Escalation Rule</span>
                <span className="text-[10px] text-slate-500 block leading-normal font-mono">Automatically escalate persistent critical surges to Emergency Review Required (dispatch requires operator authorization)</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoEscalation}
                onChange={() => updateSettings({ autoEscalation: !settings.autoEscalation })}
                className="rounded bg-slate-950 border-slate-800 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-950/60 border border-slate-900">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-300 block">FCA High-Confidence Prioritization</span>
                <span className="text-[10px] text-slate-500 block leading-normal font-mono">Automatically elevate priority of Galois concept recommendations for operator review (operator retains approval authority)</span>
              </div>
              <input
                type="checkbox"
                checked={settings.fcaAutoRecommendation}
                onChange={() => updateSettings({ fcaAutoRecommendation: !settings.fcaAutoRecommendation })}
                className="rounded bg-slate-950 border-slate-800 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
              />
            </label>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
