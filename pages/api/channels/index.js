// API endpoint for chat channels (list and create)
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      // Get all channels the user is a member of
      const channels = await db.all(`
        SELECT 
          c.*,
          cm.role as user_role,
          cm.last_read_at,
          (SELECT COUNT(*) FROM channel_messages cm2 
           WHERE cm2.channel_id = c.id 
           AND cm2.deleted_at IS NULL
           AND (cm.last_read_at IS NULL OR cm2.created_at > cm.last_read_at)
           AND cm2.user_id != ?) as unread_count,
          (SELECT content FROM channel_messages cm3 
           WHERE cm3.channel_id = c.id 
           AND cm3.deleted_at IS NULL
           ORDER BY cm3.created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM channel_messages cm3 
           WHERE cm3.channel_id = c.id 
           AND cm3.deleted_at IS NULL
           ORDER BY cm3.created_at DESC LIMIT 1) as last_message_at,
          (SELECT COUNT(*) FROM channel_members cm4 WHERE cm4.channel_id = c.id) as member_count
        FROM chat_channels c
        INNER JOIN channel_members cm ON c.id = cm.channel_id
        WHERE cm.user_id = ?
        ORDER BY c.updated_at DESC
      `, [userId, userId]);

      // Log for debugging
      channels.forEach((ch) => {
        console.log(`[Channels API] Channel ${ch.id} (${ch.name}): unread_count=${ch.unread_count}, last_read_at=${ch.last_read_at}`);
      });

      res.status(200).json(channels);
    } catch (error) {
      console.error('Get channels error:', error);
      res.status(500).json({ error: 'Failed to fetch channels' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, is_private, member_ids } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Channel name is required' });
      }

      // Create channel
      const result = await db.run(
        `INSERT INTO chat_channels (name, description, created_by, is_private)
         VALUES (?, ?, ?, ?)`,
        [name.trim(), description?.trim() || null, userId, is_private ? 1 : 0]
      );

      const channelId = result.lastID;

      // Add creator as owner
      await db.run(
        `INSERT INTO channel_members (channel_id, user_id, role)
         VALUES (?, ?, 'owner')`,
        [channelId, userId]
      );

      // Add other members if provided
      if (member_ids && Array.isArray(member_ids)) {
        const uniqueMemberIds = [...new Set(member_ids.filter(id => id !== userId))];
        for (const memberId of uniqueMemberIds) {
          // Verify user exists
          const member = await db.get('SELECT id FROM users WHERE id = ?', [memberId]);
          if (member) {
            await db.run(
              `INSERT INTO channel_members (channel_id, user_id, role)
               VALUES (?, ?, 'member')`,
              [channelId, memberId]
            );
          }
        }
      }

      // Get the created channel with member count
      const channel = await db.get(`
        SELECT 
          c.*,
          cm.role as user_role,
          (SELECT COUNT(*) FROM channel_members cm2 WHERE cm2.channel_id = c.id) as member_count
        FROM chat_channels c
        INNER JOIN channel_members cm ON c.id = cm.channel_id
        WHERE c.id = ? AND cm.user_id = ?
      `, [channelId, userId]);

      res.status(201).json(channel);
    } catch (error) {
      console.error('Create channel error:', error);
      res.status(500).json({ error: 'Failed to create channel' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

