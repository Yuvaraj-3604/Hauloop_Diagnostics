/**
 * Pure Native JS CAN & J1939 Protocol Parser and Utilities
 * Supports 29-bit extended CAN ID breakdown, PGN extraction,
 * bit-level inspection, and Intel (Little-Endian) / Motorola (Big-Endian) unpacking.
 */

/**
 * Parses a 29-bit J1939 CAN identifier into standard components:
 * Priority, Extended Data Page, Data Page, PDU Format (PF), PDU Specific (PS),
 * Source Address (SA), and Parameter Group Number (PGN).
 */
export function parseJ1939Id(hexId) {
  if (!hexId) return null;
  const clean = String(hexId).trim().replace(/^0x/i, "");
  const id = Number.parseInt(clean, 16);
  if (!Number.isFinite(id) || id < 0 || id > 0x1fffffff) return null;

  const priority = (id >>> 26) & 0x7;
  const extDataPage = (id >>> 25) & 0x1;
  const dataPage = (id >>> 24) & 0x1;
  const pduFormat = (id >>> 16) & 0xff;
  const pduSpecific = (id >>> 8) & 0xff;
  const sourceAddress = id & 0xff;

  // J1939 PGN computation rule:
  // If PF < 240 (PDU1 format - peer to peer), PS is destination address, PGN lower byte is 0.
  // If PF >= 240 (PDU2 format - broadcast), PS is Group Extension, part of PGN.
  const isPdu1 = pduFormat < 240;
  const pgn = (extDataPage << 17) | (dataPage << 16) | (pduFormat << 8) | (isPdu1 ? 0 : pduSpecific);
  const destinationAddress = isPdu1 ? pduSpecific : 0xff; // 0xFF = broadcast

  return {
    rawId: id,
    hex: "0x" + id.toString(16).toUpperCase().padStart(8, "0"),
    priority,
    extDataPage,
    dataPage,
    pduFormat,
    pduSpecific,
    isPdu1,
    destinationAddress,
    sourceAddress,
    pgn,
    pgnHex: "0x" + pgn.toString(16).toUpperCase().padStart(4, "0"),
    formatType: isPdu1 ? "PDU1 (Peer-to-Peer)" : "PDU2 (Broadcast)"
  };
}

/**
 * Converts space-separated or array of hex strings into byte array
 */
export function parseHexBytes(raw) {
  if (Array.isArray(raw)) {
    return raw.map(b => (typeof b === "number" ? b : parseInt(String(b).replace(/^0x/i, ""), 16) || 0));
  }
  return String(raw || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(b => parseInt(b.replace(/^0x/i, ""), 16) || 0);
}

/**
 * Formats byte array into hex string "00 1A FF ..."
 */
export function formatBytesHex(bytes) {
  return (bytes || []).map(b => (b & 0xff).toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

/**
 * Extracts raw signal value from 8-byte array based on bitpos, length, and byteorder.
 * @param {number[]} bytes - 8 bytes of CAN payload
 * @param {number} bitPos - 0-indexed start bit (0 to 63)
 * @param {number} bitLength - length in bits (1 to 64)
 * @param {string} byteOrder - "Intel" (Little Endian) or "Motorola" (Big Endian)
 * @returns {number} raw integer value
 */
export function extractSignalBits(bytes, bitPos, bitLength, byteOrder = "Intel") {
  if (!bytes || bytes.length === 0 || bitLength <= 0) return 0;

  if (byteOrder === "Intel") {
    // Little-endian extraction
    let val = 0n;
    for (let i = 0; i < bitLength; i++) {
      const currentBit = bitPos + i;
      const byteIdx = Math.floor(currentBit / 8);
      const bitInByte = currentBit % 8;
      if (byteIdx < bytes.length) {
        const bitVal = (BigInt(bytes[byteIdx]) >> BigInt(bitInByte)) & 1n;
        val |= bitVal << BigInt(i);
      }
    }
    return Number(val);
  } else {
    // Motorola / Big-endian extraction
    let val = 0n;
    for (let i = 0; i < bitLength; i++) {
      const byteIdx = Math.floor((bitPos - i) / 8);
      const bitInByte = (bitPos - i) % 8;
      if (byteIdx >= 0 && byteIdx < bytes.length) {
        const bitVal = (BigInt(bytes[byteIdx]) >> BigInt(bitInByte)) & 1n;
        val = (val << 1n) | bitVal;
      }
    }
    return Number(val);
  }
}

/**
 * Checks if a specific bit in a 8x8 matrix (byte 0..7, bit 0..7) is covered by a signal
 */
export function isBitOccupied(byteIdx, bitIdx, signalBitPos, signalLength, byteOrder = "Intel") {
  const cellBit = byteIdx * 8 + bitIdx;
  if (byteOrder === "Intel") {
    return cellBit >= signalBitPos && cellBit < signalBitPos + signalLength;
  } else {
    return cellBit <= signalBitPos && cellBit > signalBitPos - signalLength;
  }
}

/**
 * Evaluates J1939 signal validity:
 * In J1939, 0xFF (or all 1s for length) means "Not Available",
 * 0xFE (or max - 1) means "Error / Out of Range".
 */
export function checkSignalValidity(rawValue, bitLength, min, max, decodedValue) {
  const maxRaw = (1 << bitLength) - 1;
  const errRaw = maxRaw - 1;

  if (bitLength > 1 && rawValue === maxRaw) {
    return { valid: false, status: "Not Available", state: "warning" };
  }
  if (bitLength > 1 && rawValue === errRaw) {
    return { valid: false, status: "Sensor Error", state: "danger" };
  }
  if (min !== undefined && decodedValue < min) {
    return { valid: false, status: "Below Min", state: "warning" };
  }
  if (max !== undefined && decodedValue > max) {
    return { valid: false, status: "Above Max", state: "warning" };
  }
  return { valid: true, status: "Valid", state: "success" };
}

/**
 * CSV Exporter helper
 */
export function exportToCSV(rows, filename = "diagnostics-export.csv") {
  if (!rows || rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const lines = rows.map(r =>
    keys.map(k => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(",")
  );
  const csvContent = [header, ...lines].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * JSON Exporter helper
 */
export function exportToJSON(data, filename = "diagnostics-export.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}