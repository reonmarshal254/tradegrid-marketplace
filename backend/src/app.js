'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');
const { pool } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const itemRoutes = require('./routes/itemRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const pushRoutes = require('./routes/pushRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const supportChatRoutes = require('./routes/supportChatRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const advertisementRoutes = require('./routes/advertisementRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const subscriptionSettingsRoutes = require('./routes/subscriptionSettingsRoutes');
const referralRoutes = require('./routes/referralRoutes');

const app = express();

// Auto-run schema migration on startup (safe — all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
(async () => {
  try {
    const fs = require('fs');
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    // Split into individual statements so one failing index doesn't block the rest
    const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        // Log but don't block — indexes/tables may already exist
        if (!err.message.includes('already exists')) {
          console.error('[migrate] statement error:', err.message.split('\n')[0]);
        }
      }
    }
    console.log('[migrate] schema applied');
  } catch (err) {
    console.error('[migrate] schema error:', err.message);
  }
})();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
    },
  },
}));
app.use(cors({
  origin: env.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Public: latest app version (for mobile update check)
app.get('/api/app-version/latest', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT version_code, version_name, release_notes, apk_url, apk_public_id, file_size, created_at FROM app_versions WHERE is_active = true ORDER BY version_code DESC LIMIT 1'
    );
    const version = rows[0] || null;
    if (version?.apk_public_id) {
      try {
        const { getApkDownloadUrl } = require('./services/b2');
        version.download_url = await getApkDownloadUrl(version.apk_public_id, 3600);
      } catch { /* ignore */ }
    }
    res.json({ version });
  } catch {
    res.json({ version: null });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support-chat', supportChatRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscription-settings', subscriptionSettingsRoutes);
app.use('/api/referrals', referralRoutes);

const distDir = path.join(__dirname, '../../frontend/dist');
if (require('fs').existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
