// Get trending designs for the dashboard
import { getDb } from '../../../db/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();

    // Get trending projects based on views, likes, and recent activity
    // Trending = high views + likes + recent updates
    const trendingProjects = await db.all(
      `SELECT 
        p.id,
        p.title,
        p.views,
        p.likes,
        p.thumbnail_path,
        p.created_at,
        p.updated_at,
        u.username as author,
        u.profile_picture as author_picture,
        (p.views * 0.3 + p.likes * 0.7 + 
         CASE WHEN p.updated_at > datetime('now', '-7 days') THEN 10 ELSE 0 END) as trending_score
       FROM projects p
       JOIN users u ON p.user_id = u.id
       WHERE p.is_public = 1
       ORDER BY trending_score DESC, p.updated_at DESC
       LIMIT 10`
    );

    // Format the response
    const formatted = trendingProjects.map(project => ({
      id: project.id,
      title: project.title,
      author: `@${project.author}`,
      stars: project.likes || 0,
      downloads: 0, // Downloads not tracked in current schema
      views: project.views || 0,
      thumbnail: project.thumbnail_path,
      author_picture: project.author_picture,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Trending designs error:', error);
    res.status(500).json({ error: 'Failed to fetch trending designs' });
  }
}

