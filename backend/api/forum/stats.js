// Get forum statistics (topic counts by category)
import { getDb } from '../../../backend/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();

    // Check if forum_threads table exists
    const tableCheck = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='forum_threads'"
    );

    if (!tableCheck) {
      // Table doesn't exist, return zeros
      return res.status(200).json({
        all: 0,
        general: 0,
        electronics: 0,
        mechanical: 0,
        '3d-printing': 0,
        help: 0,
      });
    }

    // Get total count
    const totalCount = await db.get(
      'SELECT COUNT(*) as count FROM forum_threads'
    );

    // Get counts by category
    const categoryCounts = await db.all(
      `SELECT category, COUNT(*) as count 
       FROM forum_threads 
       GROUP BY category`
    );

    // Build result object
    const stats = {
      all: totalCount.count || 0,
      general: 0,
      electronics: 0,
      mechanical: 0,
      '3d-printing': 0,
      help: 0,
    };

    // Fill in category counts
    categoryCounts.forEach((row) => {
      if (stats.hasOwnProperty(row.category)) {
        stats[row.category] = row.count;
      }
    });

    res.status(200).json(stats);
  } catch (error) {
    console.error('Forum stats error:', error);
    res.status(500).json({ error: 'Failed to fetch forum stats' });
  }
}

