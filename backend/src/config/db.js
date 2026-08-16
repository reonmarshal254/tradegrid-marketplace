'use strict';
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: env.dbSsl || env.isProd ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('[pg] unexpected error on idle client', err);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (env.isProd === false) {
    const duration = Date.now() - start;
    // Only log queries taking longer than 3 seconds to reduce noise
    if (duration > 3000) {
      console.warn('[pg] slow query', { duration, text });
    }
  }
  return res;
}

module.exports = { pool, query };
