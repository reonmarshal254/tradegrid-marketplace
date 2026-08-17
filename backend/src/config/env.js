'use strict';
require('dotenv').config();

const requiredInProd = [
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLIENT_URL',
];

function databaseIsConfigured() {
  return Boolean(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_NAME));
}

if (process.env.NODE_ENV === 'production') {
  if (!databaseIsConfigured()) {
    throw new Error(
      'Missing required environment variable: set DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD'
    );
  }
  for (const key of requiredInProd) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const name = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (!host || !name) return undefined;
  const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(password || '')}@` : '';
  return `postgres://${auth}${host}${port ? `:${port}` : ''}/${encodeURIComponent(name)}`;
}

const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((u) => u.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  clientUrl,
  frontendUrl: clientUrl[0] || 'http://localhost:5173',
  databaseUrl: buildDatabaseUrl(),
  dbSsl: process.env.DB_SSL === 'true',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'TRADEGRID',
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoSender: process.env.BREVO_SENDER,
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@tradegrid.local',
  },
  b2: {
    keyId: process.env.B2_KEY_ID,
    appKey: process.env.B2_APP_KEY,
    bucketId: process.env.B2_BUCKET_ID,
    bucketName: process.env.B2_BUCKET_NAME || 'tradegrid',
    endpoint: process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com',
  },
};

module.exports = env;
