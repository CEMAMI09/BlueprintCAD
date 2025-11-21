import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../backend/lib/db';
import { getUserFromRequest } from '../../../backend/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = getUserFromRequest(req);

  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      const invitations = await db.all(
        `SELECT 
          fi.*,
          f.name as folder_name,
          u.username as invited_by_username
         FROM folder_invitations fi
         JOIN folders f ON fi.folder_id = f.id
         JOIN users u ON fi.invited_by = u.id
         WHERE fi.invited_user_id = ? AND fi.status = 'pending'
         ORDER BY fi.created_at DESC`,
        [userId]
      );

      res.status(200).json(invitations);
    } catch (error) {
      console.error('Fetch invitations error:', error);
      res.status(500).json({ error: 'Failed to fetch invitations' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}