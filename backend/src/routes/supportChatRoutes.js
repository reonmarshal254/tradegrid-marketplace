'use strict';
const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getOrCreateChat,
  sendMessage,
  closeChat,
  listChats,
  getChat,
  unreadCount,
} = require('../controllers/supportChatController');

const router = express.Router();

// User routes
router.get('/my-chat', requireAuth, getOrCreateChat);
router.post('/:chatId/messages', requireAuth, sendMessage);
router.post('/:chatId/close', requireAuth, closeChat);

// Admin routes
router.get('/admin/chats', requireAuth, requireAdmin, listChats);
router.get('/admin/chats/:chatId', requireAuth, requireAdmin, getChat);
router.get('/admin/unread-count', requireAuth, requireAdmin, unreadCount);

module.exports = router;
