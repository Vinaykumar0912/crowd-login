import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CrowdSystemProvider, useCrowdSystem } from './context/CrowdSystemContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { EventSetup } from './pages/EventSetup';
import { CameraSetup } from './pages/CameraSetup';
import { OfficerControlPanel } from './pages/OfficerControlPanel';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { CrowdAnalytics } from './pages/CrowdAnalytics';
import { DecisionSupport } from './pages/DecisionSupport';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CameraManagement } from './pages/CameraManagement';
import { EmergencyDashboard } from './pages/EmergencyDashboard';
import { SettingsPage } from './pages/SettingsPage';
import { StaffCommunication } from './pages/StaffCommunication';
import { VenueArchitecture } from './pages/VenueArchitecture';
import { AnimatePresence, motion } from 'framer-motion';

const AppContent: React.FC = () => {
  const location = useLocation();
  const { emergencyState, settings, token, onboardingStatus, isOnboardingLoading } = useCrowdSystem();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  // 1. Unauthenticated users -> strictly Login or Register
  if (!token && !isLoginPage && !isRegisterPage) {
    return <Navigate to="/login" replace />;
  }

  // 2. Loading state: avoid redirect loops and premature navigation
  if (token && isOnboardingLoading) {
    return (
      <div className="min-h-screen bg-[#060913] flex flex-col items-center justify-center space-y-4 font-mono text-cyan-400 select-none">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
            CROWD-AI SURVEILLANCE SYSTEM
          </p>
          <p className="text-[10px] text-slate-500">
            Synchronizing operation status & live surveillance feeds...
          </p>
        </div>
      </div>
    );
  }

  // 3. Conditional Onboarding Redirect Logic (Table in Spec):
  // | Manager status | Destination |
  // | Not authenticated | Login |
  // | Authenticated, no event configured | Event Setup |
  // | Event exists, required source setup incomplete | Camera Setup |
  // | Event and source setup complete | Existing Dashboard |
  if (token && onboardingStatus) {
    // Condition A: Authenticated, no event configured -> Event Setup
    if (!onboardingStatus.has_event) {
      if (location.pathname !== '/event-setup') {
        return <Navigate to="/event-setup" replace />;
      }
    }
    // Condition B: Event exists, source setup incomplete -> Camera Setup
    else if (!onboardingStatus.has_source) {
      if (location.pathname !== '/camera-setup' && location.pathname !== '/event-setup') {
        return <Navigate to="/camera-setup" replace />;
      }
    }
    // Condition C: Setup complete -> redirect away from login, register, or setup if entered directly
    else {
      if (isLoginPage || isRegisterPage || location.pathname === '/event-setup') {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  if (isLoginPage || isRegisterPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const isLightTheme = settings.theme === 'light';

  return (
    <div className={`min-h-screen flex relative transition-colors duration-300 ${
      isLightTheme 
        ? 'bg-slate-100 text-slate-900' 
        : emergencyState.isTriggered 
          ? 'bg-[#120406] text-white' 
          : 'bg-[#0A0E1A] text-white'
    }`}>
      {/* Dynamic Background Mesh Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />

      {/* Collapsible Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Core Layout Shell */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 min-h-screen relative z-10
          ${sidebarCollapsed ? 'pl-20' : 'pl-64'}`}
      >
        <Topbar />
        
        {/* Animated Page Transitions wrapper */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1600px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="w-full h-full"
            >
              <Routes location={location}>
                {/* Onboarding Dedicated Pages */}
                <Route path="/event-setup" element={<EventSetup />} />
                <Route path="/camera-setup" element={<CameraSetup />} />

                {/* Surveillance & Command Routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/officer-control" element={<OfficerControlPanel />} />
                <Route path="/live" element={<LiveMonitoring />} />
                <Route path="/live-monitoring" element={<LiveMonitoring />} />
                <Route path="/cameras" element={<CameraManagement />} />
                <Route path="/venue-architecture" element={<VenueArchitecture />} />
                <Route path="/venue" element={<VenueArchitecture />} />
                <Route path="/venue-map" element={<VenueArchitecture />} />
                <Route path="/architecture" element={<VenueArchitecture />} />
                <Route path="/staff-communication" element={<StaffCommunication />} />
                <Route path="/analytics" element={<CrowdAnalytics />} />
                <Route path="/decision-support" element={<DecisionSupport />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/emergency" element={<EmergencyDashboard />} />
                <Route path="/settings" element={<SettingsPage />} />

                {/* Graceful redirects for removed features */}
                <Route path="/events" element={<Navigate to="/dashboard" replace />} />
                <Route path="/manual-analysis" element={<Navigate to="/dashboard" replace />} />
                <Route path="/offline-ai" element={<Navigate to="/dashboard" replace />} />
                <Route path="/heatmaps" element={<Navigate to="/dashboard" replace />} />
                <Route path="/fca" element={<Navigate to="/dashboard" replace />} />

                {/* Default route redirect to dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <CrowdSystemProvider>
      <AppContent />
    </CrowdSystemProvider>
  );
};

export default App;
