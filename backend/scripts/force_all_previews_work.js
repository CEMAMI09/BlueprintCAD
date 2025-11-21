// Usage: node scripts/force_all_previews_work.js
// This script will scan your server logs for all requested 3D file names and ensure each exists in uploads/.
// If a file is missing, it will create a small placeholder STL file with the correct name.

const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const LOG_FILE = path.join(__dirname, '..', 'server.log'); // Change if your log is elsewhere

// Minimal valid ASCII STL content for a placeholder
const PLACEHOLDER_STL = `solid placeholder\nendsolid placeholder\n`;

function extractRequestedFiles(logText) {
  const regex = /sanitizedFile: '([^']+\.stl)'/g;
  const found = new Set();
  let match;
  while ((match = regex.exec(logText))) {
    found.add(match[1]);
  }
  return Array.from(found);
}

function main() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
  }
  if (!fs.existsSync(LOG_FILE)) {
    console.error('Log file not found:', LOG_FILE);
    process.exit(1);
  }
  const logText = fs.readFileSync(LOG_FILE, 'utf8');
  const requestedFiles = extractRequestedFiles(logText);
  let created = 0;
  for (const filename of requestedFiles) {
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, PLACEHOLDER_STL);
      console.log('Created placeholder:', filename);
      created++;
    }
  }
  console.log(`\nDone. Placeholders created: ${created}`);
}

main();
