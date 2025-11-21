/**
 * Fix relative component imports in app/ directory
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Fix relative component imports to use @/components/
  { 
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/components\/([^'"]+)['"]/g, 
    replacement: "from '@/components/$1'" 
  },
  { 
    pattern: /from ['"]\.\.\/\.\.\/components\/([^'"]+)['"]/g, 
    replacement: "from '@/components/$1'" 
  },
  { 
    pattern: /from ['"]\.\.\/components\/([^'"]+)['"]/g, 
    replacement: "from '@/components/$1'" 
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

const files = walkDir('app');
let totalUpdated = 0;

console.log('Fixing component imports in app/ directory...\n');

files.forEach(file => {
  if (updateFile(file)) {
    totalUpdated++;
    console.log(`  Updated: ${file}`);
  }
});

console.log(`\n✅ Total files updated: ${totalUpdated}`);

