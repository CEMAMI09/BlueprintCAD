/**
 * Fix incorrect db import paths in pages/api
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Fix incorrect backend/lib/db imports to db/db
  { 
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/backend\/lib\/db\.js['"]/g, 
    replacement: "from '../../../db/db'" 
  },
  { 
    pattern: /from ['"]\.\.\/\.\.\/backend\/lib\/db\.js['"]/g, 
    replacement: "from '../../db/db'" 
  },
  { 
    pattern: /from ['"]\.\.\/backend\/lib\/db\.js['"]/g, 
    replacement: "from '../db/db'" 
  },
  { 
    pattern: /require\(['"]\.\.\/\.\.\/\.\.\/backend\/lib\/db\.js['"]/g, 
    replacement: "require('../../../db/db')" 
  },
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    replacements.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dir, extensions = ['.ts', '.tsx', '.js', '.jsx'], excludeDirs = ['node_modules', '.next']) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    if (excludeDirs.includes(item)) continue;
    
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...walkDir(fullPath, extensions, excludeDirs));
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

const files = walkDir('pages/api');
let totalUpdated = 0;

console.log('Fixing db import paths in pages/api...\n');

files.forEach(file => {
  if (updateFile(file)) {
    totalUpdated++;
    console.log(`  Updated: ${file}`);
  }
});

console.log(`\n✅ Total files updated: ${totalUpdated}`);

