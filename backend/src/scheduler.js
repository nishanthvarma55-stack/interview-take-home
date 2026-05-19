const cron = require('node-cron');
const axios = require('axios');
const { generatePayload } = require('./payloadGen');
const { insertResponse, getRecentResponseTimes } = require('./db');
const { detectAnomaly } = require('./anomaly');

const HTTPBIN_URL = process.env.HTTPBIN_URL || 'https://httpbin.org/anything';

let broadcastFn = null;

function setBroadcast(fn) {
  broadcastFn = fn;
}

async function pingHttpbin() {
  const payload = generatePayload();
  const startTime = Date.now();
  let statusCode = 0;
  let responseBody = {};

  try {
    const response = await axios.post(HTTPBIN_URL, payload, { timeout: 15000 });
    statusCode = response.status;
    responseBody = response.data;
  } catch (err) {
    statusCode = err.response?.status ?? 0;
    responseBody = { error: err.message };
  }

  const responseTimeMs = Date.now() - startTime;
  const recentTimes = getRecentResponseTimes(20);
  const { isAnomaly, zScore } = detectAnomaly(responseTimeMs, recentTimes);

  const record = {
    timestamp: new Date().toISOString(),
    statusCode,
    responseTimeMs,
    payloadSent: payload,
    responseBody,
    isAnomaly,
    zScore
  };

  const id = insertResponse(record);
  const inserted = { id, ...record };

  if (broadcastFn) {
    broadcastFn({ type: 'new_response', data: inserted });
  }

  return inserted;
}

function startScheduler() {
  return cron.schedule('*/5 * * * *', () => {
    pingHttpbin().catch(err => console.error('Ping failed:', err.message));
  });
}

module.exports = { pingHttpbin, startScheduler, setBroadcast };
