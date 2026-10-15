import React, { useState } from "react";
import {
  HardDrive, Plus, Download, Search, CheckCircle2, AlertTriangle,
  XCircle, RadioTower, ShieldCheck, Cpu, ChevronRight, Check, Sliders
} from "lucide-react";
import { MetricCard, SectionTitle, StatusPill, Modal } from "../components/Ui.jsx";
import { telematicsEngine } from "../lib/telematicsEngine.js";
import { exportToCSV, exportToJSON } from "../lib/can.js";

export default function DeviceManagementScreen({ snapshot, setPage }) {
  const { devices, activeDevice } = snapshot;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for new device registration
  const [newDevice, setNewDevice] = useState({
    name: "",
    imei: "",
    vin: "",
    vehicleType: "Heavy Commercial Truck",
    firmware: "03.28.04.Rev.128",
    configProfile: "J1939_Mining_HeavyDuty_v4.2",
    canChannel: "CAN1 (SAE J1939)",
    canBaud: "250 kbps"
  });

  const filteredDevices = devices.filter(d => {
    const matchesQuery =
      (d.name + d.imei + d.vin + d.configProfile + d.vehicleType)
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const handleRegisterDevice = e => {
    e.preventDefault();
    if (!newDevice.name || !newDevice.imei) {
      alert("Please provide Device Name and 15-digit IMEI.");
      return;
    }
    telematicsEngine.addDevice({
      ...newDevice,
      status: "Online",
      ignition: "ON",
      powerExt: "24.4 V",
      powerBat: "4.10 V",
      location: "Active Bench Simulator"
    });
    setIsModalOpen(false);
    setNewDevice({
      name: "",
      imei: "",
      vin: "",
      vehicleType: "Heavy Commercial Truck",
      firmware: "03.28.04.Rev.128",
      configProfile: "J1939_Mining_HeavyDuty_v4.2",
      canChannel: "CAN1 (SAE J1939)",
      canBaud: "250 kbps"
    });
  };

  const handleExportCSV = () => {
    const data = filteredDevices.map(d => ({
      Device_Name: d.name,
      IMEI: d.imei,
      VIN: d.vin,
      Vehicle_Type: d.vehicleType,
      Firmware: d.firmware,
      Config_Profile: d.configProfile,
      CAN_Channel: d.canChannel,
      CAN_Baud: d.canBaud,
      Status: d.status,
      Last_Communication: d.lastSeen,
      External_Power: d.powerExt,
      Battery_Voltage: d.powerBat
    }));
    exportToCSV(data, "fmc650-registered-devices.csv");
  };

  const onlineCount = devices.filter(d => d.status === "Online").length;
  const warningCount = devices.filter(d => d.status === "Warning").length;
  const offlineCount = devices.filter(d => d.status === "Offline").length;

  return (
    <div className="page-content">
      {/* Banner matching Screenshot #1 & #5 */}
      <div className="welcome-banner compact">
        <div>
          <div className="eyebrow">SCREEN 6 · FMC650 FLEET & DEVICE MANAGEMENT</div>
          <h2>Connected FMC650 Devices</h2>
          <p>
            Register multiple FMC650 telematics hardware units, select active test vehicles,
            and inspect configuration profiles, firmware revisions, and communication status.
          </p>
        </div>
        <div className="banner-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} /> Add Device
          </button>
        </div>
      </div>

      {/* Top 4 Stat Cards (Directly matching IndustryOS Screenshot #1) */}
      <div className="metric-grid">
        <MetricCard
          label="Active Devices"
          value={String(devices.length).padStart(2, "0")}
          sub="+12% vs last week"
          icon={HardDrive}
          tone="cyan"
          trend="12%"
        />
        <MetricCard
          label="Online"
          value={String(onlineCount).padStart(2, "0")}
          sub={`${Math.round((onlineCount / devices.length) * 100)}% of total`}
          icon={CheckCircle2}
          tone="green"
          trend="94.7%"
        />
        <MetricCard
          label="Warning"
          value={String(warningCount).padStart(2, "0")}
          sub="3.2% vs last week"
          icon={AlertTriangle}
          tone="amber"
          trend="3.2%"
        />
        <MetricCard
          label="Offline"
          value={String(offlineCount).padStart(2, "0")}
          sub="Depot maintenance yard"
          icon={XCircle}
          tone="red"
        />
      </div>

      {/* Devices Master Table */}
      <section className="panel">
        <div className="toolbar">
          <div>
            <h3>All Registered FMC650 Units</h3>
            <p>Select any device to make it the active telemetry test subject</p>
          </div>
          <div className="toolbar-actions">
            <div className="search-box">
              <Search size={15} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search device name, IMEI, VIN or profile..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Online">Online</option>
              <option value="Warning">Warning</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Test Vehicle / Device</th>
                <th>IMEI</th>
                <th>Firmware</th>
                <th>Configuration Profile</th>
                <th>CAN Channel & Baud</th>
                <th>Status</th>
                <th>External / Battery</th>
                <th>Last Comm</th>
                <th>Active Selection</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map(dev => {
                const isActive = dev.id === activeDevice.id;
                return (
                  <tr
                    key={dev.id}
                    className={`hoverable-row ${isActive ? "selected-device-row" : ""}`}
                  >
                    <td>
                      <div>
                        <b>{dev.name}</b>
                        <small className="block-muted">
                          {dev.vehicleType} • VIN: <span className="mono">{dev.vin}</span>
                        </small>
                      </div>
                    </td>
                    <td className="mono cyan-text font-bold">{dev.imei}</td>
                    <td className="mono">{dev.firmware}</td>
                    <td>
                      <span className="profile-tag">{dev.configProfile}</span>
                    </td>
                    <td>
                      <div>
                        <b>{dev.canChannel}</b>
                        <small className="block-muted">{dev.canBaud}</small>
                      </div>
                    </td>
                    <td>
                      <StatusPill
                        state={
                          dev.status === "Online"
                            ? "success"
                            : dev.status === "Warning"
                            ? "warning"
                            : "danger"
                        }
                      >
                        {dev.status}
                      </StatusPill>
                    </td>
                    <td>
                      <div className="mono text-sm">
                        <span>Pwr: {dev.powerExt}</span>
                        <br />
                        <span className="text-muted">Bat: {dev.powerBat}</span>
                      </div>
                    </td>
                    <td className="text-sm">{dev.lastSeen}</td>
                    <td>
                      {isActive ? (
                        <span className="active-badge">
                          <Check size={13} /> Active Subject
                        </span>
                      ) : (
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => telematicsEngine.setActiveDevice(dev.id)}
                        >
                          Select Subject
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Device Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Teltonika FMC650 Telematics Unit"
      >
        <form onSubmit={handleRegisterDevice} className="modal-form">
          <div className="form-group">
            <label>Vehicle / Device Name *</label>
            <input
              required
              value={newDevice.name}
              onChange={e => setNewDevice({ ...newDevice, name: e.target.value })}
              placeholder="e.g. Scania R500 Long Hauler"
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>15-Digit IMEI *</label>
              <input
                required
                className="mono"
                maxLength={15}
                value={newDevice.imei}
                onChange={e => setNewDevice({ ...newDevice, imei: e.target.value })}
                placeholder="867530901234999"
              />
            </div>
            <div className="form-group">
              <label>Chassis VIN</label>
              <input
                className="mono"
                value={newDevice.vin}
                onChange={e => setNewDevice({ ...newDevice, vin: e.target.value })}
                placeholder="YS2R4X2000214890"
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Firmware Revision</label>
              <input
                className="mono"
                value={newDevice.firmware}
                onChange={e => setNewDevice({ ...newDevice, firmware: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Configuration Profile</label>
              <input
                value={newDevice.configProfile}
                onChange={e => setNewDevice({ ...newDevice, configProfile: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Primary CAN Channel</label>
              <select
                value={newDevice.canChannel}
                onChange={e => setNewDevice({ ...newDevice, canChannel: e.target.value })}
              >
                <option>CAN1 (SAE J1939)</option>
                <option>CAN2 (Body Controller)</option>
                <option>CAN3 (Auxiliary Fleet Bus)</option>
              </select>
            </div>
            <div className="form-group">
              <label>CAN Baud Rate</label>
              <select
                value={newDevice.canBaud}
                onChange={e => setNewDevice({ ...newDevice, canBaud: e.target.value })}
              >
                <option>250 kbps (Standard J1939)</option>
                <option>500 kbps (High Speed)</option>
                <option>125 kbps</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Register Device
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
