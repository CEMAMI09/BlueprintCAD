import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth.js';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing project id' });

  const db = await getDb();

  if (req.method === 'GET') {
    try {
      const comments = await db.all(
        `SELECT c.*, u.username
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.project_id = ?
         ORDER BY c.created_at DESC`,
        [id]
      );
      return res.status(200).json(comments);
    } catch (e) {
      console.error('Fetch comments error:', e);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  if (req.method === 'POST') {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { content } = req.body || {};
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      const result = await db.run(
        'INSERT INTO comments (project_id, user_id, content) VALUES (?, ?, ?)',
        [id, user.userId, content]
      );

      const comment = await db.get(
        `SELECT c.*, u.username
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [result.lastID]
      );
      return res.status(201).json(comment);
    } catch (e) {
      console.error('Create comment error:', e);
      return res.status(500).json({ error: 'Failed to create comment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
