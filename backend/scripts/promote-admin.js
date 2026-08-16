'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/db');

// Usage: node scripts/promote-admin.js <email>
// Sets the given user's role to 'admin'.
(async () => {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/promote-admin.js <email>');
    process.exit(1);
  }
  const { rows } = await pool.query(
    `UPDATE users SET role = 'admin', is_active = true, updated_at = now()
     WHERE email = $1 RETURNING id, name, email, role`,
    [email.toLowerCase()]
  );
  if (!rows.length) {
    console.error('No user found with that email.');
    process.exit(1);
  }
  console.log('Promoted to admin:', rows[0]);
  await pool.end();
})().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
