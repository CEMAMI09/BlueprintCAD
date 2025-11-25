// Serve thumbnail images
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file } = req.query;

  // Handle array case (Next.js sometimes passes arrays)
  const fileParam = Array.isArray(file) ? file[0] : file;

  if (!fileParam || typeof fileParam !== 'string') {
    return res.status(400).json({ error: 'File parameter required' });
  }

  try {
    // Decode the file path (it may be URL encoded)
    let decodedFile: string;
    try {
      decodedFile = decodeURIComponent(fileParam);
    } catch (e) {
      decodedFile = fileParam;
    }
    
    // Security: ensure file is in thumbnails directory
    // Remove any path traversal attempts
    let sanitizedPath = decodedFile.replace(/^(\.\.(\/|\\|$))+/, '').replace(/[\/\\]/g, '/');
    
    // Remove thumbnails/ prefix if present (frontend should pass just filename)
    if (sanitizedPath.startsWith('thumbnails/')) {
      sanitizedPath = sanitizedPath.replace(/^thumbnails\//, '');
    }
    
    // Build the full file path
    const uploadsDir = path.join(process.cwd(), 'storage', 'uploads');
    const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
    
    // Use the sanitized path as the filename (should be just the filename now)
    const filename = sanitizedPath;
    const filePath = path.join(thumbnailsDir, filename);
    
    // Resolve to absolute paths for security checks
    const resolvedFilePath = path.resolve(filePath);
    const resolvedThumbnailsDir = path.resolve(thumbnailsDir);

    // Security: ensure the file is within the thumbnails directory
    if (!resolvedFilePath.startsWith(resolvedThumbnailsDir)) {
      console.error(`Security check failed: ${resolvedFilePath} not in ${resolvedThumbnailsDir}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(resolvedFilePath)) {
      console.error(`Thumbnail not found: ${resolvedFilePath}`);
      console.error(`Input: ${fileParam}, Decoded: ${decodedFile}, Sanitized: ${sanitizedPath}, Filename: ${filename}`);
      return res.status(404).json({ error: 'File not found', path: resolvedFilePath });
    }

    // Get file extension to determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const contentType = contentTypeMap[ext] || 'image/png';

    const fileBuffer = fs.readFileSync(resolvedFilePath);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.send(fileBuffer);
  } catch (error: any) {
    console.error('Thumbnail serve error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to serve thumbnail', details: error.message });
  }
}

