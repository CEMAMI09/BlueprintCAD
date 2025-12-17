// backend/routes/upload.js
const express = require("express");
const router = express.Router();
const { execute } = require("../lib/db");
const { getUserFromRequest } = require("../lib/auth");

// POST /api/cad/upload - Upload CAD file (stubbed - accepts multipart/form-data)
router.post("/upload", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // For now, just accept the request and return success
    // File handling is stubbed as per requirements
    // In a full implementation, you would:
    // 1. Parse multipart/form-data file
    // 2. Upload file to Cloudflare R2
    // 3. Store metadata in PostgreSQL cad_files table
    // 4. Return R2 object key or signed URL
    
    // Return success response with stub metadata
    res.json({
      success: true,
      file: {
        id: null, // Would be the database ID in a full implementation
        filename: req.body.filename || "uploaded_file.stl",
        filepath: "r2://uploads/stub", // R2 object key format
        file_size: 0,
        file_type: "application/octet-stream",
        uploaded_at: new Date().toISOString(),
      },
      message: "File upload accepted (metadata only - file handling stubbed)",
    });
  } catch (error) {
    console.error("POST /api/cad/upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

module.exports = router;
