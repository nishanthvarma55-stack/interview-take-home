const { generatePayload } = require('../src/payloadGen');

describe('generatePayload', () => {
  const VALID_CATEGORIES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];

  it('returns an object with all required fields', () => {
    const p = generatePayload();
    expect(p).toHaveProperty('requestId');
    expect(p).toHaveProperty('value');
    expect(p).toHaveProperty('category');
    expect(p).toHaveProperty('timestamp');
    expect(p).toHaveProperty('metadata');
    expect(p.metadata).toHaveProperty('priority');
    expect(p.metadata).toHaveProperty('tags');
    expect(p.metadata).toHaveProperty('source', 'bizscout-monitor');
  });

  it('generates unique requestIds across 100 calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generatePayload().requestId));
    expect(ids.size).toBe(100);
  });

  it('value is a number between 0 and 100', () => {
    for (let i = 0; i < 50; i++) {
      const { value } = generatePayload();
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('category is always one of the valid categories', () => {
    for (let i = 0; i < 50; i++) {
      expect(VALID_CATEGORIES).toContain(generatePayload().category);
    }
  });

  it('metadata.priority is an integer 1-5', () => {
    for (let i = 0; i < 50; i++) {
      const { priority } = generatePayload().metadata;
      expect(Number.isInteger(priority)).toBe(true);
      expect(priority).toBeGreaterThanOrEqual(1);
      expect(priority).toBeLessThanOrEqual(5);
    }
  });

  it('metadata.tags is a non-empty array of strings', () => {
    for (let i = 0; i < 20; i++) {
      const { tags } = generatePayload().metadata;
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThanOrEqual(1);
      tags.forEach(t => expect(typeof t).toBe('string'));
    }
  });

  it('timestamp is a valid ISO 8601 string', () => {
    const { timestamp } = generatePayload();
    expect(() => new Date(timestamp).toISOString()).not.toThrow();
  });
});
