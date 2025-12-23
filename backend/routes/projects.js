// backend/routes/projects.js
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getOne, getAll, execute } = require("../lib/db");

// GET /api/projects - List projects (with optional username filter)
router.get("/", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req); // Optional
    const username = req.query.username;

    if (username) {
      // Get projects for a specific user
      const projects = await getAll(
        `SELECT 
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
          u.username
        FROM projects p
        INNER JOIN users u ON p.user_id = u.id
        WHERE u.username = $1
        ORDER BY p.created_at DESC`,
        [username]
      );

      // Check if viewing own profile
      const isOwnProfile = decoded && decoded.userId;
      let user = null;
      if (isOwnProfile) {
        user = await getOne("SELECT id FROM users WHERE username = $1", [username]);
      }

      // Filter out private projects if not owner
      const filteredProjects = projects.filter(p => {
        if (p.is_public === true || p.is_public === 1) return true;
        if (isOwnProfile && user && user.id === p.user_id) return true;
        return false;
      });

      res.json(filteredProjects);
    } else {
      // Get all public projects (or user's projects if authenticated)
      let query = `SELECT 
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
        u.username
      FROM projects p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.is_public = true`;

      const params = [];
      if (decoded && decoded.userId) {
        query += ` OR p.user_id = $1`;
        params.push(decoded.userId);
      }

      query += ` ORDER BY p.created_at DESC LIMIT 50`;

      const projects = await getAll(query, params);
      res.json(projects);
    }
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

// GET /api/projects/:id - Get project by ID (must come after /starred)
router.get("/:id", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req); // Optional - for checking ownership
    const { id } = req.params;
    const shareToken = req.query.share; // Optional share token

    console.log(`GET /api/projects/${id} - Fetching project`);

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
        u.username,
        u.tier as user_tier
      FROM projects p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.id = $1`,
      [id]
    ).catch(async (err) => {
      // If thumbnail_path column doesn't exist, try without it
      if (err.message && err.message.includes('thumbnail_path')) {
        console.warn("thumbnail_path column not found, trying without it");
        return await getOne(
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
            u.username,
            u.tier as user_tier
          FROM projects p
          INNER JOIN users u ON p.user_id = u.id
          WHERE p.id = $1`,
          [id]
        );
      }
      throw err;
    });

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

    // Increment view count if not owner
    if (!isOwner) {
      try {
        await execute(
          `UPDATE projects SET views = views + 1 WHERE id = $1`,
          [id]
        );
        project.views = (project.views || 0) + 1;
      } catch (viewError) {
        console.error("Failed to increment view count:", viewError);
        // Don't fail the request if view increment fails
      }
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

    // Get thumbnail_path from database (may not exist in schema yet)
    let thumbnailPath = null;
    try {
      const projectWithThumb = await getOne(
        `SELECT thumbnail_path FROM projects WHERE id = $1`,
        [id]
      );
      thumbnailPath = projectWithThumb?.thumbnail_path || null;
    } catch (thumbError) {
      // Column might not exist yet - that's okay
      console.log("thumbnail_path column may not exist yet");
    }

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

