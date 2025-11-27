// Migration script to add file branches system for files in folders
const { getDb } = require('../db');

async function migrateDatabase() {
  const db = await getDb();

  console.log('Starting file branches migration...');

  try {
    await db.exec('BEGIN TRANSACTION');

    // Create file_branches table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS file_branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        folder_id INTEGER NOT NULL,
        branch_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        description TEXT,
        is_master BOOLEAN DEFAULT 0,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(project_id, branch_name)
      )
    `);

    // Create branch_comments table for collaboration
    await db.exec(`
      CREATE TABLE IF NOT EXISTS branch_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES file_branches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES branch_comments(id) ON DELETE CASCADE
      )
    `);

    // Create branch_notes table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS branch_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL,
        folder_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        note_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES file_branches(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_file_branches_project_id ON file_branches(project_id);
      CREATE INDEX IF NOT EXISTS idx_file_branches_folder_id ON file_branches(folder_id);
      CREATE INDEX IF NOT EXISTS idx_file_branches_is_master ON file_branches(is_master);
      CREATE INDEX IF NOT EXISTS idx_branch_comments_branch_id ON branch_comments(branch_id);
      CREATE INDEX IF NOT EXISTS idx_branch_notes_branch_id ON branch_notes(branch_id);
      CREATE INDEX IF NOT EXISTS idx_branch_notes_folder_id ON branch_notes(folder_id);
    `);

    // For existing projects in folders, create a default branch with project title as name
    const projectsInFolders = await db.all(`
      SELECT id, folder_id, file_path, user_id, title
      FROM projects 
      WHERE folder_id IS NOT NULL
    `);

    for (const project of projectsInFolders) {
      // Check if branch already exists
      const existingBranch = await db.get(
        'SELECT id FROM file_branches WHERE project_id = ? AND is_master = 1',
        [project.id]
      );

      if (!existingBranch) {
        // Use project title as branch name, or fallback to 'main' if title is empty
        const branchName = project.title && project.title.trim() ? project.title.trim() : 'main';
        await db.run(
          `INSERT INTO file_branches (project_id, folder_id, branch_name, file_path, is_master, created_by)
           VALUES (?, ?, ?, ?, 1, ?)`,
          [project.id, project.folder_id, branchName, project.file_path, project.user_id]
        );
        console.log(`Created master branch "${branchName}" for project ${project.id}`);
      }
    }

    await db.exec('COMMIT');
    console.log('✅ File branches migration completed successfully');
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('❌ Error during file branches migration:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };

