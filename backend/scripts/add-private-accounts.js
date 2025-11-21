const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'forge.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding private account support...');

db.serialize(() => {
  // Add profile_private column to users table
  db.run(`
    ALTER TABLE users ADD COLUMN profile_private INTEGER DEFAULT 0
  `, (err) => {
    if (err) {
      console.error('Error adding profile_private column:', err.message);
    } else {
      console.log('✓ Added profile_private column to users table');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('✓ Database migration completed successfully');
  }
});
