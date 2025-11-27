// GET, PUT, DELETE specific project (moved to avoid route conflicts)
import { getDb } from '../../../../db/db';
import { getUserFromRequest, verifyAuth } from '../../../../backend/lib/auth';
import { isProfileVisible } from '../../../../backend/lib/privacy-utils';

export default async function handler(req, res) {
  const { id } = req.query;
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      console.log('[projects:id] GET', { id });
      
      // Get project with master branch file_path if it exists
      const project = await db.get(
        `SELECT 
          p.*, 
          u.username, 
          u.profile_private,
          COALESCE(fb.file_path, p.file_path) as display_file_path,
          p.file_size_bytes,
          p.bounding_box_width,
          p.bounding_box_height,
          p.bounding_box_depth,
          p.file_format,
          p.upload_timestamp,
          p.file_checksum,
          p.branch_count
         FROM projects p 
         JOIN users u ON p.user_id = u.id 
         LEFT JOIN file_branches fb ON p.id = fb.project_id AND fb.is_master = 1
         WHERE p.id = ?`,
        [id]
      );

      if (!project) {
        console.warn('[projects:id] Not found', { id });
        return res.status(404).json({ error: 'Project not found' });
      }

      // Use master branch file_path if available
      if (project.display_file_path) {
        project.file_path = project.display_file_path;
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
        const result = await db.run('UPDATE projects SET views = views + 1 WHERE id = ?', [id]);
        
        // Track detailed view event
        try {
          const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection?.remoteAddress || null;
          const userAgent = req.headers['user-agent'] || null;
          const referrer = req.headers['referer'] || req.headers['referrer'] || null;
          
          await db.run(
            `INSERT INTO project_views (project_id, user_id, ip_address, user_agent, referrer)
             VALUES (?, ?, ?, ?, ?)`,
            [id, viewerId, ipAddress, userAgent, referrer]
          );
        } catch (viewError) {
          // Don't fail the request if view tracking fails
          console.error('Error tracking view:', viewError);
        }
        
        // Check if views just hit 1000 milestone
        const updatedProject = await db.get('SELECT views FROM projects WHERE id = ?', [id]);
        if (updatedProject && updatedProject.views === 1000) {
          await db.run(
            'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
            [project.user_id, 'milestone', id, `🎉 Your design "${project.title}" just reached 1000 views!`]
          );
        }
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
      const project = await db.get('SELECT user_id, file_path, thumbnail_path FROM projects WHERE id = ?', [id]);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      if (project.user_id !== user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Delete related records first (due to foreign key constraints)
      // Use try-catch for each deletion to handle cases where tables might not exist
      try {
        await db.run('DELETE FROM comments WHERE project_id = ?', [id]);
      } catch (err) {
        console.warn('Error deleting comments (table may not exist):', err.message);
      }

      try {
        // Ensure project_likes table exists and delete from it
        await db.exec(`CREATE TABLE IF NOT EXISTS project_likes (
          user_id INTEGER NOT NULL,
          project_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, project_id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (project_id) REFERENCES projects(id)
        );`);
        await db.run('DELETE FROM project_likes WHERE project_id = ?', [id]);
      } catch (err) {
        // Table might not exist or deletion failed, that's okay
        console.warn('Error deleting project_likes:', err.message);
      }

      try {
        await db.run('DELETE FROM file_versions WHERE project_id = ?', [id]);
      } catch (err) {
        console.warn('Error deleting file_versions (table may not exist):', err.message);
      }

      try {
        await db.run('DELETE FROM folder_comments WHERE project_id = ?', [id]);
      } catch (err) {
        console.warn('Error deleting folder_comments (table may not exist):', err.message);
      }

      // Handle orders referencing this project
      // Note: orders table doesn't have ON DELETE CASCADE, so we need to handle it manually
      try {
        // Set project_id to NULL in orders (preserves order history but removes project reference)
        await db.run('UPDATE orders SET project_id = NULL WHERE project_id = ?', [id]);
      } catch (err) {
        // Orders table might not exist, or update failed - try to delete orders instead
        try {
          await db.run('DELETE FROM orders WHERE project_id = ?', [id]);
        } catch (deleteErr) {
          console.warn('Error handling orders (table may not exist):', deleteErr.message);
        }
      }

      // Log activity before deletion
      const { logActivity } = require('../../../../backend/lib/activity-logger');
      await logActivity({
        userId: user.userId,
        action: 'delete',
        entityType: 'file',
        folderId: project.folder_id || null,
        projectId: parseInt(id),
        entityId: parseInt(id),
        entityName: project.title,
        details: {
          file_type: project.file_type
        }
      });

      // Delete the project
      const deleteResult = await db.run('DELETE FROM projects WHERE id = ?', [id]);
      
      if (deleteResult.changes === 0) {
        return res.status(404).json({ error: 'Project not found or already deleted' });
      }

      // Optionally delete physical files (commented out to prevent accidental data loss)
      // Uncomment if you want to delete files from disk when project is deleted
      /*
      const fs = require('fs');
      const path = require('path');
      
      if (project.file_path) {
        const filePath = path.join(process.cwd(), 'storage', 'uploads', project.file_path);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
      
      if (project.thumbnail_path) {
        const thumbPath = path.join(process.cwd(), 'storage', 'uploads', project.thumbnail_path);
        try {
          if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath);
          }
        } catch (err) {
          console.error('Error deleting thumbnail:', err);
        }
      }
      */

      res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: `Failed to delete project: ${error.message || 'Unknown error'}` });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
