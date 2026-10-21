import React, { useState, useEffect } from "react";
import {
  User, Shield, Mail, Key, Clock, Laptop, Truck, CheckCircle2,
  Lock, X, ExternalLink, BadgeCheck, Hash, Radio, Database, Search,
  Download, Users
} from "lucide-react";
import { getUserDatabase } from "../lib/userDatabase.js";

export default function ProfileDetailsModal({
  isOpen,
  onClose,
  currentUser,
  activeDevice,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "database"
  const [searchQuery, setSearchQuery] = useState("");
  const [userDbList, setUserDbList] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setUserDbList(getUserDatabase());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const username = currentUser?.username || "yuvarajperumal364";
  const fullName = currentUser?.fullName || currentUser?.username || "Yuvaraj Perumal";
  const role = currentUser?.role || "Fleet Administrator";
  const operatorId = currentUser?.operatorId || "ADM-3604";

  // Resolve exact account email ID used during registration (e.g., gmail.com, outlook.com)
  const resolveEmail = () => {
    if (currentUser?.email && currentUser.email.trim()) {
      return currentUser.email.trim();
    }
    const match = userDbList.find(
      (u) =>
        (u.username && u.username.toLowerCase() === (currentUser?.username || "").toLowerCase()) ||
        (u.fullName && u.fullName.toLowerCase() === (currentUser?.fullName || "").toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes((currentUser?.username || "").toLowerCase()))
    );
    if (match && match.email) {
      return match.email.trim();
    }
    if (username.includes("@")) {
      return username;
    }
    return `${username}@gmail.com`;
  };

  const email = resolveEmail();
  const loginTime = currentUser?.loginTime || new Date().toLocaleTimeString();

  // Filtered users for the user_database view
  const filteredUsers = userDbList.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.operatorId && u.operatorId.toLowerCase().includes(q))
    );
  });

  const handleExportJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userDbList, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `hauloop_user_database_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("Failed to export database JSON.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog profile-modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="profile-modal-header-title">
            <User size={18} className="cyan-text" />
            <h3>Operator Profile & Credentials</h3>
          </div>

          {/* Navigation Segmented Tabs */}
          <div className="profile-modal-tabs">
            <button
              className={`profile-tab-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <User size={13} />
              <span>My Profile</span>
            </button>
            <button
              className={`profile-tab-btn ${activeTab === "database" ? "active" : ""}`}
              onClick={() => {
                setUserDbList(getUserDatabase());
                setActiveTab("database");
              }}
            >
              <Database size={13} />
              <span>User Database</span>
              <span className="tab-badge">{userDbList.length}</span>
            </button>
          </div>

          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body profile-modal-body">
          {activeTab === "profile" ? (
            <>
              {/* Hero Profile Card */}
              <div className="profile-hero-card">
                <div className="profile-hero-avatar">
                  {username.slice(0, 3).toUpperCase()}
                </div>
                <div className="profile-hero-info">
                  <h4>{username}</h4>
                  <p className="profile-role-tag">
                    <Shield size={12} />
                    <span>{role}</span>
                  </p>
                  <span className="profile-status-live">
                    <span className="status-dot green pulse" />
                    Active Diagnostic Session
                  </span>
                </div>
              </div>

              {/* Details 2-Column Grid */}
              <div className="profile-details-grid">
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Full Name</span>
                  <strong className="profile-detail-value">{fullName}</strong>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Operator ID</span>
                  <strong className="profile-detail-value mono">{operatorId}</strong>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Work Email</span>
                  <strong className="profile-detail-value">{email}</strong>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Security Clearance</span>
                  <strong className="profile-detail-value green-text">Level 3 (Root Telematics)</strong>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Terminal Station</span>
                  <strong className="profile-detail-value mono">HAULOOP-TERM-04</strong>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Assigned Vehicle</span>
                  <strong className="profile-detail-value">{activeDevice?.name || "Tata Signa 4825.TK"}</strong>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Hardware IMEI</span>
                  <strong className="profile-detail-value mono">{activeDevice?.imei || "867530901234567"}</strong>
                </div>

                <div className="profile-detail-item">
                  <span className="profile-detail-label">Session Login Time</span>
                  <strong className="profile-detail-value">{loginTime}</strong>
                </div>
              </div>

              {/* Diagnostic Privileges & Access List */}
              <div className="profile-permissions-box">
                <div className="profile-permissions-header">
                  <BadgeCheck size={14} className="green-text" />
                  <span>Diagnostic Privileges & Permissions</span>
                </div>
                <div className="profile-permissions-tags">
                  <span className="perm-tag">✓ CAN 2.0B / J1939 Decoders</span>
                  <span className="perm-tag">✓ 15 Manual Slots Read/Write</span>
                  <span className="perm-tag">✓ Codec 8 Extended AVL Config</span>
                  <span className="perm-tag">✓ Automated Hardware Loopback</span>
                  <span className="perm-tag">✓ AWS IoT Core MQTT Verified</span>
                </div>
              </div>
            </>
          ) : (
            /* User Database Details View */
            <div className="user-db-container">
              <div className="user-db-controls">
                <div className="user-db-search-wrap">
                  <Search size={14} className="user-db-search-icon" />
                  <input
                    type="text"
                    className="user-db-search-input"
                    placeholder="Search by name, email, role, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportJson}
                  title="Export user_database as JSON"
                >
                  <Download size={13} />
                  <span>Export JSON</span>
                </button>
              </div>

              <div className="user-db-table-wrap">
                <table className="user-db-table">
                  <thead>
                    <tr>
                      <th>Operator / ID</th>
                      <th>Registered Email</th>
                      <th>Role</th>
                      <th>Registered On</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u, idx) => (
                        <tr key={u.id || idx}>
                          <td>
                            <div className="user-db-name-cell">
                              <div className="user-db-avatar-sm">
                                {(u.username || "OP").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="user-db-info-wrap">
                                <span className="user-db-fullname">{u.fullName || u.username}</span>
                                <span className="user-db-opid">{u.operatorId || `OP-${idx + 1}`}</span>
                              </div>
                            </div>
                          </td>
                          <td className="user-db-email-cell">{u.email || "—"}</td>
                          <td>
                            <span className="user-db-role-badge">{u.role || "Operator"}</span>
                          </td>
                          <td style={{ color: "#64748b", fontSize: "10px" }}>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Active"}
                          </td>
                          <td>
                            <span className="user-db-status-badge">
                              <span className="status-dot green" />
                              Active
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="user-db-empty">
                          No registered user records match "{searchQuery}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-footer profile-modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
          >
            <Lock size={13} />
            <span>Lock / Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
