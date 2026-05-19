jest.mock('axios');
const axios = require('axios');
const Database = require('better-sqlite3');
const { setDb, getResponses } = require('../src/db');
const { pingHttpbin, setBroadcast } = require('../src/scheduler');

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
  jest.clearAllMocks();
  setBroadcast(null);
});

afterEach(() => testDb.close());

describe('pingHttpbin', () => {
  it('sends a POST request to the httpbin URL', async () => {
    axios.post.mockResolvedValue({ status: 200, data: { url: 'https://httpbin.org/anything' } });
    await pingHttpbin();
    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, payload] = axios.post.mock.calls[0];
    expect(url).toContain('httpbin.org/anything');
    expect(payload).toHaveProperty('requestId');
  });

  it('stores the response in the database', async () => {
    axios.post.mockResolvedValue({ status: 200, data: { method: 'POST' } });
    await pingHttpbin();
    const rows = getResponses({ limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].status_code).toBe(200);
  });

  it('records the response time in milliseconds', async () => {
    axios.post.mockResolvedValue({ status: 200, data: {} });
    const result = await pingHttpbin();
    expect(result.response_time_ms).toBeGreaterThanOrEqual(0);
    expect(typeof result.response_time_ms).toBe('number');
  });

  it('stores error response when axios throws (network failure)', async () => {
    axios.post.mockRejectedValue(new Error('Network error'));
    const result = await pingHttpbin();
    expect(result.status_code).toBe(0);
    const rows = getResponses({ limit: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].status_code).toBe(0);
  });

  it('stores HTTP error status when server returns 4xx/5xx', async () => {
    const err = new Error('Not Found');
    err.response = { status: 404 };
    axios.post.mockRejectedValue(err);
    const result = await pingHttpbin();
    expect(result.status_code).toBe(404);
  });

  it('calls broadcast function with new_response event', async () => {
    axios.post.mockResolvedValue({ status: 200, data: {} });
    const mockBroadcast = jest.fn();
    setBroadcast(mockBroadcast);
    await pingHttpbin();
    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'new_response', data: expect.any(Object) })
    );
  });

  it('does not throw when broadcast is null', async () => {
    axios.post.mockResolvedValue({ status: 200, data: {} });
    setBroadcast(null);
    await expect(pingHttpbin()).resolves.not.toThrow();
  });
});
