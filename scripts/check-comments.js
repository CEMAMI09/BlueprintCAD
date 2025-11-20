const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
  const db = await open({
    filename: path.join(process.cwd(), 'forge.db'),
    driver: sqlite3.Database
  });

  const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%comment%'`);
  console.log('Comment-related tables:', tables);

  if (tables.some(t => t.name === 'comments')) {
    const schema = await db.all(`PRAGMA table_info(comments)`);
    console.log('\nComments table schema:', schema);
  }

  await db.close();
}

check();
