import React from "react";
import {
  LayoutDashboard, RadioTower, Binary, Layers, ClipboardCheck,
  HardDrive, FileText, Activity, Truck, X, LogOut
} from "lucide-react";
import hauloopLogo from "../assets/hauloop-logo.png";

const NAV_ITEMS = [
  { id: "dashboard", label: "Screen 1 · Dashboard", icon: LayoutDashboard },
  { id: "can-monitor", label: "Screen 2 · CAN Monitor", icon: RadioTower },
  { id: "can-analyzer", label: "Screen 3 · CAN Analyzer", icon: Binary },
  { id: "avl-mapping", label: "Screen 4 · AVL Mapping", icon: Layers },
  { id: "diagnostics", label: "Screen 5 · Diagnostics", icon: ClipboardCheck },
  { id: "devices", label: "Screen 6 · Device Fleet", icon: HardDrive },
  { id: "events", label: "Screen 7 · Event Logs", icon: FileText },
  { id: "history", label: "Screen 8 · Signal History", icon: Activity }
];

export default function Sidebar({ page, setPage, open, setOpen, snapshot, currentUser, onLogout }) {
  const activeDev = snapshot?.activeDevice || { name: "FMC650 Unit", imei: "867530901234567" };
  const eventsCount = snapshot?.events?.length || 0;
  const activeSlots = snapshot?.slots?.filter(s => s.status === "Receiving")?.length || 10;

  return (
    <>
      {open && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        {/* Brand */}
        <div className="brand">
          <img
            src={hauloopLogo}
            alt="HAULOOP"
            className="brand-logo-img"
          />
          {open && (
            <button
              className="icon-button mobile-close"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Active Device Mini-Card */}
        <div className="device-mini">
          <div className="device-symbol">
            <Truck size={18} />
          </div>
          <div className="device-mini-info">
            <b title={activeDev.name}>
              {activeDev.name.split(" ")[0]} {activeDev.name.split(" ")[1]}
            </b>
            <small className="mono">IMEI {activeDev.imei.slice(-6)}</small>
          </div>
          <span className="status-dot green pulse" title="CAN1 Active (250 kbps)" />
        </div>

        {/* Navigation Section */}
        <div className="nav-label">DIAGNOSTIC SCREENS</div>
        <nav>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = page === item.id;

            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  setPage(item.id);
                  setOpen(false);
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="avatar">
            {(currentUser?.username || "FMC").slice(0, 3).toUpperCase()}
          </div>
          <div>
            <b>{currentUser?.username || "Teltonika Lab Bench"}</b>
            <small>{currentUser?.role || "Native JS Telematics Engine"}</small>
          </div>
        </div>

        {/* Sidebar Sign Out Action */}
        <button
          className="sidebar-logout-btn"
          onClick={() => {
            setOpen(false);
            if (onLogout) onLogout();
          }}
          title="Sign Out of Diagnostics"
        >
          <LogOut size={14} />
          <span>Lock / Sign Out</span>
        </button>
      </aside>
    </>
  );
}