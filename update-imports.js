/**
 * Script to update import paths after reorganization
 * Run with: node update-imports.js
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Update lib imports to backend/lib
  { from: /from ['"]@\/lib\//g, to: "from '@/backend/lib/" },
  { from: /from ['"]\.\.\/lib\//g, to: "from '../../backend/lib/" },
  { from: /from ['"]\.\.\/\.\.\/lib\//g, to: "from '../../../backend/lib/" },
  { from: /from ['"]\.\.\/\.\.\/\.\.\/lib\//g, to: "from '../../../../backend/lib/" },
  { from: /require\(['"]@\/lib\//g, to: "require('@/backend/lib/" },
  { from: /require\(['"]\.\.\/lib\//g, to: "require('../../backend/lib/" },
  
  // Update db imports to db/
  { from: /from ['"]@\/lib\/db['"]/g, to: "from '@/db/db'" },
  { from: /from ['"]\.\.\/lib\/db['"]/g, to: "from '../../db/db'" },
  { from: /from ['"]\.\.\/\.\.\/lib\/db['"]/g, to: "from '../../../db/db'" },
  { from: /require\(['"]@\/lib\/db['"]/g, to: "require('@/db/db')" },
  { from: /require\(['"]\.\.\/lib\/db['"]/g, to: "require('../../db/db')" },
  
  // Update components imports to frontend/components
  { from: /from ['"]@\/components\//g, to: "from '@/frontend/components/" },
  { from: /from ['"]\.\.\/components\//g, to: "from '../../frontend/components/" },
  { from: /from ['"]\.\.\/\.\.\/components\//g, to: "from '../../../frontend/components/" },
  
  // Update types imports to frontend/types
  { from: /from ['"]@\/types\//g, to: "from '@/frontend/types/" },
  
  // Update storage paths
  { from: /uploads\//g, to: "storage/uploads/" },
  { from: /temp\//g, to: "storage/temp/" },
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    replacements.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...walkDir(fullPath, extensions));
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Update files in app/, pages/, and other directories
const directories = ['app', 'pages', 'components', 'lib'];
let totalUpdated = 0;

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = walkDir(dir);
    files.forEach(file => {
      if (updateFile(file)) {
        totalUpdated++;
      }
    });
  }
});

console.log(`\nTotal files updated: ${totalUpdated}`);

