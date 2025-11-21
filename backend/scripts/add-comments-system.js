const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'forge.db'),
    driver: sqlite3.Database
  });

  console.log('🔄 Adding comments and annotations system...\n');

  try {
    // Check if old comments table exists and rename it
    const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='comments'`);
    if (tables.length > 0) {
      const columns = await db.all(`PRAGMA table_info(comments)`);
      const hasEntityType = columns.some(c => c.name === 'entity_type');
      
      if (!hasEntityType) {
        console.log('➕ Backing up old comments table...');
        await db.exec(`ALTER TABLE comments RENAME TO comments_old`);
      }
    }

    // Create comments table with threading support
    console.log('➕ Creating new comments table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('project', 'folder')),
        entity_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        parent_id INTEGER,
        is_annotation BOOLEAN DEFAULT 0,
        annotation_data TEXT,
        edited BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    // Migrate old comments if they exist
    const oldTable = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='comments_old'`);
    if (oldTable.length > 0) {
      console.log('➕ Migrating old comments...');
      await db.exec(`
        INSERT INTO comments (content, entity_type, entity_id, user_id, created_at)
        SELECT content, 'project', project_id, user_id, created_at
        FROM comments_old
      `);
      const migrated = await db.get('SELECT COUNT(*) as count FROM comments');
      console.log(`✅ Migrated ${migrated.count} comments from old table`);
    }

    // Create comment mentions table for @user notifications
    console.log('➕ Creating comment_mentions table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS comment_mentions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comment_id INTEGER NOT NULL,
        mentioned_user_id INTEGER NOT NULL,
        notified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(comment_id, mentioned_user_id)
      )
    `);

    // Create comment reactions table (optional: for likes, etc.)
    console.log('➕ Creating comment_reactions table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS comment_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comment_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        reaction_type TEXT NOT NULL CHECK(reaction_type IN ('like', 'helpful', 'love')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(comment_id, user_id, reaction_type)
      )
    `);

    // Create indexes for performance
    console.log('➕ Creating indexes...');
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON comment_mentions(mentioned_user_id);
      CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON comment_mentions(comment_id);
      CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);
    `);

    // Update notifications table to support comment notifications
    console.log('➕ Updating notifications table...');
    const notifColumns = await db.all(`PRAGMA table_info(notifications)`);
    if (!notifColumns.some(c => c.name === 'comment_id')) {
      try {
        await db.exec(`ALTER TABLE notifications ADD COLUMN comment_id INTEGER`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_comment ON notifications(comment_id)`);
      } catch (err) {
        console.log('⚠️  Notifications table update skipped (may not exist yet)');
      }
    }

    // Stats
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_comments,
        SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END) as root_comments,
        SUM(CASE WHEN parent_id IS NOT NULL THEN 1 ELSE 0 END) as replies,
        SUM(CASE WHEN is_annotation = 1 THEN 1 ELSE 0 END) as annotations
      FROM comments
    `);

    console.log('\n📊 Migration Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Comments: ${stats.total_comments}`);
    console.log(`Root Comments: ${stats.root_comments}`);
    console.log(`Replies: ${stats.replies}`);
    console.log(`Annotations: ${stats.annotations}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await db.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
