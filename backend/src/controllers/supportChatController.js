'use strict';
const { query } = require('../config/db');
const { ApiError } = require('../middleware/error');
const { notify } = require('../services/push');

const BODY_LIMIT = 2000;

/**
 * Get or create a support chat for the user
 */
async function getOrCreateChat(req, res) {
  // Check if user has an open chat
  let { rows } = await query(
    `SELECT id, status, created_at, updated_at
     FROM support_chats
     WHERE user_id = $1 AND status = 'open'
     ORDER BY updated_at DESC
     LIMIT 1`,
    [req.user.id]
  );

  let chat = rows[0];
  
  // If no open chat, create one
  if (!chat) {
    const createRes = await query(
      `INSERT INTO support_chats (user_id, status)
       VALUES ($1, 'open')
       RETURNING id, status, created_at, updated_at`,
      [req.user.id]
    );
    chat = createRes.rows[0];
    
    // Emit socket event for new chat
    const io = req.app.get('io');
    if (io && io.emitNewSupportChat) {
      io.emitNewSupportChat(chat);
    }
  }

  // Get messages for this chat
  const messagesRes = await query(
    `SELECT m.id, m.sender_id, m.body, m.read_at, m.created_at,
            u.name AS sender_name, u.avatar_url AS sender_avatar, u.role AS sender_role
     FROM support_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = $1
     ORDER BY m.created_at ASC`,
    [chat.id]
  );

  // Mark messages as read
  await query(
    `UPDATE support_messages SET read_at = now()
     WHERE chat_id = $1 AND sender_id != $2 AND read_at IS NULL`,
    [chat.id, req.user.id]
  );

  res.json({
    chat: {
      id: chat.id,
      status: chat.status,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
    },
    messages: messagesRes.rows.map((m) => ({
      id: m.id,
      sender_id: m.sender_id,
      sender_name: m.sender_name,
      sender_avatar: m.sender_avatar,
      sender_role: m.sender_role,
      body: m.body,
      read_at: m.read_at,
      created_at: m.created_at,
      sent_by_me: m.sender_id === req.user.id,
    })),
  });
}

/**
 * Send a message in the support chat
 */
async function sendMessage(req, res) {
  const body = String(req.body.body || '').trim();
  if (!body) throw new ApiError(400, 'Message cannot be empty');
  if (body.length > BODY_LIMIT) {
    throw new ApiError(400, `Message must be ${BODY_LIMIT} characters or less`);
  }

  const { chatId } = req.params;

  // Verify chat exists and user has access
  const chatRes = await query(
    'SELECT id, user_id, status FROM support_chats WHERE id = $1',
    [chatId]
  );
  const chat = chatRes.rows[0];
  if (!chat) throw new ApiError(404, 'Chat not found');
  
  // Users can only send to their own chat, admins can send to any chat
  if (req.user.role !== 'admin' && chat.user_id !== req.user.id) {
    throw new ApiError(403, 'Access denied');
  }

  // Insert message
  const { rows } = await query(
    `INSERT INTO support_messages (chat_id, sender_id, body)
     VALUES ($1, $2, $3)
     RETURNING id, sender_id, body, created_at`,
    [chatId, req.user.id, body]
  );

  // Update chat timestamp
  await query(
    'UPDATE support_chats SET updated_at = now() WHERE id = $1',
    [chatId]
  );

  const message = rows[0];

  // Send notification to the other party
  if (req.user.role === 'admin') {
    // Admin sending to user
    notify(chat.user_id, {
      type: 'support_reply',
      title: 'Support team replied',
      body,
      data: { chat_id: chatId },
    }).catch(() => {});
  } else {
    // User sending to admin - notify all admins
    const admins = await query(
      'SELECT id FROM users WHERE role = $1',
      ['admin']
    );
    for (const admin of admins.rows) {
      notify(admin.id, {
        type: 'support',
        title: `${req.user.name} needs help`,
        body,
        data: { chat_id: chatId, user_id: chat.user_id },
      }).catch(() => {});
    }
  }

  const sender = await query(
    'SELECT name, avatar_url, role FROM users WHERE id = $1',
    [req.user.id]
  );

  const messageData = {
    id: message.id,
    sender_id: message.sender_id,
    sender_name: sender.rows[0].name,
    sender_avatar: sender.rows[0].avatar_url,
    sender_role: sender.rows[0].role,
    body: message.body,
    read_at: null,
    created_at: message.created_at,
  };

  // Emit real-time socket event
  const io = req.app.get('io');
  if (io && io.emitSupportMessage) {
    const recipientId = req.user.role === 'admin' ? chat.user_id : null;
    io.emitSupportMessage(messageData, chatId, recipientId);
  }

  res.status(201).json({
    message: {
      ...messageData,
      sent_by_me: true,
    },
  });
}

