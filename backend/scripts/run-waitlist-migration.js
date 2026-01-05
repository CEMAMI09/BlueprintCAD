// Run waiting list migration on Railway PostgreSQL
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:tLFAgWPCQGfGSZRRdXJAkgmlMKtThoam@tramway.proxy.rlwy.net:57466/railway';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting waiting list migration...\n');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create-waitlist-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('waiting_list', 'email_campaigns', 'email_campaign_recipients')
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Check indexes
    const indexes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('waiting_list', 'email_campaigns', 'email_campaign_recipients')
      ORDER BY tablename, indexname
    `);
    
    console.log('\n📑 Created indexes:');
    indexes.rows.forEach(row => {
      console.log(`   ✓ ${row.indexname}`);
    });
    
    console.log('\n✨ All done! Waiting list system is ready to use.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

