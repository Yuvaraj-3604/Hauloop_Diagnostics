import React, { useState } from "react";
import {
  Binary, Search, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight,
  Info, Cpu, Sliders, Layers, ChevronRight, Hash, Database
} from "lucide-react";
import { SectionTitle, StatusPill } from "../components/Ui.jsx";
import { parseJ1939Id, extractSignalBits, isBitOccupied, checkSignalValidity } from "../lib/can.js";
import { DBC_MESSAGES } from "../data/canDefinitions.js";

export default function CanAnalyzerScreen({ initialCanId = "0CF00400", snapshot }) {
  const [canIdInput, setCanIdInput] = useState(initialCanId);
  const [selectedMessageName, setSelectedMessageName] = useState("EEC1");
  const [selectedSignalName, setSelectedSignalName] = useState("EngineSpeed");
  const [customBytesHex, setCustomBytesHex] = useState("");

  // Find active DBC message definition
  const activeMessage =
    DBC_MESSAGES.find(m => m.name === selectedMessageName) || DBC_MESSAGES[0];

  // Look up live frame from engine if available
  const liveFrame = snapshot?.frameMap?.get(activeMessage.idHex);
  const currentBytes = customBytesHex
    ? customBytesHex
        .trim()
        .split(/\s+/)
        .map(b => parseInt(b, 16) || 0)
    : liveFrame?.bytes || [0x01, 0x6e, 0x82, 0xb8, 0x0b, 0xff, 0xff, 0xff];

  // Parse current 29-bit CAN ID
  const parsedId = parseJ1939Id(canIdInput || activeMessage.idHex);

  // Selected signal object
  const activeSignal =
    activeMessage.signals.find(s => s.name === selectedSignalName) ||
    activeMessage.signals[0];

  // Decode each signal in active message
  const decodedSignals = activeMessage.signals.map(sig => {
    const rawVal = extractSignalBits(
      currentBytes,
      sig.startBit,
      sig.bitLength,
      sig.byteOrder
    );
    const decodedVal = Number((rawVal * sig.factor + sig.offset).toFixed(2));
    const validity = checkSignalValidity(
      rawVal,
      sig.bitLength,
      sig.min,
      sig.max,
      decodedVal
    );

    return {
      ...sig,
      rawVal,
      rawHex: "0x" + rawVal.toString(16).toUpperCase(),
      decodedVal,
      validity
    };
  });

  return (
    <div className="page-content">
      {/* Banner */}
      <div className="welcome-banner compact">
        <div>
          <div className="eyebrow">SCREEN 3 · CAN ID ANALYZER & SIGNAL DECODER</div>
          <h2>Protocol Definition & Bitfield Inspector</h2>
          <p>
            Convert raw 29-bit CAN arbitration IDs into J1939 PGNs, decode bit positions,
            and inspect physical engineering units using standard DBC rules.
          </p>
        </div>
        <div className="banner-actions">
          <div className="quick-select-pills">
            {DBC_MESSAGES.map(m => (
              <button
                key={m.name}
                className={`pill-btn ${selectedMessageName === m.name ? "active" : ""}`}
                onClick={() => {
                  setSelectedMessageName(m.name);
                  setCanIdInput(m.idHex);
                  setSelectedSignalName(m.signals[0].name);
                  setCustomBytesHex("");
                }}
              >
                {m.name} ({m.pgnHex})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 29-Bit Identifier Architecture & Breakdown Panel */}
      <section className="panel">
        <SectionTitle
          title="29-Bit Extended CAN Identifier Breakdown"
          detail="SAE J1939 bitfield decomposition: Priority (3b), PGN (18b), PDU Format, PDU Specific, and Source Address"
        />

        <div className="id-analyzer-bar">
          <div className="input-group">
            <label>29-bit CAN ID (HEX)</label>
            <div className="id-input-wrap">
              <input
                className="mono"
                value={canIdInput}
                onChange={e => setCanIdInput(e.target.value)}
                placeholder="0CF00400"
              />
            </div>
          </div>

          <div className="input-group flex-2">
            <label>8-Byte Raw Payload (Hex Bytes)</label>
            <input
              className="mono"
              value={
                customBytesHex ||
                currentBytes
                  .map(b => (b & 0xff).toString(16).toUpperCase().padStart(2, "0"))
                  .join(" ")
              }
              onChange={e => setCustomBytesHex(e.target.value)}
              placeholder="01 6E 82 B8 0B FF FF FF"
            />
          </div>
        </div>

        {parsedId ? (
          <div className="j1939-bitfield-grid">
            <div className="bitfield-card highlight">
              <span className="bf-label">PARAMETER GROUP NUMBER (PGN)</span>
              <strong className="bf-value mono cyan-text">{parsedId.pgnHex}</strong>
              <small>Decimal: {parsedId.pgn} · {activeMessage.fullName}</small>
            </div>

            <div className="bitfield-card">
              <span className="bf-label">PRIORITY (BITS 28-26)</span>
              <strong className="bf-value mono">{parsedId.priority}</strong>
              <small>{parsedId.priority <= 3 ? "High Priority Control" : "Routine Broadcast"}</small>
            </div>

            <div className="bitfield-card">
              <span className="bf-label">PDU FORMAT (PF - BITS 23-16)</span>
              <strong className="bf-value mono">
                0x{parsedId.pduFormat.toString(16).toUpperCase().padStart(2, "0")} ({parsedId.pduFormat})
              </strong>
              <small>{parsedId.formatType}</small>
            </div>

            <div className="bitfield-card">
              <span className="bf-label">PDU SPECIFIC (PS - BITS 15-8)</span>
              <strong className="bf-value mono">
                0x{parsedId.pduSpecific.toString(16).toUpperCase().padStart(2, "0")} ({parsedId.pduSpecific})
              </strong>
              <small>{parsedId.isPdu1 ? "Destination Address" : "Group Extension (GE)"}</small>
            </div>

            <div className="bitfield-card">
              <span className="bf-label">SOURCE ADDRESS (SA - BITS 7-0)</span>
              <strong className="bf-value mono">
                0x{parsedId.sourceAddress.toString(16).toUpperCase().padStart(2, "0")} ({parsedId.sourceAddress})
              </strong>
              <small>{activeMessage.sourceName}</small>
            </div>
          </div>
        ) : (
          <div className="inline-note error">
            Invalid 29-bit Hex Identifier. Please enter a valid hexadecimal string (00000000 to 1FFFFFFF).
          </div>
        )}
      </section>

      {/* Vector CANoe / CANdb++ Style Layout: Left Message Table + Right Bit Positions 8x8 Grid */}
      <div className="content-grid canoe-grid">
        {/* Left: Messages Table */}
        <section className="panel canoe-left-panel">
          <SectionTitle
            title="CAN Message Definition"
            detail="SAE Document J1939-71 compliant frame specifications"
          />

          <div className="table-scroll">
            <table className="canoe-table">
              <thead>
                <tr>
                  <th>Message Name</th>
                  <th>ID HEX</th>
                  <th>PGN (HEX)</th>
                  <th>PGN (DEC)</th>
                  <th>Format</th>
                  <th>DLC</th>
                  <th>TX Node</th>
                  <th>Cycle</th>
                </tr>
              </thead>
              <tbody>
                {DBC_MESSAGES.map(m => (
                  <tr
                    key={m.name}
                    className={`hoverable-row ${m.name === selectedMessageName ? "selected-row" : ""}`}
                    onClick={() => {
                      setSelectedMessageName(m.name);
                      setCanIdInput(m.idHex);
                      setSelectedSignalName(m.signals[0].name);
                      setCustomBytesHex("");
                    }}
                  >
                    <td>
                      <b className="cyan-text">{m.name}</b>
                    </td>
                    <td className="mono font-bold">0x{m.idHex}</td>
                    <td className="mono">{m.pgnHex}</td>
                    <td className="mono">{m.pgnDec}</td>
                    <td>J1939PGN</td>
                    <td>{m.dlc}</td>
                    <td>{m.sourceName}</td>
                    <td>{m.cycleTimeMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="message-desc-box">
            <strong>Description:</strong> {activeMessage.comment}
          </div>
        </section>

        {/* Right: Vector CANoe / CANdb++ 8x8 Bit Positions Matrix Layout Grid */}
        <section className="panel canoe-right-panel">
          <div className="matrix-header">
            <div>
              <h3>Bit Positions Layout (8 × 8 Grid)</h3>
              <p>
                Visualizing signal: <strong className="cyan-text">{activeSignal?.name}</strong>{" "}
                (Bit {activeSignal?.startBit}, Length {activeSignal?.bitLength} bits)
              </p>
            </div>
            <div className="matrix-legend">
              <span className="cell-active-indicator" /> Selected Signal Bits
            </div>
          </div>

          {/* 8x8 Bit Layout Matrix */}
          <div className="bit-matrix-wrapper">
            <table className="bit-matrix-table">
              <thead>
                <tr>
                  <th className="byte-corner-th">Byte #</th>
                  <th>7</th>
                  <th>6</th>
                  <th>5</th>
                  <th>4</th>
                  <th>3</th>
                  <th>2</th>
                  <th>1</th>
                  <th>0</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4, 5, 6, 7].map(byteIdx => (
                  <tr key={byteIdx}>
                    <td className="byte-label-td">Byte {byteIdx}</td>
                    {[7, 6, 5, 4, 3, 2, 1, 0].map(bitIdx => {
                      const isOccupied = isBitOccupied(
                        byteIdx,
                        bitIdx,
                        activeSignal?.startBit || 0,
                        activeSignal?.bitLength || 1,
                        activeSignal?.byteOrder || "Intel"
                      );
                      const currentByteVal = currentBytes[byteIdx] || 0;
                      const bitVal = (currentByteVal >> bitIdx) & 1;

                      return (
                        <td
                          key={bitIdx}
                          className={`matrix-bit-cell ${isOccupied ? "occupied" : ""}`}
                          title={`Byte ${byteIdx}, Bit ${bitIdx} (Global bit ${byteIdx * 8 + bitIdx}): value=${bitVal}`}
                        >
                          <span className="bit-value-num">{bitVal}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Signals of Selected CAN Message Table (Matches Vector CANoe Lower Window) */}
      <section className="panel">
        <SectionTitle
          title={`Signals of Selected Message: ${activeMessage.name} (${activeMessage.fullName})`}
          detail="Click any signal to highlight its exact bit positions in the matrix above"
        />

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Signal Name</th>
                <th>SPN</th>
                <th>Byteorder</th>
                <th>Bitpos</th>
                <th>Length</th>
                <th>Raw Value</th>
                <th>Factor (Scale)</th>
                <th>Offset</th>
                <th>Decoded Value</th>
                <th>Unit</th>
                <th>Min / Max</th>
                <th>Validity</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {decodedSignals.map(sig => {
                const isSelected = sig.name === activeSignal.name;
                return (
                  <tr
                    key={sig.name}
                    className={`hoverable-row ${isSelected ? "selected-row" : ""}`}
                    onClick={() => setSelectedSignalName(sig.name)}
                  >
                    <td>
                      <b className="cyan-text">{sig.name}</b>
                    </td>
                    <td className="mono">{sig.spn}</td>
                    <td>{sig.byteOrder}</td>
                    <td className="mono">{sig.startBit}</td>
                    <td className="mono">{sig.bitLength} bits</td>
                    <td className="mono font-bold">
                      {sig.rawHex} ({sig.rawVal})
                    </td>
                    <td className="mono">{sig.factor}</td>
                    <td className="mono">{sig.offset}</td>
                    <td className="mono font-bold decoded-highlight">
                      {sig.decodedVal} {sig.unit}
                    </td>
                    <td>{sig.unit || "—"}</td>
                    <td className="mono text-muted">
                      {sig.min} / {sig.max}
                    </td>
                    <td>
                      <StatusPill state={sig.validity.state}>
                        {sig.validity.status}
                      </StatusPill>
                    </td>
                    <td className="text-muted text-sm">{sig.comment}</td>
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
