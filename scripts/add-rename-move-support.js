const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
  const db = await open({
    filename: path.join(process.cwd(), 'forge.db'),
    driver: sqlite3.Database
  });

  console.log('🔄 Adding rename and move support...\n');

  try {
    // Add slug columns for stable URLs
    const projectColumns = await db.all(`PRAGMA table_info(projects)`);
    const folderColumns = await db.all(`PRAGMA table_info(folders)`);

    if (!projectColumns.some(c => c.name === 'slug')) {
      console.log('➕ Adding slug column to projects...');
      await db.exec(`ALTER TABLE projects ADD COLUMN slug TEXT`);
      
      // Generate slugs from existing titles
      const projects = await db.all('SELECT id, title FROM projects');
      for (const project of projects) {
        const slug = project.title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '-' + project.id;
        await db.run('UPDATE projects SET slug = ? WHERE id = ?', [slug, project.id]);
      }
      console.log(`✅ Generated slugs for ${projects.length} projects`);
    }

    if (!folderColumns.some(c => c.name === 'slug')) {
      console.log('➕ Adding slug column to folders...');
      await db.exec(`ALTER TABLE folders ADD COLUMN slug TEXT`);
      
      // Generate slugs from existing names
      const folders = await db.all('SELECT id, name FROM folders');
      for (const folder of folders) {
        const slug = folder.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '-' + folder.id;
        await db.run('UPDATE folders SET slug = ? WHERE id = ?', [slug, folder.id]);
      }
      console.log(`✅ Generated slugs for ${folders.length} folders`);
    }

    // Create rename/move history table
    console.log('➕ Creating rename_move_history table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS rename_move_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL CHECK(entity_type IN ('project', 'folder')),
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('rename', 'move', 'rename_move')),
        old_name TEXT,
        new_name TEXT,
        old_folder_id INTEGER,
        new_folder_id INTEGER,
        old_parent_id INTEGER,
        new_parent_id INTEGER,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    console.log('➕ Creating indexes...');
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
      CREATE INDEX IF NOT EXISTS idx_folders_slug ON folders(slug);
      CREATE INDEX IF NOT EXISTS idx_rename_history_entity ON rename_move_history(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_rename_history_user ON rename_move_history(user_id);
    `);

    // Add original_name columns to track name changes
    if (!projectColumns.some(c => c.name === 'original_title')) {
      console.log('➕ Adding original_title to projects...');
      await db.exec(`ALTER TABLE projects ADD COLUMN original_title TEXT`);
      await db.exec(`UPDATE projects SET original_title = title WHERE original_title IS NULL`);
    }

    if (!folderColumns.some(c => c.name === 'original_name')) {
      console.log('➕ Adding original_name to folders...');
      await db.exec(`ALTER TABLE folders ADD COLUMN original_name TEXT`);
      await db.exec(`UPDATE folders SET original_name = name WHERE original_name IS NULL`);
    }

    // Stats
    const stats = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM folders) as total_folders,
        (SELECT COUNT(*) FROM projects WHERE slug IS NOT NULL) as projects_with_slugs,
        (SELECT COUNT(*) FROM folders WHERE slug IS NOT NULL) as folders_with_slugs
    `);

    console.log('\n📊 Migration Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Projects: ${stats.total_projects}`);
    console.log(`Projects with Slugs: ${stats.projects_with_slugs}`);
    console.log(`Total Folders: ${stats.total_folders}`);
    console.log(`Folders with Slugs: ${stats.folders_with_slugs}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await db.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
