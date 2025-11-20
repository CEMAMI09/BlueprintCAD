// Script to clean up filenames in uploads/ and update the database accordingly
// Run with: node scripts/fix-uploaded-filenames.js

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const uploadsDir = path.join(process.cwd(), 'uploads');
const dbPath = path.join(process.cwd(), 'blueprint.db');

const db = new sqlite3.Database(dbPath);

function cleanFilename(filename) {
  // Remove leading/trailing spaces, commas, and any non-path characters
  return filename.replace(/^[^\w/]+/, '').replace(/[^\w.\-/]+/g, '');
}

function fixFilesAndDb() {
  fs.readdirSync(uploadsDir).forEach((file) => {
    const clean = cleanFilename(file);
    if (file !== clean) {
      const oldPath = path.join(uploadsDir, file);
      const newPath = path.join(uploadsDir, clean);
      if (!fs.existsSync(newPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed: '${file}' -> '${clean}'`);
      }
      // Update all references in the database
      db.run('UPDATE projects SET file_path = ? WHERE file_path = ?', [clean, file], function(err) {
        if (err) console.error('DB update error:', err);
      });
      db.run('UPDATE file_versions SET file_path = ? WHERE file_path = ?', [clean, file], function(err) {
        if (err) console.error('DB update error:', err);
      });
    }
  });
  db.close();
  console.log('Filename and database cleanup complete.');
}

fixFilesAndDb();
