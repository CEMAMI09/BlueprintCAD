// backend/routes/thumbnails.js
// Serve thumbnails from R2

const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getR2Client } = require("../lib/r2");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

// GET /api/thumbnails/:key(*) - Serve thumbnail from R2
router.get("/:key(*)", async (req, res) => {
  try {
    // Optional auth - thumbnails can be public
    const decoded = getUserFromRequest(req);
    
    // Extract the key from the URL
    // Frontend might pass just the filename or the full path
    let r2Key = decodeURIComponent(req.params.key);
    
    // If it's just a filename (no slashes), try to find it in the projects table
    // Otherwise, assume it's the full R2 key
    if (!r2Key.includes('/')) {
      // It's just a filename, try to find the full path
      const { getOne } = require("../lib/db");
      try {
        const project = await getOne(
          `SELECT thumbnail_path FROM projects WHERE thumbnail_path LIKE $1 LIMIT 1`,
          [`%${r2Key}%`]
        );
        if (project && project.thumbnail_path) {
          r2Key = project.thumbnail_path;
          console.log(`[Thumbnails] Found full path for ${req.params.key}: ${r2Key}`);
        } else {
          // If not found, try constructing the path assuming it's in users/{userId}/thumbnail-...
          // This is a fallback - ideally the frontend should pass the full path
          console.warn(`[Thumbnails] Could not find thumbnail path for ${r2Key}, trying as-is`);
        }
      } catch (dbError) {
        // If we can't find it, try using the key as-is
        console.warn(`[Thumbnails] Database error finding thumbnail path for ${r2Key}:`, dbError.message);
      }
    }
    
    console.log(`[Thumbnails] Serving thumbnail: ${r2Key}`);

    const bucket = process.env.R2_BUCKET_NAME;
    const client = getR2Client();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: r2Key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      return res.status(404).json({ error: "Thumbnail not found in R2" });
    }

    // Set appropriate headers
    res.setHeader("Content-Type", response.ContentType || "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // Cache for 1 year
    
    if (response.ContentLength) {
      res.setHeader("Content-Length", response.ContentLength);
    }

    // Stream the file
    response.Body.pipe(res);
  } catch (error) {
    console.error("GET /api/thumbnails/:key error:", error);
    res.status(500).json({ error: "Failed to retrieve thumbnail" });
  }
});

module.exports = router;

