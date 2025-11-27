// Migration script to add share_links table
const { getDb } = require('../db');

async function migrateDatabase() {
  const db = await getDb();

  console.log('Creating share_links table...');

  try {
    await db.exec('BEGIN TRANSACTION');

    // Create share_links table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS share_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link_token TEXT UNIQUE NOT NULL,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('project', 'folder')),
        entity_id INTEGER NOT NULL,
        created_by INTEGER NOT NULL,
        link_type TEXT NOT NULL DEFAULT 'public' CHECK(link_type IN ('public', 'password', 'expiring')),
        password_hash TEXT,
        expires_at DATETIME,
        view_only INTEGER DEFAULT 0,
        download_blocked INTEGER DEFAULT 0,
        access_count INTEGER DEFAULT 0,
        last_accessed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await db.exec('CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(link_token)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_share_links_entity ON share_links(entity_type, entity_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_share_links_created_by ON share_links(created_by)');

    await db.exec('COMMIT');
    console.log('✅ Share links table created successfully!');

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

