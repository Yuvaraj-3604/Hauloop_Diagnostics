import React, { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";
import {
  Activity, Gauge, Thermometer, Droplets, Fuel, Download, RefreshCw,
  Sliders, ArrowUpRight, CheckCircle2, AlertTriangle, Layers
} from "lucide-react";
import { MetricCard, SectionTitle, StatusPill } from "../components/Ui.jsx";
import { exportToCSV } from "../lib/can.js";

const SIGNALS_CONFIG = [
  {
    id: "rpm",
    name: "Engine Speed (SPN 190)",
    decodedKey: "rpm",
    rawKey: "rpmRaw",
    unit: "RPM",
    formula: "Decoded = Raw × 0.125",
    colorDecoded: "#e5252a",
    colorRaw: "#2563eb",
    icon: Gauge,
    description: "Crankshaft rotational speed (EEC1 / 0x0CF00400)"
  },
  {
    id: "speed",
    name: "Vehicle Road Speed (SPN 84)",
    decodedKey: "speed",
    rawKey: "speedRaw",
    unit: "km/h",
    formula: "Decoded = Raw / 256",
    colorDecoded: "#34d399",
    colorRaw: "#a78bfa",
    icon: Activity,
    description: "Wheel-based vehicle velocity (CCVS1 / 0x18FEF100)"
  },
  {
    id: "temp",
    name: "Coolant Temperature (SPN 110)",
    decodedKey: "temp",
    rawKey: "tempRaw",
    unit: "°C",
    formula: "Decoded = Raw − 40",
    colorDecoded: "#f59e0b",
    colorRaw: "#ec4899",
    icon: Thermometer,
    description: "Engine block coolant jacket temp (ET1 / 0x18FEEE00)"
  },
  {
    id: "oilPress",
    name: "Engine Oil Pressure (SPN 100)",
    decodedKey: "oilPress",
    rawKey: "oilPressRaw",
    unit: "kPa",
    formula: "Decoded = Raw × 4",
    colorDecoded: "#38bdf8",
    colorRaw: "#f43f5e",
    icon: Droplets,
    description: "Full-flow gallery lube pressure (EFL_P1 / 0x18FEEF00)"
  },
  {
    id: "fuelRate",
    name: "Instant Fuel Rate (SPN 183)",
    decodedKey: "fuelRate",
    rawKey: "fuelRateRaw",
    unit: "L/h",
    formula: "Decoded = Raw × 0.05",
    colorDecoded: "#a855f7",
    colorRaw: "#10b981",
    icon: Fuel,
    description: "Fuel delivered into injectors per hour (LFE / 0x18FEF200)"
  }
];

export default function SignalHistoryScreen({ snapshot }) {
  const { history, state } = snapshot;
  const [activeSignalId, setActiveSignalId] = useState("rpm");

  const activeCfg = SIGNALS_CONFIG.find(s => s.id === activeSignalId) || SIGNALS_CONFIG[0];

  const handleExportCSV = () => {
    const data = history.map(h => ({
      Timestamp: h.time,
      Signal_Name: activeCfg.name,
      Raw_Value: h[activeCfg.rawKey],
      Raw_Hex: "0x" + Number(h[activeCfg.rawKey] || 0).toString(16).toUpperCase(),
      Applied_Formula: activeCfg.formula,
      Decoded_Value: h[activeCfg.decodedKey],
      Engineering_Unit: activeCfg.unit
    }));
    exportToCSV(data, `fmc650-signal-history-${activeCfg.id}.csv`);
  };

  const latestPoint = history[history.length - 1] || {};
  const currentDecoded = latestPoint[activeCfg.decodedKey] ?? 0;
  const currentRaw = latestPoint[activeCfg.rawKey] ?? 0;

  return (
    <div className="page-content">
      {/* Banner */}
      <div className="welcome-banner compact">
        <div>
          <div className="eyebrow">SCREEN 8 · HISTORICAL SIGNAL CORRELATION</div>
          <h2>Decoded vs Raw Physical Signal History</h2>
          <p>
            Plot physical signals over time and correlate raw telemetry words directly with
            decoded engineering values to quickly diagnose scaling errors, bit shifts, and transmission jitter.
          </p>
        </div>
        <div className="banner-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={14} /> Export Time Series CSV
          </button>
        </div>
      </div>

      {/* Signal Selection Pill Buttons */}
      <div className="signal-selector-bar">
        {SIGNALS_CONFIG.map(sig => {
          const Icon = sig.icon;
          const isActive = sig.id === activeSignalId;
          return (
            <button
              key={sig.id}
              className={`sig-pill-btn ${isActive ? "active" : ""}`}
              onClick={() => setActiveSignalId(sig.id)}
            >
              <Icon size={15} />
              <span>{sig.name.split(" ")[0]} {sig.name.split(" ")[1]}</span>
            </button>
          );
        })}
      </div>

      {/* Top 3 Current Metric Cards */}
      <div className="metric-grid three">
        <MetricCard
          label="Current Decoded Value"
          value={`${currentDecoded} ${activeCfg.unit}`}
          sub="Engineering Physical Units"
          icon={activeCfg.icon}
          tone="cyan"
        />
        <MetricCard
          label="Raw Transmission Integer"
          value={String(currentRaw)}
          sub={`Hex: 0x${Number(currentRaw).toString(16).toUpperCase()}`}
          icon={Layers}
          tone="purple"
        />
        <MetricCard
          label="Scaling & Offset Rule"
          value={activeCfg.formula.replace("Decoded = ", "")}
          sub="SAE J1939-71 compliant transfer function"
          icon={CheckCircle2}
          tone="green"
        />
      </div>

      {/* Interactive Dual-Axis Recharts Panel */}
      <section className="panel">
        <SectionTitle
          title={`Dual-Axis Correlation: ${activeCfg.name}`}
          detail={`Left Axis (Cyan): Decoded Physical [${activeCfg.unit}] · Right Axis (Purple): Raw Integer ADC Value`}
          action={
            <div className="chart-legend">
              <span className="legend-box" style={{ background: activeCfg.colorDecoded }} />
              <span>Decoded ({activeCfg.unit})</span>
              <span className="legend-box" style={{ background: activeCfg.colorRaw }} />
              <span>Raw Integer</span>
            </div>
          }
        />

        <div className="chart-wrap-large">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={history} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 11 }} />
              {/* Left Y Axis for Decoded */}
              <YAxis
                yAxisId="left"
                stroke={activeCfg.colorDecoded}
                tick={{ fill: activeCfg.colorDecoded, fontSize: 11 }}
                domain={["auto", "auto"]}
              />
              {/* Right Y Axis for Raw */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={activeCfg.colorRaw}
                tick={{ fill: activeCfg.colorRaw, fontSize: 11 }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#0f172a",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)"
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={activeCfg.decodedKey}
                name={`Decoded (${activeCfg.unit})`}
                stroke={activeCfg.colorDecoded}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={activeCfg.rawKey}
                name="Raw Telemetry (Integer)"
                stroke={activeCfg.colorRaw}
                strokeWidth={1.8}
                strokeDasharray="4 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Side-by-Side Synchronized Telemetry Table */}
      <section className="panel">
        <SectionTitle
          title="Synchronized Raw vs Decoded Sample Buffer"
          detail="Verify each transmission timestamp to detect bit shifts or scaling overflow"
        />

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sample Time</th>
                <th>Raw Integer (Dec)</th>
                <th>Raw Hex</th>
                <th>Transfer Formula</th>
                <th>Decoded Physical Value</th>
                <th>Engineering Unit</th>
                <th>Scaling Validation</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(-12).reverse().map((pt, idx) => {
                const decVal = pt[activeCfg.decodedKey];
                const rawVal = pt[activeCfg.rawKey];
                const hexVal = "0x" + Number(rawVal || 0).toString(16).toUpperCase();

                return (
                  <tr key={idx} className="hoverable-row">
                    <td className="mono">{pt.time}</td>
                    <td className="mono purple-text font-bold">{rawVal}</td>
                    <td className="mono text-muted">{hexVal}</td>
                    <td className="text-muted text-sm">{activeCfg.formula}</td>
                    <td className="mono cyan-text font-bold text-md">
                      {decVal} {activeCfg.unit}
                    </td>
                    <td>{activeCfg.unit}</td>
                    <td>
                      <StatusPill state="success">
                        Synchronized
                      </StatusPill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
