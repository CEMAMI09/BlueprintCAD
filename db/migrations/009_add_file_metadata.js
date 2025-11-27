// Migration to add file metadata columns to projects table
const { getDb } = require('../db');

async function migrateDatabase() {
  const db = await getDb();

  console.log('Adding file metadata columns to projects table...');

  try {
    await db.exec('BEGIN TRANSACTION');

    // Check existing columns
    const columns = await db.all('PRAGMA table_info(projects)');
    const columnNames = columns.map(col => col.name);

    // Add metadata columns if they don't exist
    const metadataColumns = [
      { name: 'file_size_bytes', type: 'INTEGER', defaultValue: null },
      { name: 'bounding_box_width', type: 'REAL', defaultValue: null },
      { name: 'bounding_box_height', type: 'REAL', defaultValue: null },
      { name: 'bounding_box_depth', type: 'REAL', defaultValue: null },
      { name: 'file_format', type: 'TEXT', defaultValue: null },
      { name: 'upload_timestamp', type: 'DATETIME', defaultValue: null },
      { name: 'file_checksum', type: 'TEXT', defaultValue: null },
      { name: 'branch_count', type: 'INTEGER DEFAULT 0', defaultValue: 0 }
    ];

    for (const col of metadataColumns) {
      if (!columnNames.includes(col.name)) {
        console.log(`Adding ${col.name} column...`);
        await db.exec(`ALTER TABLE projects ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`Column ${col.name} already exists`);
      }
    }

    // Update existing projects with metadata where possible
    console.log('Updating existing projects with available metadata...');
    
    // Set file_format from file_type
    await db.exec(`
      UPDATE projects 
      SET file_format = file_type 
      WHERE file_format IS NULL AND file_type IS NOT NULL
    `);

    // Set upload_timestamp from created_at
    await db.exec(`
      UPDATE projects 
      SET upload_timestamp = created_at 
      WHERE upload_timestamp IS NULL AND created_at IS NOT NULL
    `);

    // Calculate branch_count for projects in folders
    await db.exec(`
      UPDATE projects
      SET branch_count = (
        SELECT COUNT(*) 
        FROM file_branches 
        WHERE file_branches.project_id = projects.id
      )
      WHERE folder_id IS NOT NULL
    `);

    // Try to get file sizes for existing files
    const projects = await db.all('SELECT id, file_path FROM projects WHERE file_size_bytes IS NULL');
    const fs = require('fs');
    const path = require('path');
    
    for (const project of projects) {
      try {
        let filePath = project.file_path;
        // Handle different path formats
        if (filePath.startsWith('/storage/')) {
          filePath = filePath.replace('/storage/', '');
        }
        if (filePath.startsWith('uploads/')) {
          filePath = filePath.replace('uploads/', '');
        }
        
        const fullPath = path.join(process.cwd(), 'storage', 'uploads', filePath);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          await db.run(
            'UPDATE projects SET file_size_bytes = ? WHERE id = ?',
            [stats.size, project.id]
          );
        }
      } catch (err) {
        console.warn(`Could not get file size for project ${project.id}:`, err.message);
      }
    }

    await db.exec('COMMIT');
    console.log('✅ File metadata migration completed successfully!');
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };

