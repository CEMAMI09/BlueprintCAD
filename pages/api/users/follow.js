// Follow/unfollow a user
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { username } = req.query;
  const db = await getDb();

  try {
    const targetUser = await db.get('SELECT id, profile_private FROM users WHERE username = ?', [username]);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === user.userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following or has pending request
    const existing = await db.get(
      'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?',
      [user.userId, targetUser.id]
    );

    if (existing) {
      // Unfollow or cancel request
      await db.run(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [user.userId, targetUser.id]
      );
      
      // Delete related notifications
      await db.run(
        'DELETE FROM notifications WHERE user_id = ? AND type IN (?, ?) AND related_id = ?',
        [targetUser.id, 'follow', 'follow_request', user.userId]
      );
      
      res.status(200).json({ following: false, pending: false });
    } else {
      // Check if there's already a pending request
      const pendingRequest = await db.get(
        'SELECT * FROM follows WHERE follower_id = ? AND following_id = ? AND (status = 0 OR status IS NULL)',
        [user.userId, targetUser.id]
      );

      if (pendingRequest) {
        return res.status(400).json({ 
          error: 'You already have a pending follow request. Please wait for the user to respond.',
          pending: true 
        });
      }

      // Check if target account is private
      const isPrivate = !!targetUser.profile_private;
      const status = isPrivate ? 0 : 1; // 0 = pending, 1 = accepted
      
      // Follow or send follow request
      await db.run(
        'INSERT INTO follows (follower_id, following_id, status) VALUES (?, ?, ?)',
        [user.userId, targetUser.id, status]
      );
      
      // Create notification
      const message = isPrivate 
        ? `${user.username} requested to follow you`
        : `${user.username} started following you`;
      const notificationType = isPrivate ? 'follow_request' : 'follow';
      
      await db.run(
        'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
        [targetUser.id, notificationType, user.userId, message]
      );
      
      res.status(200).json({ 
        following: !isPrivate, 
        pending: isPrivate 
      });
    }
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to follow/unfollow' });
  }
}