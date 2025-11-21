#!/usr/bin/env node

/**
 * Generate thumbnails for all existing CAD files that don't have them
 * Usage: node scripts/generate-existing-thumbnails.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'db', 'forge.db');
const UPLOADS_DIR = path.join(process.cwd(), 'storage', 'uploads');
const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// Import thumbnail generator
const { generatePlaceholderThumbnail } = require('../lib/thumbnailGeneratorSimple');

async function generateThumbnails() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, async (err) => {
      if (err) {
        console.error('Failed to connect to database:', err);
        return reject(err);
      }
      console.log('✓ Connected to database');
    });

    db.all('SELECT id, title, file_path, file_type, thumbnail_path FROM projects WHERE LOWER(file_type) IN ("stl", "obj", "fbx", "step", "stp")', async (err, projects) => {
      if (err) {
        console.error('Failed to fetch projects:', err);
        db.close();
        return reject(err);
      }

      console.log(`\n📁 Found ${projects.length} CAD projects`);

      // Ensure thumbnails directory exists
      if (!fs.existsSync(THUMBS_DIR)) {
        fs.mkdirSync(THUMBS_DIR, { recursive: true });
        console.log('✓ Created thumbnails directory');
      }

      let generated = 0;
      let skipped = 0;
      let failed = 0;

      for (const project of projects) {
        const ext = path.extname(project.file_path);
        const basename = path.basename(project.file_path, ext);
        const thumbnailFileName = `${basename}_thumb.png`;
        const thumbnailPath = path.join(THUMBS_DIR, thumbnailFileName);
        const relativeThumbnailPath = `thumbnails/${thumbnailFileName}`;

        // Skip if thumbnail already exists
        if (fs.existsSync(thumbnailPath)) {
          console.log(`⏭️  Skipping ${project.title} (thumbnail exists)`);
          
          // Update database if not set
          if (!project.thumbnail_path) {
            db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [relativeThumbnailPath, project.id]);
          }
          
          skipped++;
          continue;
        }

        try {
          console.log(`🎨 Generating thumbnail for: ${project.title}`);
          
          // Generate placeholder thumbnail
          await generatePlaceholderThumbnail(project.file_path, thumbnailPath, {
            width: 800,
            height: 600,
          });

          // Update database
          await new Promise((resolve, reject) => {
            db.run('UPDATE projects SET thumbnail_path = ? WHERE id = ?', [relativeThumbnailPath, project.id], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          console.log(`   ✓ Generated: ${thumbnailFileName}`);
          generated++;
        } catch (error) {
          console.error(`   ✗ Failed: ${project.title}`, error.message);
          failed++;
        }
      }

      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          return reject(err);
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 SUMMARY:');
        console.log(`   Generated: ${generated}`);
        console.log(`   Skipped:   ${skipped}`);
        console.log(`   Failed:    ${failed}`);
        console.log('='.repeat(50));
        console.log('\n✅ Done! Thumbnails are ready.');
        resolve();
      });
    });
  });
}

// Run the script
generateThumbnails()
  .then(() => {
    console.log('\n🎉 All thumbnails generated successfully!');
    console.log('🔄 Refresh your browser to see the thumbnails.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Script failed:', err);
    process.exit(1);
  });
