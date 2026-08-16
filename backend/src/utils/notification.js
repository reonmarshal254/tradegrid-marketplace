'use strict';
const { query } = require('../config/db');

/**
 * Create a notification and emit real-time socket event
 * @param {object} app - Express app instance (to get io)
 * @param {string} userId - Target user ID
 * @param {object} data - Notification data { type, title, body, data }
 * @returns {Promise<object>} Created notification
 */
async function createNotification(app, userId, { type, title, body, data = null }) {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, type, title, body, data, read_at, created_at`,
    [userId, type, title, body, data ? JSON.stringify(data) : null]
  );

  const notification = rows[0];

  // Emit socket event
  const io = app.get('io');
  if (io && io.emitNotification) {
    io.emitNotification(userId, notification);
  }

  return notification;
}

/**
 * Create notifications for multiple users
 */
async function createNotificationForUsers(app, userIds, { type, title, body, data = null }) {
  if (!userIds || userIds.length === 0) return [];

  const values = userIds.map((userId, idx) => {
    const base = idx * 5;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
  }).join(',');

  const params = userIds.flatMap(userId => [
    userId, type, title, body, data ? JSON.stringify(data) : null
  ]);

  const { rows } = await query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ${values}
     RETURNING id, user_id, type, title, body, data, read_at, created_at`,
    params
  );

  // Emit socket events
  const io = app.get('io');
  if (io && io.emitNotificationToUsers) {
    io.emitNotificationToUsers(userIds, rows[0]); // Send same notification structure to all
  }

  return rows;
}

/**
 * Broadcast notification to all users
 */
async function broadcastNotification(app, { type, title, body, data = null }) {
  // Get all active user IDs
  const { rows: users } = await query('SELECT id FROM users WHERE is_active = true');
  const userIds = users.map(u => u.id);

  if (userIds.length === 0) return [];

  const notifications = await createNotificationForUsers(app, userIds, { type, title, body, data });

  // Also emit broadcast event
  const io = app.get('io');
  if (io && io.emitNotificationToAll) {
    io.emitNotificationToAll(notifications[0]); // Send same structure to all
  }

  return notifications;
}

module.exports = {
  createNotification,
  createNotificationForUsers,
  broadcastNotification
};
