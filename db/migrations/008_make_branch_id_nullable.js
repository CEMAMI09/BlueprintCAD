// Migration to make branch_id nullable in branch_notes table
// This allows notes to be added to folders without requiring a branch_id
const { getDb } = require('../db');

async function migrateDatabase() {
  const db = await getDb();

  console.log('Making branch_id nullable in branch_notes table...');

  try {
    await db.exec('BEGIN TRANSACTION');

    // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    // First, create a new table with the updated schema
    await db.exec(`
      CREATE TABLE IF NOT EXISTS branch_notes_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER,
        folder_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        note_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES file_branches(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Copy existing data
    await db.exec(`
      INSERT INTO branch_notes_new (id, branch_id, folder_id, user_id, note_text, created_at, updated_at)
      SELECT id, branch_id, folder_id, user_id, note_text, created_at, updated_at
      FROM branch_notes
    `);

    // Drop old table
    await db.exec('DROP TABLE branch_notes');

    // Rename new table
    await db.exec('ALTER TABLE branch_notes_new RENAME TO branch_notes');

    // Recreate indexes
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_branch_notes_branch_id ON branch_notes(branch_id);
      CREATE INDEX IF NOT EXISTS idx_branch_notes_folder_id ON branch_notes(folder_id);
    `);

    await db.exec('COMMIT');
    console.log('✅ Successfully made branch_id nullable in branch_notes table');
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

