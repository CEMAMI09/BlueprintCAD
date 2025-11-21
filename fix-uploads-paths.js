/**
 * Fix all remaining uploads/ paths to storage/uploads/
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Fix path.join(process.cwd(), 'uploads', ...) to path.join(process.cwd(), 'storage', 'uploads', ...)
  { 
    pattern: /path\.join\(process\.cwd\(\), ['"]uploads['"], ([^)]+)\)/g, 
    replacement: "path.join(process.cwd(), 'storage', 'uploads', $1)" 
  },
  // Fix path.join(process.cwd(), 'uploads') to path.join(process.cwd(), 'storage', 'uploads')
  { 
    pattern: /path\.join\(process\.cwd\(\), ['"]uploads['"]\)/g, 
    replacement: "path.join(process.cwd(), 'storage', 'uploads')" 
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

console.log('Fixing uploads paths in pages/api...\n');

files.forEach(file => {
  if (updateFile(file)) {
    totalUpdated++;
    console.log(`  Updated: ${file}`);
  }
});

console.log(`\n✅ Total files updated: ${totalUpdated}`);

