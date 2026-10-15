/**
 * FMC650 J1939 Telematics Alert & Rule Evaluation Engine
 * Evaluates real-time driveline thresholds and broadcasts fleet safety alerts
 */

class AlertEngine {
  constructor() {
    this.activeAlerts = new Map(); // id -> alert
    this.alertHistory = [];
    this.maxHistory = 100;
  }

  /**
   * Evaluates decoded vehicle state against safety thresholds
   * @param {Object} kpis - Decoded KPIs from j1939Decoder
   * @returns {Array} List of newly triggered or active alerts
   */
  evaluate(kpis) {
    const currentTriggered = [];
    const timestamp = kpis.timestamp || new Date().toISOString();

    // 1. Engine Over-revving
    if (kpis.rpm >= 2500) {
      currentTriggered.push({
        id: 'CRIT_OVER_REV',
        severity: 'CRITICAL',
        category: 'POWERTRAIN',
        code: 'SPN 190 FMI 0',
        title: 'Dangerous Over-Revving',
        message: `Engine speed at ${kpis.rpm} RPM! Exceeds safe operating limit (2500 RPM). Imminent valve float risk.`,
        value: `${kpis.rpm} RPM`,
        timestamp
      });
    } else if (kpis.rpm >= 2200) {
      currentTriggered.push({
        id: 'WARN_HIGH_RPM',
        severity: 'WARNING',
        category: 'POWERTRAIN',
        code: 'SPN 190 FMI 15',
        title: 'Redline Threshold Exceeded',
        message: `Engine operating in yellow/redline zone (${kpis.rpm} RPM > 2200 RPM). Shift gear to reduce fuel burn.`,
        value: `${kpis.rpm} RPM`,
        timestamp
      });
    }

    // 2. Engine Coolant Temperature
    if (kpis.coolantTemp >= 108) {
      currentTriggered.push({
        id: 'CRIT_OVERHEAT',
        severity: 'CRITICAL',
        category: 'COOLING',
        code: 'SPN 110 FMI 0',
        title: 'Engine Overheating Emergency',
        message: `Coolant temperature critically high at ${kpis.coolantTemp}°C! Pull over safely to prevent cylinder head crack.`,
        value: `${kpis.coolantTemp} °C`,
        timestamp
      });
    } else if (kpis.coolantTemp >= 100) {
      currentTriggered.push({
        id: 'WARN_HIGH_TEMP',
        severity: 'WARNING',
        category: 'COOLING',
        code: 'SPN 110 FMI 16',
        title: 'Elevated Coolant Temperature',
        message: `Coolant temp at ${kpis.coolantTemp}°C. Radiator fan commanded high duty cycle.`,
        value: `${kpis.coolantTemp} °C`,
        timestamp
      });
    }

    // 3. Engine Oil Pressure (only evaluated when engine is running: RPM > 400)
    if (kpis.rpm > 400) {
      if (kpis.oilPressure <= 120 && kpis.oilPressure > 0) {
        currentTriggered.push({
          id: 'CRIT_LOW_OIL_PRESS',
          severity: 'CRITICAL',
          category: 'LUBRICATION',
          code: 'SPN 100 FMI 1',
          title: 'Critically Low Oil Pressure',
          message: `Lube pressure dropped to ${kpis.oilPressure} kPa! Risk of journal bearing starvation.`,
          value: `${kpis.oilPressure} kPa`,
          timestamp
        });
      } else if (kpis.oilPressure < 200 && kpis.oilPressure > 0) {
        currentTriggered.push({
          id: 'WARN_LOW_OIL_PRESS',
          severity: 'WARNING',
          category: 'LUBRICATION',
          code: 'SPN 100 FMI 18',
          title: 'Low Oil Pressure Warning',
          message: `Oil pressure is ${kpis.oilPressure} kPa (< 200 kPa normal operating floor).`,
          value: `${kpis.oilPressure} kPa`,
          timestamp
        });
      }
    }

    // 4. Dual Air Brake Tanks Pressure
    const minAir = Math.min(kpis.airTank1, kpis.airTank2);
    if (minAir > 0 && minAir < 500) {
      currentTriggered.push({
        id: 'CRIT_LOW_AIR_PRESSURE',
        severity: 'CRITICAL',
        category: 'BRAKES',
        code: 'SPN 1087 FMI 1',
        title: 'Emergency Air Pressure Depleted',
        message: `Pneumatic reservoir pressure low (${minAir} kPa). Spring parking brakes may auto-apply!`,
        value: `${minAir} kPa`,
        timestamp
      });
    } else if (minAir > 0 && minAir < 650) {
      currentTriggered.push({
        id: 'WARN_LOW_AIR_PRESSURE',
        severity: 'WARNING',
        category: 'BRAKES',
        code: 'SPN 1087 FMI 18',
        title: 'Low Brake Reservoir Pressure',
        message: `Air system recharge needed. Compressor unloading delay observed.`,
        value: `${minAir} kPa`,
        timestamp
      });
    }

    // 5. DEF / AdBlue Tank Level (BS-VI Compliance)
    if (kpis.defLevel > 0 && kpis.defLevel < 8) {
      currentTriggered.push({
        id: 'CRIT_DEF_EMPTY',
        severity: 'CRITICAL',
        category: 'AFTERTREATMENT',
        code: 'SPN 1761 FMI 1',
        title: 'DEF Depletion Torque Derate',
        message: `DEF fluid level critical (${kpis.defLevel}%). Indian BS-VI OBD derate will cut torque by 50%!`,
        value: `${kpis.defLevel} %`,
        timestamp
      });
    } else if (kpis.defLevel > 0 && kpis.defLevel < 15) {
      currentTriggered.push({
        id: 'WARN_DEF_LOW',
        severity: 'WARNING',
        category: 'AFTERTREATMENT',
        code: 'SPN 1761 FMI 17',
        title: 'Low DEF / AdBlue Reserve',
        message: `DEF level low (${kpis.defLevel}%). Top up before next haul route.`,
        value: `${kpis.defLevel} %`,
        timestamp
      });
    }

    // 6. DPF Soot Delta-P (Filter choke)
    if (kpis.dpfDeltaP >= 28) {
      currentTriggered.push({
        id: 'WARN_DPF_CHOKE',
        severity: 'WARNING',
        category: 'AFTERTREATMENT',
        code: 'SPN 3251 FMI 0',
        title: 'High DPF Soot Load (Delta-P)',
        message: `Differential pressure high (${kpis.dpfDeltaP} kPa). Thermal regeneration required.`,
        value: `${kpis.dpfDeltaP} kPa`,
        timestamp
      });
    }

    // 7. Green Driving Harsh Acceleration / Braking
    if (Math.abs(kpis.gForce) >= 0.45) {
      currentTriggered.push({
        id: 'INFO_HARSH_MANEUVER',
        severity: 'INFO',
        category: 'ECO_DRIVE',
        code: 'ECO_EVENT',
        title: 'Harsh Driving Maneuver Detected',
        message: `Dynamic G-force spike of ${kpis.gForce}g logged.`,
        value: `${kpis.gForce} g`,
        timestamp
      });
    }

    // Update active alerts and history
    const updatedMap = new Map();
    for (const alert of currentTriggered) {
      updatedMap.set(alert.id, alert);
      if (!this.activeAlerts.has(alert.id)) {
        // Freshly triggered alert - add to persistent history
        this.alertHistory.unshift({ ...alert, triggeredAt: timestamp });
        if (this.alertHistory.length > this.maxHistory) {
          this.alertHistory.pop();
        }
      }
    }
    this.activeAlerts = updatedMap;

    return Array.from(this.activeAlerts.values());
  }

  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory() {
    return this.alertHistory;
  }
}

module.exports = AlertEngine;
