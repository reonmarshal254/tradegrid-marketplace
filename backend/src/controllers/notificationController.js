'use strict';
const { query } = require('../config/db');
const { ApiError } = require('../middleware/error');

const listNotifications = async (req, res) => {
  const { page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const offset = (pageNum - 1) * limitNum;

  // User-visible notification types: message, featured, support_reply, new_item, admin_post
  // Hidden from users: reaction, review, report, support (admin-only)
  const userVisibleTypes = ['message', 'featured', 'support_reply', 'new_item', 'admin_post'];
  
  const count = await query(
    'SELECT count(*)::int AS total, count(*) FILTER (WHERE read_at IS NULL)::int AS unread FROM notifications WHERE user_id = $1 AND type = ANY($2)',
    [req.user.id, userVisibleTypes]
  );

  const { rows } = await query(
    `SELECT id, type, title, body, data, read_at, created_at
     FROM notifications
     WHERE user_id = $1 AND type = ANY($2)
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [req.user.id, userVisibleTypes, limitNum, offset]
  );

  res.json({
    notifications: rows,
    unread_count: count.rows[0].unread,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count.rows[0].total,
      total_pages: Math.ceil(count.rows[0].total / limitNum),
    },
  });
};

const unreadCount = async (req, res) => {
  // Only count user-visible notification types
  const userVisibleTypes = ['message', 'featured', 'support_reply', 'new_item', 'admin_post'];
  const { rows } = await query(
    'SELECT count(*)::int AS unread FROM notifications WHERE user_id = $1 AND read_at IS NULL AND type = ANY($2)',
    [req.user.id, userVisibleTypes]
  );
  res.json({ unread_count: rows[0].unread });
};

const markRead = async (req, res) => {
  const { rows } = await query(
    `UPDATE notifications SET read_at = COALESCE(read_at, now())
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Notification not found');
  
  // Emit socket event
  const io = req.app.get('io');
  if (io && io.emitNotificationRead) {
    io.emitNotificationRead(req.user.id, req.params.id);
  }
  
  res.json({ message: 'Marked as read' });
};

const markAllRead = async (req, res) => {
  await query(
    `UPDATE notifications SET read_at = COALESCE(read_at, now())
     WHERE user_id = $1 AND read_at IS NULL`,
    [req.user.id]
  );
  
  // Emit socket event
  const io = req.app.get('io');
  if (io && io.emitAllNotificationsRead) {
    io.emitAllNotificationsRead(req.user.id);
  }
  
  res.json({ message: 'All notifications marked as read' });
};

const markBulkRead = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) throw new ApiError(400, 'ids is required');
  await query(
    `UPDATE notifications SET read_at = COALESCE(read_at, now())
     WHERE user_id = $1 AND id = ANY($2::uuid[])`,
    [req.user.id, ids]
  );
  res.json({ message: 'Marked as read' });
};

module.exports = { listNotifications, unreadCount, markRead, markAllRead, markBulkRead };
