const crypto = require('crypto');

const CATEGORIES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
const MIN_TAGS = 1;
const MAX_TAGS = 3;

function generatePayload() {
  const tagCount = Math.floor(Math.random() * (MAX_TAGS - MIN_TAGS + 1)) + MIN_TAGS;
  return {
    requestId: crypto.randomUUID(),
    value: Math.round(Math.random() * 100 * 100) / 100,
    category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
    timestamp: new Date().toISOString(),
    metadata: {
      priority: Math.floor(Math.random() * 5) + 1,
      // generates random 5-char alphanumeric tags
      tags: Array.from({ length: tagCount }, () => Math.random().toString(36).substring(2, 7)),
      source: 'bizscout-monitor'
    }
  };
}

module.exports = { generatePayload };
