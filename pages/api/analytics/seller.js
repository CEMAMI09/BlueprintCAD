import { getDb } from '../../../db/db.js';
import { getUserFromRequest } from '../../../shared/utils/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const db = await getDb();

  try {
    const { period = '30' } = req.query; // days
    const periodDays = parseInt(period);
    
    console.log(`[Analytics] Fetching analytics for user ${userId}, period: ${periodDays} days`);

    // Total revenue (all time)
    const totalRevenue = await db.get(
      `SELECT COALESCE(SUM(amount - COALESCE(refund_amount, 0)), 0) as total
       FROM orders
       WHERE seller_id = ? AND payment_status = 'succeeded'`,
      [userId]
    );

    // Revenue by month (last 12 months)
    const revenueByMonth = await db.all(
      `SELECT 
        strftime('%Y-%m', created_at) as month,
        COALESCE(SUM(amount - COALESCE(refund_amount, 0)), 0) as revenue,
        COUNT(*) as order_count
       FROM orders
       WHERE seller_id = ? 
         AND payment_status = 'succeeded'
         AND created_at >= datetime('now', '-12 months')
       GROUP BY month
       ORDER BY month ASC`,
      [userId]
    );

    // Total downloads (all time) - count from projects.downloads column (primary source)
    // Also count from orders (paid downloads) and project_downloads table if they exist
    const downloadsFromProjects = await db.get(
      `SELECT COALESCE(SUM(COALESCE(downloads, 0)), 0) as total
       FROM projects
       WHERE user_id = ?`,
      [userId]
    );
    
    console.log(`[Analytics] Downloads from projects.downloads: ${downloadsFromProjects?.total || 0}`);
    
    // Also check orders for paid downloads (these might be separate)
    const downloadsFromOrders = await db.get(
      `SELECT COUNT(*) as total
       FROM orders o
       JOIN projects p ON o.project_id = p.id
       WHERE p.user_id = ? AND o.payment_status = 'succeeded'`,
      [userId]
    );
    
    console.log(`[Analytics] Downloads from orders: ${downloadsFromOrders?.total || 0}`);
    
    // Check project_downloads table if it exists (for detailed tracking)
    let freeDownloadsFromTable = { total: 0 };
    try {
      freeDownloadsFromTable = await db.get(
        `SELECT COUNT(*) as total
         FROM project_downloads pd
         JOIN projects p ON pd.project_id = p.id
         LEFT JOIN orders o ON pd.order_id = o.id
         WHERE p.user_id = ? AND o.id IS NULL`,
        [userId]
      );
    } catch (err) {
      // Table might not exist, that's okay
      console.log(`[Analytics] project_downloads table not available`);
    }
    
    console.log(`[Analytics] Free downloads from table: ${freeDownloadsFromTable?.total || 0}`);
    
    // Total = projects.downloads (primary) + orders (paid, if not already counted) + project_downloads (free, if not already counted)
    // Since projects.downloads is the main source, use that as primary
    const totalDownloads = {
      total: parseInt(downloadsFromProjects?.total || 0)
    };
    
    console.log(`[Analytics] Total downloads: ${totalDownloads.total}`);

    // Downloads by file - use projects.downloads as primary source
    // Also include orders for revenue tracking
    const downloadsByFileFromProjects = await db.all(
      `SELECT 
        p.id,
        p.title,
        COALESCE(p.downloads, 0) as download_count,
        0 as revenue
       FROM projects p
       WHERE p.user_id = ? AND COALESCE(p.downloads, 0) > 0
       ORDER BY p.downloads DESC
       LIMIT 20`,
      [userId]
    );
    
    // Get revenue from orders for these projects
    const downloadsByFileFromOrders = await db.all(
      `SELECT 
        p.id,
        COALESCE(SUM(o.amount - COALESCE(o.refund_amount, 0)), 0) as revenue
       FROM orders o
       JOIN projects p ON o.project_id = p.id
       WHERE p.user_id = ? AND o.payment_status = 'succeeded'
       GROUP BY p.id`,
      [userId]
    );
    
    // Create a map of revenue by project ID
    const revenueMap = new Map();
    downloadsByFileFromOrders.forEach(item => {
      revenueMap.set(item.id, parseFloat(item.revenue || 0));
    });
    
    // Merge downloads and revenue
    const downloadsByFile = downloadsByFileFromProjects.map(item => ({
      id: item.id,
      title: item.title,
      download_count: parseInt(item.download_count || 0),
      revenue: revenueMap.get(item.id) || 0
    })).sort((a, b) => b.download_count - a.download_count);
    
    console.log(`[Analytics] Downloads by file: ${downloadsByFile.length} files with downloads`);

    // File views (total and by file)
    // Use project_views table if available, otherwise fall back to projects.views
    const totalViewsFromTable = await db.get(
      `SELECT COUNT(*) as total
       FROM project_views pv
       JOIN projects p ON pv.project_id = p.id
       WHERE p.user_id = ?`,
      [userId]
    );
    
    const totalViewsFromProjects = await db.get(
      `SELECT COALESCE(SUM(views), 0) as total
       FROM projects
       WHERE user_id = ?`,
      [userId]
    );
    
    // Use the larger value (project_views is more accurate, but projects.views might have historical data)
    const totalViews = {
      total: Math.max(
        parseInt(totalViewsFromTable?.total || 0),
        parseInt(totalViewsFromProjects?.total || 0)
      )
    };

    // Views by file - use projects.views as primary source since project_views might be empty
    const viewsByFile = await db.all(
      `SELECT 
        p.id,
        p.title,
        COALESCE(p.views, 0) as view_count,
        COALESCE(p.views, 0) as total_views,
        COALESCE(COUNT(pv.id), 0) as tracked_views
       FROM projects p
       LEFT JOIN project_views pv ON p.id = pv.project_id
       WHERE p.user_id = ? AND COALESCE(p.views, 0) > 0
       GROUP BY p.id, p.title, p.views
       ORDER BY p.views DESC
       LIMIT 20`,
      [userId]
    );

    // Conversion rate (downloads / views for paid files)
    const conversionData = await db.get(
      `SELECT 
        COUNT(DISTINCT pv.project_id) as files_with_views,
        COUNT(DISTINCT pd.project_id) as files_with_downloads,
        COUNT(DISTINCT CASE WHEN p.for_sale = 1 THEN pv.project_id END) as paid_files_with_views,
        COUNT(DISTINCT CASE WHEN p.for_sale = 1 THEN pd.project_id END) as paid_files_with_downloads
       FROM projects p
       LEFT JOIN project_views pv ON p.id = pv.project_id
       LEFT JOIN project_downloads pd ON p.id = pd.project_id
       WHERE p.user_id = ? AND p.for_sale = 1`,
      [userId]
    );

    // For conversion rate, use projects.views for views and orders for downloads
    const totalViewsForPaid = await db.get(
      `SELECT COALESCE(SUM(views), 0) as total
       FROM projects
       WHERE user_id = ? AND for_sale = 1`,
      [userId]
    );

    const totalDownloadsForPaid = await db.get(
      `SELECT COUNT(*) as total
       FROM orders o
       JOIN projects p ON o.project_id = p.id
       WHERE p.user_id = ? AND p.for_sale = 1 AND o.payment_status = 'succeeded'`,
      [userId]
    );

    const conversionRate = totalViewsForPaid.total > 0
      ? (totalDownloadsForPaid.total / totalViewsForPaid.total) * 100
      : 0;

    // Top-selling items (by revenue)
    const topSellingItems = await db.all(
      `SELECT 
        p.id,
        p.title,
        p.thumbnail_path,
        COUNT(DISTINCT pd.id) as download_count,
        COALESCE(SUM(o.amount - COALESCE(o.refund_amount, 0)), 0) as revenue,
        p.price
       FROM projects p
       INNER JOIN project_downloads pd ON p.id = pd.project_id
       INNER JOIN orders o ON pd.order_id = o.id
       WHERE p.user_id = ? 
         AND o.payment_status = 'succeeded'
       GROUP BY p.id, p.title, p.thumbnail_path, p.price
       HAVING revenue > 0
       ORDER BY revenue DESC
       LIMIT 10`,
      [userId]
    );

    // Revenue trend (last N days)
    const revenueTrend = await db.all(
      `SELECT 
        date(created_at) as date,
        COALESCE(SUM(amount - COALESCE(refund_amount, 0)), 0) as revenue,
        COUNT(*) as order_count
       FROM orders
       WHERE seller_id = ? 
         AND payment_status = 'succeeded'
         AND date(created_at) >= date('now', '-' || ? || ' days')
       GROUP BY date(created_at)
       ORDER BY date ASC`,
      [userId, periodDays]
    );

    // Downloads trend (last N days) - try to get from project_downloads table first
    // If that doesn't exist or has no data, we can't show daily trends (projects.downloads is only a total)
    let downloadsTrend = [];
    try {
      const downloadsTrendFromTable = await db.all(
        `SELECT 
          date(pd.downloaded_at) as date,
          COUNT(*) as download_count
         FROM project_downloads pd
         JOIN projects p ON pd.project_id = p.id
         WHERE p.user_id = ?
           AND date(pd.downloaded_at) >= date('now', '-' || ? || ' days')
         GROUP BY date(pd.downloaded_at)
         ORDER BY date ASC`,
        [userId, periodDays]
      );
      
      downloadsTrend = downloadsTrendFromTable.map(item => ({
        date: item.date,
        download_count: parseInt(item.download_count || 0)
      }));
    } catch (err) {
      // project_downloads table might not exist
      console.log(`[Analytics] project_downloads table not available for trends`);
    }
    
    // Also include orders for paid downloads
    const downloadsTrendFromOrders = await db.all(
      `SELECT 
        date(o.created_at) as date,
        COUNT(*) as download_count
       FROM orders o
       JOIN projects p ON o.project_id = p.id
       WHERE p.user_id = ?
         AND o.payment_status = 'succeeded'
         AND date(o.created_at) >= date('now', '-' || ? || ' days')
       GROUP BY date(o.created_at)
       ORDER BY date ASC`,
      [userId, periodDays]
    );
    
    // Merge the two sources by date
    const downloadsTrendMap = new Map();
    downloadsTrend.forEach(item => {
      downloadsTrendMap.set(item.date, item.download_count);
    });
    downloadsTrendFromOrders.forEach(item => {
      const count = downloadsTrendMap.get(item.date) || 0;
      downloadsTrendMap.set(item.date, count + parseInt(item.download_count || 0));
    });
    
    downloadsTrend = Array.from(downloadsTrendMap.entries())
      .map(([date, download_count]) => ({ date, download_count: parseInt(download_count) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // If no trend data, show total downloads as a single point (not ideal but better than nothing)
    if (downloadsTrend.length === 0) {
      const totalDownloadsCount = parseInt(downloadsFromProjects?.total || 0);
      if (totalDownloadsCount > 0) {
        downloadsTrend.push({
          date: new Date().toISOString().split('T')[0],
          download_count: totalDownloadsCount
        });
      }
    }

    // Views trend (last N days) - use project_views if available
    // If project_views is empty, we can't show daily trends (projects.views is only a total)
    const viewsTrend = await db.all(
      `SELECT 
        date(pv.viewed_at) as date,
        COUNT(*) as view_count
       FROM project_views pv
       JOIN projects p ON pv.project_id = p.id
       WHERE p.user_id = ?
         AND date(pv.viewed_at) >= date('now', '-' || ? || ' days')
       GROUP BY date(pv.viewed_at)
       ORDER BY date ASC`,
      [userId, periodDays]
    );
    
    // If no views in project_views table, try to estimate from projects.views
    // We can't get daily breakdown, but we can show total views for the period
    if (viewsTrend.length === 0) {
      // Check if there are any views at all
      const hasViews = await db.get(
        `SELECT COALESCE(SUM(views), 0) as total
         FROM projects
         WHERE user_id = ? AND views > 0`,
        [userId]
      );
      
      if (hasViews && hasViews.total > 0) {
        // Show a single data point with all views (not ideal but better than nothing)
        viewsTrend.push({
          date: new Date().toISOString().split('T')[0],
          view_count: parseInt(hasViews.total)
        });
      }
    }
    
    console.log(`[Analytics] Views trend: ${viewsTrend.length} days with data`);

    // Ensure all numeric values are properly formatted
    const response = {
      totalRevenue: parseFloat(totalRevenue?.total || 0),
      revenueByMonth: revenueByMonth.map(item => ({
        month: item.month,
        revenue: parseFloat(item.revenue || 0),
        order_count: parseInt(item.order_count || 0)
      })),
      totalDownloads: parseInt(totalDownloads?.total || 0),
      downloadsByFile: downloadsByFile.map(item => ({
        id: item.id,
        title: item.title,
        download_count: parseInt(item.download_count || 0),
        revenue: parseFloat(item.revenue || 0)
      })),
      totalViews: parseInt(totalViews?.total || 0),
      viewsByFile: viewsByFile.map(item => ({
        id: item.id,
        title: item.title,
        view_count: parseInt(item.view_count || item.total_views || 0),
        total_views: parseInt(item.total_views || item.view_count || 0)
      })),
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      topSellingItems: topSellingItems.map(item => ({
        id: item.id,
        title: item.title,
        thumbnail_path: item.thumbnail_path,
        download_count: parseInt(item.download_count || 0),
        revenue: parseFloat(item.revenue || 0),
        price: parseFloat(item.price || 0)
      })),
      trends: {
        revenue: revenueTrend.map(item => ({
          date: item.date,
          revenue: parseFloat(item.revenue || 0),
          order_count: parseInt(item.order_count || 0)
        })),
        downloads: downloadsTrend.map(item => ({
          date: item.date,
          download_count: parseInt(item.download_count || 0)
        })),
        views: viewsTrend.map(item => ({
          date: item.date,
          view_count: parseInt(item.view_count || 0)
        }))
      },
      period: periodDays
    };

    console.log(`[Analytics] Response summary:`, {
      totalRevenue: response.totalRevenue,
      totalDownloads: response.totalDownloads,
      totalViews: response.totalViews,
      downloadsByFileCount: response.downloadsByFile.length,
      viewsByFileCount: response.viewsByFile.length,
      downloadsTrendDays: response.trends.downloads.length,
      viewsTrendDays: response.trends.views.length
    });
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

