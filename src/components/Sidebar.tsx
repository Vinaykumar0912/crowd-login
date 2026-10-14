import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCrowdSystem } from '../context/CrowdSystemContext';
import { 
  Sliders,
  LayoutDashboard, 
  Video, 
  BarChart3, 
  Flame, 
  Network, 
  Cpu, 
  Bell, 
  FileText, 
  Server, 
  AlertOctagon, 
  Settings, 
  LogOut,
  Radio,
  Layers,
  PhoneCall,
  Film,
  Calendar
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { emergencyState, logout } = useCrowdSystem();

  const navItems = [
    { name: 'Officer Control Panel', path: '/officer-control', icon: Sliders, highlightCyan: true },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Events & Operations', path: '/events', icon: Calendar },
    { name: 'Live Monitoring', path: '/live', icon: Video },
    { name: 'Camera Access & Health', path: '/cameras', icon: Server },
    { name: 'Venue Architecture & Map', path: '/venue-architecture', icon: Layers },
    { name: 'Security Staff Dispatch', path: '/staff-communication', icon: PhoneCall },
    { name: 'Manual Video Analysis', path: '/manual-analysis', icon: Film },
    { name: 'Offline AI Mode', path: '/offline-ai', icon: Cpu },
    { name: 'Crowd Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Heatmaps', path: '/heatmaps', icon: Flame },
    { name: 'FCA Analysis', path: '/fca', icon: Network },
    { name: 'Decision Support', path: '/decision-support', icon: Cpu },
    { name: 'Alerts Logs', path: '/alerts', icon: Bell },
    { name: 'Emergency Panel', path: '/emergency', icon: AlertOctagon, highlightRed: true },
    { name: 'Reports Generator', path: '/reports', icon: FileText },
    { name: 'System Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen z-30 transition-all duration-300 ease-in-out border-r border-cyber-border 
        ${collapsed ? 'w-20' : 'w-64'} 
        ${emergencyState.isTriggered ? 'bg-[#150508] border-red-900/30' : 'bg-[#0B0F19]'}`}
    >
      {/* Brand Logo Header */}
      <div className="h-16 flex items-center px-4 border-b border-cyber-border/40 gap-3 overflow-hidden select-none">
        <div className={`p-2 rounded-lg ${emergencyState.isTriggered ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
          <Radio className={`w-5 h-5 ${emergencyState.isTriggered ? 'animate-ping' : ''}`} />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400">AGY SURVEILLANCE</span>
            <span className={`text-sm font-semibold truncate ${emergencyState.isTriggered ? 'text-red-400' : 'text-cyan-400 glow-text-cyan'}`}>
              CROWD-AI v2.4
            </span>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-10rem)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isEmergency = item.highlightRed && emergencyState.isTriggered;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group relative
                ${isEmergency 
                  ? 'bg-red-900/40 text-red-200 border border-red-500/30 animate-pulse' 
                  : item.highlightRed 
                    ? 'hover:bg-red-900/20 hover:text-red-300 text-slate-400 border border-transparent'
                    : item.highlightCyan && isActive
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : isActive 
                        ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/30' 
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-white border border-transparent'
                }
              `}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105
                ${isEmergency 
                  ? 'text-red-500' 
                  : item.highlightRed 
                    ? 'text-red-400'
                    : 'group-hover:text-cyan-400'}`} 
              />
              
              {!collapsed && (
                <span className="truncate">{item.name}</span>
              )}

              {/* Tooltip for collapsed sidebar */}
              {collapsed && (
                <div className="absolute left-full ml-4 px-2.5 py-1 rounded bg-slate-950 text-slate-200 text-xs 
                  invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity whitespace-nowrap 
                  z-50 border border-slate-800 shadow-xl pointer-events-none font-mono">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle & Logout */}
      <div className="absolute bottom-0 left-0 w-full p-3 border-t border-cyber-border/40 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-900/60 hover:text-white transition-colors"
          title="Toggle Navigation Menu"
        >
          <span className="text-xs uppercase tracking-wider font-semibold font-mono">
            {collapsed ? '→' : '← collapse'}
          </span>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-400/80 hover:bg-red-950/20 hover:text-red-400 transition-all border border-transparent hover:border-red-900/30"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>System Logout</span>}
        </button>
      </div>
    </aside>
  );
};
