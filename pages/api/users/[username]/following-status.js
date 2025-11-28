// Get follow status for a user
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    // Check follow status
    let followRecord;
    try {
      followRecord = await db.get(
        'SELECT status FROM follows WHERE follower_id = ? AND following_id = ?',
        [user.userId, targetUser.id]
      );
    } catch (err) {
      // If status column doesn't exist, check without it
      if (err.message && err.message.includes('no such column: status')) {
        followRecord = await db.get(
          'SELECT 1 as status FROM follows WHERE follower_id = ? AND following_id = ?',
          [user.userId, targetUser.id]
        );
        if (followRecord) {
          followRecord.status = 1; // Default to accepted if no status column
        }
      } else {
        throw err;
      }
    }

    const following = followRecord?.status === 1;
    const pending = followRecord?.status === 0;

    res.status(200).json({ 
      following, 
      pending,
      isPrivate: !!targetUser.profile_private
    });
  } catch (error) {
    console.error('Follow status error:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
}

