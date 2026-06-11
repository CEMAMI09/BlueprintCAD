// backend/routes/forum.js
const express = require("express");
const router = express.Router();
const { getOne, getAll, execute } = require("../lib/db");
const { getUserFromRequest } = require("../lib/auth");
const { ensureForumTables } = require("../lib/forumSchema");

const CATEGORIES = ["general", "electronics", "mechanical", "3d-printing", "help"];

// Prevent duplicate view counts from rapid repeat requests (e.g. React Strict Mode)
const recentThreadViews = new Map();
const VIEW_DEDUP_MS = 5000;

function getViewDedupKey(req, threadId) {
  const decoded = getUserFromRequest(req);
  const viewerId = decoded?.userId ? `user:${decoded.userId}` : `ip:${req.ip || req.socket?.remoteAddress || "anon"}`;
  return `${threadId}:${viewerId}`;
}

// GET /api/forum/stats
router.get("/stats", async (req, res) => {
  try {
    await ensureForumTables();

    const rows = await getAll(
      `SELECT category, COUNT(*)::int AS count
       FROM forum_threads
       GROUP BY category`,
      []
    );

    const stats = { all: 0, general: 0, electronics: 0, mechanical: 0, "3d-printing": 0, help: 0 };
    for (const row of rows) {
      const cat = row.category || "general";
      if (stats[cat] !== undefined) {
        stats[cat] = row.count;
      }
      stats.all += row.count;
    }

    res.json(stats);
  } catch (error) {
    console.error("GET /api/forum/stats error:", error);
    res.status(500).json({ error: "Failed to fetch forum stats" });
  }
});

// GET /api/forum/threads
router.get("/threads", async (req, res) => {
  try {
    await ensureForumTables();

    const { category, search, sort, username } = req.query;
    const params = [];
    let paramIndex = 1;

    let sql = `
      SELECT
        t.id,
        t.title,
        t.content,
        t.category,
        t.views,
        t.is_pinned,
        t.is_locked,
        t.created_at,
        u.username,
        u.profile_picture,
        COALESCE(r.reply_count, 0)::int AS reply_count,
        COALESCE(r.last_reply_at, t.created_at) AS last_activity
      FROM forum_threads t
      INNER JOIN users u ON t.user_id = u.id
      LEFT JOIN (
        SELECT thread_id, COUNT(*)::int AS reply_count, MAX(created_at) AS last_reply_at
        FROM forum_replies
        GROUP BY thread_id
      ) r ON r.thread_id = t.id
      WHERE 1=1
    `;

    if (username && String(username).trim()) {
      sql += ` AND u.username = $${paramIndex}`;
      params.push(String(username).trim());
      paramIndex++;
    }

    if (category && category !== "all") {
      sql += ` AND t.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search && String(search).trim()) {
      sql += ` AND (t.title ILIKE $${paramIndex} OR t.content ILIKE $${paramIndex})`;
      params.push(`%${String(search).trim()}%`);
      paramIndex++;
    }

    const sortKey = sort || "latest";
    if (sortKey === "top") {
      sql += ` ORDER BY t.is_pinned DESC, reply_count DESC, t.views DESC, t.created_at DESC`;
    } else if (sortKey === "new") {
      sql += ` ORDER BY t.is_pinned DESC, t.created_at DESC`;
    } else {
      sql += ` ORDER BY t.is_pinned DESC, last_activity DESC`;
    }

    const threads = await getAll(sql, params);
    res.json(threads);
  } catch (error) {
    console.error("GET /api/forum/threads error:", error);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

// GET /api/forum/top-contributors
router.get("/top-contributors", async (req, res) => {
  try {
    await ensureForumTables();

    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 25);

    const contributors = await getAll(
      `SELECT
        u.username,
        u.profile_picture,
        COALESCE(t.thread_count, 0)::int AS posts,
        COALESCE(r.reply_count, 0)::int AS replies,
        (COALESCE(t.thread_count, 0) * 2 + COALESCE(r.reply_count, 0))::int AS reputation
       FROM users u
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS thread_count
         FROM forum_threads
         GROUP BY user_id
       ) t ON t.user_id = u.id
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS reply_count
         FROM forum_replies
         GROUP BY user_id
       ) r ON r.user_id = u.id
       WHERE COALESCE(t.thread_count, 0) + COALESCE(r.reply_count, 0) > 0
       ORDER BY reputation DESC, posts DESC, replies DESC, u.username ASC
       LIMIT $1`,
      [limit]
    );

    res.json(contributors);
  } catch (error) {
    console.error("GET /api/forum/top-contributors error:", error);
    res.status(500).json({ error: "Failed to fetch top contributors" });
  }
});

// POST /api/forum/threads
router.post("/threads", async (req, res) => {
  try {
    await ensureForumTables();

    const decoded = getUserFromRequest(req);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "You must be logged in to create a thread" });
    }

    const { title, content, category } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    const threadCategory = category && CATEGORIES.includes(category) ? category : "general";

    const result = await execute(
      `INSERT INTO forum_threads (user_id, title, content, category)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, content, category, views, is_pinned, is_locked, created_at, user_id`,
      [decoded.userId, String(title).trim(), String(content).trim(), threadCategory]
    );

    const thread = result.rows[0];
    res.status(201).json(thread);
  } catch (error) {
    console.error("POST /api/forum/threads error:", error);
    res.status(500).json({ error: "Failed to create thread" });
  }
});

// POST /api/forum/:id/view — record a single page view (must come before /:id routes)
router.post("/:id/view", async (req, res) => {
  try {
    await ensureForumTables();

    const threadId = parseInt(req.params.id, 10);
    if (Number.isNaN(threadId)) {
      return res.status(400).json({ error: "Invalid thread ID" });
    }

    const thread = await getOne(
      `SELECT id, views FROM forum_threads WHERE id = $1`,
      [threadId]
    );
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const dedupKey = getViewDedupKey(req, threadId);
    const lastViewedAt = recentThreadViews.get(dedupKey);
    const now = Date.now();

    if (lastViewedAt && now - lastViewedAt < VIEW_DEDUP_MS) {
      return res.json({ views: thread.views || 0 });
    }

    recentThreadViews.set(dedupKey, now);

    const result = await execute(
      `UPDATE forum_threads SET views = views + 1 WHERE id = $1 RETURNING views`,
      [threadId]
    );

    res.json({ views: result.rows[0].views });
  } catch (error) {
    console.error("POST /api/forum/:id/view error:", error);
    res.status(500).json({ error: "Failed to record view" });
  }
});

// GET /api/forum/:id
router.get("/:id", async (req, res) => {
  try {
    await ensureForumTables();

    const threadId = parseInt(req.params.id, 10);
    if (Number.isNaN(threadId)) {
      return res.status(400).json({ error: "Invalid thread ID" });
    }

    const thread = await getOne(
      `SELECT
        t.id,
        t.title,
        t.content,
        t.category,
        t.views,
        t.is_pinned,
        t.is_locked,
        t.created_at,
        t.user_id,
        u.username,
        u.profile_picture
       FROM forum_threads t
       INNER JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [threadId]
    );

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const replies = await getAll(
      `SELECT
        r.id,
        r.content,
        r.created_at,
        u.username,
        u.profile_picture
       FROM forum_replies r
       INNER JOIN users u ON r.user_id = u.id
       WHERE r.thread_id = $1
       ORDER BY r.created_at ASC`,
      [threadId]
    );

    thread.replies = replies;
    res.json(thread);
  } catch (error) {
    console.error("GET /api/forum/:id error:", error);
    res.status(500).json({ error: "Failed to fetch thread" });
  }
});

