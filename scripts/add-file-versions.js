// Migration script to add file version control
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('forge.db');

db.serialize(() => {
  console.log('Creating file_versions table...\n');

  // Create versions table
  db.run(`
    CREATE TABLE IF NOT EXISTS file_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      parent_version_id INTEGER,
      version_number INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      thumbnail_path TEXT,
      uploaded_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_current INTEGER DEFAULT 1,
      change_notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_version_id) REFERENCES file_versions(id) ON DELETE SET NULL,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating file_versions table:', err.message);
    } else {
      console.log('✓ Created file_versions table');
    }
  });

  // Add version tracking column to projects table
  db.run(`ALTER TABLE projects ADD COLUMN current_version_id INTEGER`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding current_version_id:', err.message);
    } else {
      console.log('✓ Added current_version_id to projects table');
    }
  });

  // Create index for faster version lookups
  db.run(`CREATE INDEX IF NOT EXISTS idx_file_versions_project ON file_versions(project_id)`, (err) => {
    if (err) {
      console.error('Error creating index:', err.message);
    } else {
      console.log('✓ Created index on file_versions');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('\n✅ File version control migration complete!');
  }
});
