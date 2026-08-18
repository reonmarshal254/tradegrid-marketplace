'use strict';
const { query, pool } = require('../config/db');
const { ApiError } = require('../middleware/error');
const crypto = require('crypto');

function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// Get or create the current user's affiliate profile
const getProfile = async (req, res) => {
  const userId = req.user.id;

  // Check if user already has a referral code
  let { rows } = await query(
    'SELECT referral_code FROM users WHERE id = $1',
    [userId]
  );

  let code = rows[0]?.referral_code;

  // Auto-generate one if missing
  if (!code) {
    code = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      try {
        await query(
          'UPDATE users SET referral_code = $1 WHERE id = $2 AND referral_code IS NULL',
          [code, userId]
        );
        break;
      } catch (err) {
        if (err.message.includes('unique') || err.message.includes('duplicate')) {
          code = generateReferralCode();
          attempts++;
        } else {
          throw err;
        }
      }
    }
  }

  // Count referrals
  const { rows: stats } = await query(
    `SELECT
       COUNT(*)::int AS total_referrals,
       COUNT(*) FILTER (WHERE status = 'registered' OR status = 'trial_granted')::int AS registered,
       COUNT(*) FILTER (WHERE status = 'trial_granted')::int AS trial_granted
     FROM referrals WHERE referrer_id = $1`,
    [userId]
  );

  const baseUrl = getBaseUrl(req);
  const referralLink = `${baseUrl}/register?ref=${code}`;

  res.json({
    referral_code: code,
    referral_link: referralLink,
    stats: stats[0] || { total_referrals: 0, registered: 0, trial_granted: 0 },
  });
};

// Record a pending referral when someone visits via referral link
const trackVisit = async (req, res) => {
  const { code } = req.params;
  if (!code) throw new ApiError(400, 'Referral code is required');

  // Find the referrer
  const { rows: referrerRows } = await query(
    'SELECT id, name FROM users WHERE referral_code = $1',
    [code]
  );
  if (!referrerRows[0]) throw new ApiError(404, 'Invalid referral code');

  // Don't allow self-referral
  if (req.user && req.user.id === referrerRows[0].id) {
    return res.json({ valid: false, message: 'Cannot refer yourself' });
  }

  res.json({
    valid: true,
    referrer_name: referrerRows[0].name,
    referral_code: code,
  });
};

// Get referral list for the current user
const getReferrals = async (req, res) => {
  const userId = req.user.id;
  const { rows } = await query(
    `SELECT r.id, r.referral_code, r.status, r.created_at, r.registered_at, r.trial_granted_at,
            u.name AS referred_name, u.avatar_url AS referred_avatar
     FROM referrals r
     LEFT JOIN users u ON u.id = r.referred_id
     WHERE r.referrer_id = $1
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [userId]
  );

  res.json({ referrals: rows });
};

// Generate share thumbnail data (for client-side rendering)
const getShareData = async (req, res) => {
  const userId = req.user.id;

  const { rows } = await query(
    'SELECT referral_code, name, avatar_url FROM users WHERE id = $1',
    [userId]
  );

  const user = rows[0];
  if (!user?.referral_code) throw new ApiError(400, 'No referral code found');

  const baseUrl = getBaseUrl(req);
  const referralLink = `${baseUrl}/register?ref=${user.referral_code}`;

  res.json({
    title: `${user.name} invites you to TRADEGRID`,
    description: 'Buy and sell pre-owned items on a free marketplace. Great deals, near you!',
    link: referralLink,
    code: user.referral_code,
    avatar_url: user.avatar_url,
  });
};

module.exports = { getProfile, trackVisit, getReferrals, getShareData };
