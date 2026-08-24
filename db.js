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
`);

const HISTORY_LIMIT = 8;

function newId() {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

// --- Trips -----------------------------------------------------------

function listTrips(sessionId) {
  return db.prepare(
    'SELECT id, name, meta, price, tier_label AS tierLabel, booking_href AS bookingHref, created_at AS savedAt FROM trips WHERE session_id = ? ORDER BY created_at DESC'
  ).all(sessionId);
}

function insertTrip(sessionId, trip) {
  const id = newId();
  db.prepare(
    `INSERT INTO trips (id, session_id, name, meta, price, tier_label, booking_href, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, sessionId, trip.name || '', trip.meta || '', trip.price || '', trip.tierLabel || '', trip.bookingHref || '', Date.now());
  return id;
}

function deleteTrip(sessionId, id) {
  db.prepare('DELETE FROM trips WHERE session_id = ? AND id = ?').run(sessionId, id);
}

// --- Search history ----------------------------------------------------

function listHistory(sessionId) {
  return db.prepare(
    'SELECT id, prompt_text AS promptText, tags, budget_label AS budgetLabel, nights, travelers, destination, created_at AS savedAt FROM history WHERE session_id = ? ORDER BY created_at DESC'
  ).all(sessionId).map(row => ({ ...row, tags: JSON.parse(row.tags || '[]') }));
}

function insertHistory(sessionId, entry) {
  const id = newId();
  db.prepare(
    `INSERT INTO history (id, session_id, prompt_text, tags, budget_label, nights, travelers, destination, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, sessionId, entry.promptText || '', JSON.stringify(entry.tags || []),
    entry.budgetLabel || '', entry.nights || null, entry.travelers || null,
    entry.destination || '', Date.now()
  );

  // Keep only the most recent HISTORY_LIMIT entries per session.
  const all = db.prepare('SELECT id FROM history WHERE session_id = ? ORDER BY created_at DESC').all(sessionId);
  if (all.length > HISTORY_LIMIT) {
    const del = db.prepare('DELETE FROM history WHERE id = ?');
    all.slice(HISTORY_LIMIT).forEach(row => del.run(row.id));
  }
}

module.exports = { listTrips, insertTrip, deleteTrip, listHistory, insertHistory };
