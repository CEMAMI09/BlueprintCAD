// backend/routes/dashboard.js
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getAll, getOne } = require("../lib/db");

// GET /api/dashboard/activity - Get recent activity for user's dashboard
router.get("/activity", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's recent projects (last 10)
    const recentProjects = await getAll(
      `SELECT 
        p.id,
        p.title,
        p.file_path,
        p.file_type,
        p.thumbnail_path,
        p.created_at,
        p.updated_at,
        p.views,
        p.likes,
        u.username
      FROM projects p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
      ORDER BY p.updated_at DESC, p.created_at DESC
      LIMIT 10`,
      [decoded.userId]
    );

    // Format as activity items
    const activities = recentProjects.map((project) => ({
      id: project.id,
      type: "project_created",
      title: project.title,
      description: `Created project "${project.title}"`,
      project_id: project.id,
      project_title: project.title,
      thumbnail_path: project.thumbnail_path,
      file_path: project.file_path,
      file_type: project.file_type,
      username: project.username,
      views: project.views || 0,
      likes: project.likes || 0,
      timestamp: project.created_at,
      created_at: project.created_at,
    }));

    res.json(activities);
  } catch (error) {
    console.error("GET /api/dashboard/activity error:", error);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// GET /api/dashboard/trending - Get trending/public projects
router.get("/trending", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req); // Optional

    // Get trending projects (most views in last 7 days, or most views overall)
    const trendingProjects = await getAll(
      `SELECT 
        p.id,
        p.title,
        p.description,
        p.file_path,
        p.file_type,
        p.thumbnail_path,
        p.views,
        p.likes,
        p.created_at,
        p.for_sale,
        p.price,
        u.username,
        u.profile_picture
      FROM projects p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.is_public = true
      ORDER BY p.views DESC, p.likes DESC, p.created_at DESC
      LIMIT 12`,
      []
    );

    // Build thumbnail URLs
    const publicBase = process.env.R2_PUBLIC_URL
      ? process.env.R2_PUBLIC_URL.replace(/\/$/, "")
      : null;

    const formatted = trendingProjects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      file_path: project.file_path,
      file_type: project.file_type,
      thumbnail_path: project.thumbnail_path,
      thumbnail_url: publicBase && project.thumbnail_path
        ? `${publicBase}/${project.thumbnail_path}`
        : null,
      views: project.views || 0,
      likes: project.likes || 0,
      for_sale: project.for_sale || false,
      price: project.price || null,
      username: project.username,
      profile_picture: project.profile_picture,
      profile_picture_url: publicBase && project.profile_picture
        ? `${publicBase}/${project.profile_picture}`
        : null,
      created_at: project.created_at,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("GET /api/dashboard/trending error:", error);
    res.status(500).json({ error: "Failed to fetch trending projects" });
  }
});

module.exports = router;

