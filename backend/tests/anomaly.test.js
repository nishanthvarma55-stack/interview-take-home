const { computeStats, computeZScore, detectAnomaly, predictNextResponseTime } = require('../src/anomaly');

describe('computeStats', () => {
  it('returns zero mean and stdDev for empty array', () => {
    expect(computeStats([])).toEqual({ mean: 0, stdDev: 0 });
  });

  it('calculates mean and stdDev for known dataset', () => {
    // [2,4,4,4,5,5,7,9] → mean=5, population variance=4, stdDev=2
    const { mean, stdDev } = computeStats([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(mean).toBe(5);
    expect(stdDev).toBeCloseTo(2, 5);
  });

  it('returns stdDev of 0 for a single-value array', () => {
    const { mean, stdDev } = computeStats([42]);
    expect(mean).toBe(42);
    expect(stdDev).toBe(0);
  });

  it('returns stdDev of 0 for identical values', () => {
    const { stdDev } = computeStats([100, 100, 100, 100]);
    expect(stdDev).toBe(0);
  });
});

describe('computeZScore', () => {
  it('returns 0 when stdDev is 0 (guard against division by zero)', () => {
    expect(computeZScore(500, 100, 0)).toBe(0);
  });

  it('returns positive z-score for value above mean', () => {
    expect(computeZScore(9, 5, 2)).toBe(2);
  });

  it('returns negative z-score for value below mean', () => {
    expect(computeZScore(1, 5, 2)).toBe(-2);
  });

  it('returns 0 for value equal to mean', () => {
    expect(computeZScore(5, 5, 3)).toBe(0);
  });
});

describe('detectAnomaly', () => {
  // Varied normal data: mean≈100, stdDev≈6.3
  const NORMAL_BASELINE = [100, 110, 90, 105, 95, 100, 108, 92, 103, 97];

  it('returns isAnomaly=false and zScore=null when fewer than 5 samples', () => {
    const result = detectAnomaly(1000, [100, 110, 105]);
    expect(result.isAnomaly).toBe(false);
    expect(result.zScore).toBeNull();
  });

  it('returns isAnomaly=false and zScore=null when samples array is empty', () => {
    const result = detectAnomaly(1000, []);
    expect(result.isAnomaly).toBe(false);
    expect(result.zScore).toBeNull();
  });

  it('flags a value far above the baseline as an anomaly (z >> 2)', () => {
    // 500 vs mean≈100, stdDev≈6.3 → z≈63 >> 2 threshold
    const result = detectAnomaly(500, NORMAL_BASELINE);
    expect(result.isAnomaly).toBe(true);
    expect(result.zScore).toBeGreaterThan(2);
  });

  it('does not flag a value within normal range', () => {
    // 103 vs mean≈100, stdDev≈6.3 → z≈0.48 < 2 threshold
    const result = detectAnomaly(103, NORMAL_BASELINE);
    expect(result.isAnomaly).toBe(false);
  });

  it('flags a value far below the baseline as an anomaly (z << -2)', () => {
    // 50 vs mean≈100, stdDev≈6.3 → z≈-7.9 < -2 threshold
    const result = detectAnomaly(50, NORMAL_BASELINE);
    expect(result.isAnomaly).toBe(true);
    expect(result.zScore).toBeLessThan(-2);
  });

  it('rounds zScore to 2 decimal places', () => {
    const result = detectAnomaly(103, NORMAL_BASELINE);
    const decimals = result.zScore?.toString().split('.')[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

describe('predictNextResponseTime', () => {
  it('returns null for empty array', () => {
    expect(predictNextResponseTime([])).toBeNull();
  });

  it('returns the single value for a one-element array', () => {
    expect(predictNextResponseTime([200])).toBe(200);
  });

  it('returns moving average of last windowSize values', () => {
    // values[0..4] = [100,200,300,400,500], window=5 → mean=300
    expect(predictNextResponseTime([100, 200, 300, 400, 500], 5)).toBe(300);
  });

  it('only uses the first windowSize values (most recent first)', () => {
    // values[0..2] = [100,200,300], window=3 → mean=200
    expect(predictNextResponseTime([100, 200, 300, 400, 500], 3)).toBe(200);
  });

  it('uses default window of 5', () => {
    expect(predictNextResponseTime([100, 200, 300, 400, 500, 600])).toBe(300);
  });
});
