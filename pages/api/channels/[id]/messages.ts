// API endpoint for channel messages
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../../backend/lib/auth';
import { getDb } from '../../../../db/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;
  const channelId = parseInt(req.query.id as string);

  if (isNaN(channelId)) {
    return res.status(400).json({ error: 'Invalid channel ID' });
  }

  try {
    const db = await getDb();

    // Check if user is a member of the channel
    const membership = await db.get(
      'SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?',
      [channelId, userId]
    );

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    if (req.method === 'GET') {
      // Get all messages for the channel
      const messages = await db.all(`
        SELECT 
          cm.*,
          u.username,
          u.profile_picture
        FROM channel_messages cm
        INNER JOIN users u ON u.id = cm.sender_id
        WHERE cm.channel_id = ?
        ORDER BY cm.created_at ASC
      `, [channelId]);

      return res.status(200).json(messages);
    }

    if (req.method === 'POST') {
      // Send a message to the channel
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Insert message
      const result = await db.run(
        'INSERT INTO channel_messages (channel_id, sender_id, content) VALUES (?, ?, ?)',
        [channelId, userId, content.trim()]
      );

      // Update channel's updated_at timestamp
      await db.run(
        'UPDATE channels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [channelId]
      );

      // Get the created message with user info
      const message = await db.get(`
        SELECT 
          cm.*,
          u.username,
          u.profile_picture
        FROM channel_messages cm
        INNER JOIN users u ON u.id = cm.sender_id
        WHERE cm.id = ?
      `, [result.lastID]);

      return res.status(201).json(message);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Channel messages API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

