// API endpoint to mark a message as read
import { getDb } from '../../../../../../db/db.js';
import { getUserFromRequest } from '../../../../../../shared/utils/auth.js';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const { id, messageId } = req.query;
  const db = await getDb();

  // Check if user is a member
  const membership = await db.get(
    'SELECT id FROM channel_members WHERE channel_id = ? AND user_id = ?',
    [id, userId]
  );

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this channel' });
  }

  if (req.method === 'POST') {
    try {
      // Mark message as read (upsert)
      await db.run(
        `INSERT OR IGNORE INTO message_read_receipts (message_id, user_id)
         VALUES (?, ?)`,
        [messageId, userId]
      );

      // Update last_read_at for the channel member
      await db.run(
        `UPDATE channel_members 
         SET last_read_at = CURRENT_TIMESTAMP 
         WHERE channel_id = ? AND user_id = ?`,
        [id, userId]
      );

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Mark read error:', error);
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

