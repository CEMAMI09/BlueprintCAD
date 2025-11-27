const { getDb } = require('../db');

async function migrateDatabase() {
  const db = await getDb();
  console.log('Adding dismissed column to notifications table...');

  try {
    await db.exec('BEGIN TRANSACTION');

    // Check if dismissed column exists
    const columns = await db.all('PRAGMA table_info(notifications)');
    const hasDismissed = columns.some(col => col.name === 'dismissed');

    if (!hasDismissed) {
      await db.exec('ALTER TABLE notifications ADD COLUMN dismissed INTEGER DEFAULT 0');
      console.log('✅ Added dismissed column to notifications table');
    } else {
      console.log('✅ dismissed column already exists, skipping');
    }

    await db.exec('COMMIT');
    console.log('✅ Notification dismissed migration completed successfully!');
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

