// Clearly labelled demonstration values. Replace with live backend/API data.
export const canRows = [
  { id: "0CF00400", pgn: "61444", name: "EEC1 · Engine speed / torque", slot: "Manual CAN 00", avl: "145", raw: "B8 0B FF 00 00 00 FF FF", value: "1450 RPM", state: "Receiving", seen: "Just now" },
  { id: "18F00300", pgn: "61443", name: "EEC2 · Pedal / demand", slot: "Manual CAN 01", avl: "147", raw: "6E FF 00 FF FF FF FF FF", value: "44%", state: "Receiving", seen: "1s ago" },
  { id: "18FEEE00", pgn: "65262", name: "ET1 · Engine temperature", slot: "Manual CAN 02", avl: "152", raw: "82 FF FF FF FF FF FF FF", value: "90 °C", state: "Receiving", seen: "2s ago" },
  { id: "18FEEF00", pgn: "65263", name: "EFL/P1 · Engine oil", slot: "Manual CAN 03", avl: "153", raw: "69 FF FF FF FF FF FF FF", value: "420 kPa", state: "Stale", seen: "48s ago" },
  { id: "18FEF100", pgn: "65265", name: "CCVS1 · Vehicle speed", slot: "Manual CAN 04", avl: "146", raw: "00 48 FF FF FF FF FF FF", value: "72 km/h", state: "Receiving", seen: "1s ago" },
  { id: "18FEE500", pgn: "65253", name: "Engine hours", slot: "Manual CAN 05", avl: "150", raw: "B8 5E 00 00 FF FF FF FF", value: "1210 hrs", state: "Not verified", seen: "—" }
];

export const payloadExample = {
  state: { reported: {
    imei: "DEMO-DEVICE-NOT-LIVE",
    ts: "DEMO TIMESTAMP",
    "145": 11600,
    "146": 18432,
    "147": 110,
    "152": 130,
    "153": 105,
    "239": 1
  }}
};

export const signals = [
  { name: "Engine Speed", spn: "190", pgn: "61444 / 0xF004", raw: "11600", formula: "raw × 0.125", value: "1450", unit: "RPM" },
  { name: "Accelerator Pedal Position", spn: "91", pgn: "61443 / 0xF003", raw: "110", formula: "verify signal definition / encoding", value: "Not decoded", unit: "%" },
  { name: "Engine Coolant Temperature", spn: "110", pgn: "65262 / 0xFEEE", raw: "130", formula: "raw − 40 (if raw byte matches J1939 definition)", value: "90", unit: "°C" },
  { name: "Engine Oil Pressure", spn: "100", pgn: "65263 / 0xFEEF", raw: "105", formula: "verify source bytes and encoding", value: "Not decoded", unit: "kPa" }
];

export const tests = [
  { name: "Device / telemetry source", detail: "Data source connected to backend", state: "Not verified" },
  { name: "Manual CAN ID reception", detail: "Confirm incoming frame or device-reported AVL element", state: "Demo only" },
  { name: "AVL element mapping", detail: "Confirm slot-to-element mapping from actual Configurator settings", state: "Not verified" },
  { name: "PGN / SPN decoding", detail: "Check PGN, byte order, start bit, length, scaling and offset", state: "Review required" },
  { name: "AWS MQTT delivery", detail: "Confirm actual broker message / ingestion record", state: "Not connected" }
];