// API endpoint for forum threads
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../backend/lib/auth';
import { getDb } from '../../../db/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Get all threads with reply count
      const { category, sort = 'latest', search } = req.query;
      const db = await getDb();
      
      let query = `
        SELECT 
          t.*,
          u.username,
          COUNT(DISTINCT r.id) as reply_count,
          MAX(COALESCE(r.created_at, t.created_at)) as last_activity
        FROM forum_threads t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN forum_replies r ON t.id = r.thread_id
      `;
      
      const conditions: string[] = [];
      const params: any[] = [];
      
      if (category && category !== 'all') {
        conditions.push('t.category = ?');
        params.push(category);
      }
      
      if (search) {
        conditions.push('(t.title LIKE ? OR t.content LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' GROUP BY t.id';
      
      // Sort
      if (sort === 'top') {
        query += ' ORDER BY t.views DESC, last_activity DESC';
      } else if (sort === 'unanswered') {
        query += ' HAVING reply_count = 0 ORDER BY t.created_at DESC';
      } else {
        query += ' ORDER BY t.is_pinned DESC, last_activity DESC';
      }
      
      const threads = await db.all(query, params);
      return res.status(200).json(threads);
    }

    if (req.method === 'POST') {
      // Create new thread
      const user = getUserFromRequest(req);
      if (!user || typeof user === 'string') {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { title, content, category } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      const db = await getDb();
      const result = await db.run(
        'INSERT INTO forum_threads (user_id, title, content, category) VALUES (?, ?, ?, ?)',
        [(user as any).userId, title, content, category || 'general']
      );

      const thread = await db.get(
        `SELECT t.*, u.username 
         FROM forum_threads t 
         JOIN users u ON t.user_id = u.id 
         WHERE t.id = ?`,
        [result.lastID]
      );

      return res.status(200).json(thread);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Forum threads API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
