const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.hnpydicsafapdkimqijb:capital@coffee12345@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase');
    
    // Add phone column to employees table
    await client.query(`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '';
    `);
    
    console.log('✅ Added "phone" column to employees table successfully!');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\nCurrent employees table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
  } catch (err) {
    console.error('Error:', err.stack);
  } finally {
    await client.end();
  }
}

run();
