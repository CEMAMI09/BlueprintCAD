// Get list of users that the current user is following (for messaging)
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = await getDb();

  try {
    // Get all users the current user is following (with accepted status)
    let followingData;
    try {
      followingData = await db.all(
        `SELECT 
          u.id,
          u.username,
          u.profile_picture,
          u.bio
         FROM follows f
         JOIN users u ON f.following_id = u.id
         WHERE f.follower_id = ? AND (f.status = 1 OR f.status IS NULL)
         ORDER BY u.username ASC`,
        [user.userId]
      );
    } catch (err) {
      if (err.message && err.message.includes('no such column: status')) {
        followingData = await db.all(
          `SELECT 
            u.id,
            u.username,
            u.profile_picture,
            u.bio
           FROM follows f
           JOIN users u ON f.following_id = u.id
           WHERE f.follower_id = ?
           ORDER BY u.username ASC`,
          [user.userId]
        );
      } else {
        throw err;
      }
    }

    res.status(200).json(followingData || []);
  } catch (error) {
    console.error('Get following list error:', error);
    res.status(500).json({ error: 'Failed to fetch following list' });
  }
}

