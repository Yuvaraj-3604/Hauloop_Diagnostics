/**
 * Teltonika FMC650 J1939 AVL Protocol Decoder
 * Decodes raw Teltonika AVL properties into standard SAE J1939 physical engineering units.
 */

// Master dictionary of FMC650 Manual CAN and standard AVL definitions
const AVL_DEFINITIONS = {
  // --- Core Powertrain (Tier 1) ---
  145: {
    name: 'Engine Speed',
    acronym: 'EEC1_RPM',
    channel: 'CAN00',
    pgnHex: '0xF004',
    pgnDec: 61444,
    unit: 'RPM',
    min: 0,
    max: 8000,
    formulaDesc: 'Raw × 0.125',
    decode: (raw) => Number((raw * 0.125).toFixed(1))
  },
  146: {
    name: 'Vehicle Speed',
    acronym: 'CCVS1_Speed',
    channel: 'CAN01',
    pgnHex: '0xFEF1',
    pgnDec: 65265,
    unit: 'km/h',
    min: 0,
    max: 250,
    formulaDesc: 'Raw × (1/256)',
    decode: (raw) => Number((raw / 256).toFixed(1))
  },
  147: {
    name: 'Accelerator Pedal Position',
    acronym: 'EEC2_Pedal',
    channel: 'CAN02',
    pgnHex: '0xF003',
    pgnDec: 61443,
    unit: '%',
    min: 0,
    max: 100,
    formulaDesc: 'Raw × 0.4',
    decode: (raw) => Number(Math.min(100, Math.max(0, raw * 0.4)).toFixed(1))
  },
  148: {
    name: 'Actual Engine Torque',
    acronym: 'EEC1_Torque',
    channel: 'CAN03',
    pgnHex: '0xF004',
    pgnDec: 61444,
    unit: '%',
    min: -125,
    max: 125,
    formulaDesc: 'Raw - 125',
    decode: (raw) => Number((raw - 125).toFixed(1))
  },
  149: {
    name: 'Cumulative Total Fuel Used',
    acronym: 'LFC_TotalFuel',
    channel: 'CAN04',
    pgnHex: '0xFEE9',
    pgnDec: 65257,
    unit: 'L',
    min: 0,
    max: 999999,
    formulaDesc: 'Raw × 0.5',
    decode: (raw) => Number((raw * 0.5).toFixed(1))
  },
  150: {
    name: 'Total Engine Run Hours',
    acronym: 'HOURS_EngineHours',
    channel: 'CAN05',
    pgnHex: '0xFEE5',
    pgnDec: 65253,
    unit: 'hrs',
    min: 0,
    max: 999999,
    formulaDesc: 'Raw × 0.05',
    decode: (raw) => Number((raw * 0.05).toFixed(2))
  },
  151: {
    name: 'Instantaneous Fuel Rate',
    acronym: 'LFE_FuelRate',
    channel: 'CAN06',
    pgnHex: '0xFEF2',
    pgnDec: 65266,
    unit: 'L/h',
    min: 0,
    max: 300,
    formulaDesc: 'Raw × 0.05',
    decode: (raw) => Number((raw * 0.05).toFixed(2))
  },
  152: {
    name: 'Engine Coolant Temperature',
    acronym: 'ET1_CoolantTemp',
    channel: 'CAN07',
    pgnHex: '0xFEEE',
    pgnDec: 65262,
    unit: '°C',
    min: -40,
    max: 210,
    formulaDesc: 'Raw - 40',
    decode: (raw) => Number((raw - 40).toFixed(1))
  },
  153: {
    name: 'Engine Oil Pressure',
    acronym: 'EFL_OilPress',
    channel: 'CAN08',
    pgnHex: '0xFEEF',
    pgnDec: 65263,
    unit: 'kPa',
    min: 0,
    max: 1000,
    formulaDesc: 'Raw × 4',
    decode: (raw) => Number((raw * 4).toFixed(0))
  },
  154: {
    name: 'DEF / AdBlue Tank Level',
    acronym: 'AT1T1I_DEFLevel',
    channel: 'CAN09',
    pgnHex: '0xFE56',
    pgnDec: 65110,
    unit: '%',
    min: 0,
    max: 100,
    formulaDesc: 'Raw × 0.4',
    decode: (raw) => Number(Math.min(100, Math.max(0, raw * 0.4)).toFixed(1))
  },

  // --- Operational & Chassis (Tier 2) ---
  380: {
    name: 'Air Brake Tank 1 Pressure',
    acronym: 'AIR1_Tank1',
    channel: 'CAN10',
    pgnHex: '0xFEAE',
    pgnDec: 65198,
    unit: 'kPa',
    min: 0,
    max: 2000,
    formulaDesc: 'Raw × 8',
    decode: (raw) => Number((raw * 8).toFixed(0))
  },
  381: {
    name: 'Air Brake Tank 2 Pressure',
    acronym: 'AIR1_Tank2',
    channel: 'CAN11',
    pgnHex: '0xFEAE',
    pgnDec: 65198,
    unit: 'kPa',
    min: 0,
    max: 2000,
    formulaDesc: 'Raw × 8',
    decode: (raw) => Number((raw * 8).toFixed(0))
  },
  382: {
    name: 'Active Transmission Gear',
    acronym: 'ETC2_Gear',
    channel: 'CAN12',
    pgnHex: '0xF005',
    pgnDec: 61445,
    unit: '',
    min: -2,
    max: 16,
    formulaDesc: 'Raw - 125',
    decode: (raw) => {
      const g = raw - 125;
      if (g === 0) return 'N';
      if (g === -1) return 'R1';
      if (g === -2) return 'R2';
      return `G${g}`;
    }
  },
  383: {
    name: 'DPF Differential Pressure (Delta-P)',
    acronym: 'AT1S_DPFDeltaP',
    channel: 'CAN13',
    pgnHex: '0xFD7B',
    pgnDec: 64891,
    unit: 'kPa',
    min: 0,
    max: 50,
    formulaDesc: 'Raw × 0.1',
    decode: (raw) => Number((raw * 0.1).toFixed(2))
  },
  384: {
    name: 'Bogie Axle Weight',
    acronym: 'VW_AxleWeight',
    channel: 'CAN14',
    pgnHex: '0xFEEA',
    pgnDec: 65258,
    unit: 'kg',
    min: 0,
    max: 35000,
    formulaDesc: 'Raw × 0.5',
    decode: (raw) => Number((raw * 0.5).toFixed(0))
  },

  // --- Teltonika Standard System Elements ---
  239: {
    name: 'Ignition Status',
    acronym: 'SYS_Ignition',
    channel: 'DIN/IGN',
    pgnHex: 'N/A',
    pgnDec: 0,
    unit: '',
    formulaDesc: '0=Off, 1=On',
    decode: (raw) => (Number(raw) > 0 ? 'ON' : 'OFF')
  },
  66: {
    name: 'External Power Voltage',
    acronym: 'SYS_ExtVolt',
    channel: 'PWR',
    pgnHex: 'N/A',
    pgnDec: 0,
    unit: 'V',
    min: 0,
    max: 36,
    formulaDesc: 'Raw / 1000',
    decode: (raw) => Number((raw / 1000).toFixed(2))
  },
  67: {
    name: 'Backup Battery Voltage',
    acronym: 'SYS_BatVolt',
    channel: 'BAT',
    pgnHex: 'N/A',
    pgnDec: 0,
    unit: 'V',
    min: 0,
    max: 5,
    formulaDesc: 'Raw / 1000',
    decode: (raw) => Number((raw / 1000).toFixed(2))
  },
  24: {
    name: 'GNSS Road Speed',
    acronym: 'GPS_Speed',
    channel: 'GNSS',
    pgnHex: 'N/A',
    pgnDec: 0,
    unit: 'km/h',
    min: 0,
    max: 200,
    formulaDesc: 'Raw × 1',
    decode: (raw) => Number(Number(raw).toFixed(1))
  },
  254: {
    name: 'Green Driving G-Force',
    acronym: 'ECO_GForce',
    channel: 'ACCEL',
    pgnHex: 'N/A',
    pgnDec: 0,
    unit: 'g',
    min: 0,
    max: 5,
    formulaDesc: 'Raw × 0.01',
    decode: (raw) => Number((raw * 0.01).toFixed(2))
  }
};

