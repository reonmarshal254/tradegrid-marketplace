const { pool } = require('../src/config/db');

async function addSubscriptionSettings() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create subscription_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_settings (
        id SERIAL PRIMARY KEY,
        plan VARCHAR(50) NOT NULL UNIQUE,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        max_listings INTEGER NOT NULL DEFAULT 3,
        max_featured_listings INTEGER NOT NULL DEFAULT 0,
        max_ads INTEGER NOT NULL DEFAULT 0,
        can_create_ads BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by UUID REFERENCES users(id),
        CONSTRAINT check_max_listings CHECK (max_listings >= 0),
        CONSTRAINT check_max_featured CHECK (max_featured_listings >= 0),
        CONSTRAINT check_max_ads CHECK (max_ads >= 0)
      )
    `);

    // Insert default settings for each plan
    await client.query(`
      INSERT INTO subscription_settings (plan, price, max_listings, max_featured_listings, max_ads, can_create_ads)
      VALUES 
        ('free', 0, 3, 0, 0, FALSE),
        ('personal', 500, 15, 3, 0, FALSE),
        ('recommended', 1500, 999999, 10, 5, TRUE),
        ('enterprise', 2500, 999999, 999999, 999999, TRUE)
      ON CONFLICT (plan) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✅ Subscription settings table created and populated successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating subscription settings:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addSubscriptionSettings();
