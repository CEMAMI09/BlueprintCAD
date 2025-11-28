// Download project file and increment download count
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing project id' });
  }

  try {
    let db;
    try {
      db = await getDb();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    if (!db) {
      console.error('Database is null');
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    // Get project with master branch file_path if it exists
    const project = await db.get(
      `SELECT 
        p.*, 
        u.username,
        COALESCE(fb.file_path, p.file_path) as display_file_path
       FROM projects p 
       JOIN users u ON p.user_id = u.id 
       LEFT JOIN file_branches fb ON p.id = fb.project_id AND fb.is_master = 1
       WHERE p.id = ?`,
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Use master branch file_path if available
    if (project.display_file_path) {
      project.file_path = project.display_file_path;
    }

    // Check if project is public or user has access
    const user = getUserFromRequest(req);
    const userId = user && typeof user !== 'string' ? user.userId : null;
    
    const isOwner = userId && userId === project.user_id;
    
    // Check for share link access
    let shareLinkAccess = false;
    let shareLinkData = null;
    const shareToken = req.query.share_token || req.query.share;
    if (shareToken && !isOwner) {
      shareLinkData = await db.get(
        'SELECT * FROM share_links WHERE link_token = ? AND entity_type = ? AND entity_id = ?',
        [shareToken, 'project', id]
      );
      
      if (shareLinkData) {
        // Check if expired
        if (shareLinkData.expires_at) {
          const expiresAt = new Date(shareLinkData.expires_at);
          if (expiresAt < new Date()) {
            return res.status(410).json({ error: 'Share link has expired' });
          }
        }
        shareLinkAccess = true;
      }
    }
    
    // If accessed via share link, check download restrictions
    if (shareLinkAccess && shareLinkData && shareLinkData.download_blocked === 1) {
      return res.status(403).json({ error: 'Downloads are disabled for this share link' });
    }
    
    // If project is for sale, only owner or purchasers can download (unless via share link)
    if (project.for_sale && project.price > 0 && !isOwner && !shareLinkAccess) {
      // Check if user has purchased this project
      if (userId) {
        const purchase = await db.get(
          `SELECT id FROM orders 
           WHERE buyer_id = ? AND project_id = ? 
           AND payment_status = 'succeeded' 
           AND status != 'refunded'`,
          [userId, id]
        );
        if (!purchase) {
          return res.status(403).json({ error: 'This file is for sale. Purchase required to download.' });
        }
      } else {
        return res.status(403).json({ error: 'This file is for sale. Purchase required to download.' });
      }
    }
    
    // Check folder membership if in a folder
    let isFolderMember = false;
    if (project.folder_id && userId) {
      const membership = await db.get(
        'SELECT id FROM folder_members WHERE folder_id = ? AND user_id = ?',
        [project.folder_id, userId]
      );
      isFolderMember = !!membership;
    }
    
    // Grant access if: public, owner, folder member, or share link
    const hasAccess = project.is_public || isOwner || isFolderMember || shareLinkAccess;
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get file path - check both uploads and branches directories
    let filePath = path.join(process.cwd(), 'storage', 'uploads', project.file_path);
    
    // If file doesn't exist in uploads, check branches directory
    if (!fs.existsSync(filePath)) {
      const branchPath = path.join(process.cwd(), 'storage', 'branches', project.file_path);
      if (fs.existsSync(branchPath)) {
        filePath = branchPath;
      } else {
        return res.status(404).json({ error: 'File not found' });
      }
    }

    // Increment download count in projects table
    // First, check if downloads column exists, if not we'll add it
    try {
      await db.run(
        `UPDATE projects SET downloads = COALESCE(downloads, 0) + 1 WHERE id = ?`,
        [id]
      );
      
      // Create notification for project owner if it's not their own download
      if (userId && project.user_id !== userId) {
        const downloader = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
        if (downloader) {
          await db.run(
            'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
            [project.user_id, 'download', id, `${downloader.username} downloaded your design "${project.title}"`]
          );
        }
      } else if (!userId) {
        // Anonymous download
        await db.run(
          'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
          [project.user_id, 'download', id, `Someone downloaded your design "${project.title}"`]
        );
      }
    } catch (err) {
      // If downloads column doesn't exist, add it and try again
      if (err.message && err.message.includes('no such column')) {
        try {
          await db.run(`ALTER TABLE projects ADD COLUMN downloads INTEGER DEFAULT 0`);
          await db.run(`UPDATE projects SET downloads = 1 WHERE id = ?`, [id]);
          
          // Create notification for project owner if it's not their own download
          if (userId && project.user_id !== userId) {
            const downloader = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
            if (downloader) {
              await db.run(
                'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
                [project.user_id, 'download', id, `${downloader.username} downloaded your design "${project.title}"`]
              );
            }
          } else if (!userId) {
            // Anonymous download
            await db.run(
              'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
              [project.user_id, 'download', id, `Someone downloaded your design "${project.title}"`]
            );
          }
        } catch (alterErr) {
          console.error('Failed to add downloads column:', alterErr);
          // Continue anyway - download will still work
        }
      } else {
        console.error('Failed to increment download count:', err);
        // Continue anyway - download will still work
      }
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Determine content type based on file extension
    const ext = path.extname(project.file_path).toLowerCase();
    const contentTypes = {
      '.stl': 'application/octet-stream',
      '.obj': 'application/octet-stream',
      '.step': 'application/octet-stream',
      '.stp': 'application/octet-stream',
      '.3mf': 'application/octet-stream',
      '.ply': 'application/octet-stream',
      '.gltf': 'model/gltf+json',
      '.glb': 'model/gltf-binary',
      '.fbx': 'application/octet-stream',
      '.dae': 'application/xml',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set headers for download
    const fileName = path.basename(project.file_path);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileSize);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
}