// POST /api/forum/:id — add a reply
router.post("/:id", async (req, res) => {
  try {
    await ensureForumTables();

    const decoded = getUserFromRequest(req);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "You must be logged in to reply" });
    }

    const threadId = parseInt(req.params.id, 10);
    if (Number.isNaN(threadId)) {
      return res.status(400).json({ error: "Invalid thread ID" });
    }

    const { content } = req.body || {};
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: "Reply content is required" });
    }

    const thread = await getOne(
      `SELECT id, is_locked FROM forum_threads WHERE id = $1`,
      [threadId]
    );
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }
    if (thread.is_locked) {
      return res.status(403).json({ error: "This thread is locked" });
    }

    const result = await execute(
      `INSERT INTO forum_replies (thread_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at, user_id`,
      [threadId, decoded.userId, String(content).trim()]
    );

    await execute(
      `UPDATE forum_threads SET updated_at = NOW() WHERE id = $1`,
      [threadId]
    );

    const reply = result.rows[0];
    const user = await getOne(
      `SELECT username, profile_picture FROM users WHERE id = $1`,
      [decoded.userId]
    );

    res.status(201).json({
      ...reply,
      username: user?.username,
      profile_picture: user?.profile_picture,
    });
  } catch (error) {
    console.error("POST /api/forum/:id error:", error);
    res.status(500).json({ error: "Failed to post reply" });
  }
});

// DELETE /api/forum/:id
router.delete("/:id", async (req, res) => {
  try {
    await ensureForumTables();

    const decoded = getUserFromRequest(req);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const threadId = parseInt(req.params.id, 10);
    if (Number.isNaN(threadId)) {
      return res.status(400).json({ error: "Invalid thread ID" });
    }

    const thread = await getOne(
      `SELECT id, user_id FROM forum_threads WHERE id = $1`,
      [threadId]
    );
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    if (Number(thread.user_id) !== Number(decoded.userId)) {
      return res.status(403).json({ error: "You can only delete your own threads" });
    }

    await execute(`DELETE FROM forum_threads WHERE id = $1`, [threadId]);
    res.json({ message: "Thread deleted" });
  } catch (error) {
    console.error("DELETE /api/forum/:id error:", error);
    res.status(500).json({ error: "Failed to delete thread" });
  }
});

module.exports = router;
