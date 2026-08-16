'use strict';
const router = require('express').Router();
const controller = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', requireAuth, asyncHandler(controller.listNotifications));
router.get('/unread-count', requireAuth, asyncHandler(controller.unreadCount));
router.post('/read-all', requireAuth, asyncHandler(controller.markAllRead));
router.post('/read', requireAuth, asyncHandler(controller.markBulkRead));
router.post('/:id/read', requireAuth, asyncHandler(controller.markRead));

module.exports = router;
