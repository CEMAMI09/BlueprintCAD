const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'forge.db');
const migrationPath = path.join(__dirname, '..', 'migrations', 'add_feature_trees.sql');

console.log('Running migration: add_feature_trees.sql');
console.log('Database:', dbPath);

try {
  const db = new Database(dbPath);
  const migration = fs.readFileSync(migrationPath, 'utf8');
  
  // Split by semicolons and execute each statement
  const statements = migration.split(';').filter(s => s.trim());
  
  statements.forEach(stmt => {
    if (stmt.trim()) {
      db.exec(stmt);
    }
  });
  
  db.close();
  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
