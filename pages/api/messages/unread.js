// Get unread message count for the current user
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth';

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
    // Get total unread message count
    const result = await db.get(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read = 0',
      [user.userId]
    );

    res.status(200).json({ count: result?.count || 0 });
  } catch (error) {
    console.error('Get unread messages error:', error);
    res.status(500).json({ error: 'Failed to fetch unread messages' });
  }
}

