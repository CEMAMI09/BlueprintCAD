// Grant admin access to a user
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:tLFAgWPCQGfGSZRRdXJAkgmlMKtThoam@tramway.proxy.rlwy.net:57466/railway';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function grantAdmin() {
  const username = process.argv[2];
  
  if (!username) {
    console.error('❌ Please provide a username:');
    console.log('   node grant-admin.js your-username');
    process.exit(1);
  }

  const client = await pool.connect();
  
  try {
    console.log(`🔄 Granting admin access to: ${username}\n`);
    
    // Check if user exists
    const userCheck = await client.query(
      'SELECT id, username, email, tier, is_admin FROM users WHERE username = $1',
      [username]
    );
    
    if (userCheck.rows.length === 0) {
      console.error(`❌ User "${username}" not found!`);
      process.exit(1);
    }
    
    const user = userCheck.rows[0];
    console.log(`📋 Current user info:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Tier: ${user.tier || 'free'}`);
    console.log(`   is_admin: ${user.is_admin || false}\n`);
    
    // Grant admin access
    await client.query(
      'UPDATE users SET is_admin = true WHERE username = $1',
      [username]
    );
    
    console.log('✅ Admin access granted successfully!\n');
    console.log('🎯 You can now:');
    console.log('   1. Log in to your account');
    console.log('   2. Visit /admin/email-campaigns');
    console.log('   3. Send mass emails to your waiting list\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

grantAdmin();

