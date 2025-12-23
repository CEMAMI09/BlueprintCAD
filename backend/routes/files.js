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
      
      if (!response.Body) {
        console.error(`[Files] No body in R2 response for ${filePath}`);
        return res.status(404).json({ error: "File not found" });
      }

      // Set appropriate headers
      const contentType = response.ContentType || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      
      // Set CORS headers for 3D viewer (browser needs these for blob conversion)
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
      
      if (response.ContentLength) {
        res.setHeader('Content-Length', response.ContentLength);
      }
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      console.log(`[Files] Streaming file ${filePath} (${response.ContentLength || 'unknown'} bytes, type: ${contentType})`);
      
      // Stream the file directly (better for large files)
      // Three.js loaders can handle streams via blob URLs
      response.Body.pipe(res);
      
      // Handle stream errors
      response.Body.on('error', (err) => {
        console.error(`[Files] Stream error for ${filePath}:`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to stream file" });
        }
      });
      
      res.on('close', () => {
        console.log(`[Files] Finished streaming ${filePath}`);
      });
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