/**
 * Decodes a raw incoming packet (e.g. from AWS IoT Core MQTT or Device Shadow)
 * @param {Object} rawPacket - Either an object of AVL IDs or standard Teltonika parsed packet
 * @returns {Object} decodedState with engineering KPIs, signal table, and raw inspector entries
 */
function decodeFMC650Packet(rawPacket) {
  const now = new Date();
  const imei = rawPacket.imei || rawPacket.device_id || '867530901234567';
  const timestamp = rawPacket.timestamp || rawPacket.ts || now.toISOString();

  // Extract coordinate data
  const lat = Number(rawPacket.lat ?? rawPacket.latitude ?? 10.823078);
  const lng = Number(rawPacket.lng ?? rawPacket.longitude ?? 78.685815);
  const altitude = Number(rawPacket.alt ?? rawPacket.altitude ?? 85);
  const angle = Number(rawPacket.angle ?? rawPacket.heading ?? 45);

  // Raw AVL mapping can come as keys in rawPacket directly, or in rawPacket.avl, or rawPacket.metrics
  const avlStore = rawPacket.avl || rawPacket.metrics || rawPacket;

  const decodedSignals = [];
  const kpis = {
    imei,
    timestamp,
    lat,
    lng,
    altitude,
    heading: angle,
    ignition: 'ON',
    rpm: 0,
    speed: 0,
    gnssSpeed: 0,
    pedalPos: 0,
    engineTorque: 0,
    totalFuel: 0,
    engineHours: 0,
    fuelRate: 0,
    coolantTemp: 0,
    oilPressure: 0,
    defLevel: 0,
    airTank1: 0,
    airTank2: 0,
    gear: 'N',
    dpfDeltaP: 0,
    bogieAxleWeight: 0,
    extVoltage: 24.2,
    batVoltage: 4.12,
    gForce: 0.02,
    engineLoad: 0
  };

  // Inspect each supported AVL ID
  for (const [idStr, meta] of Object.entries(AVL_DEFINITIONS)) {
    const id = parseInt(idStr, 10);
    const rawVal = avlStore[idStr] !== undefined ? avlStore[idStr] : avlStore[id];

    if (rawVal !== undefined && rawVal !== null) {
      const numericRaw = typeof rawVal === 'string' && rawVal.startsWith('0x')
        ? parseInt(rawVal, 16)
        : Number(rawVal);

      const decodedVal = meta.decode(numericRaw);
      const rawHex = '0x' + (Number.isFinite(numericRaw) ? Math.floor(numericRaw).toString(16).toUpperCase().padStart(4, '0') : '00');

      decodedSignals.push({
        id,
        channel: meta.channel,
        name: meta.name,
        acronym: meta.acronym,
        pgn: meta.pgnHex,
        raw: numericRaw,
        rawHex,
        decoded: decodedVal,
        unit: meta.unit,
        formula: meta.formulaDesc,
        status: 'OK'
      });

      // Bind to KPI summaries
      switch (id) {
        case 145: kpis.rpm = decodedVal; break;
        case 146: kpis.speed = decodedVal; break;
        case 147: kpis.pedalPos = decodedVal; break;
        case 148: kpis.engineTorque = decodedVal; break;
        case 149: kpis.totalFuel = decodedVal; break;
        case 150: kpis.engineHours = decodedVal; break;
        case 151: kpis.fuelRate = decodedVal; break;
        case 152: kpis.coolantTemp = decodedVal; break;
        case 153: kpis.oilPressure = decodedVal; break;
        case 154: kpis.defLevel = decodedVal; break;
        case 380: kpis.airTank1 = decodedVal; break;
        case 381: kpis.airTank2 = decodedVal; break;
        case 382: kpis.gear = decodedVal; break;
        case 383: kpis.dpfDeltaP = decodedVal; break;
        case 384: kpis.bogieAxleWeight = decodedVal; break;
        case 239: kpis.ignition = decodedVal; break;
        case 66: kpis.extVoltage = decodedVal; break;
        case 67: kpis.batVoltage = decodedVal; break;
        case 24: kpis.gnssSpeed = decodedVal; break;
        case 254: kpis.gForce = decodedVal; break;
      }
    }
  }

  // Derive estimated Engine Percent Load % if not directly provided
  if (avlStore['22'] !== undefined) {
    kpis.engineLoad = Number(avlStore['22']);
  } else {
    // Standard J1939 derived approximation: combination of throttle pedal and torque %
    const baseTorque = Math.max(0, kpis.engineTorque);
    kpis.engineLoad = Number(Math.min(100, Math.max(12, (baseTorque * 0.7) + (kpis.pedalPos * 0.3))).toFixed(1));
  }

  return {
    kpis,
    signals: decodedSignals,
    rawPacket
  };
}

module.exports = {
  AVL_DEFINITIONS,
  decodeFMC650Packet
};
