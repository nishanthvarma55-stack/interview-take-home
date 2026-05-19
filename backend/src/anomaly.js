const ANOMALY_THRESHOLD = 2.0;
const MIN_SAMPLES = 5;

function computeStats(values) {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

function computeZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function detectAnomaly(currentValue, recentValues) {
  if (recentValues.length < MIN_SAMPLES) {
    return { isAnomaly: false, zScore: null };
  }
  const { mean, stdDev } = computeStats(recentValues);
  const raw = computeZScore(currentValue, mean, stdDev);
  const zScore = Math.round(raw * 100) / 100;
  return {
    isAnomaly: Math.abs(zScore) > ANOMALY_THRESHOLD,
    zScore
  };
}

function predictNextResponseTime(recentValues, windowSize = 5) {
  if (recentValues.length === 0) return null;
  const window = recentValues.slice(0, Math.min(windowSize, recentValues.length));
  return Math.round(window.reduce((a, b) => a + b, 0) / window.length);
}

module.exports = { computeStats, computeZScore, detectAnomaly, predictNextResponseTime };
