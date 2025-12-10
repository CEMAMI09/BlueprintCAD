// API endpoint for channels (group chats)
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../backend/lib/auth';
import { getDb } from '../../../db/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;

  try {
    if (req.method === 'GET') {
      // Get all channels the user is a member of
      const db = await getDb();
      
      const channels = await db.all(`
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) as member_count,
          (SELECT content FROM channel_messages 
           WHERE channel_id = c.id 
           ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM channel_messages 
           WHERE channel_id = c.id 
           ORDER BY created_at DESC LIMIT 1) as last_message_time,
          cm.role as user_role
        FROM channels c
        INNER JOIN channel_members cm ON cm.channel_id = c.id
        WHERE cm.user_id = ?
        ORDER BY c.updated_at DESC
      `, [userId]);

      return res.status(200).json(channels);
    }

    if (req.method === 'POST') {
      // Create a new channel
      const { name, description, member_ids } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Channel name is required' });
      }

      const db = await getDb();
      
      // Create channel
      const result = await db.run(
        'INSERT INTO channels (name, description, created_by) VALUES (?, ?, ?)',
        [name, description || null, userId]
      );

      const channelId = result.lastID;

      // Add creator as owner
      await db.run(
        'INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)',
        [channelId, userId, 'owner']
      );

      // Add other members if provided
      if (member_ids && Array.isArray(member_ids)) {
        for (const memberId of member_ids) {
          if (memberId !== userId) {
            try {
              await db.run(
                'INSERT INTO channel_members (channel_id, user_id, role) VALUES (?, ?, ?)',
                [channelId, memberId, 'member']
              );
            } catch (err) {
              // Ignore duplicates due to UNIQUE constraint
              console.warn('Skipping duplicate member add', err);
            }
          }
        }
      }

      // Get the created channel
      const channel = await db.get(`
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) as member_count,
          cm.role as user_role
        FROM channels c
        INNER JOIN channel_members cm ON cm.channel_id = c.id
        WHERE c.id = ? AND cm.user_id = ?
      `, [channelId, userId]);

      return res.status(201).json(channel);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Channels API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