/**
 * Close a support chat
 */
async function closeChat(req, res) {
  const { chatId } = req.params;

  const chatRes = await query(
    'SELECT id, user_id FROM support_chats WHERE id = $1',
    [chatId]
  );
  const chat = chatRes.rows[0];
  if (!chat) throw new ApiError(404, 'Chat not found');

  // Only the user or admin can close
  if (req.user.role !== 'admin' && chat.user_id !== req.user.id) {
    throw new ApiError(403, 'Access denied');
  }

  await query(
    'UPDATE support_chats SET status = $1, updated_at = now() WHERE id = $2',
    ['closed', chatId]
  );

  // Emit socket event
  const io = req.app.get('io');
  if (io && io.emitSupportChatStatusChange) {
    io.emitSupportChatStatusChange(chatId, 'closed', chat.user_id);
  }

  res.json({ message: 'Chat closed' });
}

/**
 * Admin: List all support chats
 */
async function listChats(req, res) {
  const { status = 'open' } = req.query;

  const { rows } = await query(
    `SELECT sc.id, sc.user_id, sc.status, sc.created_at, sc.updated_at,
            u.name AS user_name, u.avatar_url AS user_avatar,
            (SELECT count(*)::int FROM support_messages sm 
             WHERE sm.chat_id = sc.id AND sm.sender_id != $1 AND sm.read_at IS NULL) AS unread,
            (SELECT sm.body FROM support_messages sm 
             WHERE sm.chat_id = sc.id 
             ORDER BY sm.created_at DESC LIMIT 1) AS last_message,
            (SELECT sm.created_at FROM support_messages sm 
             WHERE sm.chat_id = sc.id 
             ORDER BY sm.created_at DESC LIMIT 1) AS last_message_at
     FROM support_chats sc
     JOIN users u ON u.id = sc.user_id
     WHERE sc.status = $2
     ORDER BY sc.updated_at DESC`,
    [req.user.id, status]
  );

  res.json({
    chats: rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: r.user_name,
      user_avatar: r.user_avatar,
      status: r.status,
      unread: r.unread,
      last_message: r.last_message,
      last_message_at: r.last_message_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
  });
}

/**
 * Admin: Get a specific chat with messages
 */
async function getChat(req, res) {
  const { chatId } = req.params;

  const chatRes = await query(
    `SELECT sc.id, sc.user_id, sc.status, sc.created_at, sc.updated_at,
            u.name AS user_name, u.avatar_url AS user_avatar, u.email AS user_email
     FROM support_chats sc
     JOIN users u ON u.id = sc.user_id
     WHERE sc.id = $1`,
    [chatId]
  );

  const chat = chatRes.rows[0];
  if (!chat) throw new ApiError(404, 'Chat not found');

  const messagesRes = await query(
    `SELECT m.id, m.sender_id, m.body, m.read_at, m.created_at,
            u.name AS sender_name, u.avatar_url AS sender_avatar, u.role AS sender_role
     FROM support_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = $1
     ORDER BY m.created_at ASC`,
    [chatId]
  );

  // Mark messages as read
  await query(
    `UPDATE support_messages SET read_at = now()
     WHERE chat_id = $1 AND sender_id != $2 AND read_at IS NULL`,
    [chatId, req.user.id]
  );

  res.json({
    chat: {
      id: chat.id,
      user_id: chat.user_id,
      user_name: chat.user_name,
      user_avatar: chat.user_avatar,
      user_email: chat.user_email,
      status: chat.status,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
    },
    messages: messagesRes.rows.map((m) => ({
      id: m.id,
      sender_id: m.sender_id,
      sender_name: m.sender_name,
      sender_avatar: m.sender_avatar,
      sender_role: m.sender_role,
      body: m.body,
      read_at: m.read_at,
      created_at: m.created_at,
      sent_by_me: m.sender_id === req.user.id,
    })),
  });
}

/**
 * Get unread count for admin
 */
async function unreadCount(req, res) {
  const { rows } = await query(
    `SELECT count(DISTINCT sm.chat_id)::int AS unread
     FROM support_messages sm
     JOIN support_chats sc ON sc.id = sm.chat_id
     WHERE sm.sender_id != $1 AND sm.read_at IS NULL AND sc.status = 'open'`,
    [req.user.id]
  );
  res.json({ unread_count: rows[0].unread });
}

module.exports = {
  getOrCreateChat,
  sendMessage,
  closeChat,
  listChats,
  getChat,
  unreadCount,
};
