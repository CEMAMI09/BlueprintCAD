/**
 * Final comprehensive path fix for all remaining issues
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Fix @/backend/lib/db to @/db/db
  { 
    pattern: /from ['"]@\/backend\/lib\/db['"]/g, 
    replacement: "from '@/db/db'" 
  },
  { 
    pattern: /require\(['"]@\/backend\/lib\/db['"]/g, 
    replacement: "require('@/db/db')" 
  },
  
  // Fix remaining lib/auth imports in pages/api
  { 
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/lib\/auth['"]/g, 
    replacement: "from '../../../../backend/lib/auth'" 
  },
  { 
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/lib\/auth['"]/g, 
    replacement: "from '../../../backend/lib/auth'" 
  },
  { 
    pattern: /from ['"]\.\.\/\.\.\/lib\/auth['"]/g, 
    replacement: "from '../../backend/lib/auth'" 
  },
  { 
    pattern: /from ['"]\.\.\/lib\/auth['"]/g, 
    replacement: "from '../backend/lib/auth'" 
  },
  
  // Fix remaining lib/ imports in pages/api
  { 
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/lib\/([^'"]+)['"]/g, 
    replacement: "from '../../../../backend/lib/$1'" 
  },
  { 
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/lib\/([^'"]+)['"]/g, 
    replacement: "from '../../../backend/lib/$1'" 
  },
  { 
    pattern: /from ['"]\.\.\/\.\.\/lib\/([^'"]+)['"]/g, 
    replacement: "from '../../backend/lib/$1'" 
  },
  { 
    pattern: /from ['"]\.\.\/lib\/([^'"]+)['"]/g, 
    replacement: "from '../backend/lib/$1'" 
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

const directories = ['pages', 'backend'];
let totalUpdated = 0;

console.log('Final path fixes...\n');

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = walkDir(dir);
    let dirUpdated = 0;
    
    files.forEach(file => {
      if (updateFile(file)) {
        dirUpdated++;
        totalUpdated++;
        console.log(`  Updated: ${file}`);
      }
    });
    
    if (dirUpdated > 0) {
      console.log(`\n✅ Updated ${dirUpdated} files in ${dir}/\n`);
    }
  }
});

console.log(`\n✅ Total files updated: ${totalUpdated}`);

