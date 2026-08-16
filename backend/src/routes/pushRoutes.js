'use strict';
const router = require('express').Router();
const controller = require('../controllers/pushController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/vapid-public-key', asyncHandler(controller.status));
router.post('/subscribe', requireAuth, asyncHandler(controller.subscribe));
router.post('/unsubscribe', requireAuth, asyncHandler(controller.unsubscribe));

module.exports = router;
