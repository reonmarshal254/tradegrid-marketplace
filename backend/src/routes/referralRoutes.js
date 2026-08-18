'use strict';
const router = require('express').Router();
const controller = require('../controllers/referralController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/profile', requireAuth, asyncHandler(controller.getProfile));
router.get('/list', requireAuth, asyncHandler(controller.getReferrals));
router.get('/share-data', requireAuth, asyncHandler(controller.getShareData));
router.get('/visit/:code', optionalAuth, asyncHandler(controller.trackVisit));

module.exports = router;
