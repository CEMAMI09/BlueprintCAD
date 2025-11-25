// Get dashboard statistics for the current user
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.userId;
    const db = await getDb();

    // Get total projects count (both public and private)
    const totalProjects = await db.get(
      'SELECT COUNT(*) as count FROM projects WHERE user_id = ?',
      [userId]
    );
    
    // Log for debugging
    console.log(`[Dashboard Stats] User ${userId} has ${totalProjects.count} total projects (public + private)`);

    // Get total versions count (all file_versions for user's projects)
    // Check if file_versions table exists first
    let activeVersions = { count: 0 };
    try {
      const tableCheck = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='file_versions'"
      );
      if (tableCheck) {
        // Count all versions for user's projects
        activeVersions = await db.get(
          `SELECT COUNT(*) as count 
           FROM file_versions fv
           JOIN projects p ON fv.project_id = p.id
           WHERE p.user_id = ?`,
          [userId]
        );
      } else {
        // If file_versions table doesn't exist, count projects as versions (each project is version 1)
        activeVersions = totalProjects;
      }
    } catch (e) {
      // Table doesn't exist or error, use total projects as fallback
      console.warn('file_versions table not found or error, using total projects as versions:', e.message);
      activeVersions = totalProjects;
    }

    // Get total earnings from orders
    const earningsData = await db.get(
      `SELECT COALESCE(SUM(amount - COALESCE(refund_amount, 0)), 0) as total
       FROM orders
       WHERE seller_id = ? AND payment_status = 'succeeded'`,
      [userId]
    );

    // Get total views across all user's projects
    const viewsData = await db.get(
      'SELECT COALESCE(SUM(views), 0) as total FROM projects WHERE user_id = ?',
      [userId]
    );

    // Get user profile info
    const userInfo = await db.get(
      'SELECT username, email, bio, profile_picture FROM users WHERE id = ?',
      [userId]
    );

    // Get follower count
    const followerCount = await db.get(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ? AND status = 1',
      [userId]
    );

    // Get total stars (likes) across all projects
    const starsData = await db.get(
      'SELECT COALESCE(SUM(likes), 0) as total FROM projects WHERE user_id = ?',
      [userId]
    );

    res.status(200).json({
      totalProjects: totalProjects.count,
      activeVersions: activeVersions.count || 0,
      totalEarnings: parseFloat(earningsData.total || 0).toFixed(2),
      totalViews: viewsData.total || 0,
      followers: followerCount.count || 0,
      totalStars: starsData.total || 0,
      user: {
        username: userInfo.username,
        email: userInfo.email,
        bio: userInfo.bio,
        profile_picture: userInfo.profile_picture,
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
}

