const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./forge.db');

db.serialize(() => {
  // Forum threads table
  db.run(`
    CREATE TABLE IF NOT EXISTS forum_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      views INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating forum_threads table:', err);
    } else {
      console.log('✓ Forum threads table created/verified');
    }
  });

  // Forum replies table
  db.run(`
    CREATE TABLE IF NOT EXISTS forum_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating forum_replies table:', err);
    } else {
      console.log('✓ Forum replies table created/verified');
    }
  });

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_forum_threads_user ON forum_threads(user_id)', (err) => {
    if (err) console.error('❌ Error creating threads user index:', err);
    else console.log('✓ Threads user index created');
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category)', (err) => {
    if (err) console.error('❌ Error creating threads category index:', err);
    else console.log('✓ Threads category index created');
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON forum_replies(thread_id)', (err) => {
    if (err) console.error('❌ Error creating replies thread index:', err);
    else console.log('✓ Replies thread index created');
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_forum_replies_user ON forum_replies(user_id)', (err) => {
    if (err) console.error('❌ Error creating replies user index:', err);
    else console.log('✓ Replies user index created');
  });
});

db.close((err) => {
  if (err) {
    console.error('❌ Error closing database:', err);
  } else {
    console.log('\n✅ Forum tables setup completed!');
  }
});
