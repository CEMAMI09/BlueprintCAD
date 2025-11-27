const { getDb } = require('../db');

async function migrateDatabase() {
  const db = await getDb();
  console.log('Creating activity_log table...');

  try {
    await db.exec('BEGIN TRANSACTION');

    // Create activity_log table for comprehensive activity tracking
    await db.exec(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER,
        project_id INTEGER,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('folder', 'file', 'branch', 'member', 'role')),
        entity_id INTEGER,
        entity_name TEXT,
        details TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    await db.exec('CREATE INDEX IF NOT EXISTS idx_activity_log_folder ON activity_log(folder_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_activity_log_project ON activity_log(project_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action)');

    await db.exec('COMMIT');
    console.log('✅ Activity log table created successfully!');
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };

