// User Database Management & Cross-Platform Sync Module for HAULOOP Telematics
// Synchronizes registered user accounts across Web and Android APK via local storage & cloud channel

export const STORAGE_KEYS = {
  PRIMARY: "user_database",
  DETAILS: "user_database_details",
  LEGACY: "hauloop_registered_users"
};

// Global Cloud Sync Endpoint to bridge Web and APK registrations
const CLOUD_SYNC_URL = "https://api.restful-api.dev/objects/ff808181a09d98f701a15d31bb43384b";

// Built-in Seed Accounts (Only official system admin and engineer)
export const DEFAULT_SEED_USERS = [
  {
    id: "USR-SEED-001",
    operatorId: "ADM-1001",
    fullName: "System Administrator",
    email: "admin@hauloop.com",
    username: "admin",
    role: "Fleet Administrator",
    password: "hauloop2026",
    status: "Active",
    securityClearance: "Level 3 (Root Telematics)",
    terminalStation: "HAULOOP-TERM-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastLogin: new Date().toISOString()
  },
  {
    id: "USR-SEED-002",
    operatorId: "ENG-4825",
    fullName: "Diagnostic Field Engineer",
    email: "engineer@hauloop.com",
    username: "engineer",
    role: "Diagnostic Engineer",
    password: "fmc650",
    status: "Active",
    securityClearance: "Level 2 (Diagnostic Engineer)",
    terminalStation: "HAULOOP-TERM-02",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastLogin: new Date().toISOString()
  }
];

/**
 * Normalizes a user record ensuring no undefined/null properties.
 */
