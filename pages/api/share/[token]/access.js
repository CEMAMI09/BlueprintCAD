// API endpoint for accessing shared content
import { getDb } from '../../../../db/db.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  const { token } = req.query;
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      const shareLink = await db.get('SELECT * FROM share_links WHERE link_token = ?', [token]);

      if (!shareLink) {
        return res.status(404).json({ error: 'Share link not found' });
      }

      // Check if expired
      if (shareLink.expires_at) {
        const expiresAt = new Date(shareLink.expires_at);
        if (expiresAt < new Date()) {
          return res.status(410).json({ error: 'Share link has expired' });
        }
      }

      // Check password if required
      const { password } = req.query;
      if (shareLink.password_hash) {
        if (!password) {
          return res.status(401).json({ 
            error: 'Password required',
            requires_password: true 
          });
        }
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
        if (passwordHash !== shareLink.password_hash) {
          return res.status(401).json({ error: 'Incorrect password' });
        }
      }

      // Update access stats
      await db.run(
        'UPDATE share_links SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [shareLink.id]
      );

      // Fetch entity data
      if (shareLink.entity_type === 'project') {
        const project = await db.get(
          `SELECT p.*, u.username, u.profile_picture
           FROM projects p
           JOIN users u ON p.user_id = u.id
           WHERE p.id = ?`,
          [shareLink.entity_id]
        );

        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }

        res.status(200).json({
          entity_type: 'project',
          entity: {
            ...project,
            // Include all metadata fields
            file_size_bytes: project.file_size_bytes,
            bounding_box_width: project.bounding_box_width,
            bounding_box_height: project.bounding_box_height,
            bounding_box_depth: project.bounding_box_depth,
            file_format: project.file_format,
            upload_timestamp: project.upload_timestamp,
            file_checksum: project.file_checksum,
            branch_count: project.branch_count
          },
          share_link: {
            view_only: shareLink.view_only === 1,
            download_blocked: shareLink.download_blocked === 1
          },
          is_public: project.is_public === 1
        });
      } else if (shareLink.entity_type === 'folder') {
        const folder = await db.get(
          `SELECT f.*, u.username, u.profile_picture
           FROM folders f
           JOIN users u ON f.owner_id = u.id
           WHERE f.id = ?`,
          [shareLink.entity_id]
        );

        if (!folder) {
          return res.status(404).json({ error: 'Folder not found' });
        }

        // Get folder contents
        const projects = await db.all(
          `SELECT p.*, u.username
           FROM projects p
           JOIN users u ON p.user_id = u.id
           WHERE p.folder_id = ? AND p.is_public = 1
           ORDER BY p.created_at DESC`,
          [shareLink.entity_id]
        );

        res.status(200).json({
          entity_type: 'folder',
          entity: folder,
          projects: projects,
          share_link: {
            view_only: shareLink.view_only === 1,
            download_blocked: shareLink.download_blocked === 1
          }
        });
      }
    } catch (error) {
      console.error('Access share link error:', error);
      res.status(500).json({ error: 'Failed to access share link' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

