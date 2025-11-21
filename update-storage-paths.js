/**
 * Script to update storage paths (uploads/, temp/) to storage/uploads/ and storage/temp/
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Update path.join(process.cwd(), 'uploads') to path.join(process.cwd(), 'storage', 'uploads')
  { 
    pattern: /path\.join\(process\.cwd\(\), ['"]uploads['"]\)/g, 
    replacement: "path.join(process.cwd(), 'storage', 'uploads')" 
  },
  { 
    pattern: /path\.join\(process\.cwd\(\), ['"]temp['"]\)/g, 
    replacement: "path.join(process.cwd(), 'storage', 'temp')" 
  },
  { 
    pattern: /path\.join\(process\.cwd\(\), ['"]public['"], ['"]uploads['"]\)/g, 
    replacement: "path.join(process.cwd(), 'storage', 'uploads')" 
  },
  // Update string literals
  { pattern: /['"]uploads\//g, replacement: "'storage/uploads/" },
  { pattern: /['"]temp\//g, replacement: "'storage/temp/" },
  // Update in path.join calls with multiple args
  { 
    pattern: /path\.join\(process\.cwd\(\), ['"]public['"], ['"]uploads['"], ([^)]+)\)/g, 
    replacement: "path.join(process.cwd(), 'storage', 'uploads', $1)" 
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

const directories = ['pages', 'app', 'backend', 'lib'];
let totalUpdated = 0;

console.log('Updating storage paths...\n');

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = walkDir(dir);
    let dirUpdated = 0;
    
    files.forEach(file => {
      if (updateFile(file)) {
        dirUpdated++;
        totalUpdated++;
      }
    });
    
    if (dirUpdated > 0) {
      console.log(`Updated ${dirUpdated} files in ${dir}/`);
    }
  }
});

console.log(`\n✅ Total files updated: ${totalUpdated}`);

