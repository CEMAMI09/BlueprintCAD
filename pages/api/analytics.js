// Analytics API endpoint
import { getDb } from '../../db/db';
import { getUserFromRequest } from '../../shared/utils/auth';
import { getUserTier } from '../../shared/utils/subscription-utils';

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
    const tier = await getUserTier(userId);

    // Check if user has access to analytics
    if (tier === 'free') {
      return res.status(403).json({ error: 'Analytics requires Pro subscription or higher' });
    }

    const { range = '30d' } = req.query;
    const db = await getDb();

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get overview stats
    const totalViews = await db.get(
      `SELECT SUM(views) as total FROM projects WHERE user_id = ? AND created_at >= ?`,
      [userId, startDate.toISOString()]
    );

    const totalDownloads = await db.get(
      `SELECT COUNT(*) as total FROM downloads WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?) AND created_at >= ?`,
      [userId, startDate.toISOString()]
    );

    const totalRevenue = await db.get(
      `SELECT SUM(amount) as total FROM orders WHERE seller_id = ? AND status = 'completed' AND created_at >= ?`,
      [userId, startDate.toISOString()]
    );

    const totalStars = await db.get(
      `SELECT SUM(stars) as total FROM projects WHERE user_id = ? AND created_at >= ?`,
      [userId, startDate.toISOString()]
    );

    // Get previous period for comparison
    const prevStartDate = new Date(startDate);
    const prevEndDate = new Date(startDate);
    prevStartDate.setTime(prevStartDate.getTime() - (now.getTime() - startDate.getTime()));

    const prevViews = await db.get(
      `SELECT SUM(views) as total FROM projects WHERE user_id = ? AND created_at >= ? AND created_at < ?`,
      [userId, prevStartDate.toISOString(), prevEndDate.toISOString()]
    );

    const prevDownloads = await db.get(
      `SELECT COUNT(*) as total FROM downloads WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?) AND created_at >= ? AND created_at < ?`,
      [userId, prevStartDate.toISOString(), prevEndDate.toISOString()]
    );

    const prevRevenue = await db.get(
      `SELECT SUM(amount) as total FROM orders WHERE seller_id = ? AND status = 'completed' AND created_at >= ? AND created_at < ?`,
      [userId, prevStartDate.toISOString(), prevEndDate.toISOString()]
    );

    const prevStars = await db.get(
      `SELECT SUM(stars) as total FROM projects WHERE user_id = ? AND created_at >= ? AND created_at < ?`,
      [userId, prevStartDate.toISOString(), prevEndDate.toISOString()]
    );

    // Calculate percentage changes
    const viewsChange = prevViews?.total > 0 
      ? (((totalViews?.total || 0) - (prevViews.total || 0)) / prevViews.total * 100).toFixed(1)
      : '0';
    const downloadsChange = prevDownloads?.total > 0
      ? (((totalDownloads?.total || 0) - (prevDownloads.total || 0)) / prevDownloads.total * 100).toFixed(1)
      : '0';
    const revenueChange = prevRevenue?.total > 0
      ? (((totalRevenue?.total || 0) - (prevRevenue.total || 0)) / prevRevenue.total * 100).toFixed(1)
      : '0';
    const starsChange = prevStars?.total > 0
      ? (((totalStars?.total || 0) - (prevStars.total || 0)) / prevStars.total * 100).toFixed(1)
      : '0';

    // Get top projects
    const topProjects = await db.all(
      `SELECT id, title, views, downloads, stars, created_at
       FROM projects
       WHERE user_id = ?
       ORDER BY views DESC
       LIMIT 10`,
      [userId]
    );

    // Get recent activity
    const recentActivity = await db.all(
      `SELECT 'project_created' as type, title as description, created_at as timestamp
       FROM projects
       WHERE user_id = ? AND created_at >= ?
       UNION ALL
       SELECT 'order_completed' as type, CONCAT('Order #', order_number) as description, created_at as timestamp
       FROM orders
       WHERE seller_id = ? AND status = 'completed' AND created_at >= ?
       ORDER BY timestamp DESC
       LIMIT 20`,
      [userId, startDate.toISOString(), userId, startDate.toISOString()]
    );

    // Get project performance
    const projects = await db.all(
      `SELECT 
        p.id,
        p.title,
        p.views,
        p.downloads,
        p.stars,
        COALESCE(SUM(o.amount), 0) as revenue,
        CASE WHEN p.for_sale = 1 THEN 'selling' ELSE 'free' END as status
       FROM projects p
       LEFT JOIN orders o ON o.project_id = p.id AND o.status = 'completed'
       WHERE p.user_id = ? AND p.created_at >= ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [userId, startDate.toISOString()]
    );

    // Get sales analytics
    const sales = await db.get(
      `SELECT 
        COUNT(*) as totalSales,
        SUM(amount) as totalRevenue,
        AVG(amount) as averageOrder
       FROM orders
       WHERE seller_id = ? AND status = 'completed' AND created_at >= ?`,
      [userId, startDate.toISOString()]
    );

    // Get audience insights
    const audience = await db.get(
      `SELECT 
        COUNT(*) as totalFollowers,
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as newFollowers
       FROM followers
       WHERE following_id = ?`,
      [startDate.toISOString(), userId]
    );

    // Track analytics view
    await db.run(
      `INSERT INTO analytics_events (user_id, event_type, metadata)
       VALUES (?, 'analytics_viewed', ?)`,
      [userId, JSON.stringify({ range, timestamp: new Date().toISOString() })]
    );

    res.status(200).json({
      overview: {
        totalViews: totalViews?.total || 0,
        totalDownloads: totalDownloads?.total || 0,
        totalRevenue: totalRevenue?.total || 0,
        totalStars: totalStars?.total || 0,
        viewsChange,
        downloadsChange,
        revenueChange,
        starsChange,
      },
      topProjects,
      recentActivity,
      projects,
      sales: {
        totalSales: sales?.totalSales || 0,
        totalRevenue: sales?.totalRevenue || 0,
        averageOrder: sales?.averageOrder || 0,
      },
      audience: {
        totalFollowers: audience?.totalFollowers || 0,
        newFollowers: audience?.newFollowers || 0,
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

