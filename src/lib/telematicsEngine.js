/**
 * FMC650 Native JS Telematics & J1939 Diagnostics Simulation Engine
 * Runs fully in-browser with zero backend dependencies.
 * Generates realistic CAN frames, bit-level payloads, Teltonika AVL element packets,
 * and tracks diagnostic metrics, events, and historical signals.
 */

import { INITIAL_DEVICES, INITIAL_MANUAL_CAN_SLOTS, DIAGNOSTIC_TESTS } from "../data/canDefinitions.js";
import { formatBytesHex } from "./can.js";

class TelematicsEngine {
  constructor() {
    this.devices = [...INITIAL_DEVICES];
    this.activeDeviceId = "dev-01";
    this.scenario = "HIGHWAY"; // HIGHWAY, UPHILL, OVERHEAT, LOW_OIL, HARSH_BRAKE, IDLE
    this.isRunning = true;
    this.tickCount = 0;
    this.updateRateMs = 1000;

    // Manual CAN Slots Configuration
    this.slots = JSON.parse(JSON.stringify(INITIAL_MANUAL_CAN_SLOTS));

    // Vehicle physics state
    this.state = {
      rpm: 1450,
      speed: 68.4,
      pedal: 42.0,
      torque: 58.0,
      coolantTemp: 89.0,
      oilPressure: 420.0,
      fuelRate: 21.5,
      totalFuel: 42150.0,
      engineHours: 1245.5,
      defLevel: 74.0,
      airTank1: 830.0,
      airTank2: 825.0,
      dpfDeltaP: 7.5,
      gear: 7,
      axleWeight: 14600,
      extVoltage: 24.6,
      batVoltage: 4.15,
      ignition: "ON",
      canBusStatus: "Active",
      mqttLatencyMs: 42
    };

    // Frame cache: canId -> { bytes: [8], prevBytes: [8], frameCount: number, lastSeen: string, deltaBits: number[] }
    this.frameCache = new Map();

    // Signal History buffer (last 40 points)
    this.signalHistory = [];

    // Diagnostic Events log (last 100)
    this.events = [
      {
        id: "evt-init-01",
        time: new Date(Date.now() - 120000).toLocaleTimeString(),
        severity: "INFO",
        category: "CAN Bus",
        title: "CAN1 Transceiver Online",
        detail: "FMC650 CAN1 physical port locked at 250 kbps (SAE J1939).",
        source: "PHY_CAN1"
      },
      {
        id: "evt-init-02",
        time: new Date(Date.now() - 95000).toLocaleTimeString(),
        severity: "INFO",
        category: "AVL Engine",
        title: "Manual CAN Slots Initialized",
        detail: "10 active slots mapped to Codec 8E AVL elements.",
        source: "FMC650_CFG"
      },
      {
        id: "evt-init-03",
        time: new Date(Date.now() - 60000).toLocaleTimeString(),
        severity: "WARN",
        category: "CAN Bus",
        title: "Stale Frame Rate Warning",
        detail: "Manual CAN 12 (0x18FEEA00 / Bogie Weight) cadence > 4000ms.",
        source: "SLOT_CAN12"
      },
      {
        id: "evt-init-04",
        time: new Date(Date.now() - 30000).toLocaleTimeString(),
        severity: "CRIT",
        category: "Decoding",
        title: "Sensor Missing Warning",
        detail: "DM1 Active DTC slot CAN 14 has no incoming CAN frames.",
        source: "SLOT_CAN14"
      }
    ];

    // Diagnostic Test Suite State
    this.testResults = DIAGNOSTIC_TESTS.map(t => ({
      ...t,
      status: "PASS",
      latencyMs: 18 + Math.floor(Math.random() * 20),
      timestamp: new Date().toLocaleTimeString(),
      log: "Bench test baseline passed without error."
    }));

    // Listeners for React components
    this.subscribers = new Set();

    // Prime initial frames & history
    this.stepPhysics();
    this.encodeFrames();
    this.recordHistoryPoint();

    // Start tick loop
    this.startLoop();
  }

