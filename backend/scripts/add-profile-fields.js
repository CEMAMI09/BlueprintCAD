const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(process.cwd(), 'db', 'forge.db'));

db.serialize(() => {
  db.run('ALTER TABLE users ADD COLUMN profile_picture TEXT', (err) => {
    if (err && !err.message.includes('duplicate')) {
      console.error('❌ Error adding profile_picture:', err);
    } else {
      console.log('✓ Added profile_picture column');
    }
  });

  db.run('ALTER TABLE users ADD COLUMN bio TEXT', (err) => {
    if (err && !err.message.includes('duplicate')) {
      console.error('❌ Error adding bio:', err);
    } else {
      console.log('✓ Added bio column');
    }
  });
});

db.close(() => {
  console.log('\n✅ Profile fields migration complete!');
});
