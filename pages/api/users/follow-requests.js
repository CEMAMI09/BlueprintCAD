// Get pending follow requests for the current user
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth';

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
    // Get all pending follow requests
    const requests = await db.all(
      `SELECT f.follower_id, f.created_at, u.username, u.profile_picture
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ? AND f.status = 0
       ORDER BY f.created_at DESC`,
      [user.userId]
    );

    res.status(200).json(requests);
  } catch (error) {
    console.error('Get follow requests error:', error);
    res.status(500).json({ error: 'Failed to fetch follow requests' });
  }
}
