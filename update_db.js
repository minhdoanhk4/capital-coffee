const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.hnpydicsafapdkimqijb:capital@coffee12345@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected');
    
    // Check if category exists, if not add it
    await client.query(`
      ALTER TABLE menu_items 
      ADD COLUMN IF NOT EXISTS category VARCHAR(255);
    `);
    
    console.log('Added category column to menu_items table');
    
    // Update existing records to have a default category
    await client.query(`
      UPDATE menu_items 
      SET category = 'Khác' 
      WHERE category IS NULL;
    `);
    
    console.log('Updated existing records');
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

run();
