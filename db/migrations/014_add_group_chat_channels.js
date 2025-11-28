// Migration script to add group chat channels tables
const { getDb } = require('../db');

async function migrateDatabase() {
  const db = await getDb();

  console.log('Creating group chat channels tables...');

  try {
    await db.exec('BEGIN TRANSACTION');

    // Create chat_channels table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_by INTEGER NOT NULL,
        is_private INTEGER DEFAULT 0,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create channel_members table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS channel_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_read_at DATETIME,
        UNIQUE(channel_id, user_id),
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create channel_messages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS channel_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        reply_to_id INTEGER,
        edited_at DATETIME,
        deleted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to_id) REFERENCES channel_messages(id) ON DELETE SET NULL
      )
    `);

    // Create message_attachments table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        mime_type TEXT,
        thumbnail_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES channel_messages(id) ON DELETE CASCADE
      )
    `);

    // Create message_read_receipts table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS message_read_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id),
        FOREIGN KEY (message_id) REFERENCES channel_messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await db.exec('CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id ON channel_messages(channel_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_channel_messages_user_id ON channel_messages(user_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_channel_messages_created_at ON channel_messages(created_at)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON message_read_receipts(user_id)');

    await db.exec('COMMIT');
    console.log('✅ Group chat channels tables created successfully!');

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

