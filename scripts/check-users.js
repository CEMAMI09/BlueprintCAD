const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'forge.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking users in database...\n');

db.all(`SELECT id, username, email, profile_private FROM users LIMIT 10`, (err, rows) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Users found:', rows.length);
    rows.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user.id}, Private: ${user.profile_private})`);
    });
  }
  
  db.close();
});
