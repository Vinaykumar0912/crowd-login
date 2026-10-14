import React, { useState } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { GlassCard } from '../components/GlassCard';
import { 
  Radio, 
  Send, 
  CheckCheck, 
  Mic, 
  Wifi, 
  WifiOff, 
  Battery, 
  Shield, 
  MessageSquare, 
  Zap,
  Clock
} from 'lucide-react';

export const StaffCommunication: React.FC = () => {
  const { guards, instructionLogs, sendInstruction, recommendations } = useCrowdSystem();

  // Communication Form State
  const [targetType, setTargetType] = useState<'individual' | 'group' | 'emergency'>('individual');
  const [selectedGuardId, setSelectedGuardId] = useState<string>(guards[0]?.id || '');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [instructionText, setInstructionText] = useState('');
  const [isBroadcastingVoice, setIsBroadcastingVoice] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructionText.trim()) return;

    let recipientName = 'All Security Staff (Broadcast)';
    if (targetType === 'individual') {
      const target = guards.find(g => g.id === selectedGuardId);
      recipientName = target ? `${target.name} (${target.zone})` : 'Individual Guard';
    } else if (targetType === 'group') {
      recipientName = 'On-Duty Rapid Response Squad';
    } else if (targetType === 'emergency') {
      recipientName = 'ALL SECURITY UNITS (EMERGENCY BROADCAST)';
    }

    sendInstruction({
      recipient: recipientName,
      type: targetType,
      priority,
      text: instructionText
    });

    setInstructionText('');
  };

  const useAiSuggestion = (recText: string) => {
    setInstructionText(`AI DIRECTIVE: ${recText}`);
  };

  return (
    <div className="space-y-8 pb-12 font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs mb-1">
            <Radio className="w-4 h-4" />
            <span>COMMAND CENTER DISPATCH GATEWAY</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Security Staff Communication Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Transmit real-time audio announcements, text directives, and emergency dispatches to security personnel stationed across venue zones.
          </p>
        </div>

        {/* Live Audio Dispatch Push-to-Talk */}
        <button
          onClick={() => setIsBroadcastingVoice(!isBroadcastingVoice)}
          className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border shadow-lg ${
            isBroadcastingVoice 
              ? 'bg-red-600 border-red-500 text-white animate-pulse shadow-red-600/30' 
              : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/40'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>{isBroadcastingVoice ? 'Live Audio Broadcast Active...' : 'Hold to Speak (Voice Announce)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. Left Side: Dispatch Console (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>Instruction Transmission Console</span>
              </h3>
              <span className="text-[10px] text-slate-500">Encrypted Channel 4</span>
            </div>

            <form onSubmit={handleSend} className="space-y-4 text-xs">
              {/* Broadcast Target Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">Broadcast Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'individual', label: 'Individual Staff' },
                    { id: 'group', label: 'Zone Group' },
                    { id: 'emergency', label: 'Emergency All' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setTargetType(mode.id as any)}
                      className={`py-2 px-3 rounded-xl font-bold uppercase tracking-wider border transition-all text-[10px] ${
                        targetType === mode.id
                          ? mode.id === 'emergency' 
                            ? 'bg-red-950/80 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                            : 'bg-cyan-950/60 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Selection (if individual) */}
              {targetType === 'individual' && guards.length > 0 && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block">Target Security Officer</label>
                  <select
                    value={selectedGuardId}
                    onChange={(e) => setSelectedGuardId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-cyber-border text-white focus:outline-none focus:border-cyan-500/40"
                  >
                    {guards.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} — Zone: {g.zone} ({g.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Priority Level */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">Priority Level</label>
                <div className="flex gap-3">
                  {[
                    { id: 'normal', label: 'Normal', color: 'border-blue-500/30 text-blue-400' },
                    { id: 'urgent', label: 'Urgent', color: 'border-orange-500/30 text-orange-400' },
                    { id: 'emergency', label: 'CRITICAL EMERGENCY', color: 'border-red-500 text-red-400 font-extrabold' }
                  ].map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input 
                        type="radio" 
                        name="priority" 
                        value={p.id} 
                        checked={priority === p.id} 
                        onChange={() => setPriority(p.id as any)}
                        className="accent-cyan-500"
                      />
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${p.color}`}>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Instruction Textarea */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">Instruction Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Redirect crowd flow at Gate A turnstiles to auxiliary corridor B..."
                  value={instructionText}
                  onChange={(e) => setInstructionText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-cyber-border text-white focus:outline-none focus:border-cyan-500/40 text-xs leading-relaxed"
                />
              </div>

              {/* AI Recommended Quick Dispatches */}
              {recommendations.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400" /> AI Directives Quick Shortcut:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {recommendations.slice(0, 3).map(rec => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => useAiSuggestion(rec.title)}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors text-left"
                      >
                        + {rec.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              >
                <Send className="w-4 h-4 fill-white" /> Transmit Instruction via Mobile Relay
              </button>
            </form>
          </GlassCard>

          {/* Transmission History Logs */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Instruction Transmission Logs</span>
              </h3>
              <span className="text-[10px] text-slate-500">{instructionLogs.length} Messages Recorded</span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {instructionLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-900 text-xs space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-bold">{log.timestamp} · TO: {log.recipient}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${log.priority === 'emergency' ? 'bg-red-950 text-red-400 border border-red-500/20' : 'bg-slate-900 text-slate-400'}`}>
                        {log.priority}
                      </span>
                      <span className="text-green-400 flex items-center gap-0.5">
                        <CheckCheck className="w-3.5 h-3.5" /> {log.deliveryStatus}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-300 leading-normal">"{log.text}"</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* 2. Right Side: Security Staff Roster & Device Status (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>On-Duty Security Personnel ({guards.length})</span>
            </h3>
          </div>

          <div className="space-y-3">
            {guards.length > 0 ? (
              guards.map((guard) => (
                <GlassCard key={guard.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <img 
                        src={guard.avatar} 
                        alt={guard.name} 
                        className="w-10 h-10 rounded-full object-cover border border-slate-800"
                      />
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0A0E1A] ${guard.isOnline ? 'bg-green-400' : 'bg-slate-600'}`} />
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">{guard.name}</h4>
                      <p className="text-[10px] text-cyan-400">Assigned: {guard.zone}</p>
                      <p className="text-[9px] text-slate-500 truncate">{guard.phone}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      {guard.isOnline ? (
                        <span className="text-green-400 flex items-center gap-0.5"><Wifi className="w-3 h-3" /> Online</span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-0.5"><WifiOff className="w-3 h-3" /> Offline</span>
                      )}
                      <span className="text-slate-400 flex items-center gap-0.5">
                        <Battery className="w-3 h-3" /> {guard.battery}%
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] border ${
                      guard.status === 'dispatched' ? 'bg-red-950/60 border-red-500/20 text-red-400 animate-pulse' :
                      guard.status === 'alerted' ? 'bg-orange-950/60 border-orange-500/20 text-orange-400' :
                      'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      {guard.status}
                    </span>
                  </div>
                </GlassCard>
              ))
            ) : (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-900 text-slate-500 text-xs">
                No security personnel connected in database. AI dispatches will route automatically to active camera zones.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
