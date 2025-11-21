const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../forge.db');
const db = new sqlite3.Database(dbPath);

console.log('Creating CAD editor tables...\n');

db.serialize(() => {
  // CAD files table
  db.run(`
    CREATE TABLE IF NOT EXISTS cad_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      thumbnail_path TEXT,
      version INTEGER DEFAULT 1,
      is_draft BOOLEAN DEFAULT 0,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating cad_files table:', err);
    } else {
      console.log('✅ cad_files table created');
    }
  });

  // CAD file versions table
  db.run(`
    CREATE TABLE IF NOT EXISTS cad_file_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cad_file_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      changes_description TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cad_file_id) REFERENCES cad_files(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating cad_file_versions table:', err);
    } else {
      console.log('✅ cad_file_versions table created');
    }
  });

  // CAD sessions table (for collaboration)
  db.run(`
    CREATE TABLE IF NOT EXISTS cad_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cad_file_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      cursor_position TEXT,
      selection TEXT,
      is_active BOOLEAN DEFAULT 1,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cad_file_id) REFERENCES cad_files(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating cad_sessions table:', err);
    } else {
      console.log('✅ cad_sessions table created');
    }
  });

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_cad_files_user_id ON cad_files(user_id)`, (err) => {
    if (err) console.error('❌ Error creating user_id index:', err);
    else console.log('✅ Index on cad_files.user_id created');
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_cad_files_project_id ON cad_files(project_id)`, (err) => {
    if (err) console.error('❌ Error creating project_id index:', err);
    else console.log('✅ Index on cad_files.project_id created');
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_cad_file_versions_cad_file_id ON cad_file_versions(cad_file_id)`, (err) => {
    if (err) console.error('❌ Error creating cad_file_id index:', err);
    else console.log('✅ Index on cad_file_versions.cad_file_id created');
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_cad_sessions_cad_file_id ON cad_sessions(cad_file_id)`, (err) => {
    if (err) {
      console.error('❌ Error creating cad_sessions index:', err);
    } else {
      console.log('✅ Index on cad_sessions.cad_file_id created');
      db.close(() => {
        console.log('\n✅ CAD editor migration completed successfully!');
      });
    }
  });
});
