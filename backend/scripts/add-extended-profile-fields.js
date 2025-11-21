// Migration script to add extended profile fields to users table
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(process.cwd(), 'db', 'forge.db'));

db.serialize(() => {
  console.log('Adding extended profile fields to users table...\n');

  // Add banner field
  db.run(`ALTER TABLE users ADD COLUMN banner TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding banner:', err.message);
    } else {
      console.log('✓ Added banner field');
    }
  });

  // Add location field
  db.run(`ALTER TABLE users ADD COLUMN location TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding location:', err.message);
    } else {
      console.log('✓ Added location field');
    }
  });

  // Add website field
  db.run(`ALTER TABLE users ADD COLUMN website TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding website:', err.message);
    } else {
      console.log('✓ Added website field');
    }
  });

  // Add social_links field (stored as JSON)
  db.run(`ALTER TABLE users ADD COLUMN social_links TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding social_links:', err.message);
    } else {
      console.log('✓ Added social_links field (JSON)');
    }
  });

  // Add visibility_options field (stored as JSON)
  db.run(`ALTER TABLE users ADD COLUMN visibility_options TEXT DEFAULT '{"showEmail":false,"showLocation":true,"showWebsite":true,"showSocial":true}'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding visibility_options:', err.message);
    } else {
      console.log('✓ Added visibility_options field (JSON)');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('\n✅ Migration complete!');
  }
});
