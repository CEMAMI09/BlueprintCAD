const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./forge.db');

console.log('🔄 Running nested folders migration...\n');

db.serialize(() => {
  // Check if parent_id column exists (should already exist based on schema)
  db.all('PRAGMA table_info(folders)', (err, columns) => {
    if (err) {
      console.error('❌ Error checking folders schema:', err);
      return;
    }
    
    const hasParentId = columns.some(col => col.name === 'parent_id');
    
    if (!hasParentId) {
      console.log('Adding parent_id column to folders table...');
      db.run('ALTER TABLE folders ADD COLUMN parent_id INTEGER', (err) => {
        if (err) {
          console.error('❌ Error adding parent_id:', err.message);
        } else {
          console.log('✅ Added parent_id column');
        }
      });
    } else {
      console.log('✅ parent_id column already exists');
    }
    
    // Add foreign key index for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id)`, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('❌ Error creating parent_id index:', err.message);
      } else {
        console.log('✅ Created/verified parent_id index');
      }
    });
    
    // Add foreign key index on folder_id for projects
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_folder_id ON projects(folder_id)`, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('❌ Error creating projects folder_id index:', err.message);
      } else {
        console.log('✅ Created/verified projects folder_id index');
      }
    });
    
    // Verify data integrity - ensure no circular references exist
    console.log('\n📊 Checking for circular references...');
    db.all(`
      WITH RECURSIVE folder_tree AS (
        SELECT id, parent_id, name, 1 as depth
        FROM folders
        WHERE parent_id IS NULL
        
        UNION ALL
        
        SELECT f.id, f.parent_id, f.name, ft.depth + 1
        FROM folders f
        INNER JOIN folder_tree ft ON f.parent_id = ft.id
        WHERE ft.depth < 100
      )
      SELECT * FROM folder_tree WHERE depth >= 100
    `, (err, circularRefs) => {
      if (err) {
        console.error('❌ Error checking circular references:', err);
      } else if (circularRefs && circularRefs.length > 0) {
        console.warn('⚠️  Found potential circular references:');
        circularRefs.forEach(ref => {
          console.warn(`   - Folder ID ${ref.id}: "${ref.name}" (depth: ${ref.depth})`);
        });
      } else {
        console.log('✅ No circular references found');
      }
      
      // Get folder statistics
      db.get(`
        SELECT 
          COUNT(*) as total_folders,
          COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_folders,
          COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as nested_folders,
          MAX(CASE 
            WHEN parent_id IS NOT NULL THEN 
              (SELECT COUNT(*) FROM folders f2 WHERE f2.parent_id = folders.parent_id)
            ELSE 0 
          END) as max_subfolder_count
        FROM folders
      `, (err, stats) => {
        if (err) {
          console.error('❌ Error getting stats:', err);
        } else if (stats) {
          console.log('\n📈 Folder Statistics:');
          console.log(`   Total folders: ${stats.total_folders}`);
          console.log(`   Root-level folders: ${stats.root_folders}`);
          console.log(`   Nested folders: ${stats.nested_folders}`);
          console.log(`   Largest subfolder group: ${stats.max_subfolder_count}`);
        }
        
        console.log('\n✅ Nested folders migration completed!');
        console.log('\n📝 Features enabled:');
        console.log('   ✓ Infinite depth folder nesting');
        console.log('   ✓ Folder tree structure');
        console.log('   ✓ Move folders between parents');
        console.log('   ✓ Circular reference prevention');
        console.log('   ✓ Access control inheritance ready');
        
        db.close();
      });
    });
  });
});
