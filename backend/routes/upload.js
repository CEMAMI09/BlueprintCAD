// backend/routes/upload.js
const express = require("express");
const router = express.Router();
// Formidable v3 CommonJS interop: module exports an object with .formidable
const formidableLib = require("formidable");
const formidable = formidableLib.formidable || formidableLib;
const { execute } = require("../lib/db");
const { getUserFromRequest } = require("../lib/auth");
const { uploadToR2, generateUserAssetKey } = require("../lib/r2");

// POST /api/cad/upload - CAD upload (still stubbed for now)
router.post("/upload", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // TODO: Implement real CAD upload to R2 and metadata storage
    res.json({
      success: true,
      file: {
        id: null,
        filename: req.body?.filename || "uploaded_file.stl",
        filepath: "r2://uploads/stub",
        file_size: 0,
        file_type: "application/octet-stream",
        uploaded_at: new Date().toISOString(),
      },
      message: "CAD upload stub - not yet fully implemented",
    });
  } catch (error) {
    console.error("POST /api/cad/upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// POST /api/upload/profile - Upload profile picture or banner
// Expects multipart/form-data with fields:
// - file: the image file
// - type: 'profile_picture' or 'banner'
router.post("/profile", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          return reject(err);
        }
        resolve({ fields, files });
      });
    });

    const typeField = Array.isArray(fields.type) ? fields.type[0] : fields.type;
    const type = typeField === "banner" ? "banner" : "profile_picture";

    const fileField = files.file || files.profile_picture || files.banner;
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

    const key = generateUserAssetKey(decoded.userId, type, file.originalFilename || path.basename(file.filepath));

    const { key: objectKey, url } = await uploadToR2(fileBuffer, key, contentType);

    // Update user record with new key
    if (type === "profile_picture") {
      await execute("UPDATE users SET profile_picture = $1 WHERE id = $2", [
        objectKey,
        decoded.userId,
      ]);
    } else {
      await execute("UPDATE users SET banner = $1 WHERE id = $2", [
        objectKey,
        decoded.userId,
      ]);
    }

    res.json({
      success: true,
      type,
      key: objectKey,
      url,
    });
  } catch (error) {
    console.error("POST /api/upload/profile error:", error);
    res.status(500).json({ error: "Failed to upload profile image" });
  }
});

module.exports = router;
