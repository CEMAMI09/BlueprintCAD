// backend/routes/analytics.js — seller analytics (PostgreSQL), time ranges, real aggregates
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getOne, getAll, query } = require("../lib/db");
const { ensureProjectViewEventsTable } = require("../lib/analyticsSchema");

const MAX_PERIOD_DAYS = 730;

function clampPeriod(raw) {
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(n, MAX_PERIOD_DAYS);
}

function toIso(d) {
  return d.toISOString();
}

/** UTC midnight for each day from (end - periodDays + 1) through end (inclusive calendar days). */
function trendDayStrings(periodDays) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (periodDays - 1));
  start.setUTCHours(0, 0, 0, 0);
  const days = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return { days, rangeStart: start, rangeEnd: end };
}

function priorRange(rangeStart, periodDays) {
  const priorEnd = new Date(rangeStart);
  const priorStart = new Date(priorEnd);
  priorStart.setUTCDate(priorStart.getUTCDate() - periodDays);
  return { priorStart, priorEnd };
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p > 0) return Math.round(((c - p) / p) * 1000) / 10;
  if (c > 0) return 100;
  return 0;
}

function mergeTrend(days, rows, dateKey, fieldMap) {
  const map = new Map();
  for (const row of rows || []) {
    let key = row[dateKey];
    if (key instanceof Date) key = key.toISOString().slice(0, 10);
    else if (typeof key === "string") key = key.slice(0, 10);
    map.set(key, row);
  }
  return days.map((date) => {
    const r = map.get(date) || {};
    const out = { date };
    for (const [outKey, srcKey] of Object.entries(fieldMap)) {
      out[outKey] = Number(r[srcKey] ?? 0) || 0;
    }
    return out;
  });
}

async function ordersRevenueAndCount(userId, startIso, endIso) {
  try {
    const r = await getOne(
      `SELECT COALESCE(SUM(amount), 0)::float AS revenue, COUNT(*)::int AS order_count
       FROM orders
       WHERE seller_id = $1
         AND payment_status = 'succeeded'
         AND COALESCE(status, '') <> 'refunded'
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz`,
      [userId, startIso, endIso]
    );
    return {
      revenue: parseFloat(r?.revenue || 0),
      order_count: parseInt(r?.order_count || 0, 10),
    };
  } catch {
    return { revenue: 0, order_count: 0 };
  }
}

async function ordersDownloadsSum(userId, startIso, endIso) {
  try {
    const r = await getOne(
      `SELECT COALESCE(SUM(download_count), 0)::bigint AS downloads
       FROM orders
       WHERE seller_id = $1
         AND payment_status = 'succeeded'
         AND COALESCE(status, '') <> 'refunded'
         AND created_at >= $2::timestamptz
         AND created_at <= $3::timestamptz`,
      [userId, startIso, endIso]
    );
    return parseInt(r?.downloads || 0, 10);
  } catch {
    return 0;
  }
}

async function viewEventsCount(userId, startIso, endIso) {
  try {
    await ensureProjectViewEventsTable();
    const r = await getOne(
      `SELECT COUNT(*)::bigint AS c
       FROM project_view_events e
       INNER JOIN projects p ON p.id = e.project_id
       WHERE p.user_id = $1
         AND e.viewed_at >= $2::timestamptz
         AND e.viewed_at <= $3::timestamptz`,
      [userId, startIso, endIso]
    );
    return parseInt(r?.c || 0, 10);
  } catch {
    return 0;
  }
}

async function viewsLifetime(userId) {
  const r = await getOne(
    `SELECT COALESCE(SUM(COALESCE(views, 0)), 0)::bigint AS v FROM projects WHERE user_id = $1`,
    [userId]
  );
  return parseInt(r?.v || 0, 10);
}

async function starsLifetime(userId) {
  const r = await getOne(
    `SELECT COALESCE(SUM(COALESCE(likes, 0)), 0)::bigint AS s FROM projects WHERE user_id = $1`,
    [userId]
  );
  return parseInt(r?.s || 0, 10);
}

