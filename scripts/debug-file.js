const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'forge.db');
const db = new sqlite3.Database(dbPath);

const filename = '1763362406111-1762764749284-20mm_cube.stl';

console.log('Checking for file:', filename);
console.log('');

// Check in projects table
db.all('SELECT id, title, user_id, folder_id, is_public, file_path FROM projects WHERE file_path LIKE ?', 
  [`%${filename}%`], 
  (err, projects) => {
    if (err) {
      console.error('Error querying projects:', err);
    } else {
      console.log('Projects table:');
      console.log(projects);
      console.log('');
    }

    // Check in file_versions table
    db.all(`SELECT fv.id, fv.project_id, fv.version_number, fv.file_path, fv.is_current, 
            p.user_id, p.folder_id, p.is_public, p.title 
            FROM file_versions fv 
            JOIN projects p ON fv.project_id = p.id 
            WHERE fv.file_path LIKE ?`, 
      [`%${filename}%`], 
      (err, versions) => {
        if (err) {
          console.error('Error querying versions:', err);
        } else {
          console.log('File versions table:');
          console.log(versions);
          console.log('');
        }

        // Check folder membership for user 1
        db.all('SELECT * FROM folder_members WHERE user_id = 1', [], (err, memberships) => {
          if (err) {
            console.error('Error querying folder members:', err);
          } else {
            console.log('Folder memberships for user 1:');
            console.log(memberships);
          }
          
          db.close();
        });
      }
    );
  }
);
