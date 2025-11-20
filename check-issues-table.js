const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'forge.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Issues Table Structure ===\n');

db.all('PRAGMA table_info(issues)', (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }
  
  if (!rows || rows.length === 0) {
    console.log('❌ Issues table does not exist');
    db.close();
    return;
  }
  
  console.log('✅ Issues table exists with columns:');
  rows.forEach(r => {
    console.log(`  - ${r.name.padEnd(20)} ${r.type}`);
  });
  
  // Check indexes
  db.all("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='issues'", (err2, indexes) => {
    if (err2) {
      console.error('❌ Error checking indexes:', err2);
    } else {
      console.log('\n✅ Indexes:');
      indexes.forEach(idx => {
        console.log(`  - ${idx.name}`);
      });
    }
    
    // Count existing issues
    db.get('SELECT COUNT(*) as count FROM issues', (err3, countRow) => {
      if (err3) {
        console.error('❌ Error counting issues:', err3);
      } else {
        console.log(`\n📊 Total issues in database: ${countRow.count}`);
      }
      
      db.close();
      console.log('\n✅ Database check complete!');
    });
  });
});