// GET /api/analytics/seller — also used by GET / with ?range=7d|30d|90d|1y
async function sellerAnalytics(req, res) {
  try {
    const decoded = getUserFromRequest(req);
    if (!decoded || decoded.userId == null) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = Number(decoded.userId);
    const period = clampPeriod(req.query.period);
    const sortProjects = String(req.query.sortProjects || "views_period").toLowerCase();
    const sortFiles = String(req.query.sortFiles || "downloads").toLowerCase();

    const { days, rangeStart, rangeEnd } = trendDayStrings(period);
    const startIso = toIso(rangeStart);
    const endIso = toIso(rangeEnd);
    const { priorStart, priorEnd } = priorRange(rangeStart, period);
    const priorStartIso = toIso(priorStart);
    const priorEndIso = toIso(priorEnd);

    await ensureProjectViewEventsTable();

    const [currentRev, priorRev, currentDl, priorDl, currentViews, priorViews, viewsLife, starsLife] =
      await Promise.all([
        ordersRevenueAndCount(userId, startIso, endIso),
        ordersRevenueAndCount(userId, priorStartIso, priorEndIso),
        ordersDownloadsSum(userId, startIso, endIso),
        ordersDownloadsSum(userId, priorStartIso, priorEndIso),
        viewEventsCount(userId, startIso, endIso),
        viewEventsCount(userId, priorStartIso, priorEndIso),
        viewsLifetime(userId),
        starsLifetime(userId),
      ]);

    const totalProjectsResult = await getOne(
      `SELECT COUNT(*)::int AS c FROM projects WHERE user_id = $1`,
      [userId]
    );
    const totalProjects = parseInt(totalProjectsResult?.c || 0, 10);

    const forSaleCountResult = await getOne(
      `SELECT COUNT(*)::int AS c FROM projects WHERE user_id = $1 AND (for_sale IS TRUE OR for_sale = 1)`,
      [userId]
    );
    const forSaleCount = parseInt(forSaleCountResult?.c || 0, 10);

    let conversionRate = 0;
    if (forSaleCount > 0) {
      try {
        const salesInPeriod = await getOne(
          `SELECT COUNT(*)::int AS c
           FROM orders
           WHERE seller_id = $1
             AND payment_status = 'succeeded'
             AND COALESCE(status, '') <> 'refunded'
             AND created_at >= $2::timestamptz
             AND created_at <= $3::timestamptz`,
          [userId, startIso, endIso]
        );
        const salesCount = parseInt(salesInPeriod?.c || 0, 10);
        const denom = Math.max(currentViews, 1);
        conversionRate = Math.min(100, Math.round((salesCount / denom) * 10000) / 100);
      } catch {
        conversionRate = 0;
      }
    }

    // Daily trends (one query each)
    let revenueRows = [];
    let downloadRows = [];
    let viewRows = [];
    try {
      revenueRows = await getAll(
        `SELECT (created_at AT TIME ZONE 'UTC')::date AS d,
                COALESCE(SUM(amount), 0)::float AS revenue,
                COUNT(*)::int AS order_count
         FROM orders
         WHERE seller_id = $1
           AND payment_status = 'succeeded'
           AND COALESCE(status, '') <> 'refunded'
           AND created_at >= $2::timestamptz
           AND created_at <= $3::timestamptz
         GROUP BY 1 ORDER BY 1`,
        [userId, startIso, endIso]
      );
    } catch {
      revenueRows = [];
    }
    try {
      downloadRows = await getAll(
        `SELECT (created_at AT TIME ZONE 'UTC')::date AS d,
                COALESCE(SUM(download_count), 0)::bigint AS download_count
         FROM orders
         WHERE seller_id = $1
           AND payment_status = 'succeeded'
           AND COALESCE(status, '') <> 'refunded'
           AND created_at >= $2::timestamptz
           AND created_at <= $3::timestamptz
         GROUP BY 1 ORDER BY 1`,
        [userId, startIso, endIso]
      );
    } catch {
      downloadRows = [];
    }
    try {
      viewRows = await getAll(
        `SELECT (e.viewed_at AT TIME ZONE 'UTC')::date AS d,
                COUNT(*)::bigint AS view_count
         FROM project_view_events e
         INNER JOIN projects p ON p.id = e.project_id AND p.user_id = $1
         WHERE e.viewed_at >= $2::timestamptz
           AND e.viewed_at <= $3::timestamptz
         GROUP BY 1 ORDER BY 1`,
        [userId, startIso, endIso]
      );
    } catch {
      viewRows = [];
    }

    const trends = {
      revenue: mergeTrend(days, revenueRows, "d", { revenue: "revenue", order_count: "order_count" }),
      downloads: mergeTrend(days, downloadRows, "d", { download_count: "download_count" }),
      views: mergeTrend(days, viewRows, "d", { view_count: "view_count" }),
    };

    // Revenue by month (last 12 months)
    const revenueByMonth = [];
    try {
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1, 0, 0, 0, 0));
        const mr = await getOne(
          `SELECT COALESCE(SUM(amount), 0)::float AS revenue, COUNT(*)::int AS order_count
           FROM orders
           WHERE seller_id = $1
             AND payment_status = 'succeeded'
             AND COALESCE(status, '') <> 'refunded'
             AND created_at >= $2::timestamptz
             AND created_at < $3::timestamptz`,
          [userId, monthStart.toISOString(), monthEnd.toISOString()]
        );
        revenueByMonth.push({
          month: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          revenue: parseFloat(mr?.revenue || 0),
          order_count: parseInt(mr?.order_count || 0, 10),
        });
      }
    } catch {
      const nowCatch = new Date();
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(
          Date.UTC(nowCatch.getUTCFullYear(), nowCatch.getUTCMonth() - i, 1)
        );
        revenueByMonth.push({
          month: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          revenue: 0,
          order_count: 0,
        });
      }
    }

    let topSellingItems = [];
    try {
      topSellingItems = await getAll(
        `SELECT 
          p.id,
          p.title,
          p.thumbnail_path,
          p.price,
          COALESCE(SUM(o.download_count), 0)::int AS download_count,
          COALESCE(SUM(o.amount), 0)::float AS revenue,
          COUNT(o.id)::int AS order_count
         FROM projects p
         INNER JOIN orders o ON p.id = o.project_id
           AND o.seller_id = $1
           AND o.payment_status = 'succeeded'
           AND COALESCE(o.status, '') <> 'refunded'
           AND o.created_at >= $2::timestamptz
           AND o.created_at <= $3::timestamptz
         WHERE p.user_id = $1 AND (p.for_sale IS TRUE OR p.for_sale = 1)
         GROUP BY p.id, p.title, p.thumbnail_path, p.price
         ORDER BY revenue DESC NULLS LAST, download_count DESC
         LIMIT 20`,
        [userId, startIso, endIso]
      );
    } catch {
      topSellingItems = [];
    }

    let downloadsByFile = [];
    try {
      downloadsByFile = await getAll(
        `SELECT 
          p.id,
          p.title,
          COALESCE(SUM(o.download_count), 0)::int AS download_count,
          COALESCE(SUM(o.amount), 0)::float AS revenue
         FROM projects p
         LEFT JOIN orders o ON p.id = o.project_id
           AND o.seller_id = $1
           AND o.payment_status = 'succeeded'
           AND COALESCE(o.status, '') <> 'refunded'
           AND o.created_at >= $2::timestamptz
           AND o.created_at <= $3::timestamptz
         WHERE p.user_id = $1
         GROUP BY p.id, p.title
         HAVING COALESCE(SUM(o.download_count), 0) > 0
         ORDER BY download_count DESC
         LIMIT 50`,
        [userId, startIso, endIso]
      );
    } catch {
      downloadsByFile = [];
    }

    let viewsByFile = [];
    try {
      viewsByFile = await getAll(
        `SELECT 
          p.id,
          p.title,
          COALESCE(p.views, 0)::bigint AS total_views,
          COALESCE(COUNT(e.id), 0)::bigint AS views_in_period
         FROM projects p
         LEFT JOIN project_view_events e ON e.project_id = p.id
           AND e.viewed_at >= $2::timestamptz
           AND e.viewed_at <= $3::timestamptz
         WHERE p.user_id = $1
         GROUP BY p.id, p.title, p.views`,
        [userId, startIso, endIso]
      );
      const sortKey =
        sortFiles === "views" || sortFiles === "views_period"
          ? (a, b) =>
              Number(b.views_in_period || 0) - Number(a.views_in_period || 0) ||
              Number(b.total_views || 0) - Number(a.total_views || 0)
          : sortFiles === "title"
            ? (a, b) => String(a.title || "").localeCompare(String(b.title || ""))
            : (a, b) => Number(b.total_views || 0) - Number(a.total_views || 0);
      viewsByFile.sort(sortKey);
      viewsByFile = viewsByFile.slice(0, 50);
    } catch {
      viewsByFile = [];
    }

    let projectsPerformance = [];
    try {
      projectsPerformance = await getAll(
        `SELECT 
          p.id,
          p.title,
          COALESCE(p.views, 0)::bigint AS views_lifetime,
          COALESCE(p.likes, 0)::bigint AS stars,
          (p.for_sale IS TRUE OR p.for_sale = 1) AS for_sale,
          p.created_at,
          COALESCE(vp.c, 0)::bigint AS views_period,
          COALESCE(dl.dc, 0)::bigint AS downloads_period,
          COALESCE(rv.rev, 0)::float AS revenue_period
         FROM projects p
         LEFT JOIN (
           SELECT e.project_id, COUNT(*)::bigint AS c
           FROM project_view_events e
           WHERE e.viewed_at >= $2::timestamptz AND e.viewed_at <= $3::timestamptz
           GROUP BY e.project_id
         ) vp ON vp.project_id = p.id
         LEFT JOIN (
           SELECT o.project_id, SUM(o.download_count)::bigint AS dc
           FROM orders o
           WHERE o.seller_id = $1
             AND o.payment_status = 'succeeded'
             AND COALESCE(o.status, '') <> 'refunded'
             AND o.created_at >= $2::timestamptz
             AND o.created_at <= $3::timestamptz
           GROUP BY o.project_id
         ) dl ON dl.project_id = p.id
         LEFT JOIN (
           SELECT o.project_id, SUM(o.amount)::float AS rev
           FROM orders o
           WHERE o.seller_id = $1
             AND o.payment_status = 'succeeded'
             AND COALESCE(o.status, '') <> 'refunded'
             AND o.created_at >= $2::timestamptz
             AND o.created_at <= $3::timestamptz
           GROUP BY o.project_id
         ) rv ON rv.project_id = p.id
         WHERE p.user_id = $1`,
        [userId, startIso, endIso]
      );

      const sp =
        sortProjects === "title"
          ? (a, b) => String(a.title || "").localeCompare(String(b.title || ""))
          : sortProjects === "revenue"
            ? (a, b) => Number(b.revenue_period || 0) - Number(a.revenue_period || 0)
            : sortProjects === "downloads"
              ? (a, b) => Number(b.downloads_period || 0) - Number(a.downloads_period || 0)
              : sortProjects === "stars"
                ? (a, b) => Number(b.stars || 0) - Number(a.stars || 0)
                : sortProjects === "views_lifetime"
                  ? (a, b) => Number(b.views_lifetime || 0) - Number(a.views_lifetime || 0)
                  : (a, b) =>
                      Number(b.views_period || 0) - Number(a.views_period || 0) ||
                      Number(b.views_lifetime || 0) - Number(a.views_lifetime || 0);
      projectsPerformance.sort(sp);
    } catch (e) {
      console.warn("[analytics] projectsPerformance:", e.message);
      projectsPerformance = [];
    }

    let recentActivity = [];
    try {
      const orderActs = await getAll(
        `SELECT o.created_at AS t, 'sale' AS type, o.amount, p.title AS project_title, p.id AS project_id
         FROM orders o
         JOIN projects p ON p.id = o.project_id
         WHERE o.seller_id = $1
           AND o.payment_status = 'succeeded'
           AND COALESCE(o.status, '') <> 'refunded'
           AND o.created_at >= $2::timestamptz
         ORDER BY o.created_at DESC
         LIMIT 8`,
        [userId, startIso]
      );
      for (const row of orderActs) {
        recentActivity.push({
          type: "sale",
          timestamp: row.t,
          description: `Sale: $${Number(row.amount || 0).toFixed(2)} — ${row.project_title || "Project"}`,
          project_id: row.project_id,
        });
      }
    } catch {
      /* empty */
    }
    try {
      const viewActs = await getAll(
        `SELECT e.viewed_at AS t, p.title AS project_title, p.id AS project_id
         FROM project_view_events e
         JOIN projects p ON p.id = e.project_id AND p.user_id = $1
         WHERE e.viewed_at >= $2::timestamptz
         ORDER BY e.viewed_at DESC
         LIMIT 20`,
        [userId, startIso]
      );
      for (const row of viewActs) {
        recentActivity.push({
          type: "view",
          timestamp: row.t,
          description: `Project view — ${row.project_title || "Project"}`,
          project_id: row.project_id,
        });
      }
    } catch {
      /* empty */
    }
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    recentActivity = recentActivity.slice(0, 15);

    let audience = { totalFollowers: 0, newFollowers: 0 };
    try {
      const f1 = await getOne(
        `SELECT COUNT(*)::int AS c FROM follows WHERE following_id = $1`,
        [userId]
      );
      audience.totalFollowers = parseInt(f1?.c || 0, 10);
      const f2 = await getOne(
        `SELECT COUNT(*)::int AS c FROM follows
         WHERE following_id = $1
           AND created_at >= $2::timestamptz
           AND created_at <= $3::timestamptz`,
        [userId, startIso, endIso]
      );
      audience.newFollowers = parseInt(f2?.c || 0, 10);
    } catch {
      audience = { totalFollowers: 0, newFollowers: 0 };
    }

    const avgOrder =
      currentRev.order_count > 0 ? currentRev.revenue / currentRev.order_count : 0;

    const deltas = {
      revenuePct: pctChange(currentRev.revenue, priorRev.revenue),
      downloadsPct: pctChange(currentDl, priorDl),
      viewsPct: pctChange(currentViews, priorViews),
      ordersPct: pctChange(currentRev.order_count, priorRev.order_count),
    };

    const overview = {
      totalViews: currentViews,
      totalViewsLifetime: viewsLife,
      totalDownloads: currentDl,
      totalRevenue: currentRev.revenue,
      totalStars: starsLife,
      totalOrders: currentRev.order_count,
      viewsChange: String(deltas.viewsPct),
      downloadsChange: String(deltas.downloadsPct),
      revenueChange: String(deltas.revenuePct),
      starsChange: "0",
    };

    res.json({
      period,
      periodStart: startIso,
      periodEnd: endIso,
      totalRevenue: currentRev.revenue,
      totalDownloads: currentDl,
      totalOrders: currentRev.order_count,
      totalViews: currentViews,
      totalViewsLifetime: viewsLife,
      totalStars: starsLife,
      totalProjects,
      conversionRate,
      priorPeriod: {
        totalRevenue: priorRev.revenue,
        totalDownloads: priorDl,
        totalViews: priorViews,
        totalOrders: priorRev.order_count,
      },
      deltas,
      revenueByMonth,
      trends,
      topSellingItems: (topSellingItems || []).map((r) => ({
        id: r.id,
        title: r.title,
        thumbnail_path: r.thumbnail_path,
        download_count: parseInt(r.download_count || 0, 10),
        revenue: parseFloat(r.revenue || 0),
        price: parseFloat(r.price || 0),
        order_count: parseInt(r.order_count || 0, 10),
      })),
      downloadsByFile: (downloadsByFile || []).map((r) => ({
        id: r.id,
        title: r.title,
        download_count: parseInt(r.download_count || 0, 10),
        revenue: parseFloat(r.revenue || 0),
      })),
      viewsByFile: (viewsByFile || []).map((r) => ({
        id: r.id,
        title: r.title,
        view_count: parseInt(r.views_in_period || 0, 10),
        total_views: parseInt(r.total_views || 0, 10),
      })),
      projectsPerformance: (projectsPerformance || []).map((r) => ({
        id: r.id,
        title: r.title,
        views: parseInt(r.views_period || 0, 10),
        viewsLifetime: parseInt(r.views_lifetime || 0, 10),
        downloads: parseInt(r.downloads_period || 0, 10),
        stars: parseInt(r.stars || 0, 10),
        revenue: parseFloat(r.revenue_period || 0),
        for_sale: !!r.for_sale,
        created_at: r.created_at,
        status: r.for_sale ? "For sale" : "Not listed",
      })),
      recentActivity,
      audience,
      sales: {
        totalSales: currentRev.order_count,
        totalRevenue: currentRev.revenue,
        averageOrder: avgOrder,
      },
      overview,
      topProjects: (projectsPerformance || [])
        .slice()
        .sort(
          (a, b) =>
            Number(b.views_lifetime || 0) - Number(a.views_lifetime || 0)
        )
        .slice(0, 10)
        .map((r) => ({
          id: r.id,
          title: r.title,
          views: parseInt(r.views_lifetime || 0, 10),
        })),
      projects: (projectsPerformance || []).map((r) => ({
        id: r.id,
        title: r.title,
        views: parseInt(r.views_period || 0, 10),
        viewsLifetime: parseInt(r.views_lifetime || 0, 10),
        downloads: parseInt(r.downloads_period || 0, 10),
        stars: parseInt(r.stars || 0, 10),
        revenue: parseFloat(r.revenue_period || 0),
        status: r.for_sale ? "For sale" : "Personal",
      })),
    });
  } catch (error) {
    console.error("GET /api/analytics/seller error:", error);
    res.status(500).json({
      error: "Failed to fetch analytics",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

router.get("/seller", sellerAnalytics);

router.get("/", (req, res) => {
  const range = String(req.query.range || "30d");
  const map = { "7d": 7, "30d": 30, "90d": 90, "180d": 180, "1y": 365 };
  req.query.period = String(map[range] || 30);
  return sellerAnalytics(req, res);
});

module.exports = router;
