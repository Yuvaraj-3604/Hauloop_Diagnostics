import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, RadioTower, Binary, ClipboardCheck, Layers
} from "lucide-react";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import { telematicsEngine } from "./lib/telematicsEngine.js";

// Import all 8 diagnostic screens and LoginScreen
import LoginScreen from "./screens/LoginScreen.jsx";
import DashboardScreen from "./screens/DashboardScreen.jsx";
import CanMonitorScreen from "./screens/CanMonitorScreen.jsx";
import CanAnalyzerScreen from "./screens/CanAnalyzerScreen.jsx";
import AvlMappingScreen from "./screens/AvlMappingScreen.jsx";
import DiagnosticsScreen from "./screens/DiagnosticsScreen.jsx";
import DeviceManagementScreen from "./screens/DeviceManagementScreen.jsx";
import EventLogsScreen from "./screens/EventLogsScreen.jsx";
import SignalHistoryScreen from "./screens/SignalHistoryScreen.jsx";
import ProfileDetailsModal from "./components/ProfileDetailsModal.jsx";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [drilldownCanId, setDrilldownCanId] = useState("0CF00400");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(() => telematicsEngine.getSnapshot());

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const stored = localStorage.getItem("hauloop_auth");
      return stored ? JSON.parse(stored).isAuthenticated : false;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("hauloop_auth");
      return stored ? JSON.parse(stored).user : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (user, remember) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    if (remember) {
      localStorage.setItem("hauloop_auth", JSON.stringify({ isAuthenticated: true, user }));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem("hauloop_auth");
    setPage("dashboard");
  };

  // Subscribe to real-time native JS simulation ticks
  useEffect(() => {
    const unsubscribe = telematicsEngine.subscribe(newSnapshot => {
      setSnapshot(newSnapshot);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectCanIdForAnalysis = canIdHex => {
    setDrilldownCanId(canIdHex);
    setPage("can-analyzer");
  };

  const renderActiveScreen = () => {
    switch (page) {
      case "dashboard":
        return <DashboardScreen snapshot={snapshot} setPage={setPage} />;
      case "can-monitor":
        return (
          <CanMonitorScreen
            snapshot={snapshot}
            setPage={setPage}
            onSelectCanId={handleSelectCanIdForAnalysis}
          />
        );
      case "can-analyzer":
        return (
          <CanAnalyzerScreen
            initialCanId={drilldownCanId}
            snapshot={snapshot}
            setPage={setPage}
          />
        );
      case "avl-mapping":
        return <AvlMappingScreen snapshot={snapshot} setPage={setPage} />;
      case "diagnostics":
        return <DiagnosticsScreen snapshot={snapshot} setPage={setPage} />;
      case "devices":
        return <DeviceManagementScreen snapshot={snapshot} setPage={setPage} />;
      case "events":
        return <EventLogsScreen snapshot={snapshot} setPage={setPage} />;
      case "history":
        return <SignalHistoryScreen snapshot={snapshot} setPage={setPage} />;
      default:
        return <DashboardScreen snapshot={snapshot} setPage={setPage} />;
    }
  };

  // If not authenticated, render LoginScreen with CAPTCHA verification
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        open={menuOpen}
        setOpen={setMenuOpen}
        snapshot={snapshot}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setProfileModalOpen(true)}
      />
      <main className="main-area">
        <Topbar
          page={page}
          setOpen={setMenuOpen}
          snapshot={snapshot}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenProfile={() => setProfileModalOpen(true)}
        />
        {renderActiveScreen()}
        <footer className="app-footer">
          <div className="footer-left">
            <span>HAULOOP FMC650 TELEMATICS LAB · SAE J1939 DIAGNOSTICS</span>
            <span className="dot">•</span>
            <span>Teltonika AVL Codec 8E Protocol Engine</span>
          </div>
          <div className="footer-right">
            <span>Pure React & Native JS · Active Benchmark</span>
          </div>
        </footer>
      </main>

      {/* Native Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mob-nav-btn ${page === "dashboard" ? "active" : ""}`}
          onClick={() => setPage("dashboard")}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>
        <button
          className={`mob-nav-btn ${page === "can-monitor" ? "active" : ""}`}
          onClick={() => setPage("can-monitor")}
        >
          <RadioTower size={18} />
          <span>Monitor</span>
        </button>
        <button
          className={`mob-nav-btn ${page === "can-analyzer" ? "active" : ""}`}
          onClick={() => setPage("can-analyzer")}
        >
          <Binary size={18} />
          <span>Analyzer</span>
        </button>
        <button
          className={`mob-nav-btn ${page === "diagnostics" ? "active" : ""}`}
          onClick={() => setPage("diagnostics")}
        >
          <ClipboardCheck size={18} />
          <span>Tests</span>
        </button>
        <button
          className="mob-nav-btn"
          onClick={() => setMenuOpen(true)}
        >
          <Layers size={18} />
          <span>Screens</span>
        </button>
      </nav>

      {/* Operator Profile Details Dialog */}
      <ProfileDetailsModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentUser={currentUser}
        activeDevice={snapshot.activeDevice}
        onLogout={handleLogout}
      />
    </div>
  );
}