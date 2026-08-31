// db.js — persistence layer (SQLite via better-sqlite3).
// SQLite is used here because it needs zero external setup (no separate
// database server to provision) — good for a solo/small-team launch. If you
// outgrow it later (multiple server instances, need for backups/replicas),
// swapping to hosted Postgres (Supabase, Neon, Railway Postgres) means
// rewriting only this file — server.js talks to it through the functions
// exported below, not through raw SQL.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'derive.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL,
    name          TEXT NOT NULL,
    meta          TEXT,
    price         TEXT,
    tier_label    TEXT,
    booking_href  TEXT,
    created_at    INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_trips_session ON trips(session_id);

  CREATE TABLE IF NOT EXISTS history (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL,
    prompt_text   TEXT NOT NULL,
    tags          TEXT,
    budget_label  TEXT,
    nights        INTEGER,
    travelers     INTEGER,
    destination   TEXT,
    created_at    INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_history_session ON history(session_id);

  CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    created_at     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_captures (
    id                  TEXT PRIMARY KEY,
    email               TEXT NOT NULL,
    destination         TEXT,
    marketing_consent   INTEGER NOT NULL DEFAULT 0,
    created_at          INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_email_captures_email ON email_captures(email);
`);

// --- Soft migration: add user_id to trips/history without touching
// existing rows (SQLite has no "ADD COLUMN IF NOT EXISTS", so check first).
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn('trips', 'user_id', 'user_id TEXT');
ensureColumn('history', 'user_id', 'user_id TEXT');
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
  CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id);
`);

const HISTORY_LIMIT = 8;

function newId() {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

// An "identity" is { sessionId, userId }. userId (once logged in) always
// takes priority over the anonymous sessionId. Guest rows are matched with
// "user_id IS NULL" so that once a session's data is claimed by an account
// (see migrateGuestData), the old anonymous id can no longer see it.

// --- Users -------------------------------------------------------------

function createUser(email, passwordHash) {
  const id = newId();
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(id, email, passwordHash, Date.now());
  return id;
}

function findUserByEmail(email) {
  return db.prepare('SELECT id, email, password_hash AS passwordHash FROM users WHERE email = ?').get(email);
}

function findUserById(id) {
  return db.prepare('SELECT id, email FROM users WHERE id = ?').get(id);
}

// Reattach a guest session's existing trips/history to a real account —
// called right after signup and on every login, so nothing gets stranded
// under the old browser-generated id.
function migrateGuestData(sessionId, userId) {
  if (!sessionId || !userId) return;
  db.prepare('UPDATE trips SET user_id = ? WHERE session_id = ? AND user_id IS NULL').run(userId, sessionId);
  db.prepare('UPDATE history SET user_id = ? WHERE session_id = ? AND user_id IS NULL').run(userId, sessionId);
}

// --- Trips -----------------------------------------------------------

function listTrips(identity) {
  if (identity.userId) {
    return db.prepare(
      'SELECT id, name, meta, price, tier_label AS tierLabel, booking_href AS bookingHref, created_at AS savedAt FROM trips WHERE user_id = ? ORDER BY created_at DESC'
    ).all(identity.userId);
  }
  return db.prepare(
    'SELECT id, name, meta, price, tier_label AS tierLabel, booking_href AS bookingHref, created_at AS savedAt FROM trips WHERE session_id = ? AND user_id IS NULL ORDER BY created_at DESC'
  ).all(identity.sessionId);
}

function insertTrip(identity, trip) {
  const id = newId();
  db.prepare(
    `INSERT INTO trips (id, session_id, user_id, name, meta, price, tier_label, booking_href, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, identity.sessionId || newId(), identity.userId || null, trip.name || '', trip.meta || '', trip.price || '', trip.tierLabel || '', trip.bookingHref || '', Date.now());
  return id;
}

function deleteTrip(identity, id) {
  if (identity.userId) {
    db.prepare('DELETE FROM trips WHERE user_id = ? AND id = ?').run(identity.userId, id);
  } else {
    db.prepare('DELETE FROM trips WHERE session_id = ? AND user_id IS NULL AND id = ?').run(identity.sessionId, id);
  }
}

// --- Search history ----------------------------------------------------

function listHistory(identity) {
  const rows = identity.userId
    ? db.prepare(
        'SELECT id, prompt_text AS promptText, tags, budget_label AS budgetLabel, nights, travelers, destination, created_at AS savedAt FROM history WHERE user_id = ? ORDER BY created_at DESC'
      ).all(identity.userId)
    : db.prepare(
        'SELECT id, prompt_text AS promptText, tags, budget_label AS budgetLabel, nights, travelers, destination, created_at AS savedAt FROM history WHERE session_id = ? AND user_id IS NULL ORDER BY created_at DESC'
      ).all(identity.sessionId);
  return rows.map(row => ({ ...row, tags: JSON.parse(row.tags || '[]') }));
}

function insertHistory(identity, entry) {
  const id = newId();
  const sessionId = identity.sessionId || newId();
  db.prepare(
    `INSERT INTO history (id, session_id, user_id, prompt_text, tags, budget_label, nights, travelers, destination, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, sessionId, identity.userId || null, entry.promptText || '', JSON.stringify(entry.tags || []),
    entry.budgetLabel || '', entry.nights || null, entry.travelers || null,
    entry.destination || '', Date.now()
  );

  // Keep only the most recent HISTORY_LIMIT entries per identity.
  const all = identity.userId
    ? db.prepare('SELECT id FROM history WHERE user_id = ? ORDER BY created_at DESC').all(identity.userId)
    : db.prepare('SELECT id FROM history WHERE session_id = ? AND user_id IS NULL ORDER BY created_at DESC').all(sessionId);
  if (all.length > HISTORY_LIMIT) {
    const del = db.prepare('DELETE FROM history WHERE id = ?');
    all.slice(HISTORY_LIMIT).forEach(row => del.run(row.id));
  }
}

// --- Email captures -----------------------------------------------------
// Just a landing spot for "someone wanted this itinerary" — no automatic
// newsletter is built on top of this yet, see README.

function insertEmailCapture(email, destination, marketingConsent) {
  const id = newId();
  db.prepare(
    'INSERT INTO email_captures (id, email, destination, marketing_consent, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, email, destination || '', marketingConsent ? 1 : 0, Date.now());
  return id;
}

module.exports = {
  listTrips, insertTrip, deleteTrip, listHistory, insertHistory,
  createUser, findUserByEmail, findUserById, migrateGuestData,
  insertEmailCapture
};
