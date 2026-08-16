'use strict';
const webpush = require('web-push');
const env = require('../config/env');
const { query } = require('../config/db');

// Notification preferences always default to ON so users are notified by default.
const DEFAULT_SETTINGS = {
  notif_reactions: true,
  notif_sold: true,
  notif_reviews: true,
  notif_push: true,
  notif_email: true,
};

// Notification types that map to a specific preference toggle.
// Types without a mapping are always pushed (as long as notif_push is enabled).
const TYPE_SETTING_MAP = {
  reaction: 'notif_reactions',
  review: 'notif_reviews',
};

const isConfigured = Boolean(env.vapid.publicKey && env.vapid.privateKey);
if (isConfigured) {
  webpush.setVapidDetails(
    env.vapid.subject,
    env.vapid.publicKey,
    env.vapid.privateKey
  );
}

async function getSubscriptionsForUser(userId) {
  const { rows } = await query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  return rows;
}

async function sendPushToUser(userId, payload) {
  if (!isConfigured) return [];
  const subs = await getSubscriptionsForUser(userId);
  const results = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      results.push({ ok: true });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
      }
      results.push({ ok: false, statusCode: err.statusCode });
    }
  }
  return results;
}

async function shouldSendPush(userId, type) {
  try {
    const { rows } = await query('SELECT settings FROM users WHERE id = $1', [userId]);
    const settings = { ...DEFAULT_SETTINGS, ...(rows[0]?.settings || {}) };
    if (settings.notif_push === false) return false;
    const specific = TYPE_SETTING_MAP[type];
    if (specific && settings[specific] === false) return false;
    return true;
  } catch (err) {
    console.error('[notify] failed to load user settings', err.message);
    return true;
  }
}

/**
 * Create an in-app notification row for a user and trigger a web push.
 * payload: { title, body, data }
 */
async function notify(userId, { type, title, body, data }) {
  let created = null;
  try {
    const { rows } = await query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, body, type, data, created_at`,
      [userId, type, title, body, data || null]
    );
    created = rows[0];
  } catch (err) {
    console.error('[notify] failed to store notification', err.message);
  }
  try {
    if (await shouldSendPush(userId, type)) {
      await sendPushToUser(userId, { type, title, body, data });
    }
  } catch (err) {
    console.error('[notify] push failed', err.message);
  }
  return created;
}

module.exports = { sendPushToUser, notify, isConfigured, DEFAULT_SETTINGS };
