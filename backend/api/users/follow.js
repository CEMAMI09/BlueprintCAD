// Follow/unfollow a user
import { getDb } from '../../../backend/lib/db';
import { getUserFromRequest } from '../../../backend/lib/auth';

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
    const targetUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === user.userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existing = await db.get(
      'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?',
      [user.userId, targetUser.id]
    );

    if (existing) {
      // Unfollow
      await db.run(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [user.userId, targetUser.id]
      );
      res.status(200).json({ following: false });
    } else {
      // Follow
      await db.run(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [user.userId, targetUser.id]
      );
      
      // Create notification
      await db.run(
        'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
        [targetUser.id, 'follow', user.userId, `${user.username} started following you`]
      );
      
      res.status(200).json({ following: true });
    }
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to follow/unfollow' });
  }
}