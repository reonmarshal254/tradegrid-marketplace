'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const { ApiError } = require('./error');

function parseToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function requireAuth(req, res, next) {
  const token = parseToken(req);
  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }
  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired session'));
  }
  try {
    const { rows } = await query(
      'SELECT id, email, role, is_active, subscription_plan, subscription_expires_at FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = rows[0];
    if (!user) return next(new ApiError(401, 'Account not found'));
    if (!user.is_active) return next(new ApiError(403, 'This account has been deactivated'));
    req.user = { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      subscription_plan: user.subscription_plan || 'free',
      subscription_expires_at: user.subscription_expires_at
    };
    next();
  } catch (err) {
    next(err);
  }
}

function optionalAuth(req, res, next) {
  const token = parseToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = { id: payload.sub, email: payload.email };
  } catch (err) {
    /* ignore */
  }
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }
  next();
}

module.exports = { requireAuth, optionalAuth, requireAdmin };
