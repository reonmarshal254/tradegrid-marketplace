'use strict';
const router = require('express').Router();
const controller = require('../controllers/userController');
const { optionalAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/:id', optionalAuth, asyncHandler(controller.getUserProfile));
router.get('/:id/reviews', optionalAuth, asyncHandler(controller.getUserReviews));

module.exports = router;
