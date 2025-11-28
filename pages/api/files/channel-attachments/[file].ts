// API endpoint to serve channel attachment files
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getUserFromRequest } from '../../../../shared/utils/auth';
import { getDb } from '../../../../db/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file } = req.query;
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'File parameter required' });
    }

    // Security: prevent directory traversal
    const sanitizedFile = path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(process.cwd(), 'storage', 'channel-attachments', sanitizedFile);

    // Security: ensure file is within allowed directory
    const allowedDir = path.join(process.cwd(), 'storage', 'channel-attachments');
    if (!filePath.startsWith(allowedDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user has access to the message this attachment belongs to
    const db = await getDb();
    const attachment = await db.get(
      'SELECT message_id FROM message_attachments WHERE file_path = ?',
      [`channel-attachments/${sanitizedFile}`]
    );

    if (attachment) {
      const message = await db.get(
        'SELECT channel_id FROM channel_messages WHERE id = ?',
        [attachment.message_id]
      );

      if (message) {
        // Try to get user from request (cookies/headers first, then query param for img tags)
        let user = getUserFromRequest(req);
        
        // If no user from headers/cookies, try query parameter (for img/video tags)
        if (!user || typeof user === 'string') {
          const token = req.query.token as string;
          if (token) {
            const { verifyToken } = require('../../../../shared/utils/auth');
            user = verifyToken(token);
          }
        }
        
        if (user && typeof user !== 'string') {
          const membership = await db.get(
            'SELECT id FROM channel_members WHERE channel_id = ? AND user_id = ?',
            [message.channel_id, user.userId]
          );

          if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
          }
        } else {
          return res.status(401).json({ error: 'Unauthorized' });
        }
      }
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Determine content type
    const ext = path.extname(sanitizedFile).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.stl': 'application/octet-stream',
      '.obj': 'application/octet-stream',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(sanitizedFile)}"`);

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
}

