'use strict';
const { query } = require('../config/db');
const { ApiError } = require('../middleware/error');

/**
 * Get all active announcements (public)
 */
async function listActive(req, res) {
  const { rows } = await query(
    `SELECT id, title, message, link_text, link_url, position, created_at
     FROM announcements
     WHERE is_enabled = true
     ORDER BY position ASC, created_at DESC`,
    []
  );
  res.json({ announcements: rows });
}

/**
 * Get all announcements (admin only)
 */
async function listAll(req, res) {
  const { rows } = await query(
    `SELECT a.id, a.title, a.message, a.link_text, a.link_url, a.is_enabled, 
            a.position, a.created_at, a.updated_at,
            u.name AS created_by_name
     FROM announcements a
     JOIN users u ON u.id = a.created_by
     ORDER BY a.position ASC, a.created_at DESC`,
    []
  );
  res.json({ announcements: rows });
}

/**
 * Get single announcement (admin only)
 */
async function getOne(req, res) {
  const { rows } = await query(
    `SELECT a.*, u.name AS created_by_name
     FROM announcements a
     JOIN users u ON u.id = a.created_by
     WHERE a.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Announcement not found');
  res.json({ announcement: rows[0] });
}

/**
 * Create new announcement (admin only)
 */
async function create(req, res) {
  const { title, message, link_text, link_url, is_enabled, position } = req.body;

  if (!title || !String(title).trim()) {
    throw new ApiError(400, 'Title is required');
  }
  if (!message || !String(message).trim()) {
    throw new ApiError(400, 'Message is required');
  }

  const { rows } = await query(
    `INSERT INTO announcements (title, message, link_text, link_url, is_enabled, position, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, title, message, link_text, link_url, is_enabled, position, created_at`,
    [
      String(title).trim(),
      String(message).trim(),
      link_text ? String(link_text).trim() : null,
      link_url ? String(link_url).trim() : null,
      is_enabled !== false, // default true
      position || 0,
      req.user.id
    ]
  );

  res.status(201).json({ announcement: rows[0] });
}

/**
 * Update announcement (admin only)
 */
async function update(req, res) {
  const { title, message, link_text, link_url, is_enabled, position } = req.body;

  // Check if announcement exists
  const checkRes = await query('SELECT id FROM announcements WHERE id = $1', [req.params.id]);
  if (!checkRes.rows[0]) throw new ApiError(404, 'Announcement not found');

  const { rows } = await query(
    `UPDATE announcements
     SET title = COALESCE($1, title),
         message = COALESCE($2, message),
         link_text = $3,
         link_url = $4,
         is_enabled = COALESCE($5, is_enabled),
         position = COALESCE($6, position),
         updated_at = now()
     WHERE id = $7
     RETURNING id, title, message, link_text, link_url, is_enabled, position, updated_at`,
    [
      title ? String(title).trim() : null,
      message ? String(message).trim() : null,
      link_text !== undefined ? (link_text ? String(link_text).trim() : null) : undefined,
      link_url !== undefined ? (link_url ? String(link_url).trim() : null) : undefined,
      is_enabled !== undefined ? is_enabled : null,
      position !== undefined ? position : null,
      req.params.id
    ]
  );

  res.json({ announcement: rows[0] });
}

/**
 * Delete announcement (admin only)
 */
async function deleteAnnouncement(req, res) {
  const { rows } = await query(
    'DELETE FROM announcements WHERE id = $1 RETURNING id',
    [req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Announcement not found');
  res.json({ message: 'Announcement deleted' });
}

/**
 * Toggle announcement enabled status (admin only)
 */
async function toggleEnabled(req, res) {
  const { rows } = await query(
    `UPDATE announcements
     SET is_enabled = NOT is_enabled, updated_at = now()
     WHERE id = $1
     RETURNING id, is_enabled`,
    [req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Announcement not found');
  res.json({ announcement: rows[0] });
}

module.exports = {
  listActive,
  listAll,
  getOne,
  create,
  update,
  deleteAnnouncement,
  toggleEnabled
};
