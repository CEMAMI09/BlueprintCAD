const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'forge.db');
const db = new sqlite3.Database(dbPath);

console.log('Creating recovery_tokens table...');

db.serialize(() => {
  // Create recovery_tokens table
  db.run(`
    CREATE TABLE IF NOT EXISTS recovery_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('password_reset', 'username_recovery')),
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating recovery_tokens table:', err);
    } else {
      console.log('✓ recovery_tokens table created');
    }
  });

  // Create index for faster token lookups
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_recovery_tokens_token 
    ON recovery_tokens(token) 
    WHERE used = 0
  `, (err) => {
    if (err) {
      console.error('Error creating token index:', err);
    } else {
      console.log('✓ Token index created');
    }
  });

  // Create index for cleanup queries
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_recovery_tokens_expires 
    ON recovery_tokens(expires_at)
  `, (err) => {
    if (err) {
      console.error('Error creating expires index:', err);
    } else {
      console.log('✓ Expires index created');
    }
  });

  console.log('\nMigration complete!');
  db.close();
});
