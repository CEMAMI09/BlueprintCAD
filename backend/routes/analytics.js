// backend/routes/analytics.js
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getOne, getAll, execute } = require("../lib/db");

// GET /api/analytics/seller - Get seller analytics
router.get("/seller", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = decoded.userId;
    const period = parseInt(req.query.period) || 30; // Default to 30 days
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - period);

    // Helper function to check if using PostgreSQL or SQLite
    const isPostgreSQL = async () => {
      try {
        const result = await getOne("SELECT 1");
        // If we can query, check the database type
        // For now, we'll use SQLite syntax and adapt if needed
        return false; // Default to SQLite
      } catch {
        return false;
      }
    };

    // Total Revenue (from orders where user is seller)
    const totalRevenueResult = await getOne(
      `SELECT COALESCE(SUM(amount), 0) as total_revenue
       FROM orders
       WHERE seller_id = $1 
       AND payment_status = 'succeeded'
       AND status != 'refunded'
       AND created_at >= NOW() - INTERVAL '${period} days'`,
      [userId]
    );
    const totalRevenue = parseFloat(totalRevenueResult?.total_revenue || 0);

    // Total Downloads (sum of download_count from orders)
    const totalDownloadsResult = await getOne(
      `SELECT COALESCE(SUM(download_count), 0) as total_downloads
       FROM orders
       WHERE seller_id = $1 
       AND payment_status = 'succeeded'
       AND status != 'refunded'
       AND created_at >= NOW() - INTERVAL '${period} days'`,
      [userId]
    );
    const totalDownloads = parseInt(totalDownloadsResult?.total_downloads || 0);

    // Total Views (sum of views from user's projects)
    const totalViewsResult = await getOne(
      `SELECT COALESCE(SUM(views), 0) as total_views
       FROM projects
       WHERE user_id = $1`,
      [userId]
    );
    const totalViews = parseInt(totalViewsResult?.total_views || 0);

    // Total Projects
    const totalProjectsResult = await getOne(
      `SELECT COUNT(*)::int as count FROM projects WHERE user_id = $1`,
      [userId]
    );
    const totalProjects = parseInt(totalProjectsResult?.count || 0);

    // Conversion Rate (sales / views for projects that are for sale)
    let conversionRate = 0;
    if (totalViews > 0 && totalProjects > 0) {
      const forSaleProjects = await getOne(
        `SELECT COUNT(*)::int as count FROM projects WHERE user_id = $1 AND for_sale = 1`,
        [userId]
      );
      const forSaleCount = parseInt(forSaleProjects?.count || 0);
      if (forSaleCount > 0) {
        const totalSales = await getOne(
          `SELECT COUNT(*)::int as count 
           FROM orders 
           WHERE seller_id = $1 
           AND payment_status = 'succeeded' 
           AND status != 'refunded'
           AND created_at >= NOW() - INTERVAL '${period} days'`,
          [userId]
        );
        const salesCount = parseInt(totalSales?.count || 0);
        // Rough conversion: sales / (views of for-sale projects)
        // We'll use a simplified calculation
        conversionRate = salesCount > 0 ? (salesCount / Math.max(totalViews, 1)) * 100 : 0;
      }
    }

    // Revenue by Month (last 12 months)
    const revenueByMonth = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthResult = await getOne(
        `SELECT 
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(*)::int as order_count
         FROM orders
         WHERE seller_id = $1
         AND payment_status = 'succeeded'
         AND status != 'refunded'
         AND created_at >= $2
         AND created_at < $3`,
        [userId, monthStart.toISOString(), monthEnd.toISOString()]
      );

      revenueByMonth.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: parseFloat(monthResult?.revenue || 0),
        order_count: parseInt(monthResult?.order_count || 0),
      });
    }

    // Trends (daily data for the selected period)
    const trends = {
      revenue: [],
      downloads: [],
      views: [],
    };

    // Generate daily data points
    for (let i = period - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dateStr = date.toISOString().split('T')[0];

      // Revenue for this day
      const dayRevenue = await getOne(
        `SELECT 
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(*)::int as order_count
         FROM orders
         WHERE seller_id = $1
         AND payment_status = 'succeeded'
         AND status != 'refunded'
         AND created_at >= $2
         AND created_at < $3`,
        [userId, date.toISOString(), nextDate.toISOString()]
      );

      // Downloads for this day
      const dayDownloads = await getOne(
        `SELECT COALESCE(SUM(download_count), 0) as downloads
         FROM orders
         WHERE seller_id = $1
         AND payment_status = 'succeeded'
         AND status != 'refunded'
         AND created_at >= $2
         AND created_at < $3`,
        [userId, date.toISOString(), nextDate.toISOString()]
      );

      trends.revenue.push({
        date: dateStr,
        revenue: parseFloat(dayRevenue?.revenue || 0),
        order_count: parseInt(dayRevenue?.order_count || 0),
      });

      trends.downloads.push({
        date: dateStr,
        download_count: parseInt(dayDownloads?.downloads || 0),
      });

      // Views are cumulative, so we'll get the total views up to this date
      // For simplicity, we'll use a simplified approach
      trends.views.push({
        date: dateStr,
        view_count: 0, // Views are tracked per project, not per day, so we'll leave this as 0 for now
      });
    }

    // Top Selling Items
    const topSellingItems = await getAll(
      `SELECT 
        p.id,
        p.title,
        p.thumbnail_path,
        p.price,
        COALESCE(SUM(o.download_count), 0)::int as download_count,
        COALESCE(SUM(o.amount), 0) as revenue,
        COUNT(o.id)::int as order_count
       FROM projects p
       LEFT JOIN orders o ON p.id = o.project_id 
         AND o.seller_id = $1
         AND o.payment_status = 'succeeded'
         AND o.status != 'refunded'
         AND o.created_at >= NOW() - INTERVAL '${period} days'
       WHERE p.user_id = $1 AND p.for_sale = 1
       GROUP BY p.id, p.title, p.thumbnail_path, p.price
       HAVING order_count > 0
       ORDER BY revenue DESC, download_count DESC
       LIMIT 10`,
      [userId]
    );

    // Downloads by File
    const downloadsByFile = await getAll(
      `SELECT 
        p.id,
        p.title,
        COALESCE(SUM(o.download_count), 0)::int as download_count,
        COALESCE(SUM(o.amount), 0) as revenue
       FROM projects p
       LEFT JOIN orders o ON p.id = o.project_id 
         AND o.seller_id = $1
         AND o.payment_status = 'succeeded'
         AND o.status != 'refunded'
         AND o.created_at >= NOW() - INTERVAL '${period} days'
       WHERE p.user_id = $1
       GROUP BY p.id, p.title
       HAVING download_count > 0
       ORDER BY download_count DESC
       LIMIT 20`,
      [userId]
    );

    // Views by File
    const viewsByFile = await getAll(
      `SELECT 
        id,
        title,
        views as view_count,
        views as total_views
       FROM projects
       WHERE user_id = $1
       ORDER BY views DESC
       LIMIT 20`,
      [userId]
    );

    res.json({
      totalRevenue,
      revenueByMonth,
      totalDownloads,
      downloadsByFile: downloadsByFile || [],
      totalViews,
      viewsByFile: viewsByFile || [],
      conversionRate,
      topSellingItems: topSellingItems || [],
      trends,
      period,
    });
  } catch (error) {
    console.error("GET /api/analytics/seller error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

module.exports = router;

