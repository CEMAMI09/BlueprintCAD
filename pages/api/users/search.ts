// API endpoint for searching users
import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../db/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const db = await getDb();
    
    // Search users by username (case-insensitive)
    const users = await db.all(`
      SELECT id, username, bio, created_at
      FROM users
      WHERE username LIKE ?
      LIMIT 20
    `, [`%${q}%`]);

    return res.status(200).json(users);
  } catch (error) {
    console.error('User search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
