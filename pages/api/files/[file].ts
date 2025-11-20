// Secure endpoint to serve CAD files with proper headers
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getUserFromRequest } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import { getAllExtensions, getContentType } from '../../../lib/cad-formats';

// Get all allowed file extensions from CAD formats module
const ALLOWED_EXTENSIONS = getAllExtensions();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file } = req.query;
    
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'File parameter required' });
    }

    // Security: prevent directory traversal attacks
    const sanitizedFile = path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(process.cwd(), 'uploads', sanitizedFile);
    
    // Security: ensure file is within uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Security: check file extension
    const ext = path.extname(sanitizedFile).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(403).json({ error: 'File type not allowed' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file info from database to check permissions
    const db = await getDb();
    let project = await db.get(
      'SELECT * FROM projects WHERE file_path = ?',
      [sanitizedFile]
    );

    // If no project found, check if it's a version file
    if (!project) {
      const versionFile = await db.get(
        'SELECT fv.*, p.user_id, p.is_public, p.folder_id, p.for_sale, p.price FROM file_versions fv JOIN projects p ON fv.project_id = p.id WHERE fv.file_path = ?',
        [sanitizedFile]
      );
      
      if (!versionFile) {
        return res.status(404).json({ error: 'File not found in database' });
      }
      
      // Use version file data as project data
      project = versionFile;
    }

    // Check if project is public or user has access
    const user = getUserFromRequest(req);
    const userId = user && typeof user !== 'string' ? (user as any).userId : null;
    
    // Owner always has access
    const isOwner = userId && userId === project.user_id;
    
    // If project is for sale, only the owner can download
    if (project.for_sale && project.price > 0 && !isOwner) {
      return res.status(403).json({ error: 'This file is for sale. Purchase required to download.' });
    }
    
    // Check folder membership if in a folder
    let isFolderMember = false;
    if (project.folder_id && userId) {
      const membership = await db.get(
        'SELECT id FROM folder_members WHERE folder_id = ? AND user_id = ?',
        [project.folder_id, userId]
      );
      isFolderMember = !!membership;
    }
    
    // Grant access if: public, owner, or folder member
    const hasAccess = project.is_public || isOwner || isFolderMember;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Set secure headers
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Content-Type based on extension (from CAD formats module)
    const contentType = getContentType(ext);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(sanitizedFile)}"`);
    
    // CORS headers for Three.js loaders
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Cache for performance (1 hour)
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
}
