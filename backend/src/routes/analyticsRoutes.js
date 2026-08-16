const express = require('express');
const {
  getOverview,
  getItemPerformance,
  getAdvertisementAnalytics,
  getEngagementTrends
} = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All analytics routes require authentication
router.use(requireAuth);

// Analytics endpoints
router.get('/overview', getOverview);
router.get('/items', getItemPerformance);
router.get('/advertisements', getAdvertisementAnalytics);
router.get('/trends', getEngagementTrends);

module.exports = router;