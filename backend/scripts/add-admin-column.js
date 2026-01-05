// Add is_admin column to users table if it doesn't exist
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:tLFAgWPCQGfGSZRRdXJAkgmlMKtThoam@tramway.proxy.rlwy.net:57466/railway';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function addAdminColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Checking for is_admin column...\n');
    
    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'is_admin'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ is_admin column already exists!\n');
    } else {
      console.log('➕ Adding is_admin column...\n');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN is_admin BOOLEAN DEFAULT false
      `);
      console.log('✅ is_admin column added successfully!\n');
    }
    
    // Also ensure email_verified exists
    const emailVerifiedCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'email_verified'
    `);
    
    if (emailVerifiedCheck.rows.length === 0) {
      console.log('➕ Adding email_verified column...\n');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN email_verified BOOLEAN DEFAULT false
      `);
      console.log('✅ email_verified column added!\n');
    } else {
      console.log('✅ email_verified column already exists!\n');
    }
    
    // Show current admin users
    const adminUsers = await client.query(`
      SELECT id, username, email, tier, is_admin 
      FROM users 
      WHERE is_admin = true OR tier = 'enterprise'
      ORDER BY username
    `);
    
    if (adminUsers.rows.length > 0) {
      console.log('👑 Current admin users:');
      adminUsers.rows.forEach(user => {
        console.log(`   - ${user.username} (${user.email}) - Tier: ${user.tier}, is_admin: ${user.is_admin}`);
      });
    } else {
      console.log('ℹ️  No admin users found. Grant admin access with:');
      console.log('   UPDATE users SET is_admin = true WHERE username = \'your-username\';');
      console.log('   OR');
      console.log('   UPDATE users SET tier = \'enterprise\' WHERE username = \'your-username\';');
    }
    
    console.log('\n✨ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addAdminColumn();

