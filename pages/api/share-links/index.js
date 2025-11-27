// API endpoint for creating and listing share links
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth';
import crypto from 'crypto';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const db = await getDb();

  if (req.method === 'POST') {
    // Create a new share link
    try {
      const { entity_type, entity_id, link_type, password, expires_in_days, view_only, download_blocked } = req.body;

      if (!entity_type || !entity_id) {
        return res.status(400).json({ error: 'entity_type and entity_id are required' });
      }

      if (!['project', 'folder'].includes(entity_type)) {
        return res.status(400).json({ error: 'entity_type must be "project" or "folder"' });
      }

      // Verify user owns the entity
      if (entity_type === 'project') {
        const project = await db.get('SELECT user_id FROM projects WHERE id = ?', [entity_id]);
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        if (project.user_id !== userId) {
          // Check if user has access via folder membership
          const folderAccess = await db.get(
            `SELECT fm.id FROM folder_members fm
             JOIN projects p ON p.folder_id = fm.folder_id
             WHERE p.id = ? AND fm.user_id = ? AND fm.role IN ('owner', 'admin', 'editor')`,
            [entity_id, userId]
          );
          if (!folderAccess) {
            return res.status(403).json({ error: 'You do not have permission to share this project' });
          }
        }
      } else if (entity_type === 'folder') {
        const folder = await db.get('SELECT owner_id FROM folders WHERE id = ?', [entity_id]);
        if (!folder) {
          return res.status(404).json({ error: 'Folder not found' });
        }
        if (folder.owner_id !== userId) {
          // Check if user has admin/editor access
          const folderAccess = await db.get(
            'SELECT id FROM folder_members WHERE folder_id = ? AND user_id = ? AND role IN (\'owner\', \'admin\', \'editor\')',
            [entity_id, userId]
          );
          if (!folderAccess) {
            return res.status(403).json({ error: 'You do not have permission to share this folder' });
          }
        }
      }

      // Generate unique token
      const linkToken = crypto.randomBytes(32).toString('hex');

      // Hash password if provided
      let passwordHash = null;
      if (link_type === 'password' && password) {
        passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      }

      // Calculate expiration date
      let expiresAt = null;
      if (link_type === 'expiring' && expires_in_days) {
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + parseInt(expires_in_days));
        expiresAt = expiresDate.toISOString();
      }

      // Create share link
      const result = await db.run(
        `INSERT INTO share_links (
          link_token, entity_type, entity_id, created_by, link_type,
          password_hash, expires_at, view_only, download_blocked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          linkToken,
          entity_type,
          entity_id,
          userId,
          link_type || 'public',
          passwordHash,
          expiresAt,
          view_only ? 1 : 0,
          download_blocked ? 1 : 0
        ]
      );

      const shareLink = await db.get('SELECT * FROM share_links WHERE id = ?', [result.lastID]);

      res.status(201).json({
        ...shareLink,
        share_url: `/share/${shareLink.link_token}`
      });
    } catch (error) {
      console.error('Create share link error:', error);
      res.status(500).json({ error: 'Failed to create share link' });
    }
  } else if (req.method === 'GET') {
    // List share links for a specific entity
    try {
      const { entity_type, entity_id } = req.query;

      if (!entity_type || !entity_id) {
        return res.status(400).json({ error: 'entity_type and entity_id are required' });
      }

      // Verify user has access
      if (entity_type === 'project') {
        const project = await db.get('SELECT user_id FROM projects WHERE id = ?', [entity_id]);
        if (!project || project.user_id !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else if (entity_type === 'folder') {
        const folder = await db.get('SELECT owner_id FROM folders WHERE id = ?', [entity_id]);
        if (!folder || folder.owner_id !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const shareLinks = await db.all(
        'SELECT * FROM share_links WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
        [entity_type, entity_id]
      );

      // Add share URLs
      const linksWithUrls = shareLinks.map(link => ({
        ...link,
        share_url: `/share/${link.link_token}`
      }));

      res.status(200).json(linksWithUrls);
    } catch (error) {
      console.error('List share links error:', error);
      res.status(500).json({ error: 'Failed to list share links' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

