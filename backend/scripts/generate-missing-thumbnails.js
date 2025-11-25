/**
 * Script to generate thumbnails for existing projects that don't have them
 * Run with: node backend/scripts/generate-missing-thumbnails.js
 */

const { getDb } = require('../../db/db');
const path = require('path');
const fs = require('fs');
const { generateThumbnailForDesign } = require('../lib/generateThumbnail');

async function generateMissingThumbnails() {
  const db = await getDb();
  
  try {
    // Get all projects that have CAD files but no thumbnails
    const projects = await db.all(`
      SELECT id, title, file_path, file_type, thumbnail_path
      FROM projects
      WHERE file_path IS NOT NULL
      AND (thumbnail_path IS NULL OR thumbnail_path = '')
      AND (file_type LIKE '%.stl' OR file_type LIKE '%.obj' OR file_type LIKE '%.STL' OR file_type LIKE '%.OBJ' OR file_type = 'stl' OR file_type = 'obj' OR file_type = 'STL' OR file_type = 'OBJ')
      ORDER BY id DESC
      LIMIT 100
    `);

    console.log(`Found ${projects.length} projects without thumbnails`);

    for (const project of projects) {
      try {
        const filePath = project.file_path;
        const fullPath = path.join(process.cwd(), 'storage', 'uploads', filePath);
        
        if (!fs.existsSync(fullPath)) {
          console.log(`Skipping project ${project.id}: file not found at ${fullPath}`);
          continue;
        }

        console.log(`Generating thumbnail for project ${project.id} (${project.title})...`);
        
        const thumbnailPath = await generateThumbnailForDesign(fullPath, project.id, {
          width: 800,
          height: 600,
        });

        if (thumbnailPath) {
          await db.run(
            'UPDATE projects SET thumbnail_path = ? WHERE id = ?',
            [thumbnailPath, project.id]
          );
          console.log(`✓ Generated thumbnail for project ${project.id}: ${thumbnailPath}`);
        } else {
          console.log(`✗ Failed to generate thumbnail for project ${project.id}`);
        }
      } catch (error) {
        console.error(`Error generating thumbnail for project ${project.id}:`, error.message);
      }
    }

    console.log('Thumbnail generation complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

generateMissingThumbnails();

