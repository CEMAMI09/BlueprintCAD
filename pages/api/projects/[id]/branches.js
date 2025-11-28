// API endpoint for managing file branches (only for files in folders)
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const { id } = req.query; // Project ID
  const user = getUserFromRequest(req);
  
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const db = await getDb();

  // Verify project exists and is in a folder
  const project = await db.get(
    'SELECT id, user_id, folder_id, file_path FROM projects WHERE id = ?',
    [id]
  );

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!project.folder_id) {
    return res.status(400).json({ error: 'Branches are only available for files in folders' });
  }

  // Check folder access
  const folder = await db.get('SELECT owner_id, is_team_folder FROM folders WHERE id = ?', [project.folder_id]);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const isOwner = folder.owner_id === userId;
  let hasAccess = isOwner;

  if (folder.is_team_folder && !isOwner) {
    const membership = await db.get(
      'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
      [project.folder_id, userId]
    );
    hasAccess = !!membership && ['owner', 'admin', 'editor'].includes(membership.role);
  }

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (req.method === 'GET') {
    try {
      // Check if user has access to view branches
      const { hasFeature } = require('../../../../backend/lib/subscription-utils');
      const canViewBranches = await hasFeature(userId, 'canCreateBranches');
      
      if (!canViewBranches) {
        return res.status(403).json({
          error: 'Branches are not available on the Base plan. Please upgrade to Premium to use branches.',
          reason: 'feature_not_available',
          requiredTier: 'pro' // Premium tier
        });
      }

      const branches = await db.all(
        `SELECT 
          fb.*,
          u.username as created_by_username
        FROM file_branches fb
        JOIN users u ON fb.created_by = u.id
        WHERE fb.project_id = ?
        ORDER BY fb.is_master DESC, fb.created_at DESC`,
        [id]
      );

      res.status(200).json({ branches });
    } catch (error) {
      console.error('Get branches error:', error);
      res.status(500).json({ error: 'Failed to fetch branches' });
    }
  } else if (req.method === 'POST') {
    // Create new branch
    try {
      // Check if user has access to create branches
      const { hasFeature } = require('../../../../backend/lib/subscription-utils');
      const canCreateBranches = await hasFeature(userId, 'canCreateBranches');
      
      if (!canCreateBranches) {
        return res.status(403).json({
          error: 'Branches are not available on the Base plan. Please upgrade to Premium to create branches.',
          reason: 'feature_not_available',
          requiredTier: 'pro' // Premium tier
        });
      }
      // Ensure upload directory exists
      const uploadDir = path.join(process.cwd(), 'storage', 'branches');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const form = formidable({
        uploadDir,
        keepExtensions: true,
        maxFileSize: 100 * 1024 * 1024, // 100MB
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Formidable parse error:', err);
          if (!res.headersSent) {
            return res.status(400).json({ error: 'Failed to parse form data: ' + err.message });
          }
          return;
        }

        try {
          const branchName = Array.isArray(fields.branch_name) ? fields.branch_name[0] : fields.branch_name;
          const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
          const isMaster = Array.isArray(fields.is_master) ? fields.is_master[0] === 'true' : fields.is_master === 'true';
          const file = Array.isArray(files.file) ? files.file[0] : files.file;

          if (!branchName || !branchName.trim()) {
            if (!res.headersSent) {
              return res.status(400).json({ error: 'Branch name is required' });
            }
            return;
          }

          if (!file) {
            if (!res.headersSent) {
              return res.status(400).json({ error: 'File is required' });
            }
            return;
          }

          // Check if branch name already exists
          const existing = await db.get(
            'SELECT id FROM file_branches WHERE project_id = ? AND branch_name = ?',
            [id, branchName.trim()]
          );

          if (existing) {
            if (!res.headersSent) {
              return res.status(400).json({ error: 'Branch name already exists' });
            }
            return;
          }

          // Move file to storage
          const fileExtension = path.extname(file.originalFilename || '');
          const fileName = `branch_${Date.now()}${fileExtension}`;
          const storagePath = path.join(process.cwd(), 'storage', 'branches', fileName);
          fs.mkdirSync(path.dirname(storagePath), { recursive: true });
          fs.renameSync(file.filepath, storagePath);

          // If setting as master, unset other master branches
          if (isMaster) {
            await db.run(
              'UPDATE file_branches SET is_master = 0 WHERE project_id = ?',
              [id]
            );
          }

          // Create branch
          const result = await db.run(
            `INSERT INTO file_branches (project_id, folder_id, branch_name, file_path, description, is_master, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              project.folder_id,
              branchName.trim(),
              `/storage/branches/${fileName}`,
              description || null,
              isMaster ? 1 : 0,
              userId
            ]
          );

          // Update branch count
          const branchCount = await db.get(
            'SELECT COUNT(*) as count FROM file_branches WHERE project_id = ?',
            [id]
          );
          await db.run(
            'UPDATE projects SET branch_count = ? WHERE id = ?',
            [branchCount.count, id]
          );

          // If this is the master branch, update the project's file_path
          if (isMaster) {
            await db.run(
              'UPDATE projects SET file_path = ? WHERE id = ?',
              [`/storage/branches/${fileName}`, id]
            );
          }

          const branch = await db.get(
            `SELECT fb.*, u.username as created_by_username
             FROM file_branches fb
             JOIN users u ON fb.created_by = u.id
             WHERE fb.id = ?`,
            [result.lastID]
          );

          // Log activity
          const { logActivity } = require('../../../../backend/lib/activity-logger');
          await logActivity({
            userId: userId,
            action: 'branch_created',
            entityType: 'branch',
            folderId: project.folder_id || null,
            projectId: parseInt(id),
            entityId: result.lastID,
            entityName: branchName.trim(),
            details: {
              is_master: isMaster,
              description: description || null
            }
          });

          if (!res.headersSent) {
            res.status(201).json(branch);
          }
        } catch (error) {
          console.error('Create branch error:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to create branch: ' + error.message });
          }
        }
      });
    } catch (error) {
      console.error('Branch creation setup error:', error);
      res.status(500).json({ error: 'Failed to setup branch creation: ' + error.message });
    }
  } else if (req.method === 'PUT') {
    // Update branch (rename, set master, update description)
    try {
      // Read JSON body manually since bodyParser is disabled
      let body = {};
      
      return new Promise((resolve) => {
        let data = '';
        
        req.on('data', (chunk) => {
          data += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            if (data) {
              body = JSON.parse(data);
            }
            
            const { branch_id, branch_name, description, is_master } = body;
            
            console.log('PUT branch request:', { branch_id, branch_name, description, is_master });

            if (!branch_id) {
              res.status(400).json({ error: 'Branch ID is required' });
              return resolve();
            }

            // Verify branch belongs to this project
            const branch = await db.get(
              'SELECT * FROM file_branches WHERE id = ? AND project_id = ?',
              [branch_id, id]
            );

            if (!branch) {
              res.status(404).json({ error: 'Branch not found' });
              return resolve();
            }

            // If renaming, check for conflicts
            if (branch_name && branch_name !== branch.branch_name) {
              const existing = await db.get(
                'SELECT id FROM file_branches WHERE project_id = ? AND branch_name = ? AND id != ?',
                [id, branch_name, branch_id]
              );

              if (existing) {
                res.status(400).json({ error: 'Branch name already exists' });
                return resolve();
              }
            }

            // Update branch first
            const updates = [];
            const values = [];

            if (branch_name !== undefined) {
              updates.push('branch_name = ?');
              values.push(branch_name);
            }

            if (description !== undefined) {
              updates.push('description = ?');
              values.push(description);
            }

            if (is_master !== undefined) {
              updates.push('is_master = ?');
              values.push(is_master ? 1 : 0);
            }

            if (updates.length === 0) {
              res.status(400).json({ error: 'No updates provided' });
              return resolve();
            }

            updates.push('updated_at = CURRENT_TIMESTAMP');
            values.push(branch_id);

            const updateQuery = `UPDATE file_branches SET ${updates.join(', ')} WHERE id = ?`;
            console.log('Executing update query:', updateQuery, values);
            await db.run(updateQuery, values);

            // If setting as master, unset other master branches and update project file_path
            if (is_master === true) {
              await db.run(
                'UPDATE file_branches SET is_master = 0 WHERE project_id = ? AND id != ?',
                [id, branch_id]
              );

              // Get the branch file_path and name AFTER all updates (in case it was just renamed)
              const updatedBranch = await db.get(
                'SELECT file_path, branch_name FROM file_branches WHERE id = ?',
                [branch_id]
              );
              
              console.log('Setting master branch, updating project file_path and title:', {
                projectId: id,
                branchId: branch_id,
                branchFilePath: updatedBranch?.file_path,
                branchName: updatedBranch?.branch_name
              });
              
              // Update project's file_path and title to match master branch
              if (updatedBranch) {
                await db.run(
                  'UPDATE projects SET file_path = ?, title = ? WHERE id = ?',
                  [updatedBranch.file_path, updatedBranch.branch_name, id]
                );
                console.log(`Updated project ${id} file_path to "${updatedBranch.file_path}" and title to "${updatedBranch.branch_name}"`);
              }
            }

            // If branch was renamed and it's the master, update project title and file_path
            if (branch_name && branch_name !== branch.branch_name) {
              // Get the updated branch to ensure we have the latest file_path
              const updatedBranch = await db.get(
                'SELECT file_path, is_master FROM file_branches WHERE id = ?',
                [branch_id]
              );
              
              if (updatedBranch) {
                // If it's the master branch, update the project title to match the branch name
                if (updatedBranch.is_master === 1) {
                  await db.run(
                    'UPDATE projects SET title = ?, file_path = ? WHERE id = ?',
                    [branch_name, updatedBranch.file_path, id]
                  );
                  console.log(`Updated project ${id} title to "${branch_name}" and file_path to match master branch`);
                } else {
                  // Even if not master, update file_path if needed
                  await db.run(
                    'UPDATE projects SET file_path = ? WHERE id = ?',
                    [updatedBranch.file_path, id]
                  );
                }
              }
            }

            const updated = await db.get(
              `SELECT fb.*, u.username as created_by_username
               FROM file_branches fb
               JOIN users u ON fb.created_by = u.id
               WHERE fb.id = ?`,
              [branch_id]
            );

            if (!updated) {
              res.status(404).json({ error: 'Branch not found after update' });
              return resolve();
            }

            // Log activity
            const { logActivity } = require('../../../../backend/lib/activity-logger');
            const project = await db.get('SELECT folder_id FROM projects WHERE id = ?', [id]);
            const actionType = branch_name && branch_name !== branch.branch_name ? 'branch_renamed' : 
                             is_master === true ? 'branch_master_changed' : 'branch_updated';
            await logActivity({
              userId: userId,
              action: actionType,
              entityType: 'branch',
              folderId: project?.folder_id || null,
              projectId: parseInt(id),
              entityId: branch_id,
              entityName: updated.branch_name,
              details: {
                old_name: branch_name && branch_name !== branch.branch_name ? branch.branch_name : null,
                new_name: branch_name && branch_name !== branch.branch_name ? branch_name : null,
                is_master: is_master !== undefined ? is_master : null
              }
            });

            res.status(200).json(updated);
            resolve();
          } catch (error) {
            console.error('Update branch error:', error);
            res.status(500).json({ error: 'Failed to update branch: ' + (error.message || String(error)) });
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Update branch setup error:', error);
      res.status(500).json({ error: 'Failed to setup branch update: ' + (error.message || String(error)) });
    }
  } else if (req.method === 'DELETE') {
    // Delete branch
    try {
      const { branch_id } = req.query;

      if (!branch_id) {
        return res.status(400).json({ error: 'Branch ID is required' });
      }

      const branch = await db.get(
        'SELECT * FROM file_branches WHERE id = ? AND project_id = ?',
        [branch_id, id]
      );

      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      // Prevent deleting the only branch
      const branchCount = await db.get(
        'SELECT COUNT(*) as count FROM file_branches WHERE project_id = ?',
        [id]
      );

      if (branchCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only branch. Create another branch first.' });
      }

      // Log activity before deletion
      const { logActivity } = require('../../../../backend/lib/activity-logger');
      const project = await db.get('SELECT folder_id FROM projects WHERE id = ?', [id]);
      await logActivity({
        userId: userId,
        action: 'branch_deleted',
        entityType: 'branch',
        folderId: project?.folder_id || null,
        projectId: parseInt(id),
        entityId: branch_id,
        entityName: branch.branch_name,
        details: {
          was_master: branch.is_master === 1
        }
      });

      // Delete branch
      await db.run('DELETE FROM file_branches WHERE id = ?', [branch_id]);

      // Update branch count after deletion
      const branchCountAfterDelete = await db.get(
        'SELECT COUNT(*) as count FROM file_branches WHERE project_id = ?',
        [id]
      );
      await db.run(
        'UPDATE projects SET branch_count = ? WHERE id = ?',
        [branchCountAfterDelete.count, id]
      );

      // If master was deleted, set the most recent branch as master
      if (branch.is_master) {
        const newMaster = await db.get(
          'SELECT * FROM file_branches WHERE project_id = ? ORDER BY created_at DESC LIMIT 1',
          [id]
        );

        if (newMaster) {
          await db.run(
            'UPDATE file_branches SET is_master = 1 WHERE id = ?',
            [newMaster.id]
          );
          await db.run(
            'UPDATE projects SET file_path = ? WHERE id = ?',
            [newMaster.file_path, id]
          );
        }
      }

      res.status(200).json({ message: 'Branch deleted successfully' });
    } catch (error) {
      console.error('Delete branch error:', error);
      res.status(500).json({ error: 'Failed to delete branch' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

