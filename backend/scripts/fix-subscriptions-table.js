const { pool } = require('../src/config/db');

async function fixSubscriptionsTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if subscriptions table exists, if not create it
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscriptions'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('Creating subscriptions table...');
      await client.query(`
        CREATE TABLE subscriptions (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          plan VARCHAR(50) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          reference VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          cancelled_at TIMESTAMP,
          refund_requested_at TIMESTAMP,
          refund_approved_at TIMESTAMP,
          refund_status VARCHAR(20),
          refund_amount DECIMAL(10, 2),
          refund_reason TEXT
        );
      `);
      console.log('✅ Subscriptions table created!');
    } else {
      console.log('Subscriptions table exists, checking columns...');
      
      // Add missing columns if they don't exist
      const columns = [
        { name: 'amount', type: 'DECIMAL(10, 2)', default: null },
        { name: 'reference', type: 'VARCHAR(255)', default: null },
        { name: 'cancelled_at', type: 'TIMESTAMP', default: null },
        { name: 'refund_requested_at', type: 'TIMESTAMP', default: null },
        { name: 'refund_approved_at', type: 'TIMESTAMP', default: null },
        { name: 'refund_status', type: 'VARCHAR(20)', default: null },
        { name: 'refund_amount', type: 'DECIMAL(10, 2)', default: null },
        { name: 'refund_reason', type: 'TEXT', default: null }
      ];

      for (const col of columns) {
        try {
          await client.query(`
            ALTER TABLE subscriptions 
            ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
          `);
          console.log(`✅ Column ${col.name} added/verified`);
        } catch (err) {
          console.log(`⚠️  Column ${col.name}: ${err.message}`);
        }
      }

      // Add unique constraint on reference if it doesn't exist
      try {
        await client.query(`
          ALTER TABLE subscriptions 
          ADD CONSTRAINT subscriptions_reference_unique UNIQUE (reference)
        `);
        console.log('✅ Unique constraint on reference added');
      } catch (err) {
        if (err.code === '42P07') {
          console.log('✅ Unique constraint on reference already exists');
        } else {
          console.log('⚠️  Constraint issue:', err.message);
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Subscriptions table fixed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing subscriptions table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSubscriptionsTable();
