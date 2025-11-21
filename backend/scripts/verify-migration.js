const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function verify() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'forge.db'),
    driver: sqlite3.Database
  });

  console.log('📋 Verifying Migration...\n');

  // Check project columns
  console.log('Projects Table Columns:');
  const projectColumns = await db.all(`PRAGMA table_info(projects)`);
  projectColumns.forEach(col => {
    if (['slug', 'original_title'].includes(col.name)) {
      console.log(`  ✓ ${col.name} (${col.type})`);
    }
  });

  // Check folder columns
  console.log('\nFolders Table Columns:');
  const folderColumns = await db.all(`PRAGMA table_info(folders)`);
  folderColumns.forEach(col => {
    if (['slug', 'original_name'].includes(col.name)) {
      console.log(`  ✓ ${col.name} (${col.type})`);
    }
  });

  // Check history table
  console.log('\nHistory Table:');
  const tables = await db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='rename_move_history'`);
  if (tables.length > 0) {
    console.log('  ✓ rename_move_history table exists');
  }

  // Sample data
  console.log('\nSample Project Slugs:');
  const projects = await db.all('SELECT id, title, slug FROM projects LIMIT 3');
  projects.forEach(p => {
    console.log(`  ${p.id}. "${p.title}" → ${p.slug}`);
  });

  console.log('\nSample Folder Slugs:');
  const folders = await db.all('SELECT id, name, slug FROM folders LIMIT 3');
  folders.forEach(f => {
    console.log(`  ${f.id}. "${f.name}" → ${f.slug}`);
  });

  await db.close();
}

verify();
