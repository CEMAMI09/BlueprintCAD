// Get notifications for the current user
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
    // Get all notifications for the user
    const notifications = await db.all(
      `SELECT n.*, u.username, u.profile_picture
       FROM notifications n
       LEFT JOIN users u ON n.related_id = u.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [user.userId]
    );

    // Get unread count
    const unreadCount = await db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
      [user.userId]
    );

    res.status(200).json({ 
      notifications, 
      unreadCount: unreadCount?.count || 0 
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

