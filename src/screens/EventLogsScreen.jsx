import React, { useState } from "react";
import {
  FileText, Search, Download, Trash2, AlertTriangle, XCircle, Info,
  Filter, CheckCircle2, ChevronRight, RefreshCw, Layers
} from "lucide-react";
import { MetricCard, SectionTitle, StatusPill, EmptyState } from "../components/Ui.jsx";
import { telematicsEngine } from "../lib/telematicsEngine.js";
import { exportToCSV, exportToJSON } from "../lib/can.js";

export default function EventLogsScreen({ snapshot }) {
  const { events } = snapshot;
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredEvents = events.filter(e => {
    const matchesQuery =
      (e.title + e.detail + e.category + (e.source || "")).toLowerCase().includes(query.toLowerCase());
    const matchesSeverity = severityFilter === "ALL" || e.severity === severityFilter;
    const matchesCategory = categoryFilter === "ALL" || e.category === categoryFilter;
    return matchesQuery && matchesSeverity && matchesCategory;
  });

  const criticalCount = events.filter(e => e.severity === "CRIT").length;
  const warningCount = events.filter(e => e.severity === "WARN").length;
  const infoCount = events.filter(e => e.severity === "INFO").length;

  const handleExportCSV = () => {
    const data = filteredEvents.map(e => ({
      Timestamp: e.time,
      Severity: e.severity,
      Category: e.category,
      Title: e.title,
      Detail: e.detail,
      Source_Register: e.source
    }));
    exportToCSV(data, "fmc650-diagnostic-event-log.csv");
  };

  const handleExportJSON = () => {
    exportToJSON(filteredEvents, "fmc650-diagnostic-event-log.json");
  };

  const handleInjectTestEvent = (category, title, detail, severity = "WARN") => {
    telematicsEngine.addEvent({
      severity,
      category,
      title,
      detail,
      source: "MANUAL_INJECTOR"
    });
  };

  return (
    <div className="page-content">
      {/* Banner */}
      <div className="welcome-banner compact">
        <div>
          <div className="eyebrow">SCREEN 7 · TELEMATICS & PROTOCOL EVENT LOGS</div>
          <h2>Diagnostic Event & Fault Audit Log</h2>
          <p>
            Audit and track missing CAN frames, frozen/unchanged sensor values, J1939 decoding failures,
            stale message timeouts, AWS MQTT broker errors, and device disconnections.
          </p>
        </div>
        <div className="banner-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportJSON}>
            <Download size={14} /> Export JSON
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => telematicsEngine.clearEvents()}
          >
            <Trash2 size={14} /> Clear Logs
          </button>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Total Stored Events"
          value={String(events.length).padStart(2, "0")}
          sub="Buffer size (max 150)"
          icon={FileText}
          tone="cyan"
        />
        <MetricCard
          label="Critical Faults"
          value={String(criticalCount).padStart(2, "0")}
          sub="Immediate diagnostic priority"
          icon={XCircle}
          tone={criticalCount > 0 ? "red" : "neutral"}
        />
        <MetricCard
          label="Active Warnings"
          value={String(warningCount).padStart(2, "0")}
          sub="Frame jitter or stale slots"
          icon={AlertTriangle}
          tone={warningCount > 0 ? "amber" : "neutral"}
        />
        <MetricCard
          label="Information Logs"
          value={String(infoCount).padStart(2, "0")}
          sub="Physical bus state changes"
          icon={Info}
          tone="purple"
        />
      </div>

      {/* Quick Test Event Trigger Toolbar */}
      <div className="callout callout-blue">
        <Layers size={18} />
        <div className="inject-callout-inner">
          <div>
            <b>Bench Fault Injector (Repeatable Testing)</b>
            <span>Simulate real-world vehicle telematics anomalies to test downstream monitoring:</span>
          </div>
          <div className="inject-buttons-row">
            <button
              className="btn btn-secondary btn-xs"
              onClick={() =>
                handleInjectTestEvent(
                  "Missing Frames",
                  "Missing Frame Timeout: PGN 65253",
                  "Frame timeout exceeded > 3000ms on Manual CAN Slot 05 (Engine Hours).",
                  "WARN"
                )
              }
            >
              + Missing Frame
            </button>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() =>
                handleInjectTestEvent(
                  "Frozen Values",
                  "Frozen Signal Detected: AVL 145 (RPM)",
                  "Engine Speed raw value unchanged for 60 consecutive seconds while road speed > 50 km/h.",
                  "WARN"
                )
              }
            >
              + Unchanged Value
            </button>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() =>
                handleInjectTestEvent(
                  "Decoding Failures",
                  "J1939 Parity Failure: SPN 110",
                  "Raw byte 0xFE received for Engine Coolant Temperature, indicating sensor error.",
                  "CRIT"
                )
              }
            >
              + Decoding Failure
            </button>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() =>
                handleInjectTestEvent(
                  "MQTT Errors",
                  "AWS IoT Core Broker QoS 1 Timeout",
                  "No PUBACK received within 2500ms on topic teltonika/fmc650/data.",
                  "CRIT"
                )
              }
            >
              + MQTT Error
            </button>
          </div>
        </div>
      </div>

      {/* Main Events List & Inspector */}
      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={15} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search event title, detail, or category..."
            />
          </div>

          <div className="toolbar-actions">
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
            >
              <option value="ALL">All Severities</option>
              <option value="CRIT">Critical Only</option>
              <option value="WARN">Warnings Only</option>
              <option value="INFO">Info Only</option>
            </select>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="Missing Frames">Missing Frames</option>
              <option value="Frozen Values">Frozen Values</option>
              <option value="Decoding Failures">Decoding Failures</option>
              <option value="Stale Messages">Stale Messages</option>
              <option value="MQTT Errors">MQTT Errors</option>
              <option value="Device Disconnections">Device Disconnections</option>
              <option value="CAN Bus">CAN Bus</option>
              <option value="Cooling">Cooling</option>
              <option value="Lubrication">Lubrication</option>
              <option value="Powertrain">Powertrain</option>
            </select>
          </div>
        </div>

        <div className="event-list detailed">
          {filteredEvents.map(evt => (
            <div
              key={evt.id}
              className={`event-item detailed ${selectedEvent?.id === evt.id ? "selected-event" : ""}`}
              onClick={() => setSelectedEvent(evt)}
            >
              <div className={`event-icon event-${evt.severity.toLowerCase()}`}>
                {evt.severity === "CRIT" ? (
                  <XCircle size={18} />
                ) : evt.severity === "WARN" ? (
                  <AlertTriangle size={18} />
                ) : (
                  <Info size={18} />
                )}
              </div>

              <div className="event-copy">
                <div className="event-title-row">
                  <b>{evt.title}</b>
                  <StatusPill
                    state={
                      evt.severity === "CRIT"
                        ? "danger"
                        : evt.severity === "WARN"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {evt.severity}
                  </StatusPill>
                  <span className="source-tag">{evt.category}</span>
                  {evt.source && <span className="mono text-muted text-xs">[{evt.source}]</span>}
                </div>
                <span className="event-desc">{evt.detail}</span>
              </div>

              <time className="mono text-muted">{evt.time}</time>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <EmptyState
              title="No events matching criteria"
              detail="Adjust the search term or clear severity/category filters."
            />
          )}
        </div>
      </section>
    </div>
  );
}
