import React, { useState, useRef, useEffect } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { 
  Bell, 
  ShieldAlert, 
  Clock, 
  Calendar, 
  Check, 
  AlertCircle, 
  Sliders, 
  Moon, 
  Sun,
  User,
  Settings,
  LogOut,
  X,
  Building,
  ChevronDown,
  Edit2,
  Save
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const { 
    emergencyState, 
    currentTime, 
    currentEvent, 
    events, 
    selectedEventId, 
    alerts, 
    resolveAlert, 
    settings, 
    updateSettings,
    user,
    logout,
    onboardingStatus,
    updateEvent
  } = useCrowdSystem();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // Edit Event State inside My Event Modal
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editCapacity, setEditCapacity] = useState(5000);
  const [editLimits, setEditLimits] = useState(4200);
  const [editStaff, setEditStaff] = useState(20);
  const [editRisk, setEditRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [editStart, setEditStart] = useState('08:00 AM');
  const [editEnd, setEditEnd] = useState('10:00 PM');
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);
  const activeAlerts = alerts.filter(a => !a.resolved);

  const activeEventObj = events.find(e => e.id === selectedEventId) || onboardingStatus?.event;

  // Initialize edit fields when opening modal
  useEffect(() => {
    if (activeEventObj) {
      setEditTitle(activeEventObj.title || '');
      setEditVenue(activeEventObj.venueName || 'Main Arena Complex');
      setEditCapacity(activeEventObj.capacity || 5000);
      setEditLimits(activeEventObj.limits || 4200);
      setEditStaff(activeEventObj.staff || 20);
      setEditRisk(activeEventObj.risk || 'medium');
      setEditStart(activeEventObj.start || '08:00 AM');
      setEditEnd(activeEventObj.end || '10:00 PM');
    }
  }, [activeEventObj, showEventModal]);

  // Click outside listener to close account dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  const handleLogout = () => {
    setShowAccountMenu(false);
    logout();
    navigate('/login', { replace: true });
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventObj || !editTitle.trim()) return;

    setIsSavingEvent(true);
    try {
      await updateEvent(activeEventObj.id, {
        title: editTitle.trim(),
        venue_name: editVenue.trim(),
        capacity: Number(editCapacity),
        limits: Number(editLimits),
        staff: Number(editStaff),
        risk: editRisk,
        start: editStart,
        end: editEnd
      });
      setIsEditingEvent(false);
    } catch (err) {
      console.error('Failed to update event:', err);
    } finally {
      setIsSavingEvent(false);
    }
  };

  // User initials
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'OP';

  return (
    <>
      <header className="h-16 border-b border-cyber-border/40 px-6 flex items-center justify-between bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20 w-full select-none font-mono">
        {/* Left Side: Active Operation Context Display */}
        <div className="flex items-center gap-4">
          <NavLink 
            to="/dashboard" 
            className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </NavLink>

          {/* Current Running Event Banner (Read-only badge scoped to authenticated manager) */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-cyan-500/30">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="hidden md:inline text-slate-400">Event:</span>
            <span 
              className="text-cyan-300 font-bold max-w-[220px] sm:max-w-[320px] truncate"
              title={activeEventObj?.title || currentEvent || 'No Active Event'}
            >
              {activeEventObj?.title || currentEvent || 'No Active Event'}
            </span>
          </div>
        </div>

        {/* Emergency Status Banner */}
        {emergencyState.isTriggered && (
          <NavLink 
            to="/emergency"
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-semibold animate-pulse cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          >
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>ACTIVE CRISIS: {emergencyState.type} IN {emergencyState.location.toUpperCase()}</span>
          </NavLink>
        )}

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-900/50 border border-cyber-border hover:border-cyan-500/40 text-slate-300 transition-colors"
            title={`Current Theme: ${settings.theme}. Click to toggle.`}
          >
            {settings.theme === 'light' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Current Local Clock */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-slate-900/40 px-3 py-1.5 rounded-lg border border-cyber-border/20 font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentTime}</span>
          </div>

          {/* Notifications Icon with Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg bg-slate-900/50 border border-cyber-border hover:border-cyan-500/40 transition-colors relative"
              title="Notifications Drawer"
            >
              <Bell className="w-4 h-4 text-slate-300" />
              {activeAlerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 rounded-xl bg-slate-950 border border-cyber-border shadow-2xl p-4 z-50">
                <div className="flex items-center justify-between mb-3 border-b border-cyber-border/20 pb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">Active Alert Logs</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold">
                    {activeAlerts.length} Active
                  </span>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {activeAlerts.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No active warnings. System secure.
                    </div>
                  ) : (
                    activeAlerts.map(alert => (
                      <div 
                        key={alert.id} 
                        className={`p-2.5 rounded-lg border text-xs flex gap-2 justify-between items-start
                          ${alert.level === 'critical' 
                            ? 'bg-red-950/20 border-red-900/40 text-red-200' 
                            : 'bg-amber-950/20 border-amber-900/40 text-amber-200'}`}
                      >
                        <div className="flex gap-2">
                          {alert.level === 'critical' 
                            ? <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /> 
                            : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          }
                          <div>
                            <p className="font-semibold leading-tight">{alert.title}</p>
                            <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{alert.description}</p>
                            <span className="text-[9px] text-slate-500 block mt-1">{alert.timestamp} · {alert.zone}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => resolveAlert(alert.id)}
                          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-green-400"
                          title="Mark alert as resolved"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-cyber-border/20 text-center">
                  <NavLink 
                    to="/alerts" 
                    onClick={() => setShowNotifications(false)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    View All Alert History →
                  </NavLink>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Badge / Clickable Avatar */}
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2.5 border-l border-cyber-border/40 pl-4 py-1 hover:opacity-90 transition-opacity cursor-pointer group"
              title="Click to view Account Menu"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 group-hover:border-cyan-400 flex items-center justify-center font-bold text-cyan-400 text-xs shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                {initials}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-white leading-tight group-hover:text-cyan-300 transition-colors">
                  {user?.name || 'Operator'}
                </p>
                <p className="text-[9px] text-slate-400 leading-none">
                  {user?.role || 'Surveillance Operator'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-transform duration-200" />
            </button>

            {/* EXACT 4-OPTION ACCOUNT DROPDOWN */}
            {/* STRICTLY NO CAMERA OPTIONS */}
            {showAccountMenu && (
              <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-[#090D1A] border border-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-2 z-50 divide-y divide-slate-800/60 font-sans">
                {/* User Header in Dropdown */}
                <div className="px-4 py-2.5">
                  <p className="text-xs font-bold text-white truncate">{user?.name || 'Operator'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email || 'operator@surveillance.gov'}</p>
                  <span className="inline-block mt-1 text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30">
                    {user?.role || 'Surveillance Operator'}
                  </span>
                </div>

                {/* Exactly 4 Specified Options */}
                <div className="py-1">
                  {/* Option 1: My Profile */}
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/80 flex items-center gap-2.5 transition-colors"
                  >
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>My Profile</span>
                  </button>

                  {/* Option 2: My Event */}
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      setShowEventModal(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/80 flex items-center gap-2.5 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>My Event</span>
                  </button>

                  {/* Option 3: Account Settings */}
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      navigate('/settings');
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/80 flex items-center gap-2.5 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-cyan-400" />
                    <span>Account Settings</span>
                  </button>
                </div>

                {/* Option 4: Logout */}
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 flex items-center gap-2.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MY PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md cyber-glass p-6 rounded-2xl border border-cyan-500/40 space-y-5">
            <div className="flex items-center justify-between border-b border-cyber-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Operator Profile</h3>
                  <p className="text-[10px] text-slate-400">Authenticated terminal identity</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-cyber-border">
                <div className="w-12 h-12 rounded-full bg-cyan-950 border-2 border-cyan-500/40 flex items-center justify-center font-bold text-cyan-300 text-sm">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{user?.name || 'Officer J. Doe'}</p>
                  <p className="text-[11px] text-slate-400">{user?.email || 'surveillance.ops@smartcity.gov'}</p>
                  <span className="inline-block mt-0.5 text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/30">
                    {user?.role || 'Command Officer'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-cyber-border space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">OPERATOR ID:</span>
                  <span className="text-slate-200">OP-{user?.id || '101'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CLEARANCE:</span>
                  <span className="text-cyan-400 font-bold">LEVEL 4 - COMMAND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SESSION:</span>
                  <span className="text-green-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    AUTHORIZED
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ACTIVE EVENT:</span>
                  <span className="text-slate-300 truncate max-w-[200px]">
                    {activeEventObj?.title || 'None Assigned'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MY EVENT MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg cyber-glass p-6 rounded-2xl border border-cyan-500/40 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-cyber-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">My Security Event</h3>
                  <p className="text-[10px] text-slate-400">Configured operation parameters</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowEventModal(false);
                  setIsEditingEvent(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!activeEventObj ? (
              <div className="p-6 rounded-xl bg-slate-950 border border-cyber-border text-center space-y-3">
                <p className="text-xs text-slate-400">No operational event is currently configured for your account.</p>
                <button
                  onClick={() => {
                    setShowEventModal(false);
                    navigate('/event-setup');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                >
                  <span>Configure Event Now</span>
                </button>
              </div>
            ) : isEditingEvent ? (
              /* Edit Event Form */
              <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Operation Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-cyber-border rounded-lg text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Venue Name</label>
                  <input
                    type="text"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-cyber-border rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Max Capacity</label>
                    <input
                      type="number"
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-cyber-border rounded-lg text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Alert Threshold (Limits)</label>
                    <input
                      type="number"
                      value={editLimits}
                      onChange={(e) => setEditLimits(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-cyber-border rounded-lg text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Security Staff</label>
                    <input
                      type="number"
                      value={editStaff}
                      onChange={(e) => setEditStaff(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-cyber-border rounded-lg text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Risk Level</label>
                    <select
                      value={editRisk}
                      onChange={(e) => setEditRisk(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-cyber-border rounded-lg text-white"
                    >
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-cyber-border/40">
                  <button
                    type="button"
                    onClick={() => setIsEditingEvent(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEvent}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingEvent ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* View Event Details */
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-cyber-border space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">EVENT TITLE:</span>
                    <h4 className="text-base font-extrabold text-white">{activeEventObj.title}</h4>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">VENUE COMPLEX:</span>
                    <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{activeEventObj.venueName || 'Main Complex Arena'}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="p-3 rounded-xl bg-slate-950 border border-cyber-border">
                    <span className="text-slate-500 block text-[9px] uppercase">MAX CAPACITY:</span>
                    <strong className="text-white text-sm">{activeEventObj.capacity}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-cyber-border">
                    <span className="text-slate-500 block text-[9px] uppercase">ALERT THRESHOLD:</span>
                    <strong className="text-cyan-400 text-sm">{activeEventObj.limits}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-cyber-border">
                    <span className="text-slate-500 block text-[9px] uppercase">SECURITY SQUAD:</span>
                    <strong className="text-white text-sm">{activeEventObj.staff} officers</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-cyber-border">
                    <span className="text-slate-500 block text-[9px] uppercase">RISK ASSESSMENT:</span>
                    <strong className="text-amber-400 text-sm uppercase">{activeEventObj.risk}</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-cyber-border flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">OPERATIONAL HOURS:</span>
                  <span className="text-slate-200">{activeEventObj.start} — {activeEventObj.end}</span>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setIsEditingEvent(true)}
                    className="px-4 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Event Details</span>
                  </button>

                  <button
                    onClick={() => setShowEventModal(false)}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
