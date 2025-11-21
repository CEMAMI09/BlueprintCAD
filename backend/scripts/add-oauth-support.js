// Database migration to add OAuth support
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrateDatabase() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'forge.db'),
    driver: sqlite3.Database
  });

  console.log('Starting OAuth migration...');

  try {
    await db.exec('BEGIN TRANSACTION');

    // Check existing columns in users table
    const columns = await db.all('PRAGMA table_info(users)');
    const columnNames = columns.map(col => col.name);

    console.log('Existing columns:', columnNames);

    // Add OAuth-related columns to users table if they don't exist
    // Note: SQLite doesn't support UNIQUE constraint in ALTER TABLE, so we add it without UNIQUE
    // and create a unique index separately
    if (!columnNames.includes('oauth_google_id')) {
      console.log('Adding oauth_google_id column...');
      await db.exec('ALTER TABLE users ADD COLUMN oauth_google_id TEXT');
    }

    if (!columnNames.includes('oauth_github_id')) {
      console.log('Adding oauth_github_id column...');
      await db.exec('ALTER TABLE users ADD COLUMN oauth_github_id TEXT');
    }

    if (!columnNames.includes('oauth_providers')) {
      console.log('Adding oauth_providers column...');
      await db.exec("ALTER TABLE users ADD COLUMN oauth_providers TEXT DEFAULT '[]'");
    }

    // Create accounts table for multi-provider linking (NextAuth standard)
    console.log('Creating accounts table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_account_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create sessions table for NextAuth
    console.log('Creating sessions table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_token TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        expires DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create verification tokens table for email verification
    console.log('Creating verification_tokens table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires DATETIME NOT NULL,
        PRIMARY KEY (identifier, token)
      )
    `);

    // Create indexes for performance and unique constraints
    console.log('Creating indexes...');
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider, provider_account_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_google ON users(oauth_google_id) WHERE oauth_google_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_github ON users(oauth_github_id) WHERE oauth_github_id IS NOT NULL;
    `);

    // Make password column nullable for OAuth-only users
    // SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
    console.log('Checking if password needs to be made nullable...');
    const passwordColumn = columns.find(col => col.name === 'password');
    if (passwordColumn && passwordColumn.notnull === 1) {
      console.log('Making password column nullable for OAuth-only users...');
      
      // Create a new table with the updated schema
      await db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          bio TEXT,
          avatar TEXT,
          profile_picture TEXT,
          oauth_google_id TEXT UNIQUE,
          oauth_github_id TEXT UNIQUE,
          oauth_providers TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Copy data from old table to new table
      await db.exec(`
        INSERT INTO users_new (id, username, email, password, bio, avatar, profile_picture, oauth_google_id, oauth_github_id, oauth_providers, created_at)
        SELECT id, username, email, password, bio, avatar, 
               COALESCE(profile_picture, avatar) as profile_picture,
               oauth_google_id, oauth_github_id, 
               COALESCE(oauth_providers, '[]') as oauth_providers,
               created_at
        FROM users
      `);

      // Drop old table and rename new one
      await db.exec('DROP TABLE users');
      await db.exec('ALTER TABLE users_new RENAME TO users');

      console.log('Successfully updated users table schema');
    }

    await db.exec('COMMIT');
    console.log('✅ OAuth migration completed successfully!');

    // Show current table structure
    const newColumns = await db.all('PRAGMA table_info(users)');
    console.log('\nUpdated users table structure:');
    console.table(newColumns);

    const accountsInfo = await db.all('PRAGMA table_info(accounts)');
    console.log('\nAccounts table structure:');
    console.table(accountsInfo);

  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

migrateDatabase().catch(console.error);
