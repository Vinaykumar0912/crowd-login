import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CrowdSystemProvider, useCrowdSystem } from './context/CrowdSystemContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Login } from './pages/Login';
import { OfficerControlPanel } from './pages/OfficerControlPanel';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { CrowdAnalytics } from './pages/CrowdAnalytics';
import { Heatmaps } from './pages/Heatmaps';
import { FCAPage } from './pages/FCAPage';
import { DecisionSupport } from './pages/DecisionSupport';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CameraManagement } from './pages/CameraManagement';
import { EmergencyDashboard } from './pages/EmergencyDashboard';
import { SettingsPage } from './pages/SettingsPage';
import { StaffCommunication } from './pages/StaffCommunication';
import { VenueArchitecture } from './pages/VenueArchitecture';
import { ManualVideoAnalysis } from './pages/ManualVideoAnalysis';
import { OfflineAIMode } from './pages/OfflineAIMode';
import { EventsPage } from './pages/EventsPage';
import { AnimatePresence, motion } from 'framer-motion';

const AppContent: React.FC = () => {
  const location = useLocation();
  const { emergencyState, settings, token } = useCrowdSystem();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isLoginPage = location.pathname === '/login';

  if (!token && !isLoginPage) {
    return <Navigate to="/login" replace />;
  }

  if (token && isLoginPage) {
    return <Navigate to="/officer-control" replace />;
  }

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
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
                <Route path="/officer-control" element={<OfficerControlPanel />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/live" element={<LiveMonitoring />} />
                <Route path="/live-monitoring" element={<LiveMonitoring />} />
                <Route path="/cameras" element={<CameraManagement />} />
                <Route path="/venue-architecture" element={<VenueArchitecture />} />
                <Route path="/venue" element={<VenueArchitecture />} />
                <Route path="/venue-map" element={<VenueArchitecture />} />
                <Route path="/architecture" element={<VenueArchitecture />} />
                <Route path="/staff-communication" element={<StaffCommunication />} />
                <Route path="/manual-analysis" element={<ManualVideoAnalysis />} />
                <Route path="/offline-ai" element={<OfflineAIMode />} />
                <Route path="/analytics" element={<CrowdAnalytics />} />
                <Route path="/heatmaps" element={<Heatmaps />} />
                <Route path="/fca" element={<FCAPage />} />
                <Route path="/decision-support" element={<DecisionSupport />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/emergency" element={<EmergencyDashboard />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="*" element={<Navigate to="/officer-control" replace />} />
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
