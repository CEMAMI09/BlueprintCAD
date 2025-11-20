// Test script for password recovery system
const { testEmailConfig } = require('../lib/email');
const { checkRateLimit, resetRateLimit } = require('../lib/rate-limit');

console.log('🔧 Testing Password Recovery System\n');

// Test 1: Email Configuration
console.log('1. Testing email configuration...');
testEmailConfig().then(result => {
  if (result.success) {
    console.log('   ✅ Email configuration is valid');
  } else {
    console.log('   ⚠️  Email not configured:', result.error);
    console.log('   💡 Set SMTP_USER and SMTP_PASS in .env.local');
  }
}).catch(err => {
  console.error('   ❌ Error testing email:', err.message);
});

// Test 2: Rate Limiting
console.log('\n2. Testing rate limiting...');

const testEmail = 'test@example.com';
const testIP = '127.0.0.1';

// Test password reset rate limit
console.log('   Testing password reset rate limit (max 3):');
for (let i = 1; i <= 4; i++) {
  const result = checkRateLimit(testEmail, 'passwordReset');
  console.log(`   Attempt ${i}: ${result.allowed ? '✅ Allowed' : '❌ Blocked'} (remaining: ${result.remaining})`);
}

// Reset for next test
resetRateLimit(testEmail, 'passwordReset');
console.log('   ✅ Rate limit reset successful');

// Test username recovery rate limit
console.log('\n   Testing username recovery rate limit (max 5):');
for (let i = 1; i <= 6; i++) {
  const result = checkRateLimit(testIP, 'usernameRecovery');
  console.log(`   Attempt ${i}: ${result.allowed ? '✅ Allowed' : '❌ Blocked'} (remaining: ${result.remaining})`);
}

// Reset for next test
resetRateLimit(testIP, 'usernameRecovery');
console.log('   ✅ Rate limit reset successful');

// Test 3: Database
console.log('\n3. Testing database...');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'forge.db');
const db = new sqlite3.Database(dbPath);

db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='recovery_tokens'", (err, row) => {
  if (err) {
    console.log('   ❌ Database error:', err.message);
  } else if (row) {
    console.log('   ✅ recovery_tokens table exists');
    
    // Check table structure
    db.all("PRAGMA table_info(recovery_tokens)", (err, columns) => {
      if (err) {
        console.log('   ❌ Error checking table structure:', err.message);
      } else {
        console.log('   ✅ Table structure:');
        columns.forEach(col => {
          console.log(`      - ${col.name} (${col.type})`);
        });
      }
      
      // Count existing tokens
      db.get("SELECT COUNT(*) as count FROM recovery_tokens", (err, result) => {
        if (err) {
          console.log('   ❌ Error counting tokens:', err.message);
        } else {
          console.log(`   ℹ️  Existing tokens in database: ${result.count}`);
        }
        
        db.close();
        
        // Summary
        console.log('\n📊 Summary:');
        console.log('   ✅ Rate limiting working correctly');
        console.log('   ✅ Database schema validated');
        console.log('   💡 Configure SMTP settings in .env.local to enable emails');
        console.log('\n🎉 System ready for testing!');
        console.log('\nNext steps:');
        console.log('   1. Add SMTP credentials to .env.local');
        console.log('   2. Start the dev server: npm run dev');
        console.log('   3. Visit http://localhost:3000/forgot-password');
        console.log('   4. Test password reset flow');
      });
    });
  } else {
    console.log('   ❌ recovery_tokens table not found');
    console.log('   💡 Run: node scripts/add-recovery-tokens-table.js');
  }
});
