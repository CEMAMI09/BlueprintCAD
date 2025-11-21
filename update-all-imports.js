/**
 * Comprehensive script to update all import paths after reorganization
 * Run with: node update-all-imports.js
 */

const fs = require('fs');
const path = require('path');

// Define all replacement patterns
const replacements = [
  // Update @/lib/db to @/db/db
  { pattern: /from ['"]@\/lib\/db['"]/g, replacement: "from '@/db/db'" },
  { pattern: /require\(['"]@\/lib\/db['"]/g, replacement: "require('@/db/db')" },
  
  // Update @/lib/* to @/backend/lib/*
  { pattern: /from ['"]@\/lib\/([^'"]+)['"]/g, replacement: "from '@/backend/lib/$1'" },
  { pattern: /require\(['"]@\/lib\/([^'"]+)['"]/g, replacement: "require('@/backend/lib/$1')" },
  
  // Update relative lib imports (../../lib/ -> ../../backend/lib/)
  { pattern: /from ['"]\.\.\/\.\.\/lib\/([^'"]+)['"]/g, replacement: "from '../../backend/lib/$1'" },
  { pattern: /from ['"]\.\.\/lib\/([^'"]+)['"]/g, replacement: "from '../../backend/lib/$1'" },
  { pattern: /require\(['"]\.\.\/\.\.\/lib\/([^'"]+)['"]/g, replacement: "require('../../backend/lib/$1')" },
  { pattern: /require\(['"]\.\.\/lib\/([^'"]+)['"]/g, replacement: "require('../../backend/lib/$1')" },
  
  // Special case: lib/db -> db/db
  { pattern: /from ['"]\.\.\/\.\.\/lib\/db['"]/g, replacement: "from '../../db/db'" },
  { pattern: /from ['"]\.\.\/lib\/db['"]/g, replacement: "from '../../db/db'" },
  { pattern: /from ['"]\.\.\/\.\.\/\.\.\/lib\/db['"]/g, replacement: "from '../../../db/db'" },
  { pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/lib\/db['"]/g, replacement: "from '../../../../db/db'" },
  
  // Update @/components/* to @/frontend/components/* (but keep @/components/* working via tsconfig)
  // Actually, we'll keep @/components working via tsconfig paths, so no change needed
  
  // Update storage paths in string literals
  { pattern: /['"]uploads\//g, replacement: "'storage/uploads/" },
  { pattern: /['"]temp\//g, replacement: "'storage/temp/" },
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

// Update files in key directories
const directories = ['app', 'pages', 'components', 'lib'];
let totalUpdated = 0;

console.log('Starting import path updates...\n');

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Processing ${dir}/...`);
    const files = walkDir(dir);
    let dirUpdated = 0;
    
    files.forEach(file => {
      if (updateFile(file)) {
        dirUpdated++;
        totalUpdated++;
      }
    });
    
    console.log(`  Updated ${dirUpdated} files in ${dir}/\n`);
  }
});

console.log(`\n✅ Total files updated: ${totalUpdated}`);
console.log('\nNote: You may need to restart your dev server for changes to take effect.');

