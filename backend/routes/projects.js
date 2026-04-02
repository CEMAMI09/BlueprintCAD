// backend/routes/projects.js
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getOne, getAll, execute, query } = require("../lib/db");

// GET /api/projects - List projects (with optional filters: username, sort, for_sale, search)
router.get("/", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req); // Optional
    const username = req.query.username;
    const sort = req.query.sort || 'recent'; // trending, recent, popular
    const forSale = req.query.for_sale; // 'true' or 'false'
    const search = req.query.search; // Search term

    let query = `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.file_path,
        p.file_type,
        p.tags,
        p.is_public,
        p.for_sale,
        p.price,
        p.views,
        p.likes,
        p.created_at,
        p.updated_at,
        p.thumbnail_path,
        u.username,
        u.profile_picture,
        u.tier AS subscription_tier
      FROM projects p
      INNER JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    // Filter by username if provided
    if (username) {
      query += ` AND u.username = $${paramIndex}`;
      params.push(username);
      paramIndex++;
    }

    // Filter by for_sale if provided
    if (forSale === 'true') {
      query += ` AND p.for_sale = true`;
    } else if (forSale === 'false') {
      query += ` AND (p.for_sale = false OR p.for_sale IS NULL)`;
    }

    // Filter by search term if provided
    if (search && search.trim()) {
      query += ` AND (p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.tags ILIKE $${paramIndex})`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm);
      paramIndex += 1;
    }

    // Only show public projects (unless user is viewing their own)
    if (username && decoded && decoded.userId) {
      // Check if viewing own profile - allow private projects
      const user = await getOne("SELECT id FROM users WHERE username = $1", [username]);
      if (user && user.id === decoded.userId) {
        // User viewing their own profile - show all projects
      } else {
        // Viewing someone else's profile - only public
        query += ` AND p.is_public = true`;
      }
    } else {
      // General listing - only public projects
      query += ` AND p.is_public = true`;
    }

    // Add sorting
    switch (sort) {
      case 'trending':
        // Trending = most views in last 7 days, or most views overall
        query += ` ORDER BY p.views DESC, p.likes DESC, p.created_at DESC`;
        break;
      case 'popular':
        // Popular = most likes
        query += ` ORDER BY p.likes DESC, p.views DESC, p.created_at DESC`;
        break;
      case 'recent':
      default:
        // Recent = newest first
        query += ` ORDER BY p.created_at DESC`;
        break;
    }

    // Limit results
    query += ` LIMIT 50`;

    const projects = await getAll(query, params);

    // Build thumbnail URLs
    const publicBase = process.env.R2_PUBLIC_URL
      ? process.env.R2_PUBLIC_URL.replace(/\/$/, "")
      : null;

    const formattedProjects = projects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description || "",
      file_path: p.file_path,
      file_type: p.file_type || "stl",
      tags: p.tags,
      is_public: p.is_public,
      for_sale: p.for_sale || false,
      price: p.price || null,
      views: p.views || 0,
      likes: p.likes || 0,
      created_at: p.created_at,
      updated_at: p.updated_at,
      thumbnail_path: p.thumbnail_path || null,
      username: p.username,
      profile_picture: p.profile_picture || null,
      subscription_tier: p.subscription_tier || null,
    }));

    res.json(formattedProjects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET /api/projects/starred - Get user's starred projects (must come before /:id)
router.get("/starred", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Stub for now - would need a starred_projects or favorites table
    res.json([]);
  } catch (error) {
    console.error("GET /api/projects/starred error:", error);
    res.status(500).json({ error: "Failed to fetch starred projects" });
  }
});

// DELETE /api/projects/:id - Owner deletes project (must come before GET /:id)
router.delete("/:id", async (req, res) => {
  const decoded = getUserFromRequest(req);
  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  let project;
  try {
    project = await getOne(`SELECT id, user_id FROM projects WHERE id = $1`, [
      id,
    ]);
  } catch (error) {
    console.error("DELETE /api/projects/:id lookup error:", error);
    return res.status(500).json({ error: "Failed to delete project" });
  }

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  if (project.user_id !== decoded.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  // Optional FK cleanups — each runs in its own autocommit statement. Using a single
  // transaction caused 25P02 if the first DELETE failed (e.g. wrong column name);
  // Postgres then rejects all later commands in that transaction.
  const tryCleanup = async (sql, params) => {
    try {
      await query(sql, params);
    } catch (e) {
      if (e.code === "42P01" || e.code === "42703") return;
      console.warn("[DELETE project] optional cleanup skipped:", e.code, e.message);
    }
  };

  try {
    await tryCleanup("DELETE FROM orders WHERE project_id = $1", [id]);
    await tryCleanup("DELETE FROM cad_files WHERE project_id = $1", [id]);

    const del = await query(
      `DELETE FROM projects WHERE id = $1 AND user_id = $2`,
      [id, decoded.userId]
    );

    if (!del.rowCount) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/:id error:", error);
    res.status(500).json({
      error: "Failed to delete project",
      detail:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/projects/:id - Get project by ID (must come after /starred)
router.get("/:id", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req); // Optional - for checking ownership
    const { id } = req.params;
    const shareToken = req.query.share; // Optional share token

    console.log(`GET /api/projects/${id} - Fetching project`);

    // Ensure thumbnail_path column exists
    try {
      const { query } = require("../lib/db");
      await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_path TEXT`);
    } catch (alterError) {
      // Column might already exist, that's fine
      if (!alterError.message.includes('already exists') && !alterError.message.includes('duplicate')) {
        console.warn(`[Projects] Could not ensure thumbnail_path column exists:`, alterError.message);
      }
    }

    // Get project from database
    const project = await getOne(
      `SELECT 
        p.id,
        p.user_id,
        p.folder_id,
        p.title,
        p.description,
        p.file_path,
        p.file_type,
        p.tags,
        p.is_public,
        p.for_sale,
        p.price,
        p.ai_estimate,
        p.views,
        p.likes,
        p.created_at,
        p.updated_at,
        p.thumbnail_path,
        u.username,
        u.tier as user_tier
      FROM projects p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.id = $1`,
      [id]
    );

    if (!project) {
      console.log(`GET /api/projects/${id} - Project not found in database`);
      return res.status(404).json({ error: "Project not found" });
    }

    console.log(`GET /api/projects/${id} - Project found: ${project.title} (user_id: ${project.user_id})`);

    // Check if user can view this project
    const isOwner = decoded && decoded.userId === project.user_id;
    const isPublic = project.is_public === true || project.is_public === 1;

    if (!isPublic && !isOwner && !shareToken) {
      return res.status(403).json({ error: "Project is private" });
    }

    // Increment view count if not owner (or if no auth - anonymous views)
    if (!isOwner) {
      try {
        const updateResult = await execute(
          `UPDATE projects SET views = COALESCE(views, 0) + 1 WHERE id = $1 RETURNING views`,
          [id]
        );
        if (updateResult.rows && updateResult.rows[0]) {
          project.views = updateResult.rows[0].views;
          console.log(`[Views] Incremented views for project ${id}: ${project.views}`);
        }
      } catch (viewError) {
        console.error("Failed to increment view count:", viewError);
        // Don't fail the request if view increment fails
      }
    } else {
      // For owners, just ensure views is set
      project.views = project.views || 0;
    }

    // Get CAD file info if linked
    let cadFile = null;
    if (project.file_path) {
      try {
        cadFile = await getOne(
          `SELECT id, filename, file_size, data, created_at
           FROM cad_files
           WHERE filepath = $1 AND user_id = $2
           LIMIT 1`,
          [project.file_path, project.user_id]
        );
      } catch (cadError) {
        console.error("Failed to fetch CAD file:", cadError);
      }
    }

    // Parse CAD file data JSONB
    let fileMetadata = {};
    if (cadFile && cadFile.data) {
      try {
        fileMetadata = typeof cadFile.data === 'string' 
          ? JSON.parse(cadFile.data) 
          : cadFile.data;
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Build R2 URL for file if R2_PUBLIC_URL is set
    const publicBase = process.env.R2_PUBLIC_URL
      ? process.env.R2_PUBLIC_URL.replace(/\/$/, "")
      : null;
    const fileUrl = publicBase && project.file_path
      ? `${publicBase}/${project.file_path}`
      : null;

    // Get thumbnail_path from database
    // Note: thumbnail_path column should exist (added to schema), but handle gracefully if it doesn't
    let thumbnailPath = project.thumbnail_path || null;

    // Build thumbnail URL if thumbnail exists
    const thumbnailUrl = publicBase && thumbnailPath
      ? `${publicBase}/${thumbnailPath}`
      : null;

    // Return project data in format expected by frontend
    res.json({
      id: project.id.toString(),
      title: project.title,
      description: project.description || "",
      username: project.username,
      created_at: project.created_at,
      file_path: project.file_path,
      file_type: project.file_type || "stl",
      views: project.views || 0,
      likes: project.likes || 0,
      for_sale: project.for_sale || false,
      price: project.price || null,
      ai_estimate: project.ai_estimate || null,
      tags: project.tags || null,
      thumbnail_path: thumbnailPath,
      thumbnail_url: thumbnailUrl,
      is_public: project.is_public,
      folder_id: project.folder_id,
      isOwner: isOwner,
      file_url: fileUrl,
      // Metadata from CAD file
      file_size_bytes: cadFile?.file_size || null,
      file_format: fileMetadata?.file_type || project.file_type || null,
      // Additional fields that frontend might expect
      dimensions: null,
      scale_percentage: 100,
      weight_grams: null,
      print_time_hours: null,
      canViewCostData: isOwner,
      shareLinkAccess: !!shareToken,
      shareLinkData: shareToken ? {
        download_blocked: false,
        view_only: false,
      } : null,
    });
  } catch (error) {
    console.error("GET /api/projects/:id error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to fetch project",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// GET /api/projects/:id/like - Toggle like on project (stub for now)
router.get("/:id/like", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Stub - would implement actual like logic
    res.json({ liked: false, likes: 0 });
  } catch (error) {
    console.error("GET /api/projects/:id/like error:", error);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// POST /api/projects/:id/like - Toggle like on project (stub for now)
router.post("/:id/like", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Stub - would implement actual like logic
    res.json({ liked: true, likes: 1 });
  } catch (error) {
    console.error("POST /api/projects/:id/like error:", error);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// GET /api/projects/:id/download - Download project file (stub for now)
router.get("/:id/download", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const project = await getOne(
      `SELECT file_path, is_public, user_id FROM projects WHERE id = $1`,
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const isOwner = decoded.userId === project.user_id;
    if (!project.is_public && !isOwner) {
      return res.status(403).json({ error: "Project is private" });
    }

    // Build R2 URL
    const publicBase = process.env.R2_PUBLIC_URL
      ? process.env.R2_PUBLIC_URL.replace(/\/$/, "")
      : null;
    
    if (publicBase && project.file_path) {
      const fileUrl = `${publicBase}/${project.file_path}`;
      return res.redirect(302, fileUrl);
    }

    res.status(404).json({ error: "File not found" });
  } catch (error) {
    console.error("GET /api/projects/:id/download error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// PUT /api/projects/:id/rename - Rename project
router.put("/:id/rename", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Check ownership
    const project = await getOne(
      `SELECT user_id FROM projects WHERE id = $1`,
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.user_id !== decoded.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Update title
    await execute(
      `UPDATE projects SET title = $1, updated_at = NOW() WHERE id = $2`,
      [title, id]
    );

    res.json({ success: true, title });
  } catch (error) {
    console.error("PUT /api/projects/:id/rename error:", error);
    res.status(500).json({ error: "Failed to rename project" });
  }
});

// GET /api/projects/:id/branches - Get project branches (stub for now)
router.get("/:id/branches", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Stub - return empty branches
    res.json([]);
  } catch (error) {
    console.error("GET /api/projects/:id/branches error:", error);
    res.status(500).json({ error: "Failed to fetch branches" });
  }
});

module.exports = router;

