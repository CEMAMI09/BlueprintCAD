import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth.js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      const user = getUserFromRequest(req);
      const userId = user ? (user as any).userId : null;

      // Fetch folder details
      const folder = await db.get(
        `SELECT 
          f.*,
          u.username as owner_username,
          (SELECT COUNT(*) FROM folder_members WHERE folder_id = f.id) as member_count,
          (SELECT COUNT(*) FROM projects WHERE folder_id = f.id) as project_count
        FROM folders f
        JOIN users u ON f.owner_id = u.id
        WHERE f.id = ?`,
        [id]
      );

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      const isOwner = userId && userId === folder.owner_id;

      // Check access for team folders
      if (folder.is_team_folder && !isOwner) {
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const membership = await db.get(
          'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
          [id, userId]
        );

        if (!membership) {
          return res.status(403).json({ error: 'Access denied' });
        }

        folder.user_role = membership.role;
      } else if (isOwner) {
        folder.user_role = 'owner';
      }

      // Fetch projects in this folder, showing the master branch's file
      const projects = await db.all(
        `SELECT 
          p.*, 
          u.username,
          fb.file_path as master_branch_file_path,
          fb.branch_name as master_branch_name,
          fb.id as master_branch_id
        FROM projects p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN file_branches fb ON p.id = fb.project_id AND fb.is_master = 1
        WHERE p.folder_id = ?
        ORDER BY p.updated_at DESC`,
        [id]
      );

      // Update file_path and title to show master branch's file and sync with database
      for (const project of projects) {
        // Always use master branch file_path and name if it exists
        if (project.master_branch_file_path) {
          // Update the response to show master branch file
          project.file_path = project.master_branch_file_path;
          
          // Also update the project title to match master branch name
          if (project.master_branch_name) {
            project.title = project.master_branch_name;
          }
          
          // Also update the project's file_path and title in the database to match master branch
          // This ensures consistency - the project always points to the master branch
          const currentProject = await db.get('SELECT file_path, title FROM projects WHERE id = ?', [project.id]);
          const needsUpdate = !currentProject || 
            currentProject.file_path !== project.master_branch_file_path ||
            (project.master_branch_name && currentProject.title !== project.master_branch_name);
          
          if (needsUpdate) {
            await db.run(
              'UPDATE projects SET file_path = ?, title = COALESCE(?, title) WHERE id = ?',
              [project.master_branch_file_path, project.master_branch_name || null, project.id]
            );
            console.log(`Updated project ${project.id} file_path to "${project.master_branch_file_path}" and title to "${project.master_branch_name || 'unchanged'}"`);
          }
        }
        // Clean up temporary fields
        delete project.master_branch_file_path;
        delete project.master_branch_id;
      }

      // Fetch subfolders
      const subfolders = await db.all(
        `SELECT f.*, u.username as owner_username
        FROM folders f
        JOIN users u ON f.owner_id = u.id
        WHERE f.parent_id = ?
        ORDER BY f.name`,
        [id]
      );

      res.status(200).json({
        ...folder,
        projects,
        subfolders
      });
    } catch (error) {
      console.error('Fetch folder error:', error);
      res.status(500).json({ error: 'Failed to fetch folder' });
    }
  } else if (req.method === 'PUT') {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = (user as any).userId;
      const folder = await db.get('SELECT owner_id FROM folders WHERE id = ?', [id]);

      if (!folder || folder.owner_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { name, description, color } = req.body;

      await db.run(
        `UPDATE folders 
         SET name = ?, description = ?, color = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, description, color, id]
      );

      const updated = await db.get('SELECT * FROM folders WHERE id = ?', [id]);
      res.status(200).json(updated);
    } catch (error) {
      console.error('Update folder error:', error);
      res.status(500).json({ error: 'Failed to update folder' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const user = getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = (user as any).userId;
      const folder = await db.get('SELECT owner_id FROM folders WHERE id = ?', [id]);

      if (!folder || folder.owner_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await db.run('DELETE FROM folders WHERE id = ?', [id]);
      res.status(200).json({ message: 'Folder deleted' });
    } catch (error) {
      console.error('Delete folder error:', error);
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
