// Check if there's a pending follow request
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

  const { username } = req.query;
  const db = await getDb();

  try {
    const targetUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for pending follow request
    const pendingFollow = await db.get(
      'SELECT * FROM follows WHERE follower_id = ? AND following_id = ? AND status = 0',
      [user.userId, targetUser.id]
    );

    res.status(200).json({ pending: !!pendingFollow });
  } catch (error) {
    console.error('Check pending follow error:', error);
    res.status(500).json({ error: 'Failed to check pending follow' });
  }
}
