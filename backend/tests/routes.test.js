const request = require('supertest');
const Database = require('better-sqlite3');
const { setDb } = require('../src/db');

let app;
let testDb;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  app = require('../src/index').app;
});

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

function seed(overrides = {}) {
  testDb.prepare(`
    INSERT INTO responses (timestamp, status_code, response_time_ms, payload_sent, response_body, is_anomaly, z_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    overrides.timestamp || new Date().toISOString(),
    overrides.status_code ?? 200,
    overrides.response_time_ms ?? 150,
    overrides.payload_sent || '{"requestId":"test"}',
    overrides.response_body || '{"url":"https://httpbin.org/anything"}',
    overrides.is_anomaly ?? 0,
    overrides.z_score ?? null
  );
}

describe('GET /api/responses', () => {
  it('returns 200 with empty data array when db is empty', async () => {
    const res = await request(app).get('/api/responses');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns seeded responses with all expected fields', async () => {
    seed({ response_time_ms: 150, is_anomaly: 0 });
    const res = await request(app).get('/api/responses');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const row = res.body.data[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('timestamp');
    expect(row).toHaveProperty('status_code', 200);
    expect(row).toHaveProperty('response_time_ms', 150);
    expect(row).toHaveProperty('is_anomaly', 0);
  });

  it('returns multiple responses ordered newest first', async () => {
    seed({ timestamp: '2026-01-01T01:00:00Z', response_time_ms: 100 });
    seed({ timestamp: '2026-01-01T02:00:00Z', response_time_ms: 200 });
    const res = await request(app).get('/api/responses');
    expect(res.body.data[0].response_time_ms).toBe(200);
    expect(res.body.data[1].response_time_ms).toBe(100);
  });

  it('respects ?limit query parameter', async () => {
    for (let i = 0; i < 10; i++) seed();
    const res = await request(app).get('/api/responses?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.limit).toBe(3);
  });

  it('caps limit at 200', async () => {
    const res = await request(app).get('/api/responses?limit=9999');
    expect(res.body.limit).toBe(200);
  });

  it('supports pagination with ?offset', async () => {
    for (let i = 0; i < 5; i++) seed();
    const page1 = await request(app).get('/api/responses?limit=3&offset=0');
    const page2 = await request(app).get('/api/responses?limit=3&offset=3');
    expect(page1.body.data).toHaveLength(3);
    expect(page2.body.data).toHaveLength(2);
    const page1Ids = page1.body.data.map(r => r.id);
    const page2Ids = page2.body.data.map(r => r.id);
    expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false);
  });
});

describe('GET /api/stats', () => {
  it('returns 200 with zero stats on empty db', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.anomaly_count).toBe(0);
  });

  it('calculates aggregate stats correctly', async () => {
    seed({ response_time_ms: 100, is_anomaly: 0 });
    seed({ response_time_ms: 200, is_anomaly: 1 });
    const res = await request(app).get('/api/stats');
    expect(res.body.total).toBe(2);
    expect(res.body.avg_response_time).toBe(150);
    expect(res.body.min_response_time).toBe(100);
    expect(res.body.max_response_time).toBe(200);
    expect(res.body.anomaly_count).toBe(1);
  });

  it('includes anomaly detection stats in response', async () => {
    seed({ response_time_ms: 150 });
    const res = await request(app).get('/api/stats');
    expect(res.body).toHaveProperty('rolling_mean');
    expect(res.body).toHaveProperty('rolling_std_dev');
    expect(res.body).toHaveProperty('predicted_next_response_time');
  });
});

describe('404 handling', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
