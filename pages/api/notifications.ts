// API endpoint for notifications
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../backend/lib/auth';
import { getDb } from '../../db/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;

  try {
    const db = await getDb();

    if (req.method === 'GET') {
      // Get all notifications for the user
      const notifications = await db.all(`
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId]);

      // Get unread count
      const unreadCount = await db.get(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ? AND read = 0
      `, [userId]);

      return res.status(200).json({
        notifications,
        unread_count: unreadCount.count
      });
    }

    if (req.method === 'PATCH') {
      // Mark notifications as read
      const { notification_id, mark_all } = req.body;

      if (mark_all) {
        await db.run(
          'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0',
          [userId]
        );
      } else if (notification_id) {
        await db.run(
          'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
          [notification_id, userId]
        );
      } else {
        return res.status(400).json({ error: 'Missing parameters' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Notifications API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
