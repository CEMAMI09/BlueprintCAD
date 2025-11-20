// Add messaging and notifications tables to database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'forge.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating messages table:', err);
    } else {
      console.log('✓ Messages table created/verified');
    }
  });

  // Create notifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      related_id INTEGER,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating notifications table:', err);
    } else {
      console.log('✓ Notifications table created/verified');
    }
  });

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`, (err) => {
    if (!err) console.log('✓ Messages sender index created');
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)`, (err) => {
    if (!err) console.log('✓ Messages receiver index created');
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`, (err) => {
    if (!err) console.log('✓ Notifications user index created');
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read)`, (err) => {
    if (!err) console.log('✓ Notifications read index created');
  });
});

db.close(() => {
  console.log('\n✅ Database migration completed!');
});
