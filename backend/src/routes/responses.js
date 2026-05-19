const express = require('express');
const { getResponses, getStats, getRecentResponseTimes } = require('../db');
const { predictNextResponseTime, computeStats } = require('../anomaly');

const router = express.Router();

router.get('/responses', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const data = getResponses({ limit, offset });
  res.json({ data, limit, offset });
});

router.get('/stats', (req, res) => {
  const stats = getStats();
  const recentTimes = getRecentResponseTimes(20);
  const predicted = predictNextResponseTime(recentTimes);
  const { mean, stdDev } = computeStats(recentTimes);
  res.json({
    ...stats,
    predicted_next_response_time: predicted,
    rolling_mean: Math.round(mean * 100) / 100,
    rolling_std_dev: Math.round(stdDev * 100) / 100
  });
});

module.exports = router;
