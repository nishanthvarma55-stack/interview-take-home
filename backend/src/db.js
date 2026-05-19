const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DEFAULT_DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/responses.db');

let db = null;

function setDb(newDb) {
  db = newDb;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function getDb() {
  if (!db) {
    const dir = path.dirname(DEFAULT_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DEFAULT_DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        response_time_ms REAL NOT NULL,
        payload_sent TEXT NOT NULL,
        response_body TEXT NOT NULL,
        is_anomaly INTEGER NOT NULL DEFAULT 0,
        z_score REAL
      )
    `);
  }
  return db;
}

function insertResponse(data) {
  const stmt = getDb().prepare(`
    INSERT INTO responses (timestamp, status_code, response_time_ms, payload_sent, response_body, is_anomaly, z_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.timestamp,
    data.statusCode,
    data.responseTimeMs,
    JSON.stringify(data.payloadSent),
    JSON.stringify(data.responseBody),
    data.isAnomaly ? 1 : 0,
    data.zScore ?? null
  );
  return result.lastInsertRowid;
}

function getResponses({ limit = 50, offset = 0 } = {}) {
  return getDb().prepare(
    'SELECT * FROM responses ORDER BY timestamp DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);
}

function getRecentResponseTimes(count = 20) {
  return getDb().prepare(
    'SELECT response_time_ms FROM responses ORDER BY timestamp DESC LIMIT ?'
  ).all(count).map(r => r.response_time_ms);
}

function getStats() {
  return getDb().prepare(`
    SELECT
      COUNT(*) as total,
      AVG(response_time_ms) as avg_response_time,
      MIN(response_time_ms) as min_response_time,
      MAX(response_time_ms) as max_response_time,
      COALESCE(SUM(is_anomaly), 0) as anomaly_count
    FROM responses
  `).get();
}

module.exports = { setDb, closeDb, getDb, insertResponse, getResponses, getRecentResponseTimes, getStats };
