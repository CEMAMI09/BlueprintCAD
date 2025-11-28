// Per-user like toggle and like state
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth.js';

async function ensureLikeTable(db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS project_likes (
    user_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, project_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );`);
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing project id' });

  try {
    const db = await getDb();
    await ensureLikeTable(db);
    const countRow = await db.get('SELECT COUNT(*) as cnt FROM project_likes WHERE project_id = ?', [id]);

    if (req.method === 'GET') {
      const user = getUserFromRequest(req);
      let liked = false;
      if (user) {
        const row = await db.get('SELECT 1 FROM project_likes WHERE user_id = ? AND project_id = ?', [user.userId, id]);
        liked = !!row;
      }
      return res.status(200).json({ likes: countRow.cnt, liked });
    }

    if (req.method === 'POST') {
      const user = getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const existing = await db.get('SELECT 1 FROM project_likes WHERE user_id = ? AND project_id = ?', [user.userId, id]);
      if (existing) {
        await db.run('DELETE FROM project_likes WHERE user_id = ? AND project_id = ?', [user.userId, id]);
      } else {
        await db.run('INSERT INTO project_likes (user_id, project_id) VALUES (?, ?)', [user.userId, id]);
        
        // Get project owner
        const project = await db.get('SELECT user_id, title FROM projects WHERE id = ?', [id]);
        
        // Create notification for project owner if it's not their own like
        if (project && project.user_id !== user.userId) {
          await db.run(
            'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
            [project.user_id, 'like', id, `${user.username} liked your design "${project.title}"`]
          );
        }
      }
      const newCount = await db.get('SELECT COUNT(*) as cnt FROM project_likes WHERE project_id = ?', [id]);
      await db.run('UPDATE projects SET likes = ? WHERE id = ?', [newCount.cnt, id]);
      return res.status(200).json({ likes: newCount.cnt, liked: !existing });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('Like endpoint error:', e);
    return res.status(500).json({ error: 'Failed to process like request' });
  }
}
