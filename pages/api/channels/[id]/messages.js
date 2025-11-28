// API endpoint for channel messages
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const { id } = req.query;
  const db = await getDb();

  // Check if user is a member
  const membership = await db.get(
    'SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?',
    [id, userId]
  );

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this channel' });
  }

  if (req.method === 'GET') {
    try {
      const { before, limit = 50 } = req.query;
      
      let query = `
        SELECT 
          m.*,
          u.username as sender_username,
          u.profile_picture as sender_profile_picture,
          (SELECT COUNT(*) FROM message_read_receipts mrr WHERE mrr.message_id = m.id) as read_count,
          (SELECT COUNT(*) FROM channel_members cm WHERE cm.channel_id = ?) as total_members
        FROM channel_messages m
        INNER JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ? AND m.deleted_at IS NULL
      `;
      const params = [id, id];

      if (before) {
        query += ' AND m.created_at < ?';
        params.push(before);
      }

      query += ' ORDER BY m.created_at DESC LIMIT ?';
      params.push(parseInt(limit));

      const messages = await db.all(query, params);

      // Get attachments for each message
      for (const message of messages) {
        const attachments = await db.all(
          'SELECT * FROM message_attachments WHERE message_id = ?',
          [message.id]
        );
        message.attachments = attachments;
      }

      // Reverse to show oldest first
      messages.reverse();

      res.status(200).json(messages);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  } else if (req.method === 'POST') {
    try {
      const form = formidable({
        maxFileSize: 50 * 1024 * 1024, // 50MB
        keepExtensions: true,
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Formidable parse error:', err);
          return res.status(400).json({ error: 'Failed to parse form data' });
        }

        const content = Array.isArray(fields.content) ? fields.content[0] : (fields.content || '');
        const replyToId = Array.isArray(fields.reply_to_id) ? fields.reply_to_id[0] : (fields.reply_to_id || null);

        // Create message
        const result = await db.run(
          `INSERT INTO channel_messages (channel_id, user_id, content, reply_to_id)
           VALUES (?, ?, ?, ?)`,
          [id, userId, content, replyToId || null]
        );

        const messageId = result.lastID;

        // Handle file attachments
        const attachments = [];
        const fileArray = Array.isArray(files.files) ? files.files : (files.files ? [files.files] : []);
        
        for (const file of fileArray) {
          if (!file.filepath) continue;

          const uploadDir = path.join(process.cwd(), 'storage', 'channel-attachments');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const fileName = `${messageId}_${Date.now()}_${file.originalFilename || 'file'}`;
          const filePath = path.join(uploadDir, fileName);
          
          fs.copyFileSync(file.filepath, filePath);

          const stats = fs.statSync(filePath);
          
          // Determine mime type from file extension if not provided
          const fileExt = path.extname(file.originalFilename || '').toLowerCase();
          const mimeTypeMap = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.bmp': 'image/bmp',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.flv': 'video/x-flv',
            '.wmv': 'video/x-ms-wmv',
          };
          
          const detectedMimeType = file.mimetype || mimeTypeMap[fileExt] || 'application/octet-stream';
          
          const attachmentResult = await db.run(
            `INSERT INTO message_attachments 
             (message_id, file_path, file_name, file_type, file_size, mime_type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              messageId,
              `channel-attachments/${fileName}`,
              file.originalFilename || 'file',
              fileExt.slice(1), // Remove the dot
              stats.size,
              detectedMimeType
            ]
          );

          attachments.push({
            id: attachmentResult.lastID,
            file_path: `channel-attachments/${fileName}`,
            file_name: file.originalFilename || 'file',
            file_type: fileExt.slice(1), // Remove the dot
            file_size: stats.size,
            mime_type: detectedMimeType
          });
        }

        // Update channel's updated_at
        await db.run(
          'UPDATE chat_channels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [id]
        );

        // Get the created message with sender info
        const message = await db.get(`
          SELECT 
            m.*,
            u.username as sender_username,
            u.profile_picture as sender_profile_picture
          FROM channel_messages m
          INNER JOIN users u ON m.user_id = u.id
          WHERE m.id = ?
        `, [messageId]);

        message.attachments = attachments;

        // Get channel info for notifications
        const channel = await db.get('SELECT name FROM chat_channels WHERE id = ?', [id]);

        // Send notifications to all channel members except the sender
        const members = await db.all(
          'SELECT user_id FROM channel_members WHERE channel_id = ? AND user_id != ?',
          [id, userId]
        );

        for (const member of members) {
          await db.run(
            `INSERT INTO notifications (user_id, type, related_id, message) 
             VALUES (?, ?, ?, ?)`,
            [member.user_id, 'channel_message', id, `${message.sender_username} sent a message in "${channel.name}"`]
          );
        }

        return res.status(201).json(message);
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

