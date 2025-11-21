// Database migration to add email verification
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrateDatabase() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'forge.db'),
    driver: sqlite3.Database
  });

  console.log('Starting email verification migration...');

  try {
    await db.exec('BEGIN TRANSACTION');

    // Check existing columns in users table
    const columns = await db.all('PRAGMA table_info(users)');
    const columnNames = columns.map(col => col.name);

    console.log('Current columns:', columnNames);

    // Add email_verified column if it doesn't exist
    if (!columnNames.includes('email_verified')) {
      console.log('Adding email_verified column...');
      await db.exec('ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0');
      
      // Verify existing users (grandfather them in)
      console.log('Setting existing users as verified...');
      await db.exec('UPDATE users SET email_verified = 1 WHERE created_at < datetime("now")');
    }

    // Add verified_at column if it doesn't exist
    if (!columnNames.includes('verified_at')) {
      console.log('Adding verified_at column...');
      await db.exec('ALTER TABLE users ADD COLUMN verified_at DATETIME');
      
      // Set verified_at for existing verified users
      await db.exec('UPDATE users SET verified_at = created_at WHERE email_verified = 1 AND verified_at IS NULL');
    }

    // Check if verification_tokens table exists
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='verification_tokens'");
    
    if (tables.length === 0) {
      console.log('Creating verification_tokens table...');
      await db.exec(`
        CREATE TABLE verification_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          identifier TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          expires DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Add indexes
      console.log('Creating indexes on verification_tokens...');
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON verification_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON verification_tokens(identifier);
      `);
    } else {
      console.log('verification_tokens table already exists');
      
      // Check if user_id column exists
      const tokenColumns = await db.all('PRAGMA table_info(verification_tokens)');
      const tokenColumnNames = tokenColumns.map(col => col.name);
      
      if (!tokenColumnNames.includes('user_id')) {
        console.log('Adding user_id column to verification_tokens...');
        await db.exec('ALTER TABLE verification_tokens ADD COLUMN user_id INTEGER');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON verification_tokens(user_id)');
      }
    }

    // Create email_verification_attempts table for rate limiting
    console.log('Creating email_verification_attempts table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS email_verification_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        attempt_type TEXT NOT NULL CHECK(attempt_type IN ('send', 'verify')),
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Add indexes for rate limiting queries
    console.log('Creating indexes on email_verification_attempts...');
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_verification_attempts_user ON email_verification_attempts(user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_verification_attempts_email ON email_verification_attempts(email, created_at);
    `);

    await db.exec('COMMIT');
    console.log('✅ Email verification migration completed successfully!');

    // Show updated table structure
    const newColumns = await db.all('PRAGMA table_info(users)');
    console.log('\nUpdated users table structure:');
    console.table(newColumns.filter(col => col.name.includes('verified') || col.name === 'email'));

    const verificationTokensInfo = await db.all('PRAGMA table_info(verification_tokens)');
    console.log('\nVerification tokens table structure:');
    console.table(verificationTokensInfo);

    // Show count of verified vs unverified users
    const stats = await db.get('SELECT COUNT(*) as total, SUM(email_verified) as verified FROM users');
    console.log(`\n📊 Users: ${stats.total} total, ${stats.verified} verified, ${stats.total - stats.verified} unverified`);

  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

migrateDatabase().catch(console.error);
