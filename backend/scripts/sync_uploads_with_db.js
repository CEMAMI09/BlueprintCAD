// Usage: node scripts/sync_uploads_with_db.js
// This script will scan the DB for all expected file paths and try to match/rename files in uploads/ to fix mismatches.

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const DB_PATH = path.join(__dirname, '..', 'db.sqlite'); // Adjust if your DB is elsewhere

function normalizeName(name) {
  // Remove all non-alphanumeric chars except dot and dash, and lowercase
  return name.replace(/[^\w.\-]/g, '').toLowerCase();
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('DB not found at', DB_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error('Uploads dir not found at', UPLOADS_DIR);
    process.exit(1);
  }

  const db = new sqlite3.Database(DB_PATH);
  db.all('SELECT file_path FROM projects WHERE file_path IS NOT NULL', [], (err, rows) => {
    if (err) throw err;
    const expectedFiles = rows.map(r => r.file_path);
    const uploadFiles = fs.readdirSync(UPLOADS_DIR);
    const normalizedUploads = Object.fromEntries(uploadFiles.map(f => [normalizeName(f), f]));

    let renamed = 0;
    let missing = 0;
    for (const expected of expectedFiles) {
      const expectedPath = path.join(UPLOADS_DIR, expected);
      if (fs.existsSync(expectedPath)) continue; // Already present
      // Try to find a close match
      const norm = normalizeName(expected);
      if (normalizedUploads[norm]) {
        // Rename file
        const oldPath = path.join(UPLOADS_DIR, normalizedUploads[norm]);
        fs.renameSync(oldPath, expectedPath);
        console.log(`Renamed: ${normalizedUploads[norm]} -> ${expected}`);
        renamed++;
      } else {
        console.warn(`Missing: ${expected}`);
        missing++;
      }
    }
    console.log(`\nDone. Renamed: ${renamed}, Still missing: ${missing}`);
    db.close();
  });
}

main();
