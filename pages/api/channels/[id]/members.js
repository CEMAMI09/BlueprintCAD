// API endpoint for channel members
import { getDb } from '../../../../db/db.js';
import { getUserFromRequest } from '../../../../shared/utils/auth.js';

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
      const members = await db.all(`
        SELECT 
          u.id,
          u.username,
          u.profile_picture,
          cm.role,
          cm.joined_at,
          cm.last_read_at
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

      res.status(200).json(members);
    } catch (error) {
      console.error('Get members error:', error);
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  } else if (req.method === 'POST') {
    try {
      // Only owner and admins can add members
      if (membership.role !== 'owner' && membership.role !== 'admin') {
        return res.status(403).json({ error: 'Only owners and admins can add members' });
      }

      const { user_id, username } = req.body;

      let memberId = user_id;
      if (username && !memberId) {
        const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        memberId = user.id;
      }

      if (!memberId) {
        return res.status(400).json({ error: 'user_id or username is required' });
      }

      // Check if already a member
      const existing = await db.get(
        'SELECT id FROM channel_members WHERE channel_id = ? AND user_id = ?',
        [id, memberId]
      );

      if (existing) {
        return res.status(400).json({ error: 'User is already a member' });
      }

      // Add member
      await db.run(
        `INSERT INTO channel_members (channel_id, user_id, role)
         VALUES (?, ?, 'member')`,
        [id, memberId]
      );

      // Get channel info and inviter info for notification
      const channel = await db.get('SELECT name FROM chat_channels WHERE id = ?', [id]);
      const inviter = await db.get('SELECT username FROM users WHERE id = ?', [userId]);

      // Create notification for the new member
      await db.run(
        `INSERT INTO notifications (user_id, type, related_id, message) 
         VALUES (?, ?, ?, ?)`,
        [memberId, 'channel_invite', id, `${inviter.username} added you to the channel "${channel.name}"`]
      );

      const member = await db.get(`
        SELECT 
          u.id,
          u.username,
          u.profile_picture,
          cm.role,
          cm.joined_at
        FROM channel_members cm
        INNER JOIN users u ON cm.user_id = u.id
        WHERE cm.channel_id = ? AND cm.user_id = ?
      `, [id, memberId]);

      res.status(201).json(member);
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({ error: 'Failed to add member' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { member_id } = req.body;

      // If no member_id provided, assume user is leaving themselves
      const targetMemberId = member_id || userId;

      // Can't remove yourself if you're the owner
      if (targetMemberId === userId) {
        const memberRole = await db.get(
          'SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?',
          [id, userId]
        );
        if (memberRole?.role === 'owner') {
          return res.status(400).json({ error: 'Owner cannot leave the channel. Transfer ownership first.' });
        }
      }

      // Only owner and admins can remove other members (or members can remove themselves)
      if (targetMemberId !== userId && membership.role !== 'owner' && membership.role !== 'admin') {
        return res.status(403).json({ error: 'Only owners and admins can remove members' });
      }

      await db.run(
        'DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?',
        [id, targetMemberId]
      );

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

