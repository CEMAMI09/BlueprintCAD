// Using CommonJS require so both .js and .ts API routes can import without transpile mismatches
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db = null;

async function initSchema(database) {
  // Wrap in a transaction to avoid partial creation on errors
  await database.exec('BEGIN');
  try {
    // 1) Create base tables
    await database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        bio TEXT,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        parent_id INTEGER,
        is_team_folder BOOLEAN DEFAULT 0,
        color TEXT DEFAULT '#3b82f6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS folder_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'editor', 'viewer')),
        invited_by INTEGER,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(folder_id, user_id),
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        folder_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        file_type TEXT,
        tags TEXT,
        is_public BOOLEAN DEFAULT 1,
        for_sale BOOLEAN DEFAULT 0,
        price DECIMAL(10,2),
        ai_estimate TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS folder_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS folder_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER NOT NULL,
        project_id INTEGER,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folder_comments(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS folder_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER NOT NULL,
        invited_user_id INTEGER NOT NULL,
        invited_by INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'editor', 'viewer')),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS follows (
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cad_assemblies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        folder_id INTEGER,
        author_id INTEGER NOT NULL,
        version INTEGER DEFAULT 1,
        description TEXT,
        tags TEXT,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cad_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        folder_id INTEGER,
        version INTEGER DEFAULT 1,
        thumbnail TEXT,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
      );
    `);
    
    // 2) Lightweight migrations for legacy DBs missing newer columns
    const columns = await database.all(`PRAGMA table_info(projects)`);
    const hasFolderId = columns.some((c) => c.name === 'folder_id');
    if (!hasFolderId) {
      await database.exec(`
        ALTER TABLE projects ADD COLUMN folder_id INTEGER;
      `);
    }
    const hasThumbnailPath = columns.some((c) => c.name === 'thumbnail_path');
    if (!hasThumbnailPath) {
      await database.exec(`
        ALTER TABLE projects ADD COLUMN thumbnail_path TEXT;
      `);
    }

    // 3) Create indexes after migrations succeed
    await database.exec(`
      CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders(owner_id);
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_folder_members_user ON folder_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_id);
      CREATE INDEX IF NOT EXISTS idx_folder_activity_folder ON folder_activity(folder_id);
      CREATE INDEX IF NOT EXISTS idx_folder_invitations_user ON folder_invitations(invited_user_id);
      CREATE INDEX IF NOT EXISTS idx_folder_comments_folder ON folder_comments(folder_id);
      CREATE INDEX IF NOT EXISTS idx_folder_comments_parent ON folder_comments(parent_id);
    `);
    await database.exec('COMMIT');
  } catch (err) {
    console.error('DB schema init failed, rolling back', err);
    await database.exec('ROLLBACK');
    throw err;
  }
}

async function getDb() {
  if (!db) {
    db = await open({
      filename: path.join(process.cwd(), 'db', 'blueprint.db'),
      driver: sqlite3.Database
    });
    await initSchema(db);
  }
  return db;
}

module.exports = { getDb };