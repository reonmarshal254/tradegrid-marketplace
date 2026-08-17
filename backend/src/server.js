'use strict';
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');
const mailer = require('./services/mailer');
const push = require('./services/push');

function logConfig() {
  const line = (label, ok, extra = '') =>
    console.log(`  ${ok ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`);

  console.log('[config]');
  line('Email', mailer.isConfigured(), env.resendApiKey ? 'Resend API' : env.smtp.user || 'no provider');
  line('Web Push (VAPID)', push.isConfigured, env.vapid.publicKey ? 'keys present' : 'VAPID keys missing');
  line('Cloudinary', Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey), env.cloudinary.cloudName || 'missing');
  line('Google OAuth', Boolean(env.googleClientId && env.googleClientSecret), env.googleClientId ? 'client configured' : 'client missing');
}

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('[db] connection OK');
  } catch (err) {
    console.error('[db] failed to connect:', err.message);
    process.exit(1);
  }

  logConfig();

  // Create HTTP server and attach Socket.IO
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: env.corsOrigin || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Make io instance available globally
  app.set('io', io);

  // Socket.IO authentication middleware
  const jwt = require('jsonwebtoken');
  const { query } = require('./config/db');

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, env.jwt.secret);
      
      const { rows } = await query(
        'SELECT id, email, role, name, avatar_url, is_active FROM users WHERE id = $1',
        [payload.sub]
      );
      
      const user = rows[0];
      if (!user) {
        return next(new Error('Account not found'));
      }
      
      if (!user.is_active) {
        return next(new Error('Account deactivated'));
      }

      socket.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        avatar_url: user.avatar_url
      };

      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  // Socket.IO connection handler
  io.on('connection', (socket) => {
    console.log(`[socket] user connected: ${socket.user.id} (${socket.user.email})`);

    // Join user's personal room for targeted notifications
    socket.join(`user:${socket.user.id}`);

    // Join admin room if user is admin
    if (socket.user.role === 'admin') {
      socket.join('admin');
      console.log(`[socket] admin joined: ${socket.user.id}`);
    }

    socket.on('disconnect', () => {
      console.log(`[socket] user disconnected: ${socket.user.id}`);
    });

    // Handle errors
    socket.on('error', (err) => {
      console.error(`[socket] error for user ${socket.user.id}:`, err);
    });
  });

  // Load socket event handlers
  require('./sockets/messageHandlers')(io);
  require('./sockets/notificationHandlers')(io);
  require('./sockets/itemHandlers')(io);
  require('./sockets/supportHandlers')(io);

  server.listen(env.port, () => {
    console.log(`[server] running on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log('[socket] Socket.IO ready');
  });
}

start();
