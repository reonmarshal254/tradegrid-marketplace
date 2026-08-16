'use strict';
const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const controller = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later' } },
});

router.post('/register', authLimiter, asyncHandler(controller.register));
router.post('/login', authLimiter, asyncHandler(controller.login));
router.post('/google', authLimiter, asyncHandler(controller.google));
router.post('/verify-email', asyncHandler(controller.verifyEmail));
router.post('/resend-verification', authLimiter, asyncHandler(controller.resendVerification));
router.post('/forgot-password', authLimiter, asyncHandler(controller.forgotPassword));
router.post('/reset-password', authLimiter, asyncHandler(controller.resetPassword));
router.get('/me', requireAuth, asyncHandler(controller.me));
router.put('/me', requireAuth, uploadAvatar, asyncHandler(controller.updateProfile));

module.exports = router;
