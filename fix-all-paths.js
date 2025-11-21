/**
 * Comprehensive script to fix all remaining file paths after reorganization
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Fix relative component imports in app/
  { 
    pattern: /from ['"]\.\.\/\.\.\/components\//g, 
    replacement: "from '@/components/" 
  },
  { 
    pattern: /from ['"]\.\.\/components\//g, 
    replacement: "from '@/components/" 
  },
  
  // Fix lib imports in pages/api
  { 
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/lib\//g, 
    replacement: "from '../../../backend/lib/" 
  },
  { 
    pattern: /from ['"]\.\.\/\.\.\/lib\//g, 
    replacement: "from '../../backend/lib/" 
  },
  { 
    pattern: /from ['"]\.\.\/lib\//g, 
    replacement: "from '../backend/lib/" 
  },
  
  // Fix database file paths in scripts
  { 
    pattern: /path\.join\(process\.cwd\(\), ['"]forge\.db['"]\)/g, 
    replacement: "path.join(process.cwd(), 'db', 'forge.db')" 
  },
  { 
    pattern: /path\.join\(process\.cwd\(\), ['"]blueprint\.db['"]\)/g, 
    replacement: "path.join(process.cwd(), 'db', 'blueprint.db')" 
  },
  { 
    pattern: /path\.join\(__dirname, ['"]\.\.['"], ['"]forge\.db['"]\)/g, 
    replacement: "path.join(__dirname, '..', 'db', 'forge.db')" 
  },
  { 
    pattern: /path\.join\(__dirname, ['"]\.\.['"], ['"]blueprint\.db['"]\)/g, 
    replacement: "path.join(__dirname, '..', 'db', 'blueprint.db')" 
  },
  { 
    pattern: /new sqlite3\.Database\(['"]\.\/forge\.db['"]\)/g, 
    replacement: "new sqlite3.Database(path.join(process.cwd(), 'db', 'forge.db'))" 
  },
  { 
    pattern: /new sqlite3\.Database\(['"]\.\/blueprint\.db['"]\)/g, 
    replacement: "new sqlite3.Database(path.join(process.cwd(), 'db', 'blueprint.db'))" 
  },
  { 
    pattern: /new sqlite3\.Database\(['"]forge\.db['"]\)/g, 
    replacement: "new sqlite3.Database(path.join(process.cwd(), 'db', 'forge.db'))" 
  },
  { 
    pattern: /new sqlite3\.Database\(['"]blueprint\.db['"]\)/g, 
    replacement: "new sqlite3.Database(path.join(process.cwd(), 'db', 'blueprint.db'))" 
  },
  { 
    pattern: /filename: path\.join\(process\.cwd\(\), ['"]forge\.db['"]\)/g, 
    replacement: "filename: path.join(process.cwd(), 'db', 'forge.db')" 
  },
  { 
    pattern: /filename: path\.join\(process\.cwd\(\), ['"]blueprint\.db['"]\)/g, 
    replacement: "filename: path.join(process.cwd(), 'db', 'blueprint.db')" 
  },
  
  // Fix migration paths
  { 
    pattern: /path\.join\(__dirname, ['"]\.\.['"], ['"]migrations\//g, 
    replacement: "path.join(__dirname, '..', 'db', 'migrations/" 
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

const directories = ['app', 'pages', 'backend'];
let totalUpdated = 0;

console.log('Fixing all remaining file paths...\n');

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

