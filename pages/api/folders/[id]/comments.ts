import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      const comments = await db.all(
        `SELECT 
          fc.*,
          u.username,
          u.avatar
         FROM folder_comments fc
         JOIN users u ON fc.user_id = u.id
         WHERE fc.folder_id = ? AND fc.parent_id IS NULL
         ORDER BY fc.created_at DESC`,
        [id]
      );

   // Get replies for each comment
      for (const comment of comments) {
        const replies = await db.all(
          `SELECT 
            fc.*,
            u.username,
            u.avatar
           FROM folder_comments fc
           JOIN users u ON fc.user_id = u.id
           WHERE fc.parent_id = ?
           ORDER BY fc.created_at ASC`,
          [comment.id]
        );
        comment.replies = replies;
      }

      res.status(200).json(comments);
    } catch (error) {
      console.error('Fetch comments error:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  } else if (req.method === 'POST') {
    const user = getUserFromRequest(req);
    
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = (user as any).userId;

    try {
      const { content, project_id, parent_id } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      const result = await db.run(
        `INSERT INTO folder_comments (folder_id, project_id, user_id, content, parent_id)
         VALUES (?, ?, ?, ?, ?)`,
        [id, project_id || null, userId, content, parent_id || null]
      );

      // Log activity
      await db.run(
        `INSERT INTO folder_activity (folder_id, user_id, action, target_type, target_id)
         VALUES (?, ?, 'commented', 'comment', ?)`,
        [id, userId, result.lastID]
      );

      const comment = await db.get(
        `SELECT fc.*, u.username, u.avatar
         FROM folder_comments fc
         JOIN users u ON fc.user_id = u.id
         WHERE fc.id = ?`,
        [result.lastID]
      );

      res.status(201).json(comment);
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}