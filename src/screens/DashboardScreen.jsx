import React, { useState } from "react";
import {
  Activity, RadioTower, CheckCircle2, AlertTriangle, XCircle, Cloud,
  Zap, Clock, Gauge, Thermometer, Droplets, Fuel, ChevronRight, Play,
  Pause, RefreshCw, Cpu, Layers, HardDrive, ShieldCheck, ArrowUpRight,
  ExternalLink, Info
} from "lucide-react";
import { MetricCard, SectionTitle, StatusPill, CircularGauge, Modal } from "../components/Ui.jsx";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export default function DashboardScreen({ snapshot, setPage }) {
  const { activeDevice, state, slots, metrics, events, history, isRunning } = snapshot;
  const [inspectModal, setInspectModal] = useState(null);

  const receivingCount = slots.filter(s => s.status === "Receiving").length;
  const noDataCount = slots.filter(s => s.status === "No Data").length;
  const staleCount = slots.filter(s => s.status === "Stale").length;
  const decodeErrors = metrics.decodingErrors;

  // Recent 4 events
  const recentEvents = events.slice(0, 4);

  return (
    <div className="page-content">
      {/* Top Welcome / Device Status Banner */}
      <div className="welcome-banner compact">
        <div className="welcome-main">
          <div className="eyebrow">SCREEN 1 · SYSTEM HEALTH & TELEMATICS OVERVIEW</div>
          <div className="welcome-title-wrap">
            <h2>Diagnostic Pipeline Control Center</h2>
            <p>
              Real-time telemetry ingestion and protocol health monitor for{" "}
              <strong className="cyan-text">{activeDevice.name}</strong>.
            </p>
          </div>
        </div>

        <div className="device-quick-badge">
          <div
            className="device-chip clickable"
            onClick={() =>
              setInspectModal({
                title: "Device Hardware Identity",
                category: "Teltonika FMC650",
                description: "Hardware identification and cellular transceiver status",
                details: [
                  { label: "IMEI", value: activeDevice.imei, isMono: true },
                  { label: "Vehicle Name", value: activeDevice.name },
                  { label: "VIN", value: activeDevice.vin, isMono: true },
                  { label: "Device Model", value: "Teltonika FMC650 (Heavy Commercial)" },
                  { label: "Firmware Revision", value: activeDevice.firmware, isMono: true },
                  { label: "Profile", value: activeDevice.configProfile }
                ],
                targetScreen: "devices",
                targetScreenName: "Device Fleet (Screen 6)"
              })
            }
          >
            <Cpu size={13} className="cyan-text" />
            <div>
              <small>IMEI</small>
              <strong className="mono">{activeDevice.imei}</strong>
            </div>
          </div>

          <div
            className="device-chip clickable"
            onClick={() =>
              setInspectModal({
                title: "Device Firmware Revision",
                category: "Firmware Diagnostics",
                description: "Teltonika firmware build and protocol compliance",
                details: [
                  { label: "Installed Firmware", value: activeDevice.firmware, isMono: true },
                  { label: "J1939 Stack", value: "Compliant SAE J1939-71" },
                  { label: "Codec Format", value: "Codec 8 Extended (8E)" },
                  { label: "Manual CAN Slots", value: "15 hardware slots enabled" },
                  { label: "Status", value: "Verified & Up to Date" }
                ],
                targetScreen: "devices",
                targetScreenName: "Device Fleet (Screen 6)"
              })
            }
          >
            <ShieldCheck size={13} className="green-text" />
            <div>
              <small>FIRMWARE</small>
              <strong>{activeDevice.firmware}</strong>
            </div>
          </div>

          <div
            className="device-chip clickable"
            onClick={() =>
              setInspectModal({
                title: "CAN Port & Physical Interface",
                category: "CAN Physical Layer",
                description: "Physical transceiver routing and bus baud rate",
                details: [
                  { label: "Primary Channel", value: activeDevice.canChannel },
                  { label: "Nominal Baud Rate", value: activeDevice.canBaud },
                  { label: "Protocol", value: "SAE J1939 (29-bit Extended IDs)" },
                  { label: "Termination Resistance", value: "120 Ω (Active Internal)" },
                  { label: "Transceiver Health", value: isRunning ? "Normal (No Bus-Off)" : "Stream Paused" }
                ],
                targetScreen: "can-monitor",
                targetScreenName: "CAN Monitor (Screen 2)"
              })
            }
          >
            <RadioTower size={13} className="blue-text" />
            <div>
              <small>CAN PORT</small>
              <strong>{activeDevice.canChannel}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Top 4 Pipeline Health Metric Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Total Manual CAN IDs"
          value={String(slots.length).padStart(2, "0")}
          sub="Configured hardware slots"
          icon={RadioTower}
          tone="cyan"
          trend="+100%"
          onClick={() =>
            setInspectModal({
              title: "Total Manual CAN IDs",
              category: "Hardware Registry",
              description: "All 15 Manual CAN hardware registers configured in FMC650 Configurator",
              details: slots.map(s => ({
                label: `${s.slot} (${s.messageName.split(" ")[0]})`,
                value: `0x${s.canIdHex} • AVL ${s.avlId} • ${s.status}`,
                isMono: true
              })),
              targetScreen: "can-monitor",
              targetScreenName: "Manual CAN Monitor (Screen 2)"
            })
          }
        />

        <MetricCard
          label="IDs Receiving Data"
          value={String(receivingCount).padStart(2, "0")}
          sub={`${slots.length > 0 ? Math.round((receivingCount / slots.length) * 100) : 0}% active frame reception`}
          icon={Activity}
          tone="green"
          trend={isRunning ? "Nominal" : "Paused"}
          onClick={() =>
            setInspectModal({
              title: "Active Receiving CAN IDs",
              category: "Bus Traffic Verification",
              description: `${receivingCount} CAN IDs actively arriving on the physical CAN bus with nominal cadence:`,
              details: slots
                .filter(s => s.status === "Receiving")
                .map(s => ({
                  label: `${s.slot} (${s.avlName})`,
                  value: `0x${s.canIdHex} • ${s.frameCount} frames • ${s.lastSeenMs}ms ago`,
                  isMono: true
                })),
              targetScreen: "can-monitor",
              targetScreenName: "Manual CAN Monitor (Screen 2)"
            })
          }
        />

        <MetricCard
          label="IDs With No Data / Stale"
          value={String(noDataCount + staleCount).padStart(2, "0")}
          sub={`${noDataCount} unverified · ${staleCount} stale`}
          icon={AlertTriangle}
          tone={noDataCount + staleCount > 0 ? "amber" : "neutral"}
          onClick={() =>
            setInspectModal({
              title: "Stale & Silent CAN IDs",
              category: "Frame Timeout Audit",
              description: "Slots with missing traffic, timeout > 3000ms, or unverified bus reception:",
              details: slots
                .filter(s => s.status !== "Receiving")
                .map(s => ({
                  label: `${s.slot} (${s.messageName.split(" ")[0]})`,
                  value: `0x${s.canIdHex} • Status: ${s.status} • AVL ${s.avlId}`,
                  isMono: true
                })),
              targetScreen: "can-monitor",
              targetScreenName: "Manual CAN Monitor (Screen 2)"
            })
          }
        />

        <MetricCard
          label="Protocol Decoding Errors"
          value={String(decodeErrors).padStart(2, "0")}
          sub={decodeErrors === 0 ? "0 byte parity or SPN faults" : "Immediate attention needed"}
          icon={XCircle}
          tone={decodeErrors === 0 ? "cyan" : "red"}
          onClick={() =>
            setInspectModal({
              title: "Protocol Decoding Integrity",
              category: "J1939 Decoding Rules",
              description: "Parity, DLC verification, and signal boundary checks:",
              details: [
                { label: "SPN Boundary Violations", value: "0 violations detected" },
                { label: "DLC Length Faults", value: "0 faults (all DLC=8)" },
                { label: "Sensor Out-of-Range (0xFE)", value: "0 occurrences" },
                { label: "Sensor Unavailable (0xFF)", value: "0 occurrences" },
                { label: "Parity Check Status", value: "100% Validated" }
              ],
              targetScreen: "events",
              targetScreenName: "Event & Fault Logs (Screen 7)"
            })
          }
        />
      </div>

      {/* Pipeline Status & Device Vital Overview */}
      <div className="content-grid main-grid">
        {/* Left: Telemetry Pipeline Visualizer & Live Trend */}
        <section className="panel pipeline-panel">
          <SectionTitle
            title="End-to-End Diagnostic Pipeline"
            detail="Click any stage box to inspect detailed diagnostic parameters"
            action={
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => setPage("diagnostics")}
              >
                Run Tests <ChevronRight size={13} />
              </button>
            }
          />

          <div className="pipeline-flow">
            {/* Box 1: FMC650 Tracker */}
            <div
              className="pipeline-node active clickable"
              onClick={() =>
                setInspectModal({
                  title: "Stage 1: Teltonika FMC650 Hardware Tracker",
                  category: "Telemetry Ingestion Pipeline",
                  description: "Edge hardware capturing vehicle CAN bus signals and GNSS coordinates",
                  details: [
                    { label: "Unit Model", value: "Teltonika FMC650 Advanced Fleet Tracker" },
                    { label: "IMEI", value: activeDevice.imei, isMono: true },
                    { label: "Firmware Build", value: activeDevice.firmware, isMono: true },
                    { label: "Power Supply", value: `${state.extVoltage} V (Battery: ${state.batVoltage} V)` },
                    { label: "Ignition State", value: state.ignition },
                    { label: "GNSS Coordinates", value: "10.823078° N, 78.685815° E", isMono: true },
                    { label: "Processing State", value: isRunning ? "Normal (Streaming 250 Kbps)" : "Stream Paused" }
                  ],
                  targetScreen: "devices",
                  targetScreenName: "Device Fleet (Screen 6)"
                })
              }
            >
              <div className="node-icon"><HardDrive size={14} /></div>
              <div className="node-content">
                <strong>FMC650 Tracker</strong>
                <span className="mono">IMEI {activeDevice.imei.slice(-6)}</span>
              </div>
              <span className="node-tag ok">{isRunning ? "ONLINE" : "PAUSED"}</span>
            </div>

            <div className="pipeline-arrow">➔</div>

            {/* Box 2: CAN1 Transceiver */}
            <div
              className="pipeline-node active clickable"
              onClick={() =>
                setInspectModal({
                  title: "Stage 2: CAN1 Physical Transceiver",
                  category: "CAN Physical Layer",
                  description: "Differential physical interface connected to heavy vehicle powertrain bus",
                  details: [
                    { label: "Channel Port", value: activeDevice.canChannel },
                    { label: "Bus Baud Rate", value: activeDevice.canBaud },
                    { label: "Bus Status", value: metrics.canBusStatus },
                    { label: "Active PGNs", value: `${receivingCount} Parameter Groups` },
                    { label: "Bus Load", value: isRunning ? "24.8% (Nominal for 250 kbps)" : "0%" },
                    { label: "Bit-Stuffing Errors", value: "0 bursts" }
                  ],
                  targetScreen: "can-monitor",
                  targetScreenName: "CAN Monitor (Screen 2)"
                })
              }
            >
              <div className="node-icon"><Activity size={14} /></div>
              <div className="node-content">
                <strong>CAN1 Transceiver</strong>
                <span>250 kbps · J1939</span>
              </div>
              <span className="node-tag ok">{isRunning ? "ACTIVE" : "STANDBY"}</span>
            </div>

            <div className="pipeline-arrow">➔</div>

            {/* Box 3: AVL Engine */}
            <div
              className="pipeline-node active clickable"
              onClick={() =>
                setInspectModal({
                  title: "Stage 3: Teltonika Codec 8E AVL Engine",
                  category: "Telemetry Serialization",
                  description: "Transforms Manual CAN raw byte buffers into Teltonika standard AVL element IDs",
                  details: [
                    { label: "Packet Protocol", value: "Teltonika Codec 8 Extended" },
                    { label: "Total Mapped Elements", value: "15 AVL elements" },
                    { label: "Mapping Health", value: "100% Verified against Configurator" },
                    { label: "Codec 8E Payload Size", value: "184 bytes per record" },
                    { label: "AVL Element Sample", value: `AVL 145 (RPM): ${Math.round(state.rpm * 8)}` }
                  ],
                  targetScreen: "avl-mapping",
                  targetScreenName: "AVL ID Mapping (Screen 4)"
                })
              }
            >
              <div className="node-icon"><Layers size={14} /></div>
              <div className="node-content">
                <strong>AVL Engine</strong>
                <span>Codec 8E Packet</span>
              </div>
              <span className="node-tag ok">MAPPED</span>
            </div>

            <div className="pipeline-arrow">➔</div>

            {/* Box 4: AWS IoT Core */}
            <div
              className="pipeline-node active clickable"
              onClick={() =>
                setInspectModal({
                  title: "Stage 4: AWS IoT Core MQTT Ingestion",
                  category: "Cloud Telematics Broker",
                  description: "Secure enterprise MQTT telemetry ingestion broker and digital twin shadow",
                  details: [
                    { label: "MQTT Topic", value: activeDevice.mqttTopic, isMono: true },
                    { label: "Quality of Service", value: "QoS 1 (At Least Once Delivery)" },
                    { label: "Broker Confirmation", value: isRunning ? `PUBACK (${state.mqttLatencyMs}ms)` : "Offline" },
                    { label: "Transport Security", value: "TLS 1.3 / X.509 Certificate" },
                    { label: "Cloud Ingestion Status", value: metrics.lastAwsUpdate }
                  ],
                  targetScreen: "events",
                  targetScreenName: "Event Logs (Screen 7)"
                })
              }
            >
              <div className="node-icon"><Cloud size={14} /></div>
              <div className="node-content">
                <strong>AWS IoT Core</strong>
                <span>QoS 1 Ack ({state.mqttLatencyMs || 0}ms)</span>
              </div>
              <span className="node-tag ok">{isRunning ? "CONFIRMED" : "DISCONNECTED"}</span>
            </div>
          </div>

          <div className="mini-chart-section">
            <div className="chart-header-row">
              <div>
                <strong>Live Signal Activity</strong>
                <small>Engine RPM & Vehicle Speed continuous trace</small>
              </div>
              <div className="chart-legend">
                <span className="legend-cyan" /> RPM
                <span className="legend-blue" /> km/h
              </div>
            </div>

            <div className="chart-wrap-mini">
              <ResponsiveContainer width="100%" height={85}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="rpmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e5252a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#e5252a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      fontSize: 10,
                      padding: "4px 8px",
                      color: "#0f172a",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rpm"
                    stroke="#e5252a"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#rpmGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="speed"
                    stroke="#2563eb"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#speedGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Right: Selected Device Overview Card */}
        <section className="panel device-panel-wrap">
          <SectionTitle
            title="Vehicle Vitals & Timestamps"
            detail="Click any vital row to inspect diagnostic values"
            action={
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => setPage("devices")}
              >
                Switch Device
              </button>
            }
          />

          <div
            className="device-health-row clickable"
            onClick={() =>
              setInspectModal({
                title: "Vehicle Profile & Diagnostic Health",
                category: "Fleet Telematics Subject",
                description: "Primary commercial vehicle under active bench diagnostics:",
                details: [
                  { label: "Vehicle", value: activeDevice.name },
                  { label: "Chassis Classification", value: activeDevice.vehicleType },
                  { label: "VIN", value: activeDevice.vin, isMono: true },
                  { label: "Config Profile", value: activeDevice.configProfile },
                  { label: "Pipeline Health Index", value: isRunning ? "94% (Nominal)" : "0% (Stream Off)" },
                  { label: "CAN Channel", value: activeDevice.canChannel }
                ],
                targetScreen: "devices",
                targetScreenName: "Device Management (Screen 6)"
              })
            }
          >
            <CircularGauge
              value={isRunning ? 94 : 0}
              label="Pipeline Health"
              size={48}
              stroke={5}
              color={isRunning ? "#15803d" : "#94a3b8"}
            />
            <div className="device-health-text">
              <h4>{activeDevice.name}</h4>
              <p>{activeDevice.vehicleType}</p>
              <div className="badges-list">
                <StatusPill state={isRunning ? "success" : "neutral"}>
                  {isRunning ? "CAN1 Active" : "CAN1 Off"}
                </StatusPill>
                <StatusPill state={state.ignition === "ON" ? "success" : "neutral"}>
                  Ignition: {state.ignition}
                </StatusPill>
              </div>
            </div>
          </div>

          <div className="vitals-table">
            <div
              className="vitals-row clickable"
              onClick={() =>
                setInspectModal({
                  title: "CAN Bus Connection Diagnostics",
                  category: "CAN Interface",
                  description: "Status of the physical differential CAN transceiver line:",
                  details: [
                    { label: "Port", value: activeDevice.canChannel },
                    { label: "Speed", value: activeDevice.canBaud },
                    { label: "Bus Status", value: metrics.canBusStatus },
                    { label: "Broadcasting Rate", value: isRunning ? "250 Kbps" : "0 Kbps" }
                  ],
                  targetScreen: "can-monitor",
                  targetScreenName: "CAN Monitor (Screen 2)"
                })
              }
            >
              <span className="vitals-label">CAN Bus Connection</span>
              <strong className="cyan-text">{metrics.canBusStatus}</strong>
            </div>

            <div
              className="vitals-row clickable"
              onClick={() =>
                setInspectModal({
                  title: "Ignition State (DIN 1 / AVL 239)",
                  category: "Vehicle Power Circuit",
                  description: "Teltonika Digital Input 1 ignition sensing line:",
                  details: [
                    { label: "Digital Input 1", value: state.ignition === "ON" ? "High (1)" : "Low (0)" },
                    { label: "AVL Element ID", value: "239" },
                    { label: "Interpretation", value: state.ignition === "ON" ? "Engine Running / Key ON" : "Key OFF / Standby" }
                  ],
                  targetScreen: "avl-mapping",
                  targetScreenName: "AVL Mapping (Screen 4)"
                })
              }
            >
              <span className="vitals-label">Ignition Status</span>
              <strong className={state.ignition === "ON" ? "green-text" : "text-muted"}>
                <Zap size={13} className="inline-icon" /> {state.ignition}
              </strong>
            </div>

            <div
              className="vitals-row clickable"
              onClick={() =>
                setInspectModal({
                  title: "Last Device Telemetry Record",
                  category: "Frame Buffer Timestamp",
                  description: "Most recent packet generated by FMC650 internal FIFO buffer:",
                  details: [
                    { label: "Last Ingestion Time", value: metrics.lastRecordTime },
                    { label: "Transmission Protocol", value: "Teltonika Codec 8E" },
                    { label: "Source Clock", value: "GNSS Synchronized UTC" }
                  ],
                  targetScreen: "can-monitor",
                  targetScreenName: "CAN Monitor (Screen 2)"
                })
              }
            >
              <span className="vitals-label">Last Device Record</span>
              <strong className="mono">{metrics.lastRecordTime}</strong>
            </div>

            <div
              className="vitals-row clickable"
              onClick={() =>
                setInspectModal({
                  title: "AWS IoT Core Broker Ingestion",
                  category: "MQTT Delivery",
                  description: "Cloud MQTT broker message verification:",
                  details: [
                    { label: "Last Acknowledgment", value: metrics.lastAwsUpdate },
                    { label: "Roundtrip Latency", value: `${state.mqttLatencyMs || 0} ms` },
                    { label: "Broker Endpoint", value: "a2n9xk39m8x2.iot.ap-south-1.amazonaws.com" }
                  ],
                  targetScreen: "events",
                  targetScreenName: "Event Logs (Screen 7)"
                })
              }
            >
              <span className="vitals-label">Last AWS Ingestion Update</span>
              <strong className="purple-text">{metrics.lastAwsUpdate}</strong>
            </div>

            <div
              className="vitals-row clickable"
              onClick={() =>
                setInspectModal({
                  title: "External Alternator Power (AVL 66)",
                  category: "Electrical System",
                  description: "Vehicle primary battery & alternator voltage sensed by FMC650:",
                  details: [
                    { label: "Measured Voltage", value: `${state.extVoltage} V` },
                    { label: "AVL Element ID", value: "66" },
                    { label: "Raw Transmitted", value: `${Math.round(state.extVoltage * 1000)} mV` },
                    { label: "Nominal Rating", value: "24V Commercial Heavy Duty" }
                  ],
                  targetScreen: "avl-mapping",
                  targetScreenName: "AVL Mapping (Screen 4)"
                })
              }
            >
              <span className="vitals-label">External Alternator Power</span>
              <strong className="mono">{state.extVoltage} V (Nominal 24V)</strong>
            </div>

            <div
              className="vitals-row clickable"
              onClick={() =>
                setInspectModal({
                  title: "Backup Li-Ion Battery (AVL 67)",
                  category: "Internal Power",
                  description: "FMC650 internal emergency rechargeable battery voltage:",
                  details: [
                    { label: "Battery Voltage", value: `${state.batVoltage} V` },
                    { label: "AVL Element ID", value: "67" },
                    { label: "Charge Status", value: "92% (Fully Charged)" }
                  ],
                  targetScreen: "avl-mapping",
                  targetScreenName: "AVL Mapping (Screen 4)"
                })
              }
            >
              <span className="vitals-label">Backup Li-Ion Battery</span>
              <strong className="mono">{state.batVoltage} V</strong>
            </div>
          </div>

          <div className="panel-actions-footer">
            <button
              className="btn btn-secondary btn-xs full"
              onClick={() => setPage("can-monitor")}
            >
              Open Manual CAN ID Monitor <ChevronRight size={13} />
            </button>
          </div>
        </section>
      </div>

      {/* Live Driveline Signals Strip - Every Box Clickable */}
      <section className="panel signals-strip-panel">
        <SectionTitle
          title="Live Decoded Driveline Signals"
          detail="Click any signal box below to inspect J1939 SPN, raw byte calculations, and historical plots"
        />

        <div className="strip-grid">
          {/* Signal 1: Engine Speed */}
          <div
            className="signal-card clickable"
            onClick={() =>
              setInspectModal({
                title: "Engine Speed (SPN 190 / EEC1)",
                category: "Powertrain Core Signal",
                description: "Actual rotational speed calculated from crankshaft position sensor",
                details: [
                  { label: "Decoded Value", value: `${Math.round(state.rpm)} RPM`, isHighlight: true },
                  { label: "SPN (Suspect Parameter Number)", value: "190" },
                  { label: "PGN", value: "61444 (0x0F004 - EEC1)" },
                  { label: "Manual CAN Slot", value: "CAN 00" },
                  { label: "AVL Element ID", value: "145" },
                  { label: "Raw Transmitted Integer", value: `${Math.round(state.rpm * 8)}` },
                  { label: "Raw Hexadecimal Word", value: `0x${Math.round(state.rpm * 8).toString(16).toUpperCase().padStart(4, "0")}` },
                  { label: "Scaling Transfer Function", value: "Decoded = Raw × 0.125" },
                  { label: "Valid Operational Range", value: "0 to 8031.875 RPM" }
                ],
                targetScreen: "history",
                targetScreenName: "Signal History (Screen 8)"
              })
            }
          >
            <div className="sig-icon"><Gauge size={13} /></div>
            <div className="sig-details">
              <small>ENGINE SPEED (SPN 190)</small>
              <strong>{Math.round(state.rpm)} <span className="sig-unit">RPM</span></strong>
              <span>AVL ID 145 · Raw {Math.round(state.rpm * 8)}</span>
            </div>
          </div>

          {/* Signal 2: Road Speed */}
          <div
            className="signal-card clickable"
            onClick={() =>
              setInspectModal({
                title: "Vehicle Road Speed (SPN 84 / CCVS1)",
                category: "Chassis Dynamics Signal",
                description: "Wheel-based vehicle velocity measured from transmission output shaft",
                details: [
                  { label: "Decoded Value", value: `${state.speed.toFixed(1)} km/h`, isHighlight: true },
                  { label: "SPN", value: "84" },
                  { label: "PGN", value: "65265 (0x0FEF1 - CCVS1)" },
                  { label: "Manual CAN Slot", value: "CAN 01" },
                  { label: "AVL Element ID", value: "146" },
                  { label: "Raw Transmitted Integer", value: `${Math.round(state.speed * 256)}` },
                  { label: "Scaling Transfer Function", value: "Decoded = Raw / 256" },
                  { label: "Active Transmission Gear", value: `Gear G${state.gear}` }
                ],
                targetScreen: "history",
                targetScreenName: "Signal History (Screen 8)"
              })
            }
          >
            <div className="sig-icon"><Activity size={13} /></div>
            <div className="sig-details">
              <small>ROAD SPEED (SPN 84)</small>
              <strong>{state.speed.toFixed(1)} <span className="sig-unit">km/h</span></strong>
              <span>AVL ID 146 · Gear G{state.gear}</span>
            </div>
          </div>

          {/* Signal 3: Coolant Temp */}
          <div
            className="signal-card clickable"
            onClick={() =>
              setInspectModal({
                title: "Engine Coolant Temperature (SPN 110 / ET1)",
                category: "Engine Thermal Signal",
                description: "Temperature of coolant fluid circulating inside engine block",
                details: [
                  { label: "Decoded Value", value: `${state.coolantTemp.toFixed(1)} °C`, isHighlight: true },
                  { label: "SPN", value: "110" },
                  { label: "PGN", value: "65262 (0x0FEEE - ET1)" },
                  { label: "Manual CAN Slot", value: "CAN 07" },
                  { label: "AVL Element ID", value: "152" },
                  { label: "Raw Byte Value", value: `${Math.round(state.coolantTemp + 40)} (0x${Math.round(state.coolantTemp + 40).toString(16).toUpperCase()})` },
                  { label: "Scaling Formula", value: "Decoded = Raw - 40" },
                  { label: "Thermal Alert State", value: state.coolantTemp > 100 ? "WARNING: Elevated Temperature" : "NORMAL (Optimal Range)" }
                ],
                targetScreen: "history",
                targetScreenName: "Signal History (Screen 8)"
              })
            }
          >
            <div className="sig-icon"><Thermometer size={13} /></div>
            <div className="sig-details">
              <small>COOLANT TEMP (SPN 110)</small>
              <strong>{state.coolantTemp.toFixed(1)} <span className="sig-unit">°C</span></strong>
              <span>AVL ID 152 · {state.coolantTemp > 100 ? "High Warning" : "Optimal"}</span>
            </div>
          </div>

          {/* Signal 4: Oil Pressure */}
          <div
            className="signal-card clickable"
            onClick={() =>
              setInspectModal({
                title: "Engine Oil Pressure (SPN 100 / EFL_P1)",
                category: "Lubrication Circuit Signal",
                description: "Main oil galley lube pressure delivered by mechanical oil pump",
                details: [
                  { label: "Decoded Value", value: `${Math.round(state.oilPressure)} kPa`, isHighlight: true },
                  { label: "SPN", value: "100" },
                  { label: "PGN", value: "65263 (0x0FEEF - EFL_P1)" },
                  { label: "Manual CAN Slot", value: "CAN 08" },
                  { label: "AVL Element ID", value: "153" },
                  { label: "Raw Byte Value", value: `${Math.round(state.oilPressure / 4)}` },
                  { label: "Scaling Formula", value: "Decoded = Raw × 4" },
                  { label: "Lubrication Status", value: state.oilPressure < 120 ? "CRITICAL: Low Pressure" : "Adequate Lube Film" }
                ],
                targetScreen: "history",
                targetScreenName: "Signal History (Screen 8)"
              })
            }
          >
            <div className="sig-icon"><Droplets size={13} /></div>
            <div className="sig-details">
              <small>OIL PRESSURE (SPN 100)</small>
              <strong>{Math.round(state.oilPressure)} <span className="sig-unit">kPa</span></strong>
              <span>AVL ID 153 · Lube Circuit</span>
            </div>
          </div>

          {/* Signal 5: Fuel Rate */}
          <div
            className="signal-card clickable"
            onClick={() =>
              setInspectModal({
                title: "Instantaneous Fuel Rate (SPN 183 / LFE)",
                category: "Fuel Economy Metric",
                description: "Diesel fuel delivered into common rail injection system per hour",
                details: [
                  { label: "Decoded Value", value: `${state.fuelRate.toFixed(1)} L/h`, isHighlight: true },
                  { label: "SPN", value: "183" },
                  { label: "PGN", value: "65266 (0x0FEF2 - LFE)" },
                  { label: "Manual CAN Slot", value: "CAN 06" },
                  { label: "AVL Element ID", value: "151" },
                  { label: "Raw Integer", value: `${Math.round(state.fuelRate / 0.05)}` },
                  { label: "Scaling Formula", value: "Decoded = Raw × 0.05" },
                  { label: "Lifetime Total Fuel Used", value: `${state.totalFuel.toFixed(1)} Liters` }
                ],
                targetScreen: "history",
                targetScreenName: "Signal History (Screen 8)"
              })
            }
          >
            <div className="sig-icon"><Fuel size={13} /></div>
            <div className="sig-details">
              <small>FUEL RATE (SPN 183)</small>
              <strong>{state.fuelRate.toFixed(1)} <span className="sig-unit">L/h</span></strong>
              <span>AVL ID 151 · Instantaneous</span>
            </div>
          </div>

          {/* Signal 6: DEF Level */}
          <div
            className="signal-card clickable"
            onClick={() =>
              setInspectModal({
                title: "DEF / AdBlue Tank Level (SPN 1761 / AT1T1I)",
                category: "Aftertreatment Exhaust",
                description: "Diesel Exhaust Fluid tank percentage for SCR catalytic converter",
                details: [
                  { label: "Decoded Value", value: `${state.defLevel.toFixed(1)} %`, isHighlight: true },
                  { label: "SPN", value: "1761" },
                  { label: "PGN", value: "65110 (0x0FE56 - AT1T1I)" },
                  { label: "Manual CAN Slot", value: "CAN 09" },
                  { label: "AVL Element ID", value: "154" },
                  { label: "Raw Byte Value", value: `${Math.round(state.defLevel / 0.4)}` },
                  { label: "Scaling Formula", value: "Decoded = Raw × 0.4" },
                  { label: "SCR Emission Status", value: "Compliant Euro 6 / BS VI" }
                ],
                targetScreen: "avl-mapping",
                targetScreenName: "AVL Mapping (Screen 4)"
              })
            }
          >
            <div className="sig-icon"><ShieldCheck size={13} /></div>
            <div className="sig-details">
              <small>DEF TANK LEVEL</small>
              <strong>{state.defLevel.toFixed(1)} <span className="sig-unit">%</span></strong>
              <span>AVL ID 154 · AdBlue Tank</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section: Recent Diagnostic Events */}
      <section className="panel">
        <SectionTitle
          title="Recent Diagnostic Events"
          detail="Automatic rule engine evaluations for missing frames, sensor anomalies, and broker communication"
          action={
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => setPage("events")}
            >
              View All Events ({events.length}) <ChevronRight size={13} />
            </button>
          }
        />

        <div className="event-list">
          {recentEvents.map(evt => (
            <div
              className="event-item clickable"
              key={evt.id}
              onClick={() =>
                setInspectModal({
                  title: `Diagnostic Event: ${evt.title}`,
                  category: evt.category,
                  description: evt.detail,
                  details: [
                    { label: "Severity", value: evt.severity },
                    { label: "Event Time", value: evt.time },
                    { label: "Source Subsystem", value: evt.source || "SYSTEM" },
                    { label: "Diagnostic Explanation", value: evt.detail }
                  ],
                  targetScreen: "events",
                  targetScreenName: "Event Logs (Screen 7)"
                })
              }
            >
              <div className={`event-icon event-${evt.severity.toLowerCase()}`}>
                {evt.severity === "CRIT" ? (
                  <XCircle size={13} />
                ) : evt.severity === "WARN" ? (
                  <AlertTriangle size={13} />
                ) : (
                  <Activity size={13} />
                )}
              </div>
              <div className="event-copy">
                <div className="event-title-row">
                  <b>{evt.title}</b>
                  <StatusPill state={evt.severity === "CRIT" ? "danger" : evt.severity === "WARN" ? "warning" : "neutral"}>
                    {evt.severity}
                  </StatusPill>
                  <span className="source-tag">{evt.category}</span>
                </div>
                <span>{evt.detail}</span>
              </div>
              <time className="mono">{evt.time}</time>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Detail Modal - Makes Every Box Data Visible */}
      <Modal
        isOpen={Boolean(inspectModal)}
        onClose={() => setInspectModal(null)}
        title={inspectModal?.title || "Box Details"}
      >
        {inspectModal && (
          <div className="inspect-modal-body">
            <div className="inspect-header-badge">
              <span className="source-tag">{inspectModal.category}</span>
              <p className="inspect-desc">{inspectModal.description}</p>
            </div>

            <div className="inspect-details-table">
              {inspectModal.details.map((item, idx) => (
                <div key={idx} className="inspect-detail-row">
                  <span className="inspect-detail-label">{item.label}</span>
                  <strong className={`inspect-detail-value ${item.isMono ? "mono" : ""} ${item.isHighlight ? "cyan-text font-bold" : ""}`}>
                    {item.value}
                  </strong>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setInspectModal(null)}
              >
                Close
              </button>
              {inspectModal.targetScreen && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setPage(inspectModal.targetScreen);
                    setInspectModal(null);
                  }}
                >
                  <ExternalLink size={14} /> Open {inspectModal.targetScreenName}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
