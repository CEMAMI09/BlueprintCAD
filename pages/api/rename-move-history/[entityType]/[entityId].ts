import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { entityType, entityId } = req.query;

  if (!['project', 'folder'].includes(entityType as string)) {
    return res.status(400).json({ error: 'Invalid entity type' });
  }

  const db = await getDb();

  try {
    const history = await db.all(
      `SELECT h.*, u.username
       FROM rename_move_history h
       JOIN users u ON h.user_id = u.id
       WHERE h.entity_type = ? AND h.entity_id = ?
       ORDER BY h.created_at DESC`,
      [entityType, entityId]
    );

    res.status(200).json(history);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}
