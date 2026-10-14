import React, { useState } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { Users, Shield, Plus, Clock, MapPin, X, CheckCircle, Trash2 } from 'lucide-react';

export const EventsPage: React.FC = () => {
  const { events, selectedEventId, setSelectedEventId, addEvent, deleteEvent } = useCrowdSystem();
  const [showAddForm, setShowAddForm] = useState(false);

  // New Event Form State
  const [title, setTitle] = useState('');
  const [venueName, setVenueName] = useState('');
  const [capacity, setCapacity] = useState(5000);
  const [limits, setLimits] = useState(4200);
  const [staff, setStaff] = useState(30);
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('10:00 PM');
  const [submitting, setSubmitting] = useState(false);

  const riskColors = {
    low: 'text-green-400 bg-green-950/20 border-green-500/20',
    medium: 'text-amber-400 bg-amber-950/20 border-amber-500/20',
    high: 'text-red-400 bg-red-950/20 border-red-500/20 animate-pulse',
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSubmitting(true);
    try {
      await addEvent({
        title,
        venue_name: venueName || 'Main Arena Complex',
        capacity: Number(capacity),
        limits: Number(limits),
        staff: Number(staff),
        risk,
        start: startTime,
        end: endTime,
        assignedCameras: []
      });
      setShowAddForm(false);
      setTitle('');
      setVenueName('');
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center pb-2 border-b border-cyber-border/40">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-200">
            Security Event Coordinator
          </h2>
          <p className="text-[10px] text-slate-500">
            Define venue capacity thresholds, roster dispatcher security squads, and trigger events simulation.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
        >
          <Plus className="w-3.5 h-3.5" /> Plan Event
        </button>
      </div>

      {/* Plan Event Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg cyber-glass p-6 rounded-2xl border border-cyan-500/30 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> Plan Security Operation / Event
              </h3>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Operation / Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. World Tech Expo 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Venue / Complex Name</label>
                <input
                  type="text"
                  placeholder="e.g. Smart City Arena & Convention Center"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Venue Max Capacity</label>
                  <input
                    type="number"
                    min="50"
                    max="100000"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Safety Limit (Threshold)</label>
                  <input
                    type="number"
                    min="50"
                    max="100000"
                    value={limits}
                    onChange={(e) => setLimits(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Security Officers Count</label>
                  <input
                    type="number"
                    min="1"
                    value={staff}
                    onChange={(e) => setStaff(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Risk Assessment Profile</label>
                  <select
                    value={risk}
                    onChange={(e) => setRisk(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Start Time</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">End Time</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold uppercase text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase text-[10px] shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Operation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events Roster Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Events list (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Active & Upcoming Roster
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Displaying {events.length} planned operations
            </span>
          </div>

          <div className="space-y-4">
            {events.map((evt, idx) => {
              const isCurrent = evt.id === selectedEventId || (!selectedEventId && idx === 0);

              return (
                <div 
                  key={evt.id} 
                  className={`cyber-glass p-5 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:border-cyan-500/30
                    ${isCurrent ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'border-slate-800'}`}
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isCurrent && (
                        <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-cyan-500 text-slate-950 uppercase animate-pulse flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5" /> Active Operation
                        </span>
                      )}
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase ${riskColors[evt.risk]}`}>
                        {evt.risk} Risk Profile
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" /> {evt.start} - {evt.end}
                      </span>
                      {evt.venueName && (
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" /> {evt.venueName}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white leading-snug">{evt.title}</h4>
                      <p className="text-xs text-slate-400 leading-normal mt-1 max-w-xl">
                        Capacity: <strong>{evt.capacity.toLocaleString()}</strong> · Target Safe Limit: <strong>{evt.limits.toLocaleString()}</strong> slots.
                      </p>
                    </div>

                    {/* Meta stats */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-900/60 font-mono">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-cyan-400" /> Target Limit: <strong className="text-slate-300">{evt.limits}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" /> On-Duty Dispatchers: <strong className="text-slate-300">{evt.staff} officers</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {!isCurrent && (
                      <button
                        onClick={() => setSelectedEventId(evt.id)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-600 hover:text-white text-cyan-400 text-xs font-bold uppercase transition-all"
                      >
                        Activate Area
                      </button>
                    )}
                    {events.length > 1 && (
                      <button
                        onClick={() => deleteEvent(evt.id)}
                        className="p-2 rounded-lg bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white text-xs transition-all"
                        title="Delete Operation Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Directory Sidebar (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Operations Directory
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Contacts</span>
          </div>

          <div className="cyber-glass p-5 rounded-xl border border-blue-500/10 space-y-4">
            <div className="space-y-3.5 text-xs text-slate-400">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block font-mono">Security Dispatch HQ</span>
                <p className="font-mono text-[10px]">Duty Commander Sarah Jenkins · Room 405 · Ext 4401</p>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-900/60">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block font-mono">Medical Response Team</span>
                <p className="font-mono text-[10px]">Triage Squad 1 Lead Dr. Ryan · Standby Gate A · Ext 1205</p>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-900/60">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block font-mono">Public Address (PA) Audio</span>
                <p className="font-mono text-[10px]">Central Audio Ops Desk · Evac Speakers Hub · Ext 3302</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
