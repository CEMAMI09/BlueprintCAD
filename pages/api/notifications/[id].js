// Mark notification as read or delete it
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth';

export default async function handler(req, res) {
  if (req.method === 'PUT') {
    // Mark as read
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const db = await getDb();

    try {
      // Verify notification belongs to user
      const notification = await db.get(
        'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
        [id, user.userId]
      );

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await db.run(
        'UPDATE notifications SET read = 1 WHERE id = ?',
        [id]
      );

      res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  } else if (req.method === 'PATCH') {
    // Dismiss notification (for important notifications that require dismissal)
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const db = await getDb();

    try {
      // Verify notification belongs to user
      const notification = await db.get(
        'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
        [id, user.userId]
      );

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      // Mark as dismissed and read
      await db.run(
        'UPDATE notifications SET dismissed = 1, read = 1 WHERE id = ?',
        [id]
      );

      res.status(200).json({ message: 'Notification dismissed' });
    } catch (error) {
      console.error('Dismiss notification error:', error);
      res.status(500).json({ error: 'Failed to dismiss notification' });
    }
  } else if (req.method === 'DELETE') {
    // Delete notification
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const db = await getDb();

    try {
      // Verify notification belongs to user
      const notification = await db.get(
        'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
        [id, user.userId]
      );

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await db.run(
        'DELETE FROM notifications WHERE id = ?',
        [id]
      );

      res.status(200).json({ message: 'Notification deleted' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

