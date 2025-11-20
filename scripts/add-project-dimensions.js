const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./forge.db');

db.serialize(() => {
  db.run('ALTER TABLE projects ADD COLUMN dimensions TEXT', (err) => {
    if (err && !err.message.includes('duplicate')) {
      console.error('❌ Error adding dimensions:', err);
    } else {
      console.log('✓ Added dimensions column');
    }
  });

  db.run('ALTER TABLE projects ADD COLUMN scale_percentage INTEGER DEFAULT 100', (err) => {
    if (err && !err.message.includes('duplicate')) {
      console.error('❌ Error adding scale_percentage:', err);
    } else {
      console.log('✓ Added scale_percentage column');
    }
  });

  db.run('ALTER TABLE projects ADD COLUMN weight_grams REAL', (err) => {
    if (err && !err.message.includes('duplicate')) {
      console.error('❌ Error adding weight_grams:', err);
    } else {
      console.log('✓ Added weight_grams column');
    }
  });

  db.run('ALTER TABLE projects ADD COLUMN print_time_hours REAL', (err) => {
    if (err && !err.message.includes('duplicate')) {
      console.error('❌ Error adding print_time_hours:', err);
    } else {
      console.log('✓ Added print_time_hours column');
    }
  });
});

db.close(() => {
  console.log('\n✅ Project dimensions and scaling columns added!');
});
