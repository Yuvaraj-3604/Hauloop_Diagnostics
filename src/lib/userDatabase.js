// User Database Management Module for HAULOOP Telematics
// Handles persistent storage for all registered user accounts under 'user_database' and 'user_database_details'

export const STORAGE_KEYS = {
  PRIMARY: "user_database",
  DETAILS: "user_database_details",
  LEGACY: "hauloop_registered_users"
};

// Default seed accounts if user database is fresh
const DEFAULT_SEED_USERS = [
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
    fullName: "Diagnostic Systems Lead",
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
 * Normalizes a raw user object ensuring no undefined/null properties.
 */
export function normalizeUser(raw) {
  if (!raw) return null;
  const rawEmail = (raw.email || "").trim();
  const rawUser = (raw.username || "").trim();
  const derivedEmail =
    rawEmail || (rawUser.includes("@") ? rawUser : "");
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

/**
 * Retrieves all registered users from user_database.
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

    // Merge default seed accounts if not already present
    const normalizedList = parsed.map(normalizeUser).filter(Boolean);
    const existingEmails = new Set(normalizedList.map(u => u.email.toLowerCase()));

    DEFAULT_SEED_USERS.forEach(seed => {
      if (!existingEmails.has(seed.email.toLowerCase())) {
        normalizedList.push(seed);
      }
    });

    return normalizedList;
  } catch (err) {
    console.error("Failed to read user_database:", err);
    return DEFAULT_SEED_USERS;
  }
}

/**
 * Saves a new or updated user to user_database, user_database_details, and legacy keys.
 */
export function saveToUserDatabase(userData) {
  try {
    const normalized = normalizeUser(userData);
    const currentUsers = getUserDatabase();

    const cleanEmail = normalized.email.toLowerCase();
    const cleanUser = normalized.username.toLowerCase();

    // Remove any existing user matching email or username
    const filtered = currentUsers.filter(u => {
      const uEmail = (u.email || "").toLowerCase();
      const uUser = (u.username || "").toLowerCase();
      return uEmail !== cleanEmail && uUser !== cleanUser;
    });

    filtered.push(normalized);

    const jsonStr = JSON.stringify(filtered, null, 2);

    // Save across storage keys for complete consistency
    localStorage.setItem(STORAGE_KEYS.PRIMARY, jsonStr);
    localStorage.setItem(STORAGE_KEYS.DETAILS, jsonStr);
    localStorage.setItem(STORAGE_KEYS.LEGACY, jsonStr);

    return normalized;
  } catch (err) {
    console.error("Failed to save to user_database:", err);
    return normalizeUser(userData);
  }
}

/**
 * Updates the last login timestamp for a user.
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
