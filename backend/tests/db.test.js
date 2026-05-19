const Database = require('better-sqlite3');
const { setDb, insertResponse, getResponses, getRecentResponseTimes, getStats } = require('../src/db');

let testDb;

beforeEach(() => {
  testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  testDb.exec(`
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
  setDb(testDb);
});

afterEach(() => testDb.close());

function makeRecord(overrides = {}) {
  return {
    timestamp: new Date().toISOString(),
    statusCode: 200,
    responseTimeMs: 150,
    payloadSent: { requestId: 'test-id' },
    responseBody: { url: 'https://httpbin.org/anything' },
    isAnomaly: false,
    zScore: null,
    ...overrides
  };
}

describe('insertResponse', () => {
  it('inserts a record and returns its id', () => {
    const id = insertResponse(makeRecord());
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  it('stores all fields correctly', () => {
    insertResponse(makeRecord({ statusCode: 404, responseTimeMs: 500, isAnomaly: true, zScore: 2.5 }));
    const rows = getResponses({ limit: 1 });
    expect(rows[0].status_code).toBe(404);
    expect(rows[0].response_time_ms).toBe(500);
    expect(rows[0].is_anomaly).toBe(1);
    expect(rows[0].z_score).toBe(2.5);
  });
});

describe('getResponses', () => {
  it('returns empty array when no data', () => {
    expect(getResponses()).toEqual([]);
  });

  it('returns rows ordered by timestamp DESC', () => {
    insertResponse(makeRecord({ timestamp: '2026-01-01T01:00:00Z', responseTimeMs: 100 }));
    insertResponse(makeRecord({ timestamp: '2026-01-01T02:00:00Z', responseTimeMs: 200 }));
    const rows = getResponses({ limit: 10 });
    expect(rows[0].response_time_ms).toBe(200);
    expect(rows[1].response_time_ms).toBe(100);
  });

  it('respects limit and offset', () => {
    for (let i = 0; i < 5; i++) insertResponse(makeRecord());
    expect(getResponses({ limit: 3 })).toHaveLength(3);
    expect(getResponses({ limit: 3, offset: 3 })).toHaveLength(2);
  });
});

describe('getRecentResponseTimes', () => {
  it('returns array of response times', () => {
    insertResponse(makeRecord({ responseTimeMs: 100 }));
    insertResponse(makeRecord({ responseTimeMs: 200 }));
    const times = getRecentResponseTimes(10);
    expect(times).toHaveLength(2);
    expect(times).toContain(100);
    expect(times).toContain(200);
  });
});

describe('getStats', () => {
  it('returns zero stats on empty db', () => {
    const stats = getStats();
    expect(stats.total).toBe(0);
    expect(stats.anomaly_count).toBe(0);
  });

  it('calculates aggregate stats correctly', () => {
    insertResponse(makeRecord({ responseTimeMs: 100, isAnomaly: false }));
    insertResponse(makeRecord({ responseTimeMs: 200, isAnomaly: true }));
    const stats = getStats();
    expect(stats.total).toBe(2);
    expect(stats.avg_response_time).toBe(150);
    expect(stats.min_response_time).toBe(100);
    expect(stats.max_response_time).toBe(200);
    expect(stats.anomaly_count).toBe(1);
  });
});
