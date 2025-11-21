const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(process.cwd(), 'db', 'forge.db'));

const columns = [
  ['banner', 'TEXT'],
  ['location', 'TEXT'],
  ['website', 'TEXT'],
  ['social_links', "TEXT DEFAULT '{}'"],
  ['visibility_options', "TEXT DEFAULT '{\"showEmail\":false,\"showLocation\":true,\"showWebsite\":true,\"showSocial\":true}'"],
  ['profile_private', 'BOOLEAN DEFAULT 0']
];

let completed = 0;

console.log('🔄 Adding profile columns to users table...\n');

columns.forEach(([name, type]) => {
  db.run(`ALTER TABLE users ADD COLUMN ${name} ${type}`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error(`❌ Error adding ${name}:`, err.message);
    } else if (!err) {
      console.log(`✅ Added ${name}`);
    } else {
      console.log(`ℹ️  ${name} already exists`);
    }
    
    completed++;
    if (completed === columns.length) {
      console.log('\n✅ Migration complete!');
      db.close();
    }
  });
});
