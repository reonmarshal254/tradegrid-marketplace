'use strict';
const { query } = require('../config/db');
const { ApiError } = require('../middleware/error');
const { isConfigured } = require('../services/push');

const subscribe = async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    throw new ApiError(400, 'Invalid push subscription');
  }

  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint)
     DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_id = EXCLUDED.user_id`,
    [req.user.id, endpoint, keys.p256dh, keys.auth]
  );

  res.status(201).json({ enabled: true });
};

const unsubscribe = async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) {
    await query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [
      endpoint,
      req.user.id,
    ]);
  }
  res.json({ enabled: false });
};

const status = async (req, res) => {
  res.json({
    configured: isConfigured,
    public_key: isConfigured ? require('../config/env').vapid.publicKey : null,
  });
};

module.exports = { subscribe, unsubscribe, status };