  getActiveDevice() {
    return this.devices.find(d => d.id === this.activeDeviceId) || this.devices[0];
  }

  setActiveDevice(id) {
    this.activeDeviceId = id;
    this.notify();
  }

  addDevice(newDev) {
    this.devices.push({
      ...newDev,
      id: "dev-" + (this.devices.length + 1),
      lastSeen: "Just now",
      activeSlots: 10,
      decodingErrors: 0
    });
    this.notify();
  }

  setScenario(sc) {
    this.scenario = sc;
    this.addEvent({
      severity: "INFO",
      category: "Simulation",
      title: `Scenario Switched to ${sc}`,
      detail: `Operating profile set to dynamic mode: ${sc}.`,
      source: "BENCH_SIM"
    });
    this.notify();
  }

  toggleRunning() {
    this.isRunning = !this.isRunning;
    if (!this.isRunning) {
      // Record a zero point so graphs drop to zero
      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      this.signalHistory.push({
        time: timeLabel,
        t: this.tickCount,
        rpm: 0,
        rpmRaw: 0,
        speed: 0,
        speedRaw: 0,
        temp: 0,
        tempRaw: 0,
        oilPress: 0,
        oilPressRaw: 0,
        fuelRate: 0,
        fuelRateRaw: 0,
        pedal: 0,
        torque: 0,
        gear: 0
      });
      if (this.signalHistory.length > 50) this.signalHistory.shift();

      this.addEvent({
        severity: "WARN",
        category: "CAN Bus",
        title: "Live Stream Turned Off (0 Kbps)",
        detail: "CAN bus transceiver paused. All live telemetry values zeroed out.",
        source: "CONTROL_ROOM"
      });
    } else {
      this.addEvent({
        severity: "INFO",
        category: "CAN Bus",
        title: "Live Stream Resumed (250 Kbps)",
        detail: "CAN1 transceiver active. Broadcasting J1939 frames at 250 kbps.",
        source: "CONTROL_ROOM"
      });
    }
    this.notify();
  }

  startLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.isRunning) {
        this.tick();
      }
    }, this.updateRateMs);
  }

  setUpdateRate(ms) {
    this.updateRateMs = ms;
    this.startLoop();
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.getSnapshot());
      } catch (err) {
        console.error("Subscriber error:", err);
      }
    });
  }

  tick() {
    this.tickCount++;
    this.stepPhysics();
    this.encodeFrames();
    this.recordHistoryPoint();
    this.evaluateAlerts();
    this.notify();
  }

  stepPhysics() {
    const s = this.state;
    const t = this.tickCount;

    switch (this.scenario) {
      case "IDLE":
        s.speed = Math.max(0, s.speed - 3.5);
        s.gear = 0;
        s.rpm = 650 + Math.floor(Math.sin(t * 0.4) * 20);
        s.pedal = 0;
        s.torque = 14 + Math.sin(t * 0.3) * 2;
        s.fuelRate = 2.4;
        s.coolantTemp = Math.max(76, s.coolantTemp - 0.2);
        s.oilPressure = 280 + Math.sin(t * 0.5) * 5;
        s.airTank1 = Math.min(850, s.airTank1 + 1);
        break;

      case "UPHILL":
        s.speed = 46.0 + Math.sin(t * 0.2) * 2;
        s.gear = 5;
        s.rpm = 1850 + Math.floor(Math.sin(t * 0.3) * 50);
        s.pedal = 88.0 + Math.sin(t * 0.5) * 4;
        s.torque = 92.0 + Math.sin(t * 0.4) * 3;
        s.fuelRate = 42.0 + Math.sin(t * 0.3) * 3;
        s.coolantTemp = Math.min(104, s.coolantTemp + 0.3);
        s.oilPressure = 450 + Math.sin(t * 0.2) * 10;
        s.airTank1 = Math.max(790, s.airTank1 - 1);
        break;

      case "OVERHEAT":
        s.speed = 52.0;
        s.gear = 6;
        s.rpm = 1920 + Math.floor(Math.sin(t * 0.4) * 40);
        s.pedal = 65.0;
        s.torque = 78.0;
        s.fuelRate = 34.0;
        s.coolantTemp = Math.min(115, s.coolantTemp + 0.8); // Triggers warning & critical
        s.oilPressure = Math.max(220, s.oilPressure - 4);
        break;

      case "LOW_OIL":
        s.speed = 60.0;
        s.gear = 7;
        s.rpm = 1520;
        s.pedal = 45.0;
        s.torque = 60.0;
        s.fuelRate = 22.0;
        s.coolantTemp = 92.0;
        s.oilPressure = Math.max(85, s.oilPressure - 8); // Triggers low oil critical
        break;

      case "HARSH_BRAKE":
        s.speed = Math.max(0, s.speed - 9.0);
        s.gear = s.speed > 20 ? 3 : 1;
        s.rpm = Math.max(750, s.rpm - 120);
        s.pedal = 0;
        s.torque = 8.0;
        s.fuelRate = 3.5;
        s.airTank1 = Math.max(680, s.airTank1 - 15); // Air brake drop
        break;

      case "HIGHWAY":
      default:
        s.speed = 72.0 + Math.sin(t * 0.15) * 4;
        s.gear = 8;
        s.rpm = 1420 + Math.floor(Math.sin(t * 0.25) * 45);
        s.pedal = 40.0 + Math.sin(t * 0.2) * 6;
        s.torque = 56.0 + Math.sin(t * 0.3) * 5;
        s.fuelRate = 22.8 + Math.sin(t * 0.2) * 2;
        s.coolantTemp = 88.5 + Math.sin(t * 0.05) * 2;
        s.oilPressure = 425.0 + Math.sin(t * 0.1) * 8;
        s.airTank1 = 835.0 + Math.sin(t * 0.08) * 10;
        s.dpfDeltaP = 7.4 + Math.sin(t * 0.1) * 0.4;
        break;
    }

    s.totalFuel += s.fuelRate / 3600;
    s.engineHours += 1 / 3600;
    s.mqttLatencyMs = 35 + Math.floor(Math.random() * 25);
  }

  encodeFrames() {
    const s = this.state;

    // 1. EEC1 (0x0CF00400) - PGN 61444
    // Byte 0: Torque Mode (0x0F)
    // Byte 1: Driver Demand Torque (raw = pedal / 1 + 125 approx)
    // Byte 2: Actual Engine Torque (raw = torque + 125)
    // Byte 3-4: Engine Speed (raw = RPM * 8, Intel little-endian)
    // Byte 5: Starter mode (0xFF)
    // Byte 6-7: 0xFF, 0xFF
    const rpmRaw = Math.min(65535, Math.max(0, Math.round(s.rpm * 8)));
    const actualTorqueRaw = Math.min(255, Math.max(0, Math.round(s.torque + 125)));
    const pedalTorqueRaw = Math.min(255, Math.max(0, Math.round(s.pedal + 125)));
    const eec1Bytes = [
      0x01,
      pedalTorqueRaw,
      actualTorqueRaw,
      rpmRaw & 0xff,
      (rpmRaw >>> 8) & 0xff,
      0xff,
      0xff,
      0xff
    ];
    this.updateFrame("0CF00400", eec1Bytes);

    // 2. CCVS1 (0x18FEF100) - PGN 65265
    // Byte 0: switches (0x00)
    // Byte 1-2: Wheel-based vehicle speed (raw = speed * 256, Intel)
    // Byte 3: clutch/brake switches
    // Byte 4-7: 0xFF
    const speedRaw = Math.min(65535, Math.max(0, Math.round(s.speed * 256)));
    const ccvs1Bytes = [
      0x00,
      speedRaw & 0xff,
      (speedRaw >>> 8) & 0xff,
      0xf0,
      0xff,
      0xff,
      0xff,
      0xff
    ];
    this.updateFrame("18FEF100", ccvs1Bytes);

    // 3. EEC2 (0x18F00300) - PGN 61443
    // Byte 1: Accelerator pedal position 1 (raw = pedal / 0.4)
    const pedalRaw = Math.min(250, Math.max(0, Math.round(s.pedal / 0.4)));
    const eec2Bytes = [0xff, pedalRaw, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
    this.updateFrame("18F00300", eec2Bytes);

    // 4. ET1 (0x18FEEE00) - PGN 65262
    // Byte 0: Coolant Temp (raw = temp + 40)
    // Byte 1: Fuel Temp (raw = 55 + 40 = 95)
    // Byte 2-3: Oil Temp
    const coolantRaw = Math.min(250, Math.max(0, Math.round(s.coolantTemp + 40)));
    const et1Bytes = [coolantRaw, 0x5f, 0x80, 0x24, 0xff, 0xff, 0xff, 0xff];
    this.updateFrame("18FEEE00", et1Bytes);

    // 5. EFL_P1 (0x18FEEF00) - PGN 65263
    // Byte 3: Engine Oil Pressure (raw = oilPressure / 4)
    const oilRaw = Math.min(250, Math.max(0, Math.round(s.oilPressure / 4)));
    const eflBytes = [0xff, 0xff, 0x64, oilRaw, 0xff, 0xff, 0xff, 0xff];
    this.updateFrame("18FEEF00", eflBytes);

    // 6. LFE (0x18FEF200) - PGN 65266
    // Byte 0-1: Fuel Rate (raw = fuelRate / 0.05, Intel)
    const fuelRateRaw = Math.min(65535, Math.max(0, Math.round(s.fuelRate / 0.05)));
    const lfeBytes = [fuelRateRaw & 0xff, (fuelRateRaw >>> 8) & 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
    this.updateFrame("18FEF200", lfeBytes);

    // 7. LFC (0x18FEE900) - PGN 65257 (Total Fuel)
    const totalFuelRaw = Math.round(s.totalFuel * 2);
    const lfcBytes = [
      totalFuelRaw & 0xff,
      (totalFuelRaw >>> 8) & 0xff,
      (totalFuelRaw >>> 16) & 0xff,
      (totalFuelRaw >>> 24) & 0xff,
      0xff,
      0xff,
      0xff,
      0xff
    ];
    this.updateFrame("18FEE900", lfcBytes);

    // 8. HOURS (0x18FEE500) - PGN 65253 (Engine Hours)
    const hoursRaw = Math.round(s.engineHours * 20);
    const hoursBytes = [
      hoursRaw & 0xff,
      (hoursRaw >>> 8) & 0xff,
      (hoursRaw >>> 16) & 0xff,
      (hoursRaw >>> 24) & 0xff,
      0xff,
      0xff,
      0xff,
      0xff
    ];
    this.updateFrame("18FEE500", hoursBytes);

    // 9. AT1T1I (0x18FE5600) - DEF level
    const defRaw = Math.round(s.defLevel / 0.4);
    const defBytes = [defRaw, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
    this.updateFrame("18FE5600", defBytes);

    // 10. AIR1 (0x18FEAE00) - Air Tank
    const airRaw = Math.round(s.airTank1 / 8);
    const airBytes = [airRaw, airRaw, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
    this.updateFrame("18FEAE00", airBytes);

    // 11. ETC2 (0x18F00503) - Transmission Gear
    const gearRaw = Math.round(s.gear + 125);
    const etc2Bytes = [0xff, 0xff, 0xff, gearRaw, 0xff, 0xff, 0xff, 0xff];
    this.updateFrame("18F00503", etc2Bytes);

    // Update slot values & counts
    this.slots.forEach(slot => {
      const frame = this.frameCache.get(slot.canIdHex);
      if (frame) {
        slot.frameCount = frame.frameCount;
        slot.lastSeenMs = 30 + Math.floor(Math.random() * 40);
        slot.rawBytes = frame.bytes;
        slot.rawHex = formatBytesHex(frame.bytes);
        slot.changingBytes = frame.changingBytesCount;
      }
    });
  }

  updateFrame(canIdHex, bytes) {
    const existing = this.frameCache.get(canIdHex);
    const prevBytes = existing ? existing.bytes : bytes;
    let changingBytesCount = 0;
    const deltaFlags = bytes.map((b, i) => {
      const changed = b !== prevBytes[i];
      if (changed) changingBytesCount++;
      return changed;
    });

    const frameCount = existing ? existing.frameCount + 1 : 1;
    this.frameCache.set(canIdHex, {
      canIdHex,
      bytes,
      prevBytes,
      deltaFlags,
      changingBytesCount,
      frameCount,
      lastSeen: new Date().toLocaleTimeString() + "." + String(Date.now() % 1000).padStart(3, "0"),
      timestamp: Date.now()
    });
  }

  recordHistoryPoint() {
    const now = new Date();
    const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    const s = this.state;

    // Point stores both physical decoded value AND raw integer / hex for comparison
    const point = {
      time: timeLabel,
      t: this.tickCount,
      // Engine Speed
      rpm: Math.round(s.rpm),
      rpmRaw: Math.round(s.rpm * 8), // Raw ADC word
      // Vehicle Speed
      speed: Number(s.speed.toFixed(1)),
      speedRaw: Math.round(s.speed * 256),
      // Coolant Temp
      temp: Number(s.coolantTemp.toFixed(1)),
      tempRaw: Math.round(s.coolantTemp + 40),
      // Oil Pressure
      oilPress: Math.round(s.oilPressure),
      oilPressRaw: Math.round(s.oilPressure / 4),
      // Fuel Rate
      fuelRate: Number(s.fuelRate.toFixed(1)),
      fuelRateRaw: Math.round(s.fuelRate / 0.05),
      // Pedal & Torque
      pedal: Number(s.pedal.toFixed(1)),
      torque: Number(s.torque.toFixed(1)),
      gear: s.gear
    };

    this.signalHistory.push(point);
    if (this.signalHistory.length > 50) {
      this.signalHistory.shift();
    }
  }

  evaluateAlerts() {
    const s = this.state;

    // Overheat warning/critical
    if (s.coolantTemp >= 105) {
      this.maybeAddEvent("CRIT", "Cooling", "Engine Overheating Critical", `Coolant temperature reached ${s.coolantTemp.toFixed(1)} °C. SPN 110 FMI 0 imminent head damage.`, "SPN_110");
    } else if (s.coolantTemp >= 98) {
      this.maybeAddEvent("WARN", "Cooling", "Coolant Temp Elevated", `Coolant temp at ${s.coolantTemp.toFixed(1)} °C. High fan duty cycle commanded.`, "SPN_110");
    }

    // Low Oil Pressure
    if (s.rpm > 500 && s.oilPressure < 120) {
      this.maybeAddEvent("CRIT", "Lubrication", "Critically Low Oil Pressure", `Lube pressure dropped to ${s.oilPressure.toFixed(0)} kPa! SPN 100 FMI 1.`, "SPN_100");
    }

    // High RPM over-rev
    if (s.rpm >= 2300) {
      this.maybeAddEvent("WARN", "Powertrain", "Engine Over-Rev Alert", `Engine speed at ${s.rpm} RPM exceeding optimal powerband limit.`, "SPN_190");
    }

    // Air Tank pressure drop
    if (s.airTank1 < 700) {
      this.maybeAddEvent("WARN", "Brakes", "Pneumatic Tank Low Pressure", `Service air tank 1 pressure at ${s.airTank1.toFixed(0)} kPa.`, "SPN_117");
    }
  }

  maybeAddEvent(severity, category, title, detail, source) {
    // Avoid duplicate flood within last 15 seconds
    const recent = this.events.find(e => e.title === title && Date.now() - (e.timestamp || 0) < 15000);
    if (!recent) {
      this.addEvent({ severity, category, title, detail, source });
    }
  }

  addEvent({ severity, category, title, detail, source }) {
    const evt = {
      id: "evt-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      severity,
      category,
      title,
      detail,
      source: source || "SYSTEM"
    };
    this.events.unshift(evt);
    if (this.events.length > 150) this.events.pop();
  }

  clearEvents() {
    this.events = [];
    this.notify();
  }

  /**
   * Run automated bench diagnostic suite
   */
  async runDiagnosticTests(onProgress) {
    const results = [];
    for (let i = 0; i < DIAGNOSTIC_TESTS.length; i++) {
      const test = DIAGNOSTIC_TESTS[i];
      if (onProgress) onProgress(test.id, "RUNNING");

      // Realistic bench test execution delay
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

      let passed = true;
      let logMsg = "";
      const latency = 12 + Math.floor(Math.random() * 28);

      switch (test.id) {
        case "test-can-reception":
          passed = this.state.canBusStatus === "Active";
          logMsg = `Transceiver locked on CAN1. 250 kbps nominal. 0 bus-off errors recorded. Latency: ${latency}ms.`;
          break;
        case "test-id-mask":
          passed = true;
          logMsg = `Filter registers verified. All 29-bit extended IDs matching mask 0x1FFFFFFF without packet loss.`;
          break;
        case "test-raw-availability":
          passed = this.frameCache.size >= 8;
          logMsg = `Received ${this.frameCache.size} unique active PGNs. DLC=8 confirmed on all frames. Max jitter: 8.2ms.`;
          break;
        case "test-avl-mapping":
          passed = true;
          logMsg = `Codec 8E AVL generation verified. Slots CAN00..CAN13 successfully bound to AVL IDs 145..384.`;
          break;
        case "test-aws-reception":
          passed = true;
          logMsg = `AWS IoT Core MQTT broker ACK received on topic 'teltonika/fmc650/${this.getActiveDevice().imei}/data'. Roundtrip: ${latency}ms.`;
          break;
      }

      const res = {
        ...test,
        status: passed ? "PASS" : "FAIL",
        latencyMs: latency,
        timestamp: new Date().toLocaleTimeString(),
        log: logMsg
      };
      results.push(res);
      if (onProgress) onProgress(test.id, res.status);
    }

    this.testResults = results;
    this.addEvent({
      severity: "INFO",
      category: "Diagnostics",
      title: "Bench Test Suite Completed",
      detail: `All ${results.length} diagnostic tests executed. 5 Passed, 0 Failed.`,
      source: "TEST_RUNNER"
    });
    this.notify();
    return results;
  }

  getSnapshot() {
    const activeDev = this.getActiveDevice();

    if (!this.isRunning) {
      const zeroState = {
        rpm: 0,
        speed: 0,
        pedal: 0,
        torque: 0,
        coolantTemp: 0,
        oilPressure: 0,
        fuelRate: 0,
        totalFuel: 0,
        engineHours: 0,
        defLevel: 0,
        airTank1: 0,
        airTank2: 0,
        dpfDeltaP: 0,
        gear: 0,
        axleWeight: 0,
        extVoltage: 0,
        batVoltage: 0,
        ignition: "OFF",
        canBusStatus: "Stream Off (0 Kbps)",
        mqttLatencyMs: 0
      };

      const zeroAvl = {
        imei: activeDev.imei,
        firmware: activeDev.firmware,
        ts: "STREAM OFF (0 Kbps)",
        lat: 0,
        lng: 0,
        alt: 0,
        145: 0,
        146: 0,
        147: 0,
        148: 0,
        149: 0,
        150: 0,
        151: 0,
        152: 0,
        153: 0,
        154: 0,
        380: 0,
        382: 0,
        239: 0,
        66: 0,
        67: 0
      };

      const zeroSlots = this.slots.map(s => ({
        ...s,
        status: "No Data",
        frameCount: 0,
        lastSeenMs: 0,
        rawBytes: [0, 0, 0, 0, 0, 0, 0, 0],
        rawHex: "00 00 00 00 00 00 00 00",
        changingBytes: 0
      }));

      const zeroFrames = Array.from(this.frameCache.values()).map(f => ({
        ...f,
        bytes: [0, 0, 0, 0, 0, 0, 0, 0],
        prevBytes: [0, 0, 0, 0, 0, 0, 0, 0],
        deltaFlags: [false, false, false, false, false, false, false, false],
        changingBytesCount: 0,
        frameCount: 0,
        lastSeen: "Stream Off"
      }));

      const zeroFrameMap = new Map();
      zeroFrames.forEach(f => zeroFrameMap.set(f.canIdHex, f));

      return {
        activeDevice: activeDev,
        devices: this.devices,
        scenario: this.scenario,
        isRunning: false,
        state: zeroState,
        slots: zeroSlots,
        frames: zeroFrames,
        frameMap: zeroFrameMap,
        history: this.signalHistory,
        events: this.events,
        testResults: this.testResults,
        avlPayload: zeroAvl,
        metrics: {
          totalConfigured: this.slots.length,
          receiving: 0,
          stale: 0,
          noData: this.slots.length,
          decodingErrors: 0,
          lastRecordTime: "Stream Off (0 Kbps)",
          lastAwsUpdate: "Offline · 0 Kbps",
          canBusStatus: "Disconnected · 0 Kbps",
          ignitionStatus: "OFF"
        }
      };
    }

    const framesArray = Array.from(this.frameCache.values());

    // Compute AVL packet with current raw values
    const avlReported = {
      imei: activeDev.imei,
      firmware: activeDev.firmware,
      ts: new Date().toISOString(),
      lat: 10.823078,
      lng: 78.685815,
      alt: 85,
      // AVL IDs
      145: Math.round(this.state.rpm * 8), // Engine Speed raw
      146: Math.round(this.state.speed * 256), // Vehicle Speed raw
      147: Math.round(this.state.pedal / 0.4), // Pedal raw
      148: Math.round(this.state.torque + 125), // Torque raw
      149: Math.round(this.state.totalFuel * 2), // Fuel used raw
      150: Math.round(this.state.engineHours * 20), // Engine hours raw
      151: Math.round(this.state.fuelRate / 0.05), // Fuel rate raw
      152: Math.round(this.state.coolantTemp + 40), // Coolant temp raw
      153: Math.round(this.state.oilPressure / 4), // Oil pressure raw
      154: Math.round(this.state.defLevel / 0.4), // DEF level raw
      380: Math.round(this.state.airTank1 / 8), // Air tank 1 raw
      382: Math.round(this.state.gear + 125), // Gear raw
      239: this.state.ignition === "ON" ? 1 : 0,
      66: Math.round(this.state.extVoltage * 1000),
      67: Math.round(this.state.batVoltage * 1000)
    };

    // Calculate metrics
    const totalConfigured = this.slots.length;
    const receiving = this.slots.filter(s => s.status === "Receiving").length;
    const stale = this.slots.filter(s => s.status === "Stale").length;
    const noData = this.slots.filter(s => s.status === "No Data").length;
    const decodingErrors = activeDev.decodingErrors || 0;

    return {
      activeDevice: activeDev,
      devices: this.devices,
      scenario: this.scenario,
      isRunning: this.isRunning,
      state: this.state,
      slots: this.slots,
      frames: framesArray,
      frameMap: this.frameCache,
      history: this.signalHistory,
      events: this.events,
      testResults: this.testResults,
      avlPayload: avlReported,
      metrics: {
        totalConfigured,
        receiving,
        stale,
        noData,
        decodingErrors,
        lastRecordTime: "Just now (" + (framesArray[0]?.lastSeen || "Live") + ")",
        lastAwsUpdate: "120ms ago · QoS 1 ACK",
        canBusStatus: "Connected · 250 kbps",
        ignitionStatus: this.state.ignition
      }
    };
  }
}

// Global Singleton Instance
export const telematicsEngine = new TelematicsEngine();
