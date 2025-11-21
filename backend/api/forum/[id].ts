// API endpoint for individual forum thread
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../backend/lib/auth';
import { getDb } from '../../../backend/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      // Get thread with replies
      const db = await getDb();
      
      // Increment view count
      await db.run('UPDATE forum_threads SET views = views + 1 WHERE id = ?', [id]);
      
      const thread = await db.get(
        `SELECT t.*, u.username 
         FROM forum_threads t 
         JOIN users u ON t.user_id = u.id 
         WHERE t.id = ?`,
        [id]
      );

      if (!thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      const replies = await db.all(
        `SELECT r.*, u.username 
         FROM forum_replies r 
         JOIN users u ON r.user_id = u.id 
         WHERE r.thread_id = ? 
         ORDER BY r.created_at ASC`,
        [id]
      );

      return res.status(200).json({ ...thread, replies });
    }

    if (req.method === 'POST') {
      // Add reply to thread
      const user = getUserFromRequest(req);
      if (!user || typeof user === 'string') {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      // Check if thread exists and is not locked
      const db = await getDb();
      const thread = await db.get('SELECT is_locked, user_id FROM forum_threads WHERE id = ?', [id]);
      
      if (!thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      if (thread.is_locked) {
        return res.status(403).json({ error: 'Thread is locked' });
      }

      const result = await db.run(
        'INSERT INTO forum_replies (thread_id, user_id, content) VALUES (?, ?, ?)',
        [id, (user as any).userId, content]
      );

      // Update thread updated_at
      await db.run('UPDATE forum_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

      // Create notification for thread author if it's not their own reply
      if (thread.user_id !== (user as any).userId) {
        await db.run(
          'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
          [thread.user_id, 'forum_reply', id, `${(user as any).username} replied to your thread`]
        );
      }

      const reply = await db.get(
        `SELECT r.*, u.username 
         FROM forum_replies r 
         JOIN users u ON r.user_id = u.id 
         WHERE r.id = ?`,
        [result.lastID]
      );

      return res.status(200).json(reply);
    }

    if (req.method === 'DELETE') {
      // Delete thread (owner or admin only)
      const user = getUserFromRequest(req);
      if (!user || typeof user === 'string') {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const db = await getDb();
      const thread = await db.get('SELECT user_id FROM forum_threads WHERE id = ?', [id]);
      
      if (!thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      if (thread.user_id !== (user as any).userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await db.run('DELETE FROM forum_threads WHERE id = ?', [id]);
      return res.status(200).json({ message: 'Thread deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Forum thread API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
