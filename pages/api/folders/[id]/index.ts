import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';

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

      // Fetch projects in this folder
      const projects = await db.all(
        `SELECT p.*, u.username
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.folder_id = ?
        ORDER BY p.updated_at DESC`,
        [id]
      );

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
