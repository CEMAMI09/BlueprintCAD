// backend/routes/stats.js
const express = require("express");
const router = express.Router();
const { getDb } = require("../../db/db");
const { getUserFromRequest } = require("../lib/auth");

// GET /api/stats/dashboard - Get dashboard statistics
router.get("/dashboard", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = await getDb();

    // Get total projects
    const projectsCount = await db.get(
      "SELECT COUNT(*) as count FROM projects WHERE user_id = ?",
      [decoded.userId]
    );

    // Get total files (from cad_files table)
    const filesCount = await db.get(
      "SELECT COUNT(*) as count FROM cad_files WHERE user_id = ?",
      [decoded.userId]
    );

    // Calculate storage used
    const storageResult = await db.get(
      "SELECT COALESCE(SUM(file_size), 0) as storage_used FROM cad_files WHERE user_id = ?",
      [decoded.userId]
    );

    // Get user tier
    const user = await db.get(
      "SELECT tier FROM users WHERE id = ?",
      [decoded.userId]
    );

    const tier = user?.tier || "free";

    // Define tier limits
    const tierLimits = {
      free: { maxStorage: 1024 * 1024 * 1024 }, // 1GB
      pro: { maxStorage: 10 * 1024 * 1024 * 1024 }, // 10GB
      team: { maxStorage: 50 * 1024 * 1024 * 1024 }, // 50GB
      enterprise: { maxStorage: -1 }, // Unlimited
    };

    const limits = tierLimits[tier] || tierLimits.free;
    const storageUsed = storageResult?.storage_used || 0;
    const maxStorage = limits.maxStorage;

    res.json({
      total_projects: projectsCount?.count || 0,
      total_files: filesCount?.count || 0,
      storage_used: storageUsed,
      storage_max: maxStorage,
      storage_percentage: maxStorage === -1 ? 0 : (storageUsed / maxStorage) * 100,
      tier: tier,
    });
  } catch (error) {
    console.error("GET /api/stats/dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

module.exports = router;

