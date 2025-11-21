#!/usr/bin/env node

/**
 * Database migration script to add thumbnail_path column
 * Usage: node scripts/migrate-thumbnails.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'db.sqlite');

async function runMigration() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Failed to connect to database:', err);
        return reject(err);
      }
      console.log('✓ Connected to database');
    });

    db.serialize(() => {
      // Check if column already exists
      db.all("PRAGMA table_info(projects)", (err, columns) => {
        if (err) {
          console.error('Failed to read table info:', err);
          return reject(err);
        }

        const hasThumbnailPath = columns.some(col => col.name === 'thumbnail_path');
        
        if (hasThumbnailPath) {
          console.log('✓ thumbnail_path column already exists');
          db.close();
          return resolve();
        }

        console.log('Adding thumbnail_path column...');
        
        db.run('ALTER TABLE projects ADD COLUMN thumbnail_path TEXT', (err) => {
          if (err) {
            console.error('Failed to add column:', err);
            return reject(err);
          }
          
          console.log('✓ Added thumbnail_path column');
          
          // Create index
          db.run('CREATE INDEX IF NOT EXISTS idx_projects_thumbnail ON projects(thumbnail_path)', (err) => {
            if (err) {
              console.warn('Failed to create index (non-fatal):', err.message);
            } else {
              console.log('✓ Created index on thumbnail_path');
            }
            
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err);
                return reject(err);
              }
              console.log('✓ Migration complete!');
              resolve();
            });
          });
        });
      });
    });
  });
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✅ Successfully migrated database');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
