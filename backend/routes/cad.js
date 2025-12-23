// CAD file routes
const express = require('express');
const router = express.Router();
const { getAll, getOne, execute } = require('../lib/db');
const { getUserFromRequest } = require('../lib/auth');
const formidableLib = require("formidable");
const formidable = formidableLib.formidable || formidableLib;
const { uploadToR2, generateUserAssetKey } = require("../lib/r2");

// POST /api/cad/upload - Upload CAD file
router.post('/upload', async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log("POST /api/cad/upload: Starting file upload for user", decoded.userId);
    console.log("Content-Type:", req.headers["content-type"]);

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
    });

    let fields, files;
    try {
      const result = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            console.error("Formidable parse error:", err);
            return reject(err);
          }
          resolve({ fields, files });
        });
      });
      fields = result.fields;
      files = result.files;
      console.log("Formidable parsed successfully. Files:", Object.keys(files));
    } catch (parseError) {
      console.error("Failed to parse form data:", parseError);
      return res.status(400).json({ 
        error: "Failed to parse form data", 
        details: process.env.NODE_ENV === 'development' ? parseError.message : undefined 
      });
    }

    const fileField = files.file || files.cad_file;
    const file = Array.isArray(fileField) ? fileField[0] : fileField;

    if (!file) {
      console.error("No file found in upload. Available files:", Object.keys(files));
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", file.originalFilename || file.name, "Size:", file.size);

    const fs = require("fs");
    const path = require("path");

    let fileBuffer;
    try {
      fileBuffer = await fs.promises.readFile(file.filepath);
      console.log("File read successfully, size:", fileBuffer.length);
    } catch (readError) {
      console.error("Failed to read file:", readError);
      return res.status(500).json({ error: "Failed to read uploaded file" });
    }

    const contentType =
      file.mimetype ||
      file.type ||
      "application/octet-stream";

    // Generate R2 key for CAD file
    const key = generateUserAssetKey(decoded.userId, "cad", file.originalFilename || path.basename(file.filepath));
    console.log("Generated R2 key:", key);

    // Upload to R2
    let objectKey, url;
    try {
      const uploadResult = await uploadToR2(fileBuffer, key, contentType);
      objectKey = uploadResult.key;
      url = uploadResult.url;
      console.log("File uploaded to R2 successfully. Key:", objectKey);
    } catch (r2Error) {
      console.error("R2 upload failed:", r2Error);
      return res.status(500).json({ 
        error: "Failed to upload file to storage", 
        details: process.env.NODE_ENV === 'development' ? r2Error.message : undefined 
      });
    }

    // Store metadata in PostgreSQL
    // Note: file_type is stored in the data JSONB column since the table doesn't have a file_type column
    let result;
    try {
      const fileData = {
        file_type: contentType,
        mime_type: contentType,
      };
      
      result = await execute(
        `INSERT INTO cad_files (user_id, filename, filepath, file_size, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [
          decoded.userId,
          file.originalFilename || path.basename(file.filepath),
          objectKey,
          fileBuffer.length,
          JSON.stringify(fileData),
        ]
      );
      console.log("File metadata stored in database. ID:", result.rows[0]?.id);
    } catch (dbError) {
      console.error("Database insert failed:", dbError);
      console.error("SQL:", `INSERT INTO cad_files (user_id, filename, filepath, file_size, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id`);
      return res.status(500).json({ 
        error: "Failed to save file metadata", 
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined 
      });
    }

    res.json({
      success: true,
      file: {
        id: result.rows[0]?.id,
        filename: file.originalFilename || path.basename(file.filepath),
        filepath: objectKey,
        file_size: fileBuffer.length,
        file_type: contentType,
        url: url,
        uploaded_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/cad/upload error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to upload file",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// List user's CAD files
router.get('/list', async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's CAD files from PostgreSQL
    const files = await getAll(
      `SELECT cf.*, p.title as project_title
       FROM cad_files cf
       LEFT JOIN projects p ON cf.project_id = p.id
       WHERE cf.user_id = $1
       ORDER BY cf.updated_at DESC`,
      [decoded.userId]
    );

    // Get tier info from user
    const user = await getOne(
      'SELECT tier FROM users WHERE id = $1',
      [decoded.userId]
    );

    const userTier = user?.tier || 'free';
    const tierLimits = {
      free: { maxFiles: 5, storage: 1024 * 1024 * 1024 },
      pro: { maxFiles: 25, storage: 10 * 1024 * 1024 * 1024 },
      team: { maxFiles: 50, storage: 50 * 1024 * 1024 * 1024 },
      enterprise: { maxFiles: -1, storage: -1 }
    };

    const limits = tierLimits[userTier];
    const totalStorage = files.reduce((sum, f) => sum + (Number(f.file_size) || 0), 0);

    res.json({
      files,
      count: files.length,
      tier: userTier,
      limits,
      storage: {
        used: totalStorage,
        max: limits.storage,
        percentage: limits.storage === -1 ? 0 : (totalStorage / limits.storage) * 100
      }
    });
  } catch (error) {
    console.error('Error listing CAD files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

module.exports = router;
