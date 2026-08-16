'use strict';
const { query } = require('../config/db');
const { ApiError } = require('../middleware/error');
const { notify } = require('../services/push');

const BODY_LIMIT = 2000;

async function getParticipantInfo(userId) {
  const { rows } = await query(
    'SELECT id, name, avatar_url, is_verified FROM users WHERE id = $1',
    [userId]
  );
  return rows[0];
}

async function listConversations(req, res) {
  const { rows } = await query(
    `SELECT c.id,
            c.item_id,
            c.updated_at,
            CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END AS other_id,
            u.name AS other_name,
            u.avatar_url AS other_avatar,
            u.is_verified AS other_verified,
            i.name AS item_name,
            i.price AS item_price,
            i.status AS item_status,
            (SELECT img.url FROM item_images img WHERE img.item_id = c.item_id ORDER BY img.position LIMIT 1) AS item_image,
            lm.body AS last_body,
            lm.created_at AS last_at,
            lm.sender_id AS last_sender,
            (SELECT count(*)::int FROM messages m
              WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND m.read_at IS NULL) AS unread
     FROM conversations c
     JOIN users u ON u.id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END
     LEFT JOIN items i ON i.id = c.item_id
     LEFT JOIN LATERAL (
       SELECT m.body, m.created_at, m.sender_id
       FROM messages m
       WHERE m.conversation_id = c.id
       ORDER BY m.created_at DESC LIMIT 1
     ) lm ON true
     WHERE c.user1_id = $1 OR c.user2_id = $1
     ORDER BY COALESCE(lm.created_at, c.updated_at) DESC`,
    [req.user.id]
  );
  res.json({
    conversations: rows.map((r) => ({
      id: r.id,
      item_id: r.item_id,
      updated_at: r.updated_at,
      other: {
        id: r.other_id,
        name: r.other_name,
        avatar_url: r.other_avatar,
        is_verified: Boolean(r.other_verified),
      },
      item: r.item_id
        ? {
            name: r.item_name,
            price: r.item_price !== null ? Number(r.item_price) : null,
            status: r.item_status,
            image_url: r.item_image,
          }
        : null,
      last_message: r.last_body
        ? { body: r.last_body, created_at: r.last_at, sent_by_me: r.last_sender === req.user.id }
        : null,
      unread: Number(r.unread || 0),
    })),
  });
}

async function startConversation(req, res) {
  const otherId = String(req.body.user_id || '').trim();
  const itemId = String(req.body.item_id || '').trim();
  if (!otherId) throw new ApiError(400, 'Conversation partner is required');
  if (otherId === req.user.id) throw new ApiError(400, 'You cannot start a conversation with yourself');

  if (itemId) {
    const itemRes = await query(
      'SELECT id, user_id, status FROM items WHERE id = $1',
      [itemId]
    );
    if (!itemRes.rows.length || itemRes.rows[0].status === 'removed') {
      throw new ApiError(404, 'Item not found');
    }
    if (itemRes.rows[0].user_id === req.user.id) {
      throw new ApiError(400, 'You cannot message yourself about your own item');
    }
  }

  const ids = [req.user.id, otherId].sort();
  const convRes = await query(
    `INSERT INTO conversations (item_id, user1_id, user2_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (item_id, user1_id, user2_id) DO UPDATE SET updated_at = conversations.updated_at
     RETURNING id, item_id, user1_id, user2_id`,
    [itemId || null, ids[0], ids[1]]
  );
  const conv = convRes.rows[0];

  res.status(201).json({
    conversation: {
      id: conv.id,
      item_id: conv.item_id,
    },
  });
}

