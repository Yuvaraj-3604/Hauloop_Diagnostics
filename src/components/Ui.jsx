import React from "react";
import { ArrowUpRight, ArrowDownRight, CircleHelp, X } from "lucide-react";

export function StatusPill({ children, state = "neutral" }) {
  const normState = String(state).toLowerCase().replace(/\s+/g, "-");
  return (
    <span className={`pill pill-${normState}`}>
      <i />
      {children}
    </span>
  );
}

export function MetricCard({ label, value, sub, icon: Icon, tone = "cyan", trend, badge, onClick }) {
  return (
    <article
      className={`metric-card ${onClick ? "clickable-card" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        {badge && <span className="metric-badge">{badge}</span>}
        <span className={`metric-icon tone-${tone}`}>
          {Icon && <Icon size={18} />}
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-sub">
        {trend && (
          <span className="trend">
            <ArrowUpRight size={13} />
            {trend}
          </span>
        )}
        <span>{sub}</span>
        {onClick && <span className="card-click-hint">View ↗</span>}
      </div>
    </article>
  );
}

export function SectionTitle({ title, detail, action }) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {action && <div className="section-action">{action}</div>}
    </div>
  );
}

export function EmptyState({ title = "No data available", detail = "No records matched your query or filter." }) {
  return (
    <div className="empty-state">
      <CircleHelp size={24} />
      <b>{title}</b>
      <span>{detail}</span>
    </div>
  );
}

/**
 * Byte Cell with Delta Highlighting
 * Matches the CAN Frame Playground screenshot with Hex Dump & decimal value
 */
export function ByteCell({ byte, isDelta, index }) {
  const hex = "0x" + (byte & 0xff).toString(16).toUpperCase().padStart(2, "0");
  const dec = byte & 0xff;

  return (
    <div className={`hex-byte-cell ${isDelta ? "is-changed" : ""}`}>
      <div className="byte-header">
        <span className="byte-hex">{hex}</span>
        {isDelta && <span className="delta-arrow">▲</span>}
      </div>
      <span className="byte-dec">{dec}</span>
    </div>
  );
}

/**
 * Circular Gauge / Progress Ring Widget
 * Matches the IndustryOS screenshot: e.g. "Avg Health 94%"
 */
export function CircularGauge({ value = 92, label = "Avg Health", size = 76, stroke = 7, color = "#e5252a" }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="circular-gauge-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="circular-gauge-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="circular-gauge-inner">
        <span className="gauge-val">{value}%</span>
        <span className="gauge-lbl">{label}</span>
      </div>
    </div>
  );
}

/**
 * Standard Dialog Modal
 */
export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}