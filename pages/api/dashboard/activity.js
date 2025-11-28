// Get recent activity for the current user's dashboard
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth.js';

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

    const activities = [];

    // Get recent project uploads/updates
    const recentProjects = await db.all(
      `SELECT id, title, created_at, updated_at, 
              CASE WHEN updated_at > created_at THEN 'updated' ELSE 'created' END as action_type
       FROM projects 
       WHERE user_id = ?
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 10`,
      [userId]
    );

    for (const project of recentProjects) {
      activities.push({
        id: `project-${project.id}`,
        type: project.action_type === 'created' ? 'version' : 'version',
        project: project.title,
        action: project.action_type === 'created' ? 'New project uploaded' : 'Project updated',
        time: project.updated_at || project.created_at,
        project_id: project.id,
      });
    }

    // Get recent purchases (orders where user is buyer)
    // Check if orders table exists first
    let recentPurchases = [];
    try {
      recentPurchases = await db.all(
        `SELECT o.id, o.amount, o.created_at, p.title as project_title, seller.username as seller_username
         FROM orders o
         JOIN projects p ON o.project_id = p.id
         JOIN users seller ON o.seller_id = seller.id
         WHERE o.buyer_id = ? AND o.payment_status = 'succeeded'
         ORDER BY o.created_at DESC
         LIMIT 5`,
        [userId]
      );
    } catch (err) {
      console.warn('Orders table may not exist, skipping purchases:', err.message);
    }

    for (const purchase of recentPurchases) {
      activities.push({
        id: `purchase-${purchase.id}`,
        type: 'purchase',
        project: purchase.project_title,
        action: `Purchased from @${purchase.seller_username}`,
        time: purchase.created_at,
        amount: `$${parseFloat(purchase.amount).toFixed(2)}`,
        project_id: purchase.id,
      });
    }

    // Get recent sales (orders where user is seller)
    let recentSales = [];
    try {
      recentSales = await db.all(
        `SELECT o.id, o.amount, o.created_at, p.title as project_title, buyer.username as buyer_username
         FROM orders o
         JOIN projects p ON o.project_id = p.id
         JOIN users buyer ON o.buyer_id = buyer.id
         WHERE o.seller_id = ? AND o.payment_status = 'succeeded'
         ORDER BY o.created_at DESC
         LIMIT 5`,
        [userId]
      );
    } catch (err) {
      console.warn('Orders table may not exist, skipping sales:', err.message);
    }

    for (const sale of recentSales) {
      activities.push({
        id: `sale-${sale.id}`,
        type: 'sale',
        project: sale.project_title,
        action: `Purchased by @${sale.buyer_username}`,
        time: sale.created_at,
        amount: `$${parseFloat(sale.amount).toFixed(2)}`,
        project_id: sale.id,
      });
    }

    // Get recent comments on user's projects
    let recentComments = [];
    try {
      recentComments = await db.all(
        `SELECT c.id, c.content, c.created_at, p.title as project_title, u.username as commenter_username
         FROM comments c
         JOIN projects p ON c.project_id = p.id
         JOIN users u ON c.user_id = u.id
         WHERE p.user_id = ? AND c.user_id != ?
         ORDER BY c.created_at DESC
         LIMIT 5`,
        [userId, userId]
      );
    } catch (err) {
      console.warn('Comments table may not exist, skipping comments:', err.message);
    }

    for (const comment of recentComments) {
      activities.push({
        id: `comment-${comment.id}`,
        type: 'comment',
        project: comment.project_title,
        action: `New comment from @${comment.commenter_username}`,
        time: comment.created_at,
        user: `@${comment.commenter_username}`,
        project_id: comment.id,
      });
    }

    // Sort all activities by time (most recent first) and limit to 20
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedActivities = activities.slice(0, 20);

    // Format time relative to now
    const formatTimeAgo = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      return date.toLocaleDateString();
    };

    const formattedActivities = limitedActivities.map(activity => ({
      ...activity,
      time: formatTimeAgo(activity.time),
    }));

    res.status(200).json(formattedActivities);
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
}

