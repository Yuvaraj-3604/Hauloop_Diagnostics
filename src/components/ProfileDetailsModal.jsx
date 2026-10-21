import React from "react";
import {
  User, Shield, Mail, Key, Clock, Laptop, Truck, CheckCircle2,
  Lock, X, ExternalLink, BadgeCheck, Hash, Radio
} from "lucide-react";

export default function ProfileDetailsModal({
  isOpen,
  onClose,
  currentUser,
  activeDevice,
  onLogout
}) {
  if (!isOpen) return null;

  const username = currentUser?.username || "Operator";
  const fullName = currentUser?.fullName || currentUser?.username || "Fleet Operator";
  const role = currentUser?.role || "Fleet Administrator";
  const operatorId = currentUser?.operatorId || "ADM-1001";
  const email = currentUser?.email || "—";
  const loginTime = currentUser?.loginTime || new Date().toLocaleTimeString();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog profile-modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Modal Header - Clean without database tab */}
        <div className="modal-header">
          <div className="profile-modal-header-title">
            <User size={18} className="cyan-text" />
            <h3>Operator Profile & Credentials</h3>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content - Personal Operator Profile Vitals */}
        <div className="modal-body profile-modal-body">
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
