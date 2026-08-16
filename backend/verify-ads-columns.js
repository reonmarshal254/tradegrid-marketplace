const { query } = require('./src/config/db');

async function verify() {
  try {
    const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'advertisements' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Advertisements table columns:');
    result.rows.forEach(row => {
      const marker = row.column_name === 'rejection_reason' ? ' ← NEW' : '';
      console.log(`  - ${row.column_name} (${row.data_type})${marker}`);
    });
    
    const hasColumn = result.rows.some(r => r.column_name === 'rejection_reason');
    if (hasColumn) {
      console.log('\n✅ rejection_reason column exists!\n');
    } else {
      console.log('\n❌ rejection_reason column is missing!\n');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verify();
