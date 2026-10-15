import React, { useState } from "react";
import {
  Search, Play, Pause, Download, Filter, RadioTower, CheckCircle2,
  AlertTriangle, RefreshCw, ChevronRight, Binary, Eye, ArrowUpRight
} from "lucide-react";
import { MetricCard, SectionTitle, StatusPill, EmptyState, ByteCell } from "../components/Ui.jsx";
import { exportToCSV, exportToJSON } from "../lib/can.js";

export default function CanMonitorScreen({ snapshot, setPage, onSelectCanId }) {
  const { slots, frameMap, isRunning } = snapshot;
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCanId, setSelectedCanId] = useState("0CF00400");
  const [isPaused, setIsPaused] = useState(false);

  // Filter slots
  const filteredSlots = slots.filter(slot => {
    const matchesQuery =
      (slot.canIdHex + slot.slotName + slot.messageName + slot.avlName + slot.pgnHex)
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesChannel = channelFilter === "ALL" || slot.channel.includes(channelFilter);
    const matchesStatus = statusFilter === "ALL" || slot.status === statusFilter;
    return matchesQuery && matchesChannel && matchesStatus;
  });

  const selectedSlot = slots.find(s => s.canIdHex === selectedCanId) || slots[0];
  const selectedFrame = frameMap.get(selectedCanId) || {
    bytes: [0, 0, 0, 0, 0, 0, 0, 0],
    deltaFlags: [false, false, false, false, false, false, false, false],
    frameCount: 0,
    lastSeen: "—",
    changingBytesCount: 0
  };

  const handleExportCSV = () => {
    const exportRows = filteredSlots.map(s => {
      const f = frameMap.get(s.canIdHex);
      return {
        Slot: s.slotName,
        CAN_ID_HEX: "0x" + s.canIdHex,
        Mask_HEX: "0x" + s.maskHex,
        Type: s.canType,
        Channel: s.channel,
        PGN_HEX: s.pgnHex,
        PGN_DEC: s.pgnDec,
        Signal_Message: s.messageName,
        AVL_Element_ID: s.avlId,
        DLC: s.dlc,
        Raw_Bytes: f ? f.bytes.map(b => (b & 0xff).toString(16).toUpperCase().padStart(2, "0")).join(" ") : "—",
        Frame_Count: f ? f.frameCount : 0,
        Last_Seen_Time: f ? f.lastSeen : "—",
        Status: s.status
      };
    });
    exportToCSV(exportRows, "fmc650-manual-can-monitor.csv");
  };

  const handleExportJSON = () => {
    exportToJSON(filteredSlots, "fmc650-manual-can-monitor.json");
  };

  return (
    <div className="page-content">
      {/* Banner */}
      <div className="welcome-banner compact">
        <div>
          <div className="eyebrow">SCREEN 2 · MANUAL CAN ID RECEPTION MONITOR</div>
          <h2>Manual CAN ID Live Frame Inspector</h2>
          <p>
            Verify whether each configured 29-bit CAN ID and mask is actively arriving on the FMC650 CAN bus.
          </p>
        </div>
        <div className="banner-actions">
          <button
            className={`btn ${isPaused ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? "Resume Live Feed" : "Pause View"}
          </button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportJSON}>
            <Download size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* Top 3 Stat Cards */}
      <div className="metric-grid three">
        <MetricCard
          label="Monitored CAN IDs"
          value={String(slots.length).padStart(2, "0")}
          sub="Configured hardware slots"
          icon={RadioTower}
          tone="cyan"
        />
        <MetricCard
          label="Active Receiving"
          value={String(slots.filter(s => s.status === "Receiving").length).padStart(2, "0")}
          sub="Cadence within nominal bounds (<1000ms)"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          label="Stale or Silent Slots"
          value={String(slots.filter(s => s.status !== "Receiving").length).padStart(2, "0")}
          sub="Timeout exceeded or no frame received"
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      {/* Two-Column Layout: Left Master List / Right Detailed Hex Dump (Matches Screenshot #2) */}
      <div className="content-grid split-monitor-grid">
        {/* Left: Filterable List of Configured CAN IDs */}
        <section className="panel">
          <SectionTitle
            title="Configured Manual CAN IDs"
            detail="Click an ID to inspect bytes and delta highlights"
          />

          <div className="toolbar compact">
            <div className="search-box">
              <Search size={15} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search CAN ID, PGN, slot or signal..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Receiving">Receiving</option>
              <option value="Stale">Stale</option>
              <option value="No Data">No Data</option>
            </select>
          </div>

          <div className="can-id-cards-list">
            {filteredSlots.map(slot => {
              const frame = frameMap.get(slot.canIdHex);
              const isSelected = slot.canIdHex === selectedCanId;
              const changing = frame?.changingBytesCount || 0;

              return (
                <div
                  key={slot.slot}
                  className={`can-id-list-item ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedCanId(slot.canIdHex)}
                >
                  <div className="item-left">
                    <div className="item-title-row">
                      <strong className="mono cyan-text">0x{slot.canIdHex}</strong>
                      <span className="slot-badge">{slot.slot}</span>
                      <StatusPill state={slot.status === "Receiving" ? "success" : "warning"}>
                        {slot.status}
                      </StatusPill>
                    </div>
                    <div className="item-sub">
                      <b>{slot.messageName}</b>
                    </div>
                    <div className="item-meta">
                      <span>Mask: 0x{slot.maskHex}</span>
                      <span>•</span>
                      <span>AVL: {slot.avlId}</span>
                      <span>•</span>
                      <span>{slot.channel}</span>
                    </div>
                  </div>

                  <div className="item-right">
                    <div className="frame-count-badge">
                      <strong>{frame?.frameCount || slot.frameCount}</strong>
                      <small>frames</small>
                    </div>
                    {changing > 0 && (
                      <span className="changing-badge">
                        {changing} changing {changing === 1 ? "byte" : "bytes"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredSlots.length === 0 && (
              <EmptyState title="No matching CAN IDs" detail="Try a different query or status filter." />
            )}
          </div>
        </section>

        {/* Right: Selected Frame Hex Dump & Delta Inspection (Matches Screenshot #2) */}
        <section className="panel frame-playground-panel">
          <div className="playground-header">
            <div>
              <div className="eyebrow">ACTIVE FRAME INSPECTION</div>
              <h3>
                CAN ID: <span className="mono cyan-text">0x{selectedSlot?.canIdHex}</span>
              </h3>
              <p>
                {selectedSlot?.messageName} · DLC {selectedSlot?.dlc} · {selectedSlot?.channel}
              </p>
            </div>
            <div className="playground-stats">
              <div className="stat-pill">
                <small>LAST SEEN</small>
                <strong>{selectedFrame.lastSeen}</strong>
              </div>
              <div className="stat-pill">
                <small>UPDATE RATE</small>
                <strong>
                  {selectedSlot?.expectedCadenceMs
                    ? `${(1000 / selectedSlot.expectedCadenceMs).toFixed(1)} Hz`
                    : "1.0 Hz"}
                </strong>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (onSelectCanId) onSelectCanId(selectedSlot.canIdHex);
                  setPage("can-analyzer");
                }}
              >
                Analyze Signal <Binary size={14} />
              </button>
            </div>
          </div>

          {/* Hex Dump Table with Hex + Decimal + Delta highlights */}
          <div className="hex-dump-container">
            <div className="table-caption-row">
              <strong>Hexadecimal & Decimal Payload Dump (Byte 0 to Byte 7)</strong>
              <small className="muted">
                Green ▲ indicator highlights dynamic byte changes between consecutive frames
              </small>
            </div>

            <div className="table-scroll">
              <table className="hex-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>B0</th>
                    <th>B1</th>
                    <th>B2</th>
                    <th>B3</th>
                    <th>B4</th>
                    <th>B5</th>
                    <th>B6</th>
                    <th>B7</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="current-frame-row">
                    <td className="mono text-muted">0</td>
                    <td className="mono text-muted">{selectedFrame.lastSeen}</td>
                    {selectedFrame.bytes.map((byte, idx) => (
                      <td key={idx}>
                        <ByteCell
                          byte={byte}
                          isDelta={selectedFrame.deltaFlags[idx]}
                          index={idx}
                        />
                      </td>
                    ))}
                  </tr>
                  <tr className="prev-frame-row">
                    <td className="mono text-muted">1 (Prev)</td>
                    <td className="mono text-muted">t - 1</td>
                    {selectedFrame.prevBytes.map((byte, idx) => (
                      <td key={idx}>
                        <ByteCell
                          byte={byte}
                          isDelta={false}
                          index={idx}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Configuration & Acceptance Filter Spec */}
          <div className="spec-card-grid">
            <div className="spec-card">
              <span>CONFIGURED CAN ID</span>
              <strong className="mono cyan-text">0x{selectedSlot?.canIdHex}</strong>
            </div>
            <div className="spec-card">
              <span>HARDWARE ACCEPTANCE MASK</span>
              <strong className="mono">0x{selectedSlot?.maskHex}</strong>
            </div>
            <div className="spec-card">
              <span>FRAME FORMAT</span>
              <strong>{selectedSlot?.canType}</strong>
            </div>
            <div className="spec-card">
              <span>CAN CHANNEL</span>
              <strong>{selectedSlot?.channel}</strong>
            </div>
            <div className="spec-card">
              <span>ASSOCIATED AVL ELEMENT</span>
              <strong className="mono purple-text">AVL ID {selectedSlot?.avlId}</strong>
            </div>
            <div className="spec-card">
              <span>SIGNAL TARGET</span>
              <strong>{selectedSlot?.avlName} ({selectedSlot?.unit})</strong>
            </div>
          </div>
        </section>
      </div>

      {/* Complete Table of All Configured Manual CAN IDs */}
      <section className="panel">
        <SectionTitle
          title="All Configured Manual CAN Slots (Hardware Table)"
          detail="FMC650 Configurator Manual CAN registers, physical channels, and frame counters"
        />

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Manual CAN Slot</th>
                <th>CAN ID (HEX)</th>
                <th>Filter / Mask</th>
                <th>CAN Type</th>
                <th>Channel</th>
                <th>PGN</th>
                <th>DLC</th>
                <th>Signal / Message</th>
                <th>AVL ID</th>
                <th>Frames</th>
                <th>Last Seen</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlots.map(s => {
                const f = frameMap.get(s.canIdHex);
                return (
                  <tr key={s.slot} className="hoverable-row">
                    <td>
                      <span className="slot-badge">{s.slot}</span>
                    </td>
                    <td className="mono cyan-text font-bold">0x{s.canIdHex}</td>
                    <td className="mono">0x{s.maskHex}</td>
                    <td>{s.canType}</td>
                    <td>{s.channel}</td>
                    <td className="mono">{s.pgnHex}</td>
                    <td>{s.dlc}</td>
                    <td>
                      <b>{s.messageName}</b>
                    </td>
                    <td className="mono purple-text font-bold">{s.avlId}</td>
                    <td className="mono">{f?.frameCount || s.frameCount}</td>
                    <td>{s.lastSeenMs}ms ago</td>
                    <td>
                      <StatusPill state={s.status === "Receiving" ? "success" : "warning"}>
                        {s.status}
                      </StatusPill>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => {
                          if (onSelectCanId) onSelectCanId(s.canIdHex);
                          setPage("can-analyzer");
                        }}
                      >
                        Decode <ChevronRight size={13} />
                      </button>
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
