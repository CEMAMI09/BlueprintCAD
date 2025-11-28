import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/db/db';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const db = await getDb();
  const authUser = getUserFromRequest(req);

  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { reaction_type } = req.body;

      if (!['like', 'helpful', 'love'].includes(reaction_type)) {
        return res.status(400).json({ error: 'Invalid reaction type' });
      }

      // Toggle reaction
      const existing = await db.get(
        'SELECT id FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND reaction_type = ?',
        [id, authUser.userId, reaction_type]
      );

      if (existing) {
        // Remove reaction
        await db.run(
          'DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND reaction_type = ?',
          [id, authUser.userId, reaction_type]
        );
        return res.status(200).json({ action: 'removed', reaction_type });
      } else {
        // Add reaction
        await db.run(
          'INSERT INTO comment_reactions (comment_id, user_id, reaction_type) VALUES (?, ?, ?)',
          [id, authUser.userId, reaction_type]
        );
        return res.status(201).json({ action: 'added', reaction_type });
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      return res.status(500).json({ error: 'Failed to toggle reaction' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
