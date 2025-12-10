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
    // Get all notifications for the user (excluding message notifications - those go to messages tab)
    // Include dismissed field (default to 0 if NULL for backwards compatibility)
    const notifications = await db.all(
      `SELECT n.*, 
              COALESCE(n.dismissed, 0) as dismissed,
              u.username, 
              u.profile_picture
       FROM notifications n
       LEFT JOIN users u ON n.related_id = u.id
       WHERE n.user_id = ? AND n.type != 'message'
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [user.userId]
    );

    // Get unread count (excluding message notifications and dismissed notifications)
    // Important notifications (follow_request, folder_invitation, order_*) require dismissal
    const unreadCount = await db.get(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_id = ? 
         AND read = 0 
         AND (dismissed = 0 OR dismissed IS NULL)
         AND type != ?`,
      [user.userId, 'message']
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

