'use strict';
const router = require('express').Router();
const controller = require('../controllers/accountController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/activity', requireAuth, asyncHandler(controller.getActivity));
router.get('/settings', requireAuth, asyncHandler(controller.getSettings));
router.put('/settings', requireAuth, asyncHandler(controller.updateSettings));
router.post('/change-email', requireAuth, asyncHandler(controller.changeEmail));
router.post('/verify-email-change', requireAuth, asyncHandler(controller.verifyEmailChange));

router.get('/search-history', requireAuth, asyncHandler(controller.listSearchHistory));
router.post('/search-history', requireAuth, asyncHandler(controller.addSearchHistory));
router.delete('/search-history', requireAuth, asyncHandler(controller.clearSearchHistory));
router.delete('/search-history/:id', requireAuth, asyncHandler(controller.deleteSearchHistory));

router.post('/feedback', optionalAuth, asyncHandler(controller.addFeedback));

router.post('/report', requireAuth, asyncHandler(controller.reportUser));
router.post('/support', requireAuth, asyncHandler(controller.submitSupportTicket));
router.get('/support', requireAuth, asyncHandler(controller.listMySupportTickets));

module.exports = router;
