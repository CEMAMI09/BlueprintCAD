/**
 * API endpoint to generate thumbnails for CAD files
 * Can be called during upload or on-demand
 */

import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { getUserFromRequest } from '../../../lib/auth';

// Dynamic import to avoid bundling issues
let generateThumbnail: any;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { filePath } = req.body;

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'filePath required' });
    }

    // Security: ensure file is in uploads directory
    const sanitizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(process.cwd(), 'public', 'uploads', sanitizedPath);
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    if (!fullPath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Ensure thumbnails directory exists
    const thumbsDir = path.join(process.cwd(), 'public', 'uploads', 'thumbnails');
    if (!fs.existsSync(thumbsDir)) {
      fs.mkdirSync(thumbsDir, { recursive: true });
    }

    // Generate thumbnail filename
    const ext = path.extname(sanitizedPath);
    const basename = path.basename(sanitizedPath, ext);
    const thumbnailPath = path.join(thumbsDir, `${basename}_thumb.png`);
    const thumbnailRelPath = path.join('thumbnails', `${basename}_thumb.png`);

    // Check if thumbnail already exists
    if (fs.existsSync(thumbnailPath)) {
      return res.status(200).json({
        thumbnailPath: thumbnailRelPath,
        cached: true,
      });
    }

    // Load generator
    if (!generateThumbnail) {
      const module = await import('../../../lib/thumbnailGeneratorSimple.js');
      generateThumbnail = module.generateThumbnail;
    }

    // Generate thumbnail
    const cadFileUrl = `http://localhost:${process.env.PORT || 3000}/uploads/${sanitizedPath}`;
    await generateThumbnail(cadFileUrl, thumbnailPath, {
      width: 800,
      height: 600,
    });

    res.status(200).json({
      thumbnailPath: thumbnailRelPath,
      cached: false,
    });
  } catch (error: any) {
    console.error('Thumbnail generation error:', error);
    res.status(500).json({
      error: 'Thumbnail generation failed',
      details: error.message,
    });
  }
}
