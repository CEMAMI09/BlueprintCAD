// API endpoint to mark channel as read (update last_read_at)
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const { id } = req.query;
  const db = await getDb();

  // Check if user is a member
  const membership = await db.get(
    'SELECT id FROM channel_members WHERE channel_id = ? AND user_id = ?',
    [id, userId]
  );

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this channel' });
  }

  try {
    // Get the latest message timestamp to set last_read_at to that (or current time if no messages)
    const latestMessage = await db.get(
      'SELECT MAX(created_at) as latest FROM channel_messages WHERE channel_id = ? AND deleted_at IS NULL',
      [id]
    );
    
    console.log(`[Channel Read API] Latest message timestamp: ${latestMessage?.latest}`);
    
    // Update last_read_at to the latest message timestamp (or current time if no messages)
    // This ensures all existing messages are marked as read
    // Use CURRENT_TIMESTAMP for SQLite to ensure proper timestamp format
    if (latestMessage?.latest) {
      // If there are messages, set last_read_at to the latest message's timestamp
      const result = await db.run(
        'UPDATE channel_members SET last_read_at = (SELECT MAX(created_at) FROM channel_messages WHERE channel_id = ? AND deleted_at IS NULL) WHERE channel_id = ? AND user_id = ?',
        [id, id, userId]
      );
      console.log(`[Channel Read API] Updated last_read_at to latest message timestamp, changes: ${result.changes}`);
    } else {
      // If no messages, set to current time
      const result = await db.run(
        'UPDATE channel_members SET last_read_at = CURRENT_TIMESTAMP WHERE channel_id = ? AND user_id = ?',
        [id, userId]
      );
      console.log(`[Channel Read API] Updated last_read_at to CURRENT_TIMESTAMP (no messages), changes: ${result.changes}`);
    }

    // Verify the update and get the actual timestamp
    const updated = await db.get(
      'SELECT last_read_at FROM channel_members WHERE channel_id = ? AND user_id = ?',
      [id, userId]
    );
    console.log(`[Channel Read API] Verified last_read_at: ${updated?.last_read_at}`);
    
    // Also check what messages exist and their timestamps for debugging
    const messages = await db.all(
      'SELECT id, created_at, user_id FROM channel_messages WHERE channel_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 5',
      [id]
    );
    console.log(`[Channel Read API] Latest 5 messages:`, messages);

    res.status(200).json({ success: true, last_read_at: updated?.last_read_at });
  } catch (error) {
    console.error('Mark channel read error:', error);
    res.status(500).json({ error: 'Failed to mark channel as read' });
  }
}

