const { query } = require('../src/config/db');

async function addSubscriptionSystem() {
  console.log('Adding subscription system tables...');

  try {
    // Create subscriptions table
    await query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR(50) NOT NULL CHECK (plan IN ('free', 'personal', 'recommended', 'enterprise')),
        amount INTEGER NOT NULL DEFAULT 0,
        reference VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
        expires_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create payment transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reference VARCHAR(255) UNIQUE NOT NULL,
        amount INTEGER NOT NULL,
        plan VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
        verified_at TIMESTAMP,
        webhook_verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add subscription columns to users table if not exists
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'personal', 'recommended', 'enterprise')),
      ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
    `);

    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
    `);

    console.log('✅ Subscription system tables added successfully');
  } catch (error) {
    console.error('❌ Error adding subscription system:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  addSubscriptionSystem()
    .then(() => process.exit(0))
    .catch(console.error);
}

module.exports = addSubscriptionSystem;