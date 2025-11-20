const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'forge.db');
const db = new sqlite3.Database(dbPath);

// First check if table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='issues'", (err, row) => {
  if (err) {
    console.error('Error checking table:', err);
    return;
  }
  
  if (row) {
    console.log('✅ Issues table already exists');
    db.close();
    return;
  }
  
  console.log('Creating issues table...\n');
  
  db.serialize(() => {
    // Create issues table
    db.run(`
      CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        email TEXT,
        issue_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        screenshot_path TEXT,
        browser_info TEXT,
        user_agent TEXT,
        url TEXT,
        status TEXT DEFAULT 'open',
        assigned_to INTEGER,
        admin_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id)
      )
    `, (err) => {
      if (err) {
        console.error('❌ Error creating issues table:', err);
      } else {
        console.log('✅ Issues table created');
      }
    });

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id)`, (err) => {
      if (err) {
        console.error('❌ Error creating user_id index:', err);
      } else {
        console.log('✅ Index on user_id created');
      }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status)`, (err) => {
      if (err) {
        console.error('❌ Error creating status index:', err);
      } else {
        console.log('✅ Index on status created');
      }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_issues_assigned_to ON issues(assigned_to)`, (err) => {
      if (err) {
        console.error('❌ Error creating assigned_to index:', err);
      } else {
        console.log('✅ Index on assigned_to created');
        db.close(() => {
          console.log('\n✅ Issues migration completed successfully!');
        });
      }
    });
  });
});
