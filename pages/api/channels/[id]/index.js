// API endpoint for a specific channel (get, update, delete)
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const { id } = req.query;
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      // First check if channel exists
      const channelExists = await db.get(
        'SELECT id FROM chat_channels WHERE id = ?',
        [id]
      );

      if (!channelExists) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Check if user is a member
      const membership = await db.get(
        'SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?',
        [id, userId]
      );

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this channel' });
      }

      const channel = await db.get(`
        SELECT 
          c.*,
          cm.role as user_role,
          (SELECT COUNT(*) FROM channel_members cm2 WHERE cm2.channel_id = c.id) as member_count
        FROM chat_channels c
        INNER JOIN channel_members cm ON c.id = cm.channel_id
        WHERE c.id = ? AND cm.user_id = ?
      `, [id, userId]);

      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Get members
      const members = await db.all(`
        SELECT 
          u.id,
          u.username,
          u.profile_picture,
          cm.role,
          cm.joined_at
        FROM channel_members cm
        INNER JOIN users u ON cm.user_id = u.id
        WHERE cm.channel_id = ?
        ORDER BY 
          CASE cm.role
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            ELSE 3
          END,
          cm.joined_at ASC
      `, [id]);

      res.status(200).json({
        ...channel,
        members
      });
    } catch (error) {
      console.error('Get channel error:', error);
      res.status(500).json({ error: 'Failed to fetch channel' });
    }
  } else if (req.method === 'PUT') {
    try {
      // Check if user is a member
      const membership = await db.get(
        'SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?',
        [id, userId]
      );

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this channel' });
      }

      // Only owner and admins can update
      if (membership.role !== 'owner' && membership.role !== 'admin') {
        return res.status(403).json({ error: 'Only owners and admins can update channels' });
      }

      const { name, description, avatar_url } = req.body;
      const updates = [];
      const params = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name.trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description?.trim() || null);
      }
      if (avatar_url !== undefined) {
        updates.push('avatar_url = ?');
        params.push(avatar_url || null);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      await db.run(
        `UPDATE chat_channels SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      const channel = await db.get('SELECT * FROM chat_channels WHERE id = ?', [id]);
      res.status(200).json(channel);
    } catch (error) {
      console.error('Update channel error:', error);
      res.status(500).json({ error: 'Failed to update channel' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Check if user is a member
      const membership = await db.get(
        'SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?',
        [id, userId]
      );

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this channel' });
      }

      // Only owner can delete
      if (membership.role !== 'owner') {
        return res.status(403).json({ error: 'Only the owner can delete the channel' });
      }

      await db.run('DELETE FROM chat_channels WHERE id = ?', [id]);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete channel error:', error);
      res.status(500).json({ error: 'Failed to delete channel' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

