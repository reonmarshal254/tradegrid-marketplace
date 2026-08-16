'use strict';
const { query, pool } = require('../config/db');
const { ApiError } = require('../middleware/error');
const { generateToken, hashToken } = require('../utils/token');
const mailer = require('../services/mailer');
const { DEFAULT_SETTINGS } = require('../services/push');

const EMAIL_CHANGE_TTL_MS = 60 * 60 * 1000;

const getActivity = async (req, res) => {
  const userId = req.user.id;
  const [posted, reactions, purchases, reviews] = await Promise.all([
    query(
      `SELECT i.id, i.name, i.price, i.status, i.created_at AS at,
              'item_posted' AS type, i.id AS item_id
       FROM items i WHERE i.user_id = $1
       ORDER BY i.created_at DESC LIMIT 50`,
      [userId]
    ),
    query(
      `SELECT r.id, r.created_at AS at, 'reacted' AS type,
              r.item_id, i.name AS item_name
       FROM item_reactions r JOIN items i ON i.id = r.item_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC LIMIT 50`,
      [userId]
    ),
    query(
      `SELECT p.id, p.created_at AS at, 'purchased' AS type,
              p.item_id, i.name AS item_name
       FROM purchases p JOIN items i ON i.id = p.item_id
       WHERE p.buyer_id = $1
       ORDER BY p.created_at DESC LIMIT 50`,
      [userId]
    ),
    query(
      `SELECT rv.id, rv.created_at AS at, 'reviewed' AS type,
              rv.item_id, i.name AS item_name, rv.rating
       FROM item_reviews rv JOIN items i ON i.id = rv.item_id
       WHERE rv.reviewer_id = $1
       ORDER BY rv.created_at DESC LIMIT 50`,
      [userId]
    ),
  ]);

  const activities = [
    ...posted.rows.map((r) => ({
      type: r.type,
      at: r.at,
      item_id: r.item_id,
      item_name: r.name,
      price: Number(r.price),
      status: r.status,
    })),
    ...reactions.rows.map((r) => ({
      type: r.type,
      at: r.at,
      item_id: r.item_id,
      item_name: r.item_name,
    })),
    ...purchases.rows.map((r) => ({
      type: r.type,
      at: r.at,
      item_id: r.item_id,
      item_name: r.item_name,
    })),
    ...reviews.rows.map((r) => ({
      type: r.type,
      at: r.at,
      item_id: r.item_id,
      item_name: r.item_name,
      rating: r.rating,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 100);

  res.json({ activities });
};

const listSearchHistory = async (req, res) => {
  const { rows } = await query(
    'SELECT id, query, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json({ history: rows });
};

const addSearchHistory = async (req, res) => {
  const q = String(req.body.query || '').trim();
  if (!q || q.length > 100) throw new ApiError(400, 'Valid search query is required');
  await query(
    `INSERT INTO search_history (user_id, query) VALUES ($1, $2)`,
    [req.user.id, q]
  );
  const { rows } = await query(
    'SELECT id, query, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.status(201).json({ history: rows });
};

const deleteSearchHistory = async (req, res) => {
  await query('DELETE FROM search_history WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ message: 'Search removed' });
};

const clearSearchHistory = async (req, res) => {
  await query('DELETE FROM search_history WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'Search history cleared' });
};

const addFeedback = async (req, res) => {
  const subject = String(req.body.subject || '').trim();
  const message = String(req.body.message || '').trim();
  if (!subject || subject.length > 100) throw new ApiError(400, 'Subject is required');
  if (!message || message.length > 2000) throw new ApiError(400, 'Message is required');
  await query(
    'INSERT INTO feedback (user_id, subject, message) VALUES ($1, $2, $3)',
    [req.user ? req.user.id : null, subject, message]
  );
  res.status(201).json({ message: 'Thank you for your feedback!' });
};

const getSettings = async (req, res) => {
  const { rows } = await query(
    'SELECT name, email, phone, whatsapp, location, avatar_url, settings FROM users WHERE id = $1',
    [req.user.id]
  );
  const u = rows[0];
  // Notification preferences are ON by default; only stored overrides win.
  const settings = { ...DEFAULT_SETTINGS, ...(u.settings || {}) };
  res.json({
    settings,
    user: {
      name: u.name,
      email: u.email,
      phone: u.phone,
      whatsapp: u.whatsapp,
      location: u.location,
      avatar_url: u.avatar_url,
    },
  });
};

const updateSettings = async (req, res) => {
  const incoming = req.body.settings;
  if (!incoming || typeof incoming !== 'object') {
    throw new ApiError(400, 'Settings object is required');
  }
  const allowedKeys = [
    'notif_reactions', 'notif_sold', 'notif_reviews', 'notif_push', 'notif_email', 'public_phone',
  ];
  const patch = {};
  for (const key of allowedKeys) {
    if (incoming[key] !== undefined) patch[key] = Boolean(incoming[key]);
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, 'No valid settings provided');
  }
  const { rows } = await query(
    `UPDATE users SET settings = settings || $2::jsonb, updated_at = now()
     WHERE id = $1 RETURNING settings`,
    [req.user.id, JSON.stringify(patch)]
  );
  res.json({ settings: rows[0].settings });
};

const changeEmail = async (req, res) => {
  const newEmail = String(req.body.new_email || '').trim().toLowerCase();
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new ApiError(400, 'Valid email is required');
  }
  if (newEmail === req.user.email) throw new ApiError(400, 'This is already your email');

  const existing = await query('SELECT id FROM users WHERE email = $1', [newEmail]);
  if (existing.rows.length) throw new ApiError(400, 'That email is already in use');

  const { rows } = await query('SELECT name FROM users WHERE id = $1', [req.user.id]);
  const token = generateToken();
  await query(
    `INSERT INTO email_changes (user_id, new_email, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + interval '1 hour')`,
    [req.user.id, newEmail, hashToken(token)]
  );
  await mailer.sendEmailChangeEmail({ name: rows[0].name }, newEmail, token);
  res.json({ message: 'A confirmation link has been sent to the new email.' });
};

const verifyEmailChange = async (req, res) => {
  const token = String(req.body.token || '').trim();
  if (!token) throw new ApiError(400, 'Token is required');
  const tokenHash = hashToken(token);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM email_changes WHERE token_hash = $1 LIMIT 1',
      [tokenHash]
    );
    const record = rows[0];
    if (!record) throw new ApiError(400, 'Invalid email change token');
    if (record.used_at) throw new ApiError(400, 'Email change token already used');
    if (new Date(record.expires_at).getTime() < Date.now()) {
      throw new ApiError(400, 'Email change token has expired');
    }
    const inUse = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [
      record.new_email, record.user_id,
    ]);
    if (inUse.rows.length) throw new ApiError(400, 'That email is already in use');

    await client.query(
      'UPDATE users SET email = $1, email_verified_at = now(), updated_at = now() WHERE id = $2',
      [record.new_email, record.user_id]
    );
    await client.query('UPDATE email_changes SET used_at = now() WHERE id = $1', [record.id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.json({ message: 'Email updated successfully.' });
};

const reportUser = async (req, res) => {
  const reportedUserId = String(req.body.reported_user_id || '').trim();
  const category = String(req.body.category || 'other').trim();
  const reason = String(req.body.reason || '').trim();
  const itemId = req.body.item_id ? String(req.body.item_id).trim() : null;

  if (!reportedUserId) throw new ApiError(400, 'The user you want to report is required');
  if (reportedUserId === req.user.id) throw new ApiError(400, 'You cannot report yourself');
  if (!['scam', 'harassment', 'counterfeit', 'other'].includes(category)) {
    throw new ApiError(400, 'Invalid report category');
  }
  if (!reason || reason.length < 10) {
    throw new ApiError(400, 'Please provide a reason of at least 10 characters');
  }
  if (reason.length > 2000) throw new ApiError(400, 'Reason must be 2000 characters or less');

  const target = await query('SELECT id FROM users WHERE id = $1', [reportedUserId]);
  if (!target.rows.length) throw new ApiError(404, 'User not found');

  const { rows } = await query(
    `INSERT INTO user_reports (reporter_id, reported_user_id, item_id, category, reason)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, category, status, created_at`,
    [req.user.id, reportedUserId, itemId, category, reason]
  );

  const admin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (admin.rows[0]) {
    const { notify } = require('../services/push');
    const reporter = await query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    notify(admin.rows[0].id, {
      type: 'report',
      title: `New report: ${category}`,
      body: `${reporter.rows[0].name} reported a user as ${category}`,
      data: { report_id: rows[0].id },
    }).catch(() => {});
  }

  res.status(201).json({ report: rows[0], message: 'Report submitted. Our team will review it.' });
};

const submitSupportTicket = async (req, res) => {
  const subject = String(req.body.subject || '').trim();
  const message = String(req.body.message || '').trim();
  if (!subject || subject.length > 100) throw new ApiError(400, 'Subject is required');
  if (!message || message.length > 2000) throw new ApiError(400, 'Message is required');

  const { rows } = await query(
    `INSERT INTO support_tickets (user_id, subject, message)
     VALUES ($1, $2, $3)
     RETURNING id, status, created_at`,
    [req.user.id, subject, message]
  );

  const admin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (admin.rows[0]) {
    const { notify } = require('../services/push');
    notify(admin.rows[0].id, {
      type: 'support',
      title: `Support ticket: ${subject}`,
      body: message,
      data: { ticket_id: rows[0].id },
    }).catch(() => {});
  }

  res.status(201).json({ ticket: rows[0], message: 'Support request received. We will get back to you.' });
};

const listMySupportTickets = async (req, res) => {
  const { rows } = await query(
    'SELECT id, subject, message, status, admin_reply, created_at, updated_at FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ tickets: rows });
};

module.exports = {
  getActivity,
  listSearchHistory,
  addSearchHistory,
  deleteSearchHistory,
  clearSearchHistory,
  addFeedback,
  getSettings,
  updateSettings,
  changeEmail,
  verifyEmailChange,
  reportUser,
  submitSupportTicket,
  listMySupportTickets,
};
