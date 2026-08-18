'use strict';
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../config/db');
const env = require('../config/env');
const { ApiError } = require('../middleware/error');
const { signToken, generateToken, hashToken } = require('../utils/token');
const mailer = require('../services/mailer');
const { DEFAULT_SETTINGS } = require('../services/push');

const VERIFY_TTL_MS = 15 * 60 * 1000; // 15 minutes for OTP
const RESET_TTL_MS = 60 * 60 * 1000;

function googleIsConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

function googleRedirectUri(req) {
  const uri = req.body?.redirect_uri;
  const allowed = env.clientUrl.map((origin) => `${origin}/auth/google/callback`);
  if (allowed.includes(uri)) return uri;
  return null;
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    whatsapp: u.whatsapp,
    location: u.location,
    avatar_url: u.avatar_url,
    email_verified: Boolean(u.email_verified_at),
    role: u.role || 'user',
    is_verified: Boolean(u.is_verified),
    is_active: u.is_active !== false,
    subscription_plan: u.subscription_plan || 'free',
    subscription_expires_at: u.subscription_expires_at,
    last_login_at: u.last_login_at,
    created_at: u.created_at,
  };
}

async function touchLastLogin(userId) {
  query('UPDATE users SET last_login_at = now() WHERE id = $1', [userId]).catch(() => {});
}

function issueTokens(res, user) {
  res.json({
    token: signToken(user),
    user: publicUser(user),
  });
}

async function findUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0];
}

async function validatePassword(password) {
  if (!password || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new ApiError(400, 'Password must contain at least one letter and one number');
  }
}

