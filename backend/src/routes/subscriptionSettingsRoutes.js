const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const subscriptionSettingsController = require('../controllers/subscriptionSettingsController');

// Public endpoint - anyone can view plan pricing
router.get('/public', subscriptionSettingsController.getPublicSettings);

// Admin-only routes
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/subscription-settings - Get all subscription settings (admin only)
router.get('/', subscriptionSettingsController.getSettings);

// PATCH /api/subscription-settings/:plan - Update settings for a specific plan
router.patch('/:plan', subscriptionSettingsController.updateSettings);

module.exports = router;
