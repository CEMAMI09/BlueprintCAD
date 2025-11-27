// Script to backfill file metadata for existing projects
const { getDb } = require('../db');
const { extractFileMetadata } = require('../../backend/lib/file-metadata-utils');
const fs = require('fs');
const path = require('path');

async function backfillMetadata() {
  const db = await getDb();

  console.log('Backfilling file metadata for existing projects...\n');

  try {
    // Get all projects that need metadata
    const projects = await db.all(`
      SELECT id, file_path, file_type, folder_id
      FROM projects
      WHERE file_checksum IS NULL OR file_size_bytes IS NULL
    `);

    console.log(`Found ${projects.length} projects needing metadata...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        let fullFilePath;
        let filePath = project.file_path;

        // Handle different path formats
        if (filePath.startsWith('/storage/branches/')) {
          // Branch file
          const branchFileName = filePath.replace('/storage/branches/', '');
          fullFilePath = path.join(process.cwd(), 'storage', 'branches', branchFileName);
        } else if (filePath.startsWith('/storage/uploads/')) {
          // Upload file with full path
          const uploadFileName = filePath.replace('/storage/uploads/', '');
          fullFilePath = path.join(process.cwd(), 'storage', 'uploads', uploadFileName);
        } else if (filePath.startsWith('/storage/')) {
          // Other storage path
          filePath = filePath.replace('/storage/', '');
          fullFilePath = path.join(process.cwd(), 'storage', filePath);
        } else if (filePath.startsWith('storage/')) {
          fullFilePath = path.join(process.cwd(), filePath);
        } else if (filePath.startsWith('uploads/')) {
          fullFilePath = path.join(process.cwd(), 'storage', filePath);
        } else {
          // Relative path - assume uploads
          fullFilePath = path.join(process.cwd(), 'storage', 'uploads', filePath);
        }

        if (!fs.existsSync(fullFilePath)) {
          console.warn(`⚠️  Project ${project.id}: File not found at ${fullFilePath}`);
          errorCount++;
          continue;
        }

        // Extract metadata
        const metadata = extractFileMetadata(fullFilePath, project.file_type);
        
        // Get branch count if in folder
        let branchCount = 0;
        if (project.folder_id) {
          const branchResult = await db.get(
            'SELECT COUNT(*) as count FROM file_branches WHERE project_id = ?',
            [project.id]
          );
          branchCount = branchResult?.count || 0;
        }

        // Update project with metadata
        await db.run(
          `UPDATE projects 
           SET file_size_bytes = ?,
               bounding_box_width = ?,
               bounding_box_height = ?,
               bounding_box_depth = ?,
               file_format = ?,
               upload_timestamp = COALESCE(upload_timestamp, created_at),
               file_checksum = ?,
               branch_count = ?
           WHERE id = ?`,
          [
            metadata.file_size_bytes,
            metadata.bounding_box_width,
            metadata.bounding_box_height,
            metadata.bounding_box_depth,
            metadata.file_format || project.file_type,
            metadata.file_checksum,
            branchCount,
            project.id
          ]
        );

        console.log(`✅ Project ${project.id}: Metadata extracted`);
        successCount++;
      } catch (error) {
        console.error(`❌ Project ${project.id}: Error - ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Backfill complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  }
}

if (require.main === module) {
  backfillMetadata()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { backfillMetadata };

