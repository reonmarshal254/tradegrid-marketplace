'use strict';
const router = require('express').Router();
const controller = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/conversations', requireAuth, asyncHandler(controller.listConversations));
router.post('/conversations', requireAuth, asyncHandler(controller.startConversation));
router.get('/conversations/:id', requireAuth, asyncHandler(controller.getConversation));
router.post('/conversations/:id/messages', requireAuth, asyncHandler(controller.sendMessage));
router.get('/unread-count', requireAuth, asyncHandler(controller.unreadCount));

module.exports = router;
