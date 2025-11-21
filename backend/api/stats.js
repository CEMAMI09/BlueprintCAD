// Get platform statistics
import { getDb } from '../../backend/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();

    const projects = await db.get('SELECT COUNT(*) as count FROM projects WHERE is_public = 1');
    const users = await db.get('SELECT COUNT(*) as count FROM users');

    res.status(200).json({
      projects: projects.count,
      users: users.count
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(200).json({ projects: 0, users: 0 });
  }
}