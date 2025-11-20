// Check and create follows table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'forge.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create follows table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id),
      FOREIGN KEY (following_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating follows table:', err);
    } else {
      console.log('✓ Follows table created/verified');
    }
  });

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`, (err) => {
    if (!err) console.log('✓ Follower index created');
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`, (err) => {
    if (!err) console.log('✓ Following index created');
  });
});

db.close(() => {
  console.log('\n✅ Follows table setup completed!');
});