const register = async (req, res) => {
  const { name, email, password, phone, whatsapp, location, ref } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }
  await validatePassword(password);

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  // Normalize and check for duplicate phone/whatsapp numbers
  const normalizePhone = (num) => {
    if (!num) return null;
    return String(num).replace(/[\s\-()]/g, '').trim();
  };

  const normalizedPhone = normalizePhone(phone);
  const normalizedWhatsapp = normalizePhone(whatsapp);

  if (normalizedPhone) {
    const { rows: phoneDuplicates } = await query(
      'SELECT id FROM users WHERE phone IS NOT NULL AND REPLACE(REPLACE(REPLACE(phone, \' \', \'\'), \'-\', \'\'), \'()\', \'\') = $1',
      [normalizedPhone]
    );
    if (phoneDuplicates.length > 0) {
      throw new ApiError(409, 'This phone number is already registered');
    }
  }

  if (normalizedWhatsapp) {
    const { rows: whatsappDuplicates } = await query(
      'SELECT id FROM users WHERE whatsapp IS NOT NULL AND REPLACE(REPLACE(REPLACE(whatsapp, \' \', \'\'), \'-\', \'\'), \'()\', \'\') = $1',
      [normalizedWhatsapp]
    );
    if (whatsappDuplicates.length > 0) {
      throw new ApiError(409, 'This WhatsApp number is already registered');
    }
  }

  // Resolve referral code
  let referrerId = null;
  if (ref && typeof ref === 'string' && ref.trim()) {
    const { rows: referrerRows } = await query(
      'SELECT id FROM users WHERE referral_code = $1',
      [ref.trim().toUpperCase()]
    );
    if (referrerRows[0]) {
      referrerId = referrerRows[0].id;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, phone, whatsapp, location, settings, referred_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [name.trim(), email.toLowerCase(), passwordHash, phone || null, whatsapp || null, location || null, JSON.stringify(DEFAULT_SETTINGS), referrerId]
  );
  const user = rows[0];

  // Create pending referral record if referred
  if (referrerId) {
    await query(
      `INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
       VALUES ($1, $2, $3, 'pending')`,
      [referrerId, user.id, ref.trim().toUpperCase()]
    ).catch(() => {});
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await query(
    `INSERT INTO email_verifications (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashToken(otp), new Date(Date.now() + VERIFY_TTL_MS)]
  );
  mailer.sendVerificationOTP(user, otp).catch(() => {});

  res.json({ message: 'Verification required. Check your email for the code.', email: user.email });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }
  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.is_active === false) {
    throw new ApiError(403, 'This account has been deactivated. Contact support for help.');
  }
  touchLastLogin(user.id);
  issueTokens(res, user);
};

const google = async (req, res) => {
  const { code, ref } = req.body;
  if (!code) throw new ApiError(400, 'Google authorization code is required');
  if (!googleIsConfigured()) {
    throw new ApiError(500, 'Google sign-in is not configured on the server');
  }

  const redirectUri = googleRedirectUri(req);
  if (!redirectUri) {
    throw new ApiError(400, 'Invalid redirect_uri');
  }

  const client = new OAuth2Client({
    clientId: env.googleClientId,
    clientSecret: env.googleClientSecret,
    redirectUri,
  });

  let tokens;
  try {
    const tokenRes = await client.getToken(code);
    tokens = tokenRes.tokens;
  } catch (err) {
    throw new ApiError(401, 'Invalid Google authorization code');
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new ApiError(401, 'Invalid Google token');
  }

  let user = await findUserByEmail(payload.email);
  if (user) {
    if (user.is_active === false) {
      throw new ApiError(403, 'This account has been deactivated. Contact support for help.');
    }
    if (!user.google_id) {
      await query('UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url), updated_at = now() WHERE id = $3',
        [payload.sub, payload.picture || null, user.id]);
      user = await findUserByEmail(payload.email);
    }
  } else {
    // Resolve referral code for Google sign-ups
    let referrerId = null;
    if (ref && typeof ref === 'string' && ref.trim()) {
      const { rows: referrerRows } = await query(
        'SELECT id FROM users WHERE referral_code = $1',
        [ref.trim().toUpperCase()]
      );
      if (referrerRows[0]) referrerId = referrerRows[0].id;
    }

    const { rows } = await query(
      `INSERT INTO users (name, email, google_id, avatar_url, email_verified_at, settings, referred_by)
       VALUES ($1, $2, $3, $4, now(), $5, $6)
       RETURNING *`,
      [payload.name || payload.email.split('@')[0], payload.email, payload.sub, payload.picture || null, JSON.stringify(DEFAULT_SETTINGS), referrerId]
    );
    user = rows[0];

    // Create pending referral record
    if (referrerId) {
      await query(
        `INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
         VALUES ($1, $2, $3, 'registered')`,
        [referrerId, user.id, ref.trim().toUpperCase()]
      ).catch(() => {});
      // Grant free trial immediately for Google sign-ups (no email verification needed)
      const TRIAL_DAYS = 7;
      const trialExpires = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      await query(
        `UPDATE users SET subscription_plan = 'personal', subscription_expires_at = $1, free_trial_granted_at = now(), updated_at = now() WHERE id = $2`,
        [trialExpires, user.id]
      );
      // Grant trial to referrer too
      await query(
        `UPDATE users SET subscription_plan = 'personal', subscription_expires_at = GREATEST(COALESCE(subscription_expires_at, now()), now()) + INTERVAL '${TRIAL_DAYS} days', free_trial_granted_at = now(), updated_at = now() WHERE id = $1 AND (subscription_expires_at IS NULL OR subscription_expires_at < now())`,
        [referrerId]
      );
    }

    mailer.sendWelcomeEmail(user).catch(() => {});
  }
  touchLastLogin(user.id);
  issueTokens(res, user);
};

const me = async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) throw new ApiError(404, 'User not found');
  res.json({ user: publicUser(rows[0]) });
};

const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, 'Email and verification code are required');
  if (!/^\d{6}$/.test(otp)) throw new ApiError(400, 'Verification code must be 6 digits');

  const user = await findUserByEmail(email);
  if (!user) throw new ApiError(404, 'No account found with this email');
  if (user.email_verified_at) {
    return res.json({ message: 'Email already verified', token: signToken(user), user: publicUser(user) });
  }

  const tokenHash = hashToken(otp);

  const { rows } = await query(
    `SELECT * FROM email_verifications WHERE token_hash = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
    [tokenHash, user.id]
  );
  const record = rows[0];
  if (!record) throw new ApiError(400, 'Invalid verification code');
  if (record.used_at) throw new ApiError(400, 'Verification code already used');
  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new ApiError(400, 'Verification code has expired. Please request a new one.');
  }

  const TRIAL_DAYS = 7;
  const trialExpires = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const client = await require('../config/db').pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE email_verifications SET used_at = now() WHERE id = $1', [record.id]);
    await client.query('UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1', [record.user_id]);

    // Grant free trial if user was referred
    if (user.referred_by) {
      await client.query(
        `UPDATE users SET subscription_plan = 'personal', subscription_expires_at = $1, free_trial_granted_at = now(), updated_at = now() WHERE id = $2`,
        [trialExpires, record.user_id]
      );
      // Update referral status
      await client.query(
        `UPDATE referrals SET status = 'trial_granted', trial_granted_at = now(), registered_at = COALESCE(registered_at, now())
         WHERE referred_id = $1 AND status IN ('pending', 'registered')`,
        [record.user_id]
      );
      // Also grant trial to referrer
      await client.query(
        `UPDATE users SET subscription_plan = 'personal', subscription_expires_at = GREATEST(COALESCE(subscription_expires_at, now()), now()) + INTERVAL '${TRIAL_DAYS} days', free_trial_granted_at = now(), updated_at = now() WHERE id = $1 AND (subscription_expires_at IS NULL OR subscription_expires_at < now())`,
        [user.referred_by]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [user.id]);
  const verifiedUser = userRows[0];
  touchLastLogin(verifiedUser.id);
  mailer.sendWelcomeEmail(verifiedUser).catch(() => {});
  res.json({ token: signToken(verifiedUser), user: publicUser(verifiedUser) });
};

const resendVerification = async (req, res) => {
  const { email } = req.body;
  const user = await findUserByEmail(email || '');
  if (!user) throw new ApiError(404, 'No account found with this email');
  if (user.email_verified_at) {
    return res.json({ message: 'Email is already verified' });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await query(
    `INSERT INTO email_verifications (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashToken(otp), new Date(Date.now() + VERIFY_TTL_MS)]
  );
  mailer.sendVerificationOTP(user, otp).catch(() => {});
  res.json({ message: 'Verification code sent' });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await findUserByEmail(email || '');
  if (user) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, hashToken(otp), new Date(Date.now() + RESET_TTL_MS)]
    );
    mailer.sendPasswordResetOTP(user, otp).catch(() => {});
  }
  res.json({ message: 'If an account exists for this email, a reset code has been sent' });
};

const resetPassword = async (req, res) => {
  const { otp, password } = req.body;
  if (!otp) throw new ApiError(400, 'Reset code is required');
  await validatePassword(password);

  // The reset code already belongs to a user, so we track the owner from the code.
  const tokenHash = hashToken(otp);

  const { rows } = await query(
    'SELECT * FROM password_reset_tokens WHERE token_hash = $1 ORDER BY created_at DESC LIMIT 1',
    [tokenHash]
  );
  const record = rows[0];
  if (!record) throw new ApiError(400, 'Invalid reset code');
  if (record.used_at) throw new ApiError(400, 'Reset code already used');
  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new ApiError(400, 'Reset code has expired');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = await require('../config/db').pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [record.id]);
    await client.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, record.user_id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.json({ message: 'Password reset successfully. You can now log in.' });
};

const updateProfile = async (req, res) => {
  const { name, phone, whatsapp, location, avatar_remove } = req.body;
  if (name !== undefined && !String(name).trim()) {
    throw new ApiError(400, 'Name cannot be empty');
  }

  // Normalize and validate phone/whatsapp
  const normalizePhone = (num) => {
    if (!num) return null;
    // Remove spaces, dashes, parentheses
    return String(num).replace(/[\s\-()]/g, '').trim();
  };

  const normalizedPhone = normalizePhone(phone);
  const normalizedWhatsapp = normalizePhone(whatsapp);

  // Check for duplicate phone numbers (excluding current user)
  if (normalizedPhone) {
    const { rows: phoneDuplicates } = await query(
      'SELECT id FROM users WHERE phone IS NOT NULL AND REPLACE(REPLACE(REPLACE(phone, \' \', \'\'), \'-\', \'\'), \'()\', \'\') = $1 AND id != $2',
      [normalizedPhone, req.user.id]
    );
    if (phoneDuplicates.length > 0) {
      throw new ApiError(409, 'This phone number is already registered to another account');
    }
  }

  // Check for duplicate WhatsApp numbers (excluding current user)
  if (normalizedWhatsapp) {
    const { rows: whatsappDuplicates } = await query(
      'SELECT id FROM users WHERE whatsapp IS NOT NULL AND REPLACE(REPLACE(REPLACE(whatsapp, \' \', \'\'), \'-\', \'\'), \'()\', \'\') = $1 AND id != $2',
      [normalizedWhatsapp, req.user.id]
    );
    if (whatsappDuplicates.length > 0) {
      throw new ApiError(409, 'This WhatsApp number is already registered to another account');
    }
  }

  const pool = require('../config/db').pool;
  const client = await pool.connect();
  let newAvatarPublicId = null;

  try {
    await client.query('BEGIN');

    if (req.file) {
      const { rows } = await client.query(
        'SELECT avatar_public_id FROM users WHERE id = $1',
        [req.user.id]
      );
      const { uploadAvatar } = require('../services/cloudinary');
      const uploaded = await uploadAvatar(req.file);
      newAvatarPublicId = uploaded.publicId;
      await client.query(
        'UPDATE users SET avatar_url = $1, avatar_public_id = $2, updated_at = now() WHERE id = $3',
        [uploaded.url, uploaded.publicId, req.user.id]
      );
      if (rows[0]?.avatar_public_id) {
        const { destroyImage } = require('../services/cloudinary');
        destroyImage(rows[0].avatar_public_id);
      }
    } else if (avatar_remove === 'true' || avatar_remove === true) {
      const { rows } = await client.query(
        'SELECT avatar_public_id FROM users WHERE id = $1',
        [req.user.id]
      );
      await client.query(
        'UPDATE users SET avatar_url = NULL, avatar_public_id = NULL, updated_at = now() WHERE id = $1',
        [req.user.id]
      );
      if (rows[0]?.avatar_public_id) {
        const { destroyImage } = require('../services/cloudinary');
        destroyImage(rows[0].avatar_public_id);
      }
    }

    if (name !== undefined || phone !== undefined || whatsapp !== undefined || location !== undefined) {
      const fields = ['name', 'phone', 'whatsapp', 'location'];
      const sets = [];
      const params = [req.user.id];
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          sets.push(`${f} = $${params.length + 1}`);
          params.push(f === 'name' ? String(req.body[f]).trim() : req.body[f] || null);
        }
      }
      sets.push('updated_at = now()');
      await client.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $1`, params);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (newAvatarPublicId) {
      const { destroyImage } = require('../services/cloudinary');
      destroyImage(newAvatarPublicId);
    }
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  res.json({ user: publicUser(rows[0]) });
};

module.exports = {
  register,
  login,
  google,
  me,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  updateProfile,
};
