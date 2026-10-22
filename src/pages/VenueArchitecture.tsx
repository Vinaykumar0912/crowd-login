import React, { useState, useRef } from 'react';
import { useCrowdSystem, type VenuePin } from '../context/CrowdSystemContext';
import { GlassCard } from '../components/GlassCard';
import { 
  MapPin, 
  Upload, 
  Trash2, 
  Crosshair, 
  Layers,
  Plus,
  X,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Siren,
  DoorOpen,
  Shield,
  Video,
  Lock
} from 'lucide-react';

export const VenueArchitecture: React.FC = () => {
  const { 
    venueMap, 
    events, 
    selectedEventId, 
    uploadVenueMapFile, 
    deleteVenueMapFile, 
    addVenuePin, 
    deleteVenuePin,
    activeEmergencyEvent,
    zones,
    addZone,
    deleteZone,
    cameras,
    guards
  } = useCrowdSystem();

  const [selectedPinType, setSelectedPinType] = useState<string>('all');
  const [showAddPinModal, setShowAddPinModal] = useState(false);
  const [clickCoords, setClickCoords] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [newPinType, setNewPinType] = useState<VenuePin['type']>('gate_entry');
  const [newPinLabel, setNewPinLabel] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Zone Management State
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [zoneCapacity, setZoneCapacity] = useState(500);
  const [zoneType, setZoneType] = useState('general');

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const currentEventObj = events.find(e => e.id === selectedEventId) || events[0] || {
    id: 'default',
    title: 'Smart City Arena Security Operation',
    capacity: 15000,
    staff: 120,
    risk: 'medium',
    start: '08:00 AM',
    end: '11:00 PM',
    limits: 12000,
    assignedCameras: []
  };

  const eventCameras = cameras.filter(c => c.eventId === selectedEventId);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        await uploadVenueMapFile(file);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.round((clickX / rect.width) * 10000) / 100;
    const yPercent = Math.round((clickY / rect.height) * 10000) / 100;

    setClickCoords({ x: xPercent, y: yPercent });
    setNewPinLabel('');
    setShowAddPinModal(true);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinLabel.trim()) return;

    await addVenuePin({
      type: newPinType,
      label: newPinLabel.trim(),
      x: clickCoords.x,
      y: clickCoords.y
    });

    setShowAddPinModal(false);
    setNewPinLabel('');
  };

  const filteredPins = selectedPinType === 'all' 
    ? venueMap.pins 
    : venueMap.pins.filter(p => p.type === selectedPinType);

  const getPinBadge = (type: string) => {
    switch (type) {
      case 'gate_entry': return 'bg-emerald-500 text-slate-950 font-bold';
      case 'gate_exit': return 'bg-blue-500 text-white';
      case 'emergency_exit': return 'bg-red-500 text-white animate-pulse';
      case 'security': return 'bg-cyan-400 text-slate-950 font-bold';
      case 'medical': return 'bg-purple-500 text-white';
      case 'fire': return 'bg-amber-500 text-slate-950 font-bold';
      case 'restricted': return 'bg-pink-600 text-white';
      case 'camera': return 'bg-indigo-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="space-y-8 pb-12 font-sans select-none">
      {/* Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs mb-1">
            <Layers className="w-4 h-4" />
            <span>ARCHITECTURAL SPATIAL MAPPER</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Venue Architecture & Map Management
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Upload custom floorplan blueprints for your event. Dynamically configure entry gates, evacuation routes, security posts, and operational markers.
          </p>
        </div>

        {/* Action Controls & Active Event */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active Event Display */}
          <div className="flex items-center gap-2 bg-slate-950 border border-cyber-border px-3 py-2 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 font-mono text-[10px] uppercase">Active Event:</span>
            <span className="text-white font-bold max-w-[220px] truncate">
              {currentEventObj.title}
            </span>
          </div>

          {/* Upload Blueprint Button */}
          <label className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Uploading...' : 'Upload Floorplan Map'}</span>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden" 
            />
          </label>

          {/* Delete/Reset Map Button */}
          {venueMap.url && (
            <button
              onClick={() => deleteVenueMapFile()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-900/50 text-slate-400 hover:text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Remove Map Image for this event"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Map</span>
            </button>
          )}
        </div>
      </div>

      {/* If Map Image is Uploaded, Show Controls & Side-by-Side Views */}
      {venueMap.url ? (
        <>
          {/* Map Controls Toolbar */}
          <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            {/* Pin Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 uppercase text-[10px]">Filter Markers:</span>
              <select
                value={selectedPinType}
                onChange={(e) => setSelectedPinType(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-cyber-border text-white text-xs focus:outline-none"
              >
                <option value="all">All Overlay Markers ({venueMap.pins.length})</option>
                <option value="gate_entry">Entry Gates</option>
                <option value="gate_exit">Exit Gates</option>
                <option value="emergency_exit">Emergency Exits</option>
                <option value="security">Security Command</option>
                <option value="medical">Medical Booths</option>
                <option value="fire">Fire Equipment</option>
                <option value="restricted">Restricted Zones</option>
                <option value="camera">Camera Positions</option>
              </select>
            </div>
          </GlassCard>

          {/* Architectural Blueprint & Pin Markers */}
          <div className="w-full">
            
            {/* Left: Uploaded Venue Map Blueprint & Pins */}
            <GlassCard className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  <span>Uploaded Map: {currentEventObj.title}</span>
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">CLICK MAP TO ADD PIN</span>
              </div>

              <div 
                ref={mapContainerRef}
                onClick={handleMapClick}
                style={{ aspectRatio: '3 / 2' }}
                className="relative w-full aspect-[3/2] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-crosshair group shadow-inner flex items-center justify-center"
              >
                {/* Uploaded Venue Map Image */}
                <img 
                  src={venueMap.url} 
                  alt="Uploaded Venue Map" 
                  style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                  className="w-full h-auto object-contain filter contrast-110"
                />

                {/* Subtle Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.08)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

                {/* Relative Percentage Overlay Pins */}
                {filteredPins.map((pin) => (
                  <div 
                    key={pin.id}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group/pin"
                  >
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xl flex items-center gap-1.5 transition-transform group-hover/pin:scale-110 border border-white/20 ${getPinBadge(pin.type)}`}>
                      <MapPin className="w-3 h-3" />
                      <span>{pin.label}</span>
                      <button
                        onClick={() => deleteVenuePin(pin.id)}
                        className="ml-1 hover:text-red-300 opacity-80 hover:opacity-100 transition-opacity"
                        title="Delete Pin"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Active Emergency Marker */}
                {activeEmergencyEvent && (
                  <div 
                    style={{ left: '50%', top: '50%' }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 animate-pulse"
                  >
                    <div className="px-3 py-1.5 rounded-full text-xs font-black shadow-2xl flex items-center gap-2 bg-red-600 text-white border-2 border-red-300 animate-bounce">
                      <Siren className="w-4 h-4 text-white" />
                      <span>🚨 EMERGENCY: {activeEmergencyEvent.incident_type} ({activeEmergencyEvent.location})</span>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Monitored Operational Zones Management Panel */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Monitored Operational Zones ({zones.length})</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Spatial sub-areas for multi-sensor crowd density aggregation, bottleneck detection, and localized evacuation routing.
                </p>
              </div>
              <button
                onClick={() => setShowAddZoneModal(true)}
                className="py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
              >
                <Plus className="w-3.5 h-3.5" /> Add Operational Zone
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((zone) => {
                const zoneDens = Math.min(100, Math.round(zone.density || (zone.capacity ? (zone.current_count / zone.capacity) * 100 : 0)));
                const riskColor = 
                  zone.risk_level === 'critical' ? 'text-red-400 bg-red-950/30 border-red-500/30' :
                  zone.risk_level === 'high' ? 'text-orange-400 bg-orange-950/30 border-orange-500/30' :
                  zone.risk_level === 'medium' ? 'text-amber-400 bg-amber-950/30 border-amber-500/30' :
                  'text-green-400 bg-green-950/30 border-green-500/30';

                return (
                  <div key={zone.id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-wide">{zone.name}</h4>
                        <span className="text-[9px] text-slate-500 font-mono">{zone.code} · {zone.zone_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${riskColor}`}>
                          {zone.risk_level}
                        </span>
                        <button
                          onClick={() => deleteZone(zone.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1"
                          title="Delete Zone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>Live Head Count: <strong className="text-white">{zone.current_count}</strong></span>
                        <span>Capacity: <strong className="text-slate-200">{zone.capacity}</strong></span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            zoneDens > 80 ? 'bg-red-500' : zoneDens > 50 ? 'bg-amber-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${Math.max(4, zoneDens)}%` }}
                        />
                      </div>
                      <div className="text-right text-[9px] text-slate-500 font-mono">
                        Density: {zoneDens}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Physical Infrastructure & Spatial Entities Matrix */}
          <GlassCard className="p-6 space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span>Physical Spatial Architecture & Fixed Infrastructure</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                First-class persisted physical entities mapped to {currentEventObj.title}: Gates, Entrances, Exits, Emergency Corridors, Restricted Zones, and Field Assets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              {/* Entry Gates & Entrances */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5 uppercase text-[11px]">
                    <DoorOpen className="w-4 h-4" /> Entry Gates
                  </span>
                  <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                    {venueMap.pins.filter(p => p.type === 'gate_entry').length} Active
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  {venueMap.pins.filter(p => p.type === 'gate_entry').length > 0 ? (
                    venueMap.pins.filter(p => p.type === 'gate_entry').map(p => (
                      <div key={p.id} className="truncate">• {p.label}</div>
                    ))
                  ) : (
                    <span className="text-slate-600 text-[10px]">No entry gates pinned</span>
                  )}
                </div>
              </div>

              {/* Exits & Evacuation */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between text-blue-400 font-bold">
                  <span className="flex items-center gap-1.5 uppercase text-[11px]">
                    <DoorOpen className="w-4 h-4" /> Exits & Corridors
                  </span>
                  <span className="text-[10px] bg-blue-950 px-2 py-0.5 rounded border border-blue-500/30">
                    {venueMap.pins.filter(p => p.type === 'gate_exit').length} Mapped
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  {venueMap.pins.filter(p => p.type === 'gate_exit').length > 0 ? (
                    venueMap.pins.filter(p => p.type === 'gate_exit').map(p => (
                      <div key={p.id} className="truncate">• {p.label}</div>
                    ))
                  ) : (
                    <span className="text-slate-600 text-[10px]">No standard exits pinned</span>
                  )}
                </div>
              </div>

              {/* Emergency Exits */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-red-500/20 space-y-2">
                <div className="flex items-center justify-between text-red-400 font-bold">
                  <span className="flex items-center gap-1.5 uppercase text-[11px]">
                    <Siren className="w-4 h-4" /> Emergency Exits
                  </span>
                  <span className="text-[10px] bg-red-950 px-2 py-0.5 rounded border border-red-500/30">
                    {venueMap.pins.filter(p => p.type === 'emergency_exit').length} Ready
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  {venueMap.pins.filter(p => p.type === 'emergency_exit').length > 0 ? (
                    venueMap.pins.filter(p => p.type === 'emergency_exit').map(p => (
                      <div key={p.id} className="truncate">• {p.label}</div>
                    ))
                  ) : (
                    <span className="text-slate-600 text-[10px]">No emergency exits pinned</span>
                  )}
                </div>
              </div>

              {/* Restricted Areas */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-pink-500/20 space-y-2">
                <div className="flex items-center justify-between text-pink-400 font-bold">
                  <span className="flex items-center gap-1.5 uppercase text-[11px]">
                    <Lock className="w-4 h-4" /> Restricted Areas
                  </span>
                  <span className="text-[10px] bg-pink-950 px-2 py-0.5 rounded border border-pink-500/30">
                    {venueMap.pins.filter(p => p.type === 'restricted').length + zones.filter(z => z.zone_type === 'restricted').length} Zones
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300">
                  {venueMap.pins.filter(p => p.type === 'restricted').map(p => (
                    <div key={p.id} className="truncate">• {p.label} (Pin)</div>
                  ))}
                  {zones.filter(z => z.zone_type === 'restricted').map(z => (
                    <div key={z.id} className="truncate">• {z.name} (Zone)</div>
                  ))}
                  {venueMap.pins.filter(p => p.type === 'restricted').length === 0 && zones.filter(z => z.zone_type === 'restricted').length === 0 && (
                    <span className="text-slate-600 text-[10px]">No restricted areas configured</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cameras & Security Resource Mappings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono pt-2 border-t border-slate-900">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-cyan-500/20 space-y-2">
                <div className="flex items-center justify-between text-cyan-400 font-bold">
                  <span className="flex items-center gap-1.5 uppercase text-[11px]">
                    <Video className="w-4 h-4" /> Monitored Camera Locations
                  </span>
                  <span className="text-[10px] text-slate-400">{eventCameras.length} CCTV Feeds</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 max-h-36 overflow-y-auto">
                  {eventCameras.length > 0 ? (
                    eventCameras.map(c => (
                      <div key={c.id} className="flex justify-between items-center py-0.5 border-b border-slate-900/40">
                        <span className="truncate">{c.name} ({c.location})</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${c.status === 'online' ? 'text-green-400' : 'text-slate-500'}`}>
                          {c.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-600 text-[10px]">No cameras configured for this event</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/20 space-y-2">
                <div className="flex items-center justify-between text-purple-400 font-bold">
                  <span className="flex items-center gap-1.5 uppercase text-[11px]">
                    <Shield className="w-4 h-4" /> Security Personnel & Resource Posts
                  </span>
                  <span className="text-[10px] text-slate-400">{guards.length} On Duty</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 max-h-36 overflow-y-auto">
                  {guards.map(g => (
                    <div key={g.id} className="flex justify-between items-center py-0.5 border-b border-slate-900/40">
                      <span className="truncate">{g.name} · {g.zone}</span>
                      <span className="text-[9px] text-cyan-400 font-mono">{g.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </>
      ) : (
        /* Empty State: Prompt User to Upload Venue Map */
        <GlassCard className="p-12 text-center space-y-6 max-w-3xl mx-auto border-dashed border-2 border-cyber-border/60">
          <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <ImageIcon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-white">No Venue Map Configured</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Upload an architectural floorplan, CAD blueprint, or venue layout image for <strong>{currentEventObj.title}</strong> to configure entry gates, security positions, and operational markers.
            </p>
          </div>

          <div className="pt-2">
            <label className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Upload className="w-4 h-4" />
              <span>Select & Upload Image File (PNG, JPG, WEBP)</span>
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden" 
              />
            </label>
          </div>
        </GlassCard>
      )}

      {/* Add Overlay Pin Modal */}
      {showAddPinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md cyber-glass p-6 border border-cyan-500/30 rounded-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Spatial Overlay Pin
              </h3>
              <button onClick={() => setShowAddPinModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Pin Category / Type</label>
                <select
                  value={newPinType}
                  onChange={(e) => setNewPinType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-cyber-border text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="gate_entry">Entry Gate</option>
                  <option value="gate_exit">Exit Gate</option>
                  <option value="emergency_exit">Emergency Evacuation Exit</option>
                  <option value="security">Security Command Post</option>
                  <option value="medical">First Aid / Medical Booth</option>
                  <option value="fire">Fire Hydrant Station</option>
                  <option value="restricted">Restricted Zone</option>
                  <option value="camera">CCTV Camera Position</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Pin Title / Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gate A North Turnstiles"
                  value={newPinLabel}
                  onChange={(e) => setNewPinLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-cyber-border text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-900 text-[10px] text-slate-400 space-y-1">
                <div className="flex justify-between font-bold text-slate-300">
                  <span>Relative Position Coordinates:</span>
                  <span className="text-cyan-400">X: {clickCoords.x}% | Y: {clickCoords.y}%</span>
                </div>
                <p>Coordinates are stored as relative percentages so markers remain accurately anchored on all screen sizes.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Overlay Pin
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPinModal(false)}
                  className="py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Operational Zone Modal */}
      {showAddZoneModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md cyber-glass p-6 border border-cyan-500/30 rounded-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Operational Zone
              </h3>
              <button onClick={() => setShowAddZoneModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!zoneName.trim()) return;
                await addZone({
                  name: zoneName.trim(),
                  code: zoneCode.trim() || `Z-${Date.now() % 1000}`,
                  capacity: Number(zoneCapacity),
                  zone_type: zoneType
                });
                setShowAddZoneModal(false);
                setZoneName('');
                setZoneCode('');
              }} 
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Zone Name / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Concourse & Gate B"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-cyber-border text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Zone Code</label>
                  <input
                    type="text"
                    placeholder="e.g. GATE-B-NORTH"
                    value={zoneCode}
                    onChange={(e) => setZoneCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-cyber-border text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Max Zone Capacity</label>
                  <input
                    type="number"
                    min="10"
                    max="50000"
                    value={zoneCapacity}
                    onChange={(e) => setZoneCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-cyber-border text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Zone Architectural Type</label>
                <select
                  value={zoneType}
                  onChange={(e) => setZoneType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-cyber-border text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="gate_area">Turnstiles & Gate Area</option>
                  <option value="corridor">Corridor / Choke Point</option>
                  <option value="standing">General Standing Area</option>
                  <option value="seated">Seated Arena Section</option>
                  <option value="restricted">VIP / Security Restricted</option>
                  <option value="general">Concourse General</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Zone
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddZoneModal(false)}
                  className="py-2.5 px-4 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
