const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../forge.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding tier field to users table...\n');

db.serialize(() => {
  // Add tier column to users table if it doesn't exist
  db.run(`
    ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'free'
  `, (err) => {
    if (err) {
      if (err.message.includes('duplicate column')) {
        console.log('✅ Tier column already exists');
      } else {
        console.error('❌ Error adding tier column:', err);
      }
    } else {
      console.log('✅ Tier column added to users table');
    }
    
    db.close(() => {
      console.log('\n✅ Users table migration completed!');
    });
  });
});
