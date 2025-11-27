const { getDb } = require('../db');

async function migrateDatabase() {
  const db = await getDb();
  console.log('Creating analytics tracking tables...');

  try {
    await db.exec('BEGIN TRANSACTION');

    // Create project_views table for detailed view tracking
    await db.exec(`
      CREATE TABLE IF NOT EXISTS project_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        referrer TEXT,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create project_downloads table for download tracking
    await db.exec(`
      CREATE TABLE IF NOT EXISTS project_downloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER,
        order_id INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for better query performance
    await db.exec('CREATE INDEX IF NOT EXISTS idx_project_views_project ON project_views(project_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_project_views_date ON project_views(viewed_at)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_project_downloads_project ON project_downloads(project_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_project_downloads_date ON project_downloads(downloaded_at)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_project_downloads_order ON project_downloads(order_id)');

    await db.exec('COMMIT');
    console.log('✅ Analytics tracking tables created successfully!');
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