async function getConversation(req, res) {
  const { rows } = await query(
    `SELECT c.id, c.item_id, c.user1_id, c.user2_id,
            CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END AS other_id,
            u.name AS other_name, u.avatar_url AS other_avatar, u.is_verified AS other_verified,
            i.name AS item_name, i.price AS item_price, i.status AS item_status, i.user_id AS item_seller_id,
            (SELECT img.url FROM item_images img WHERE img.item_id = c.item_id ORDER BY img.position LIMIT 1) AS item_image
     FROM conversations c
     JOIN users u ON u.id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END
     LEFT JOIN items i ON i.id = c.item_id
     WHERE c.id = $2 AND (c.user1_id = $1 OR c.user2_id = $1)`,
    [req.user.id, req.params.id]
  );
  const conv = rows[0];
  if (!conv) throw new ApiError(404, 'Conversation not found');

  await query(
    `UPDATE messages SET read_at = now()
     WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
    [req.params.id, req.user.id]
  );

  // Emit read receipt via socket
  const io = req.app.get('io');
  if (io && io.emitMessagesRead) {
    io.emitMessagesRead(req.params.id, req.user.id);
  }

  const msgRes = await query(
    `SELECT id, sender_id, body, created_at
     FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [req.params.id]
  );

  res.json({
    conversation: {
      id: conv.id,
      item_id: conv.item_id,
      item: conv.item_id
        ? {
            name: conv.item_name,
            price: conv.item_price !== null ? Number(conv.item_price) : null,
            status: conv.item_status,
            image_url: conv.item_image,
            seller_id: conv.item_seller_id,
          }
        : null,
      other: {
        id: conv.other_id,
        name: conv.other_name,
        avatar_url: conv.other_avatar,
        is_verified: Boolean(conv.other_verified),
      },
    },
    messages: msgRes.rows.map((m) => ({
      id: m.id,
      sender_id: m.sender_id,
      body: m.body,
      created_at: m.created_at,
      sent_by_me: m.sender_id === req.user.id,
    })),
  });
}

async function sendMessage(req, res) {
  const body = String(req.body.body || '').trim();
  if (!body) throw new ApiError(400, 'Message cannot be empty');
  if (body.length > BODY_LIMIT) throw new ApiError(400, `Message must be ${BODY_LIMIT} characters or less`);

  const convRes = await query(
    'SELECT id, user1_id, user2_id, item_id FROM conversations WHERE id = $1',
    [req.params.id]
  );
  const conv = convRes.rows[0];
  if (!conv) throw new ApiError(404, 'Conversation not found');
  if (conv.user1_id !== req.user.id && conv.user2_id !== req.user.id) {
    throw new ApiError(403, 'You are not a participant in this conversation');
  }

  const { rows } = await query(
    `INSERT INTO messages (conversation_id, sender_id, body)
     VALUES ($1, $2, $3)
     RETURNING id, sender_id, body, created_at`,
    [req.params.id, req.user.id, body]
  );
  await query('UPDATE conversations SET updated_at = now() WHERE id = $1', [req.params.id]);

  const otherId = conv.user1_id === req.user.id ? conv.user2_id : conv.user1_id;
  const me = await query('SELECT name FROM users WHERE id = $1', [req.user.id]);
  notify(otherId, {
    type: 'message',
    title: `New message from ${me.rows[0].name}`,
    body,
    data: { conversation_id: conv.id, item_id: conv.item_id },
  }).catch(() => {});

  // Emit real-time socket event
  const io = req.app.get('io');
  if (io && io.emitNewMessage) {
    const messageData = {
      id: rows[0].id,
      sender_id: rows[0].sender_id,
      body: rows[0].body,
      created_at: rows[0].created_at,
    };
    io.emitNewMessage(messageData, conv.id, otherId);
  }

  res.status(201).json({
    message: {
      id: rows[0].id,
      sender_id: rows[0].sender_id,
      body: rows[0].body,
      created_at: rows[0].created_at,
      sent_by_me: true,
    },
  });
}

async function unreadCount(req, res) {
  const { rows } = await query(
    `SELECT count(*)::int AS unread
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE (c.user1_id = $1 OR c.user2_id = $1)
       AND m.sender_id <> $1
       AND m.read_at IS NULL`,
    [req.user.id]
  );
  res.json({ unread_count: rows[0].unread });
}

module.exports = {
  listConversations,
  startConversation,
  getConversation,
  sendMessage,
  unreadCount,
  getParticipantInfo,
};
