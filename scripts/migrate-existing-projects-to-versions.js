// Migration script to add version 1 for all existing projects
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const db = new sqlite3.Database('forge.db');

db.serialize(() => {
  console.log('Migrating existing projects to version system...\n');

  db.all('SELECT * FROM projects WHERE current_version_id IS NULL', [], (err, projects) => {
    if (err) {
      console.error('Error fetching projects:', err.message);
      db.close();
      return;
    }

    if (projects.length === 0) {
      console.log('No projects to migrate.');
      db.close();
      return;
    }

    console.log(`Found ${projects.length} projects to migrate.`);
    let completed = 0;

    projects.forEach((project) => {
      // Get file size if possible
      let fileSize = null;
      try {
        const fullPath = path.join(process.cwd(), 'uploads', project.file_path);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          fileSize = stats.size;
        }
      } catch (e) {
        console.warn(`Could not get file size for project ${project.id}:`, e.message);
      }

      // Insert initial version
      db.run(
        `INSERT INTO file_versions (
          project_id, parent_version_id, version_number, file_path,
          file_size, thumbnail_path, uploaded_by, is_current, change_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          null,
          1,
          project.file_path,
          fileSize,
          project.thumbnail,
          project.user_id,
          1,
          'Initial version (migrated)'
        ],
        function(err) {
          if (err) {
            console.error(`Error creating version for project ${project.id}:`, err.message);
          } else {
            // Update project with version ID
            db.run(
              'UPDATE projects SET current_version_id = ? WHERE id = ?',
              [this.lastID, project.id],
              (updateErr) => {
                if (updateErr) {
                  console.error(`Error updating project ${project.id}:`, updateErr.message);
                } else {
                  console.log(`✓ Migrated project ${project.id} - "${project.title}"`);
                }
                
                completed++;
                if (completed === projects.length) {
                  console.log(`\n✅ Migration complete! Migrated ${completed} projects.`);
                  db.close();
                }
              }
            );
          }
        }
      );
    });
  });
});
