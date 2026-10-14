import React, { useState } from 'react';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { Bell, ShieldAlert, Clock, Calendar, Check, AlertCircle, Sliders, Moon, Sun } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const Topbar: React.FC = () => {
  const { 
    emergencyState, 
    currentTime, 
    currentEvent, 
    events, 
    selectedEventId, 
    setSelectedEventId, 
    alerts, 
    resolveAlert, 
    settings, 
    updateSettings 
  } = useCrowdSystem();
  const [showNotifications, setShowNotifications] = useState(false);

  const activeAlerts = alerts.filter(a => !a.resolved);

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  return (
    <header className="h-16 border-b border-cyber-border/40 px-6 flex items-center justify-between bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20 w-full select-none">
      {/* Search Bar / Event Display */}
      <div className="flex items-center gap-4">
        <NavLink 
          to="/officer-control" 
          className="px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Officer Control</span>
        </NavLink>

        {/* Current Running Event Banner / Selector */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-cyan-500/30">
          <Calendar className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="hidden md:inline text-slate-400">Event:</span>
          {events.length > 0 ? (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-transparent text-cyan-300 font-semibold text-xs border-0 outline-none cursor-pointer focus:ring-0 max-w-[180px] sm:max-w-[240px] truncate"
              title="Select Active Event / Operation"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id} className="bg-slate-900 text-slate-200">
                  {evt.title}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-cyan-300 font-semibold">{currentEvent}</span>
          )}
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

        {/* User Profile Badge */}
        <div className="flex items-center gap-2 border-l border-cyber-border/40 pl-4 select-none">
          <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-xs">
            JD
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-white leading-tight">Officer J. Doe</p>
            <p className="text-[9px] text-slate-400 leading-none">Security Ops Command</p>
          </div>
        </div>
      </div>
    </header>
  );
};
