const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../blueprint.db');
const db = new sqlite3.Database(dbPath);

console.log('Setting up CAD Editor user access...\n');

db.serialize(() => {
  // Step 1: Add tier column if it doesn't exist
  db.run(`ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'free'`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error adding tier column:', err);
      return;
    }
    console.log('✅ Tier column ready');

    // Step 2: Update Cody's account to enterprise tier
    db.run(`UPDATE users SET tier = 'enterprise' WHERE email = 'codyemami@gmail.com'`, function(err) {
      if (err) {
        console.error('❌ Error updating user tier:', err);
        return;
      }
      
      if (this.changes > 0) {
        console.log('✅ User codyemami@gmail.com set to enterprise tier');
        
        // Verify the update
        db.get(`SELECT username, email, tier FROM users WHERE email = 'codyemami@gmail.com'`, (err, row) => {
          if (err) {
            console.error('❌ Error verifying update:', err);
          } else if (row) {
            console.log('\n✅ Verified user details:');
            console.log(`   Username: ${row.username}`);
            console.log(`   Email: ${row.email}`);
            console.log(`   Tier: ${row.tier}`);
            console.log('\n🎉 CAD Editor setup complete! User has full enterprise access.');
          } else {
            console.log('⚠️ User not found. They may need to register first.');
          }
          
          db.close();
        });
      } else {
        console.log('⚠️ User with email codyemami@gmail.com not found.');
        console.log('   Please register an account first, then run this script again.');
        db.close();
      }
    });
  });
});
