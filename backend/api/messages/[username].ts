// API endpoint for messages with a specific user
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../backend/lib/auth';
import { getDb } from '../../../backend/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;
  const { username } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username required' });
  }

  try {
    const db = await getDb();

    // Get other user's ID
    const otherUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      // Get all messages between these two users
      const messages = await db.all(`
        SELECT m.*, u.username as sender_username
        FROM messages m
        INNER JOIN users u ON u.id = m.sender_id
        WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.created_at ASC
      `, [userId, otherUser.id, otherUser.id, userId]);

      // Mark received messages as read
      await db.run(
        'UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0',
        [otherUser.id, userId]
      );

      return res.status(200).json(messages);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Messages API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
