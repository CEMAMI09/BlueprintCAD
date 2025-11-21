const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'forge.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking users table schema...\n');

db.all(`PRAGMA table_info(users)`, (err, rows) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Current columns in users table:');
    rows.forEach(col => {
      console.log(`  - ${col.name} (${col.type}, default: ${col.dflt_value})`);
    });
    
    const hasPrivateColumn = rows.some(col => col.name === 'profile_private');
    console.log(`\nprofile_private column exists: ${hasPrivateColumn}`);
  }
  
  db.close();
});
