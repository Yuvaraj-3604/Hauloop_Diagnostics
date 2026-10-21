import React from "react";
import { Menu, Cpu, LogOut } from "lucide-react";
import { telematicsEngine } from "../lib/telematicsEngine.js";

const SCREEN_TITLES = {
  dashboard: [
    "Screen 1 · Telematics Dashboard",
    "Identify current health of the entire diagnostic pipeline at a glance"
  ],
  "can-monitor": [
    "Screen 2 · Manual CAN Monitor",
    "Establish whether a configured CAN ID is appearing in available bus frames"
  ],
  "can-analyzer": [
    "Screen 3 · CAN ID Analyzer",
    "Convert raw 29-bit CAN data into signals using J1939 rules and bit positions"
  ],
  "avl-mapping": [
    "Screen 4 · AVL ID Mapping",
    "Confirm the connection between Configurator settings and device AVL output"
  ],
  diagnostics: [
    "Screen 5 · Diagnostic Tests",
    "Repeatable bench validation for physical CAN and cloud MQTT delivery"
  ],
  devices: [
    "Screen 6 · Device Management",
    "Register FMC650 hardware units and select active test vehicle"
  ],
  events: [
    "Screen 7 · Diagnostic Event Logs",
    "Audit missing frames, sensor anomalies, and broker communication"
  ],
  history: [
    "Screen 8 · Signal History",
    "Dual-axis physical correlation between decoded units and raw telemetry"
  ]
};

export default function Topbar({ page, setOpen, snapshot, currentUser, onLogout, onOpenProfile }) {
  const [title, subtitle] = SCREEN_TITLES[page] || SCREEN_TITLES.dashboard;
  const { devices, activeDevice, isRunning, state } = snapshot;

  return (
    <header className="topbar">
      <button
        className="icon-button menu-button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      <div className="page-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="top-actions">
        {/* Device Switcher Dropdown */}
        <div className="topbar-select-wrap" title="Active FMC650 Test Vehicle">
          <Cpu size={14} className="cyan-text" />
          <select
            value={activeDevice?.id || "dev-01"}
            onChange={e => telematicsEngine.setActiveDevice(e.target.value)}
            className="topbar-select"
          >
            {devices.map(d => (
              <option key={d.id} value={d.id}>
                {d.name.split(" ")[0]} {d.name.split(" ")[1]} ({d.imei.slice(-6)})
              </option>
            ))}
          </select>
        </div>

        {/* Live Simulation Play/Pause Toggle */}
        <button
          className={`mode-switch ${isRunning ? "mode-live" : "mode-paused"}`}
          onClick={() => telematicsEngine.toggleRunning()}
          title={isRunning ? "Turn Off Live Stream (0 Kbps)" : "Turn On Live Stream (250 Kbps)"}
        >
          <span className={`switch-dot ${isRunning ? "pulse" : ""}`} />
          <span className="mode-label-desktop">{isRunning ? "Live Stream (250 Kbps)" : "Stream Off (0 Kbps)"}</span>
          <span className="mode-label-mobile">{isRunning ? "Live (250k)" : "Paused (0k)"}</span>
        </button>

        {/* MQTT AWS ACK indicator */}
        <div className="connection-pill" title="AWS IoT Core MQTT Broker Roundtrip">
          <span className="status-dot green" />
          <span className="mono">AWS IoT: {state.mqttLatencyMs || 42}ms</span>
        </div>
      </div>

      {/* Operator Profile Pill (Exit button removed, clickable to view details) */}
      <div
        className="operator-profile-pill clickable"
        onClick={() => onOpenProfile && onOpenProfile()}
        title="View Operator Profile Details"
        role="button"
        tabIndex={0}
      >
        <span className="operator-avatar">
          {(currentUser?.username || "E").slice(0, 1).toUpperCase()}
        </span>
        <span className="operator-name">{currentUser?.username || "Engineer"}</span>
      </div>
    </header>
  );
}