/**
 * Script to update import paths after project restructure
 * This helps migrate from old structure to new frontend/backend/shared structure
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Import path mappings
const importMappings = [
  // Backend lib imports
  {
    from: /from ['"]\.\.\/\.\.\/\.\.\/backend\/lib\//g,
    to: "from '../../shared/utils/",
    description: 'Backend lib imports in pages/api'
  },
  {
    from: /from ['"]\.\.\/\.\.\/backend\/lib\//g,
    to: "from '../../shared/utils/",
    description: 'Backend lib imports in app/'
  },
  {
    from: /from ['"]@\/backend\/lib\//g,
    to: "from '@/lib/",
    description: 'Backend lib imports using @ alias'
  },
  // DB imports
  {
    from: /from ['"]\.\.\/\.\.\/\.\.\/db\//g,
    to: "from '../../../db/",
    description: 'DB imports (keep relative, just adjust levels)'
  },
  // Frontend components
  {
    from: /from ['"]@\/frontend\/components\//g,
    to: "from '@/components/",
    description: 'Frontend components imports'
  },
  {
    from: /from ['"]\.\.\/\.\.\/frontend\/components\//g,
    to: "from '../../components/",
    description: 'Frontend components relative imports'
  },
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    importMappings.forEach(mapping => {
      if (mapping.from.test(content)) {
        content = content.replace(mapping.from, mapping.to);
        modified = true;
        console.log(`  Updated: ${mapping.description}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  let updatedCount = 0;
  
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      updatedCount += processDirectory(fullPath, extensions);
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (extensions.includes(ext)) {
        console.log(`Processing: ${fullPath}`);
        if (updateFile(fullPath)) {
          updatedCount++;
        }
      }
    }
  });
  
  return updatedCount;
}

// Main execution
console.log('Starting import path updates...\n');

const directories = [
  path.join(ROOT_DIR, 'frontend', 'src'),
  path.join(ROOT_DIR, 'backend', 'routes'),
];

let totalUpdated = 0;
directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`\nProcessing directory: ${dir}`);
    totalUpdated += processDirectory(dir);
  }
});

console.log(`\n✅ Updated ${totalUpdated} files`);
console.log('\n⚠️  Please review the changes and test your application!');

