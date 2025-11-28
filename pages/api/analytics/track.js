// Analytics tracking API for subscription events
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { eventType, metadata } = req.body;
    const db = await getDb();

    // Track analytics event
    await db.run(
      `INSERT INTO analytics_events (user_id, event_type, metadata, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [user.userId, eventType, JSON.stringify(metadata || {})]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
}

