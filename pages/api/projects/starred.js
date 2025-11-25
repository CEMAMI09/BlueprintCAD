// Get starred projects for the current user
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth.js';

async function ensureLikeTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS project_likes (
      user_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, project_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let db;
    try {
      db = await getDb();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    if (!db) {
      console.error('Database is null');
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    await ensureLikeTable(db);

    // Get all projects that the user has starred
    // Include both public and private projects (user can star their own private projects)
    const starredProjects = await db.all(`
      SELECT p.*, u.username, u.profile_private
      FROM projects p
      JOIN project_likes pl ON p.id = pl.project_id
      JOIN users u ON p.user_id = u.id
      WHERE pl.user_id = ?
      ORDER BY pl.created_at DESC
    `, [user.userId]);
    
    // Filter out private projects that the user doesn't own or have access to
    const filteredProjects = starredProjects.filter(project => {
      // Always show public projects
      if (project.is_public) {
        return true;
      }
      // Show private projects if user is the owner
      return project.user_id === user.userId;
    });

    res.status(200).json(filteredProjects);
  } catch (error) {
    console.error('Fetch starred projects error:', error);
    res.status(500).json({ error: 'Failed to fetch starred projects' });
  }
}