export function normalizeUser(raw) {
  if (!raw) return null;
  const rawEmail = (raw.email || "").trim();
  const rawUser = (raw.username || "").trim();
  const derivedEmail = rawEmail || (rawUser.includes("@") ? rawUser : "");
  const derivedUser = rawUser || (rawEmail.includes("@") ? rawEmail.split("@")[0] : rawEmail);
  const fullName = (raw.fullName || raw.name || derivedUser || "Fleet Operator").trim();

  return {
    id: raw.id || `USR-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    operatorId: raw.operatorId || `OP-${Math.floor(1000 + Math.random() * 9000)}`,
    fullName,
    email: derivedEmail,
    username: derivedUser || "operator",
    role: raw.role || "Fleet Administrator",
    password: (raw.password || "").trim(),
    status: raw.status || "Active",
    securityClearance: raw.securityClearance || "Level 3 (Root Telematics)",
    terminalStation: raw.terminalStation || "HAULOOP-TERM-04",
    createdAt: raw.createdAt || new Date().toISOString(),
    lastLogin: raw.lastLogin || new Date().toISOString()
  };
}

// Disallowed legacy default seed emails (must not be preloaded as default accounts)
const DISALLOWED_DEFAULT_SEEDS = new Set([
  "yuvarajperumal364@gmail.com",
  "yuvarajpperumal364@gmail.com",
  "yuvarajperumalv@gmail.com"
]);

/**
 * Retrieves all registered users from local user_database, merged with built-in seeds.
 */
export function getUserDatabase() {
  try {
    let rawData = localStorage.getItem(STORAGE_KEYS.PRIMARY);
    if (!rawData) {
      rawData = localStorage.getItem(STORAGE_KEYS.DETAILS) || localStorage.getItem(STORAGE_KEYS.LEGACY);
    }

    let parsed = [];
    if (rawData) {
      const data = JSON.parse(rawData);
      parsed = Array.isArray(data) ? data : (data.users || []);
    }

    const normalizedList = parsed.map(normalizeUser).filter(Boolean);
    const validSeedIds = new Set(DEFAULT_SEED_USERS.map(s => s.id));

    // Filter out obsolete seed accounts or cached default accounts
    const cleanList = normalizedList.filter(u => {
      if (u.id && u.id.startsWith("USR-SEED-")) {
        return validSeedIds.has(u.id);
      }
      if (
        DISALLOWED_DEFAULT_SEEDS.has((u.email || "").toLowerCase()) &&
        (u.operatorId === "ADM-3604" || u.operatorId === "OP-6613" || u.operatorId === "OP-1901")
      ) {
        return false;
      }
      return true;
    });

    const existingEmails = new Set(cleanList.map(u => u.email.toLowerCase()));
    const existingUsers = new Set(cleanList.map(u => u.username.toLowerCase()));

    // Merge default seeds if not already present
    DEFAULT_SEED_USERS.forEach(seed => {
      if (!existingEmails.has(seed.email.toLowerCase()) && !existingUsers.has(seed.username.toLowerCase())) {
        cleanList.push(seed);
      }
    });

    // Write back clean list if changes were made to wipe obsolete cache on APK & Web
    if (cleanList.length !== normalizedList.length) {
      const jsonStr = JSON.stringify(cleanList, null, 2);
      localStorage.setItem(STORAGE_KEYS.PRIMARY, jsonStr);
      localStorage.setItem(STORAGE_KEYS.DETAILS, jsonStr);
      localStorage.setItem(STORAGE_KEYS.LEGACY, jsonStr);
    }

    return cleanList;
  } catch (err) {
    console.error("Failed to read user_database:", err);
    return DEFAULT_SEED_USERS;
  }
}

/**
 * Saves a new user to user_database, updating local storage and background cloud sync.
 */
export function saveToUserDatabase(userData) {
  try {
    const normalized = normalizeUser(userData);
    const currentUsers = getUserDatabase();

    const cleanEmail = normalized.email.toLowerCase();
    const cleanUser = normalized.username.toLowerCase();

    // Remove duplicates
    const filtered = currentUsers.filter(u => {
      const uEmail = (u.email || "").toLowerCase();
      const uUser = (u.username || "").toLowerCase();
      return uEmail !== cleanEmail && uUser !== cleanUser;
    });

    filtered.push(normalized);

    const jsonStr = JSON.stringify(filtered, null, 2);
    localStorage.setItem(STORAGE_KEYS.PRIMARY, jsonStr);
    localStorage.setItem(STORAGE_KEYS.DETAILS, jsonStr);
    localStorage.setItem(STORAGE_KEYS.LEGACY, jsonStr);

    // Asynchronously sync to Cloud Channel so other platform (Web or APK) receives it
    syncDatabaseToCloud(filtered);

    return normalized;
  } catch (err) {
    console.error("Failed to save to user_database:", err);
    return normalizeUser(userData);
  }
}

/**
 * Records login timestamp for user.
 */
export function recordUserLogin(identifier) {
  try {
    const clean = (identifier || "").trim().toLowerCase();
    const users = getUserDatabase();
    const user = users.find(u =>
      (u.email && u.email.toLowerCase() === clean) ||
      (u.username && u.username.toLowerCase() === clean)
    );
    if (user) {
      user.lastLogin = new Date().toISOString();
      const jsonStr = JSON.stringify(users, null, 2);
      localStorage.setItem(STORAGE_KEYS.PRIMARY, jsonStr);
      localStorage.setItem(STORAGE_KEYS.DETAILS, jsonStr);
      localStorage.setItem(STORAGE_KEYS.LEGACY, jsonStr);
    }
  } catch {
    // ignore
  }
}

/**
 * Asynchronously syncs local users to the shared cloud channel.
 */
export async function syncDatabaseToCloud(users) {
  try {
    const payload = users || getUserDatabase();
    await fetch(CLOUD_SYNC_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "hauloop_user_database",
        data: { users: payload, syncedAt: new Date().toISOString() }
      })
    });
  } catch {
    // Offline resilience: ignore network failure silently
  }
}

/**
 * Pulls latest users from the shared cloud channel (e.g. signed up on Web, pulling into APK).
 */
export async function syncDatabaseFromCloud() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(CLOUD_SYNC_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return getUserDatabase();

    const result = await res.json();
    const remoteUsers = result?.data?.users;

    if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
      const localUsers = getUserDatabase();
      const localMap = new Map();

      localUsers.forEach(u => {
        if (u.email) localMap.set(u.email.toLowerCase(), u);
        if (u.username) localMap.set(u.username.toLowerCase(), u);
      });

      const validSeedIds = new Set(DEFAULT_SEED_USERS.map(s => s.id));

      // Merge remote users
      remoteUsers.forEach(ru => {
        const norm = normalizeUser(ru);
        if (norm) {
          // Skip obsolete seed accounts
          if (norm.id && norm.id.startsWith("USR-SEED-") && !validSeedIds.has(norm.id)) {
            return;
          }
          if (
            DISALLOWED_DEFAULT_SEEDS.has((norm.email || "").toLowerCase()) &&
            (norm.operatorId === "ADM-3604" || norm.operatorId === "OP-6613" || norm.operatorId === "OP-1901")
          ) {
            return;
          }
          const key = (norm.email || norm.username).toLowerCase();
          if (!localMap.has(key)) {
            localMap.set(key, norm);
          }
        }
      });

      const merged = Array.from(new Set(localMap.values()));
      const jsonStr = JSON.stringify(merged, null, 2);
      localStorage.setItem(STORAGE_KEYS.PRIMARY, jsonStr);
      localStorage.setItem(STORAGE_KEYS.DETAILS, jsonStr);
      localStorage.setItem(STORAGE_KEYS.LEGACY, jsonStr);
      return merged;
    }
  } catch {
    // Offline fallback
  }
  return getUserDatabase();
}
