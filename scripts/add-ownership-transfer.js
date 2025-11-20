const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
  const db = await open({
    filename: path.join(process.cwd(), 'forge.db'),
    driver: sqlite3.Database
  });

  console.log('🔄 Adding ownership transfer system...\n');

  try {
    // Create ownership transfer requests table
    console.log('➕ Creating ownership_transfer_requests table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ownership_transfer_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('project', 'folder')),
        entity_id INTEGER NOT NULL,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'cancelled')),
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME,
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create ownership transfer history table
    console.log('➕ Creating ownership_transfer_history table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ownership_transfer_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('project', 'folder')),
        entity_id INTEGER NOT NULL,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        transferred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (from_user_id) REFERENCES users(id),
        FOREIGN KEY (to_user_id) REFERENCES users(id)
      )
    `);

    // Create indexes
    console.log('➕ Creating indexes...');
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transfer_requests_to_user ON ownership_transfer_requests(to_user_id, status);
      CREATE INDEX IF NOT EXISTS idx_transfer_requests_entity ON ownership_transfer_requests(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_transfer_history_entity ON ownership_transfer_history(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_transfer_history_users ON ownership_transfer_history(from_user_id, to_user_id);
    `);

    // Add owner_id column to folders if it doesn't exist (for consistency)
    console.log('➕ Checking folders table...');
    const folderColumns = await db.all(`PRAGMA table_info(folders)`);
    if (!folderColumns.some(c => c.name === 'owner_id')) {
      console.log('  Adding owner_id column to folders...');
      await db.exec(`ALTER TABLE folders ADD COLUMN owner_id INTEGER`);
      // Migrate existing data from user_id to owner_id
      await db.exec(`UPDATE folders SET owner_id = user_id WHERE owner_id IS NULL`);
      console.log('  ✅ Migrated existing folder ownership data');
    }

    // Stats
    const stats = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM ownership_transfer_requests WHERE status = 'pending') as pending_transfers,
        (SELECT COUNT(*) FROM ownership_transfer_history) as completed_transfers,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM folders) as total_folders
    `);

    console.log('\n📊 Migration Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Projects: ${stats.total_projects}`);
    console.log(`Total Folders: ${stats.total_folders}`);
    console.log(`Pending Transfers: ${stats.pending_transfers}`);
    console.log(`Completed Transfers: ${stats.completed_transfers}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await db.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
