const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'forge.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding follow request status column...\n');

db.serialize(() => {
  // Add status column to follows table (0 = pending, 1 = accepted)
  db.run(`
    ALTER TABLE follows ADD COLUMN status INTEGER DEFAULT 1
  `, (err) => {
    if (err) {
      console.error('Error adding status column:', err.message);
    } else {
      console.log('✓ Added status column to follows table');
      console.log('  - 0 = pending (awaiting approval)');
      console.log('  - 1 = accepted (default for existing follows)');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('\n✓ Migration completed successfully');
  }
});
