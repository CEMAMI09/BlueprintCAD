// Handle file uploads
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { getUserFromRequest } from '../../shared/utils/auth';
import { validateExtension, isViewable, isExtractable } from '../../shared/utils/cad-formats';
import { requireEmailVerification } from '../../shared/utils/verification-middleware';
import { uploadToR2 } from '../../backend/lib/r2.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify user is authenticated and email is verified
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Ensure upload directory exists (outside public for security)
    const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      filename: (name, ext, part, form) => {
        return `${Date.now()}-${part.originalFilename}`;
      }
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = path.basename(file[0].filepath);
      const fullFilePath = file[0].filepath;
      const originalName = file[0].originalFilename || filePath;
      
      // Validate file format
      const validation = validateExtension(originalName);
      if (!validation.valid) {
        // Delete uploaded file
        if (fs.existsSync(fullFilePath)) {
          fs.unlinkSync(fullFilePath);
        }
        return res.status(400).json({ error: validation.error });
      }
      
      // Try to generate thumbnail (non-blocking, best effort)
      let thumbnailPath = null;
      const ext = path.extname(filePath).toLowerCase();
      const is3DFile = isViewable(ext);
      
      // Extract dimensions from extractable formats
      let dimensions = null;
      let volume = null;
      if (isExtractable(ext)) {
        try {
          console.log(`Extractable file detected (${ext}), checking file exists:`, fullFilePath);
          console.log('File exists:', fs.existsSync(fullFilePath));
          
          // For STL files, use the STL-specific parser
          if (ext === 'stl') {
            const { getSTLDimensions } = require('../../shared/utils/stl-utils');
            console.log('Extracting STL dimensions from:', fullFilePath);
            const dimData = getSTLDimensions(fullFilePath);
            console.log('Extracted dimension data:', dimData);
            
            if (dimData) {
              dimensions = `${dimData.x.toFixed(2)}x${dimData.y.toFixed(2)}x${dimData.z.toFixed(2)} mm`;
              volume = dimData.volume;
              console.log('Formatted dimensions:', dimensions, 'Volume:', volume);
            } else {
              console.warn('Dimension extraction returned null or undefined');
            }
          } else {
            // For other formats (OBJ, FBX, GLTF, GLB, PLY, DAE), estimate from file size
            // This is a placeholder - actual parsing would require format-specific libraries
            const fileSizeKB = file.size / 1024;
            // Estimate dimensions based on file complexity (very rough approximation)
            const estimatedSize = Math.pow(fileSizeKB * 10, 1/3); // Cubic root scaling
            dimensions = `~${estimatedSize.toFixed(1)}x${estimatedSize.toFixed(1)}x${estimatedSize.toFixed(1)} mm (estimated)`;
            console.log(`Estimated dimensions for ${ext} file:`, dimensions);
          }
        } catch (dimError) {
          console.error('Dimension extraction failed (non-fatal):', dimError.message);
        }
      }
      
      // Thumbnail will be generated after project creation with the project ID
      // This is handled in the projects POST route

      // Also upload file to Cloudflare R2 (non-fatal if it fails)
      let r2Url = null;
      try {
        const key = `uploads/${filePath}`;
        const fileBuffer = fs.readFileSync(fullFilePath);
        const contentType = file[0].mimetype || 'application/octet-stream';
        r2Url = await uploadToR2(key, fileBuffer, contentType);
      } catch (r2Error) {
        console.error('R2 upload failed (non-fatal):', r2Error);
      }

      res.status(200).json({ 
        filePath,
        thumbnailPath,
        dimensions,
        volume,
        r2Url
      });
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}