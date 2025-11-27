// Migration script to add subscription system to database
const { getDb } = require('../db');

async function migrateDatabase() {
  // Use the same database initialization as the main app
  const db = await getDb();

  console.log('Starting subscription system migration...');

  try {
    // Ensure users table exists first (it should from main initSchema)
    const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (!tableCheck) {
      console.log('Users table does not exist. Initializing schema first...');
      // The main db.js should have already created it, but if not, we'll create basic structure
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          bio TEXT,
          avatar TEXT,
          profile_picture TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    await db.exec('BEGIN TRANSACTION');

    // Check existing columns in users table
    const userColumns = await db.all('PRAGMA table_info(users)');
    const userColumnNames = userColumns.map(col => col.name);

    // Add subscription columns to users table
    const subscriptionColumns = [
      { name: 'subscription_tier', type: 'TEXT DEFAULT "free"', defaultValue: 'free' },
      { name: 'subscription_status', type: 'TEXT DEFAULT "active"', defaultValue: 'active' },
      { name: 'subscription_starts_at', type: 'DATETIME', defaultValue: null },
      { name: 'subscription_ends_at', type: 'DATETIME', defaultValue: null },
      { name: 'stripe_customer_id', type: 'TEXT', defaultValue: null },
      { name: 'stripe_subscription_id', type: 'TEXT', defaultValue: null },
      { name: 'storage_limit_gb', type: 'INTEGER DEFAULT 1', defaultValue: 1 },
      { name: 'storage_used_gb', type: 'REAL DEFAULT 0', defaultValue: 0 }
    ];

    for (const col of subscriptionColumns) {
      if (!userColumnNames.includes(col.name)) {
        console.log(`Adding ${col.name} column...`);
        await db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        if (col.defaultValue !== null) {
          await db.exec(`UPDATE users SET ${col.name} = ? WHERE ${col.name} IS NULL`, [col.defaultValue]);
        }
      }
    }

    // Create subscriptions table
    console.log('Creating subscriptions table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tier TEXT NOT NULL,
        status TEXT NOT NULL,
        stripe_subscription_id TEXT UNIQUE,
        stripe_customer_id TEXT,
        current_period_start DATETIME,
        current_period_end DATETIME,
        cancel_at_period_end INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create subscription_usage table
    console.log('Creating subscription_usage table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS subscription_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        feature TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        limit_count INTEGER,
        reset_period TEXT,
        last_reset DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, feature)
      )
    `);

    // Create subscription_history table
    console.log('Creating subscription_history table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS subscription_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        from_tier TEXT,
        to_tier TEXT,
        change_type TEXT,
        stripe_event_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    console.log('Creating indexes...');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_subscription_usage_user ON subscription_usage(user_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id)');

    await db.exec('COMMIT');
    console.log('✅ Subscription system migration completed successfully!');

  } catch (error) {
    try {
      await db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
    console.error('❌ Migration failed:', error);
    throw error;
  }
  // Don't close db - it's a shared connection
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

