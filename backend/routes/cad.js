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

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          return reject(err);
        }
        resolve({ fields, files });
      });
    });

    const fileField = files.file || files.cad_file;
    const file = Array.isArray(fileField) ? fileField[0] : fileField;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fs = require("fs");
    const path = require("path");

    const fileBuffer = await fs.promises.readFile(file.filepath);
    const contentType =
      file.mimetype ||
      file.type ||
      "application/octet-stream";

    // Generate R2 key for CAD file
    const key = generateUserAssetKey(decoded.userId, "cad", file.originalFilename || path.basename(file.filepath));

    // Upload to R2
    const { key: objectKey, url } = await uploadToR2(fileBuffer, key, contentType);

    // Store metadata in PostgreSQL
    const result = await execute(
      `INSERT INTO cad_files (user_id, filename, filepath, file_size, file_type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [
        decoded.userId,
        file.originalFilename || path.basename(file.filepath),
        objectKey,
        fileBuffer.length,
        contentType,
      ]
    );

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
    res.status(500).json({ error: "Failed to upload file" });
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
