// GET, PUT, DELETE specific project (moved to avoid route conflicts)
import { getDb } from '../../../../lib/db';
import { getUserFromRequest, verifyAuth } from '../../../../lib/auth';
import { isProfileVisible } from '../../../../lib/privacy-utils';

export default async function handler(req, res) {
  const { id } = req.query;
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      console.log('[projects:id] GET', { id });
      
      const project = await db.get(
        `SELECT p.*, u.username, u.profile_private 
         FROM projects p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.id = ?`,
        [id]
      );

      if (!project) {
        console.warn('[projects:id] Not found', { id });
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check privacy
      let viewerUsername = null;
      let viewerId = null;
      try {
        const auth = await verifyAuth(req);
        viewerUsername = auth?.username || null;
        viewerId = auth?.userId || null;
      } catch (e) {
        // Not logged in
      }

      // Owner always has access
      const isOwner = viewerId && viewerId === project.user_id;
      
      if (!isOwner) {
        const { visible } = await isProfileVisible(project.username, viewerUsername);
        
        if (!visible) {
          return res.status(403).json({ error: 'This project is from a private account' });
        }
      }

      // Only increment views if not owner
      if (!isOwner) {
        await db.run('UPDATE projects SET views = views + 1 WHERE id = ?', [id]);
      }

      // Check if user can view cost data (owner OR team member)
      let canViewCostData = isOwner;
      
      if (!canViewCostData && project.folder_id && viewerId) {
        // Check if user is a member of the folder
        const folderAccess = await db.get(
          `SELECT role FROM folder_members 
           WHERE folder_id = ? AND user_id = ?`,
          [project.folder_id, viewerId]
        );
        canViewCostData = !!folderAccess;
      }

      // Prepare response with permission flags
      const response = {
        ...project,
        canViewCostData,
        isOwner
      };

      // Strip cost data if user doesn't have permission
      if (!canViewCostData) {
        delete response.ai_estimate;
        delete response.weight_grams;
        delete response.print_time_hours;
      }

      console.log('[projects:id] Found project', { id, canViewCostData, isOwner });
      res.status(200).json(response);
    } catch (error) {
      console.error('Fetch project error:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  } else if (req.method === 'PUT') {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const project = await db.get('SELECT user_id, for_sale FROM projects WHERE id = ?', [id]);
      
      if (!project || project.user_id !== user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { title, description, tags, is_public, for_sale, price } = req.body;
      
      // Allow marketplace listing

      await db.run(
        `UPDATE projects 
         SET title = ?, description = ?, tags = ?, is_public = ?, for_sale = ?, price = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [title, description, tags, is_public ? 1 : 0, for_sale ? 1 : 0, price, id]
      );

      const updated = await db.get('SELECT * FROM projects WHERE id = ?', [id]);
      res.status(200).json(updated);
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  } else if (req.method === 'DELETE') {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const project = await db.get('SELECT user_id FROM projects WHERE id = ?', [id]);
      
      if (!project || project.user_id !== user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await db.run('DELETE FROM projects WHERE id = ?', [id]);
      res.status(200).json({ message: 'Project deleted' });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
