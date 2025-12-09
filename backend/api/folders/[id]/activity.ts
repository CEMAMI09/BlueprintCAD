import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const user = getUserFromRequest(req);

  if (req.method === 'GET') {
    try {
      const db = await getDb();

      const activities = await db.all(
        `SELECT 
          fa.*,
          u.username
         FROM folder_activity fa
         JOIN users u ON fa.user_id = u.id
         WHERE fa.folder_id = ?
         ORDER BY fa.created_at DESC
         LIMIT 50`,
        [id]
      );

      res.status(200).json(activities);
    } catch (error) {
      console.error('Fetch activity error:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}