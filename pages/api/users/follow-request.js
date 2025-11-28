// Accept or reject a follow request
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

  const { followerId, action } = req.body; // action: 'accept' or 'reject'

  if (!followerId || !action) {
    return res.status(400).json({ error: 'Missing followerId or action' });
  }

  if (action !== 'accept' && action !== 'reject') {
    return res.status(400).json({ error: 'Invalid action. Must be "accept" or "reject"' });
  }

  const db = await getDb();

  try {
    // Verify the follow request exists and is pending
    let followRequest;
    try {
      followRequest = await db.get(
        'SELECT * FROM follows WHERE follower_id = ? AND following_id = ? AND (status = 0 OR status IS NULL)',
        [followerId, user.userId]
      );
    } catch (err) {
      if (err.message && err.message.includes('no such column: status')) {
        // Fallback if status column doesn't exist
        followRequest = await db.get(
          'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?',
          [followerId, user.userId]
        );
      } else {
        throw err;
      }
    }

    if (!followRequest) {
      return res.status(404).json({ error: 'Follow request not found' });
    }

    if (action === 'accept') {
      // Update status to accepted
      await db.run(
        'UPDATE follows SET status = 1 WHERE follower_id = ? AND following_id = ?',
        [followerId, user.userId]
      );

      // Get follower username for notification
      const follower = await db.get('SELECT username FROM users WHERE id = ?', [followerId]);

      // Delete the follow_request notification
      await db.run(
        'DELETE FROM notifications WHERE user_id = ? AND type = ? AND related_id = ?',
        [user.userId, 'follow_request', followerId]
      );

      // Create notification for the follower
      await db.run(
        'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
        [followerId, 'follow_accepted', user.userId, `${user.username} accepted your follow request`]
      );

      res.status(200).json({ message: 'Follow request accepted' });
    } else {
      // Reject - delete the follow request
      await db.run(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
        [followerId, user.userId]
      );

      // Delete the follow_request notification
      await db.run(
        'DELETE FROM notifications WHERE user_id = ? AND type = ? AND related_id = ?',
        [user.userId, 'follow_request', followerId]
      );

      res.status(200).json({ message: 'Follow request rejected' });
    }
  } catch (error) {
    console.error('Follow request action error:', error);
    res.status(500).json({ error: 'Failed to process follow request' });
  }
}
