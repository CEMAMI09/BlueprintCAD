// backend/routes/folders.js
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getOne, getAll, execute } = require("../lib/db");

// GET /api/folders - List user's folders (stub for now)
router.get("/", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Return empty folders list for now
    res.json([]);
  } catch (error) {
    console.error("GET /api/folders error:", error);
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

// GET /api/folders/:id - Get folder by ID (stub for now)
router.get("/:id", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    // Stub - return empty folder
    res.json({ id: parseInt(id), name: "Folder", projects: [] });
  } catch (error) {
    console.error("GET /api/folders/:id error:", error);
    res.status(500).json({ error: "Failed to fetch folder" });
  }
});

// POST /api/folders - Create project (this is what the upload page calls)
router.post("/", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      title,
      description,
      file_path,
      file_type,
      tags,
      is_public = true,
      for_sale = false,
      price = null,
      folder_id = null,
      dimensions = null,
      licenses = [],
    } = req.body;

    if (!title || !file_path) {
      return res.status(400).json({ error: "Title and file_path are required" });
    }

    // Insert into projects table (thumbnail_path will be added later)
    const result = await execute(
      `INSERT INTO projects (
        user_id, 
        folder_id, 
        title, 
        description, 
        file_path, 
        file_type, 
        tags, 
        is_public, 
        for_sale, 
        price,
        created_at, 
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, title, description, file_path, file_type, tags, is_public, for_sale, price, created_at, updated_at`,
      [
        decoded.userId,
        folder_id,
        title,
        description || null,
        file_path,
        file_type || null,
        tags || null,
        is_public,
        for_sale,
        price,
      ]
    );

    const project = result.rows[0];

    // Link the CAD file to this project if we can find it by filepath
    if (file_path) {
      try {
        await execute(
          `UPDATE cad_files 
           SET project_id = $1 
           WHERE user_id = $2 AND filepath = $3 AND project_id IS NULL`,
          [project.id, decoded.userId, file_path]
        );
      } catch (updateError) {
        console.error("Failed to link CAD file to project:", updateError);
        // Don't fail the request if linking fails
      }
    }

    // Generate thumbnail asynchronously (don't block response)
    let thumbnailPath = null;
    if (file_path && file_type) {
      console.log(`[Thumbnail] Starting thumbnail generation for project ${project.id}, file: ${file_path}`);
      try {
        const { generateThumbnailFromR2 } = require("../lib/generateThumbnailR2");
        const { query } = require("../lib/db");
        
        // Generate thumbnail in background
        generateThumbnailFromR2(file_path, project.id, decoded.userId)
          .then(async (thumbnailKey) => {
            console.log(`[Thumbnail] Generation completed for project ${project.id}, result: ${thumbnailKey || 'null'}`);
            if (thumbnailKey) {
              try {
                // Ensure thumbnail_path column exists
                try {
                  await query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_path TEXT`);
                  console.log(`[Thumbnail] Ensured thumbnail_path column exists`);
                } catch (alterError) {
                  // Column might already exist, that's fine
                  if (!alterError.message.includes('already exists') && !alterError.message.includes('duplicate')) {
                    console.warn(`[Thumbnail] Could not ensure thumbnail_path column exists:`, alterError.message);
                  }
                }
                
                // Update project with thumbnail path
                await execute(
                  `UPDATE projects SET thumbnail_path = $1 WHERE id = $2`,
                  [thumbnailKey, project.id]
                );
                console.log(`[Thumbnail] Successfully updated project ${project.id} with thumbnail: ${thumbnailKey}`);
              } catch (updateError) {
                console.error(`[Thumbnail] Failed to update project ${project.id} with thumbnail:`, updateError);
                console.error(`[Thumbnail] Update error stack:`, updateError.stack);
              }
            } else {
              console.warn(`[Thumbnail] Thumbnail generation returned null for project ${project.id}`);
            }
          })
          .catch((thumbError) => {
            console.error(`[Thumbnail] Background generation failed for project ${project.id}:`, thumbError);
            console.error(`[Thumbnail] Error stack:`, thumbError.stack);
          });
      } catch (thumbGenError) {
        console.error("[Thumbnail] Failed to start thumbnail generation:", thumbGenError);
        console.error("[Thumbnail] Error stack:", thumbGenError.stack);
        // Don't fail the request if thumbnail generation fails
      }
    } else {
      console.log(`[Thumbnail] Skipping thumbnail generation - file_path: ${file_path}, file_type: ${file_type}`);
    }

    // Return project (thumbnail will be null initially, updated later)
    res.json({
      id: project.id,
      title: project.title,
      description: project.description,
      file_path: project.file_path,
      file_type: project.file_type,
      tags: project.tags,
      is_public: project.is_public,
      for_sale: project.for_sale,
      price: project.price,
      thumbnail_path: thumbnailPath, // Will be null initially, updated asynchronously
      created_at: project.created_at,
      updated_at: project.updated_at,
    });
  } catch (error) {
    console.error("POST /api/folders error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to create project",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

module.exports = router;

