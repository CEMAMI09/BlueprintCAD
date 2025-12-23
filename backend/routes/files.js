// backend/routes/files.js
const express = require("express");
const router = express.Router();
const { getUserFromRequest } = require("../lib/auth");
const { getR2Client } = require("../lib/r2");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

// GET /api/files/:path(*) - Proxy files from R2
// This route handles file requests for 3D previews and downloads
router.get("/:path(*)", async (req, res) => {
  try {
    const decoded = getUserFromRequest(req); // Optional - for private files
    const filePath = decodeURIComponent(req.params.path);
    
    console.log(`GET /api/files/${filePath} - Fetching file from R2`);

    // Get R2 client
    const s3Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!bucketName) {
      return res.status(500).json({ error: "R2 bucket not configured" });
    }

    // Get file from R2
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: filePath,
      });

      const response = await s3Client.send(command);
      
      // Set appropriate headers
      const contentType = response.ContentType || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      if (response.ContentLength) {
        res.setHeader('Content-Length', response.ContentLength);
      }
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      // Stream the file
      if (response.Body) {
        response.Body.pipe(res);
      } else {
        return res.status(404).json({ error: "File not found" });
      }
    } catch (s3Error) {
      console.error(`Failed to fetch file from R2: ${filePath}`, s3Error);
      if (s3Error.name === 'NoSuchKey' || s3Error.$metadata?.httpStatusCode === 404) {
        return res.status(404).json({ error: "File not found" });
      }
      return res.status(500).json({ error: "Failed to fetch file" });
    }
  } catch (error) {
    console.error("GET /api/files/:path error:", error);
    res.status(500).json({ error: "Failed to load file" });
  }
});

module.exports = router;

