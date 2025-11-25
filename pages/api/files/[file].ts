// Secure endpoint to serve CAD files with proper headers
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getUserFromRequest } from '../../../backend/lib/auth';
import { getDb } from '../../../db/db';
import { getAllExtensions, getContentType } from '../../../backend/lib/cad-formats';

// Get all allowed file extensions from CAD formats module
const ALLOWED_EXTENSIONS = getAllExtensions();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file } = req.query;

    if (!file) {
      return res.status(400).json({ error: 'File parameter required' });
    }

    const rawFile = Array.isArray(file) ? file[0] : file;
    // Decode percent-encoded path segments (client uses encodeURIComponent)
    let decodedFile: string;
    try {
      decodedFile = decodeURIComponent(rawFile);
    } catch (e) {
      decodedFile = rawFile;
    }

    if (typeof decodedFile !== 'string' || decodedFile.length === 0) {
      return res.status(400).json({ error: 'File parameter required' });
    }

    // Security: prevent directory traversal attacks
    const sanitizedFile = path.normalize(decodedFile).replace(/^(\.\.(\/|\\|$))+/, '');
    const uploadsDir = path.join(process.cwd(), 'storage', 'uploads');
    const filePath = path.join(uploadsDir, sanitizedFile);
    
    // Security: ensure file is within uploads directory
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Security: check file extension
    const ext = path.extname(sanitizedFile).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(403).json({ error: 'File type not allowed' });
    }

    // Get file info from database first to check if project exists
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
        // Try to find project by partial match (in case file_path has changed)
        const allProjects = await db.all('SELECT id, title, file_path FROM projects WHERE file_path LIKE ?', [`%${path.basename(sanitizedFile)}%`]);
        console.log('[api/files] File not found in database. Searched for:', sanitizedFile, 'Found similar:', allProjects);
        return res.status(404).json({ error: 'File not found in database' });
      }
      
      // Use version file data as project data
      project = versionFile;
    }

    // Check if file exists on disk
    let exists = fs.existsSync(filePath);
    let actualFilePath = filePath;
    
    // If file doesn't exist at exact path, try to find it by filename
    if (!exists && project) {
      const filename = path.basename(sanitizedFile);
      const uploadsDir = path.join(process.cwd(), 'storage', 'uploads');
      
      // Try to find file by searching in uploads directory
      try {
        const files = fs.readdirSync(uploadsDir, { withFileTypes: true });
        for (const file of files) {
          if (file.isFile() && file.name === filename) {
            actualFilePath = path.join(uploadsDir, file.name);
            exists = true;
            console.log('[api/files] Found file by filename search:', { requested: sanitizedFile, found: file.name, actualPath: actualFilePath });
            break;
          } else if (file.isDirectory()) {
            // Search in subdirectories
            try {
              const subFiles = fs.readdirSync(path.join(uploadsDir, file.name), { withFileTypes: true });
              for (const subFile of subFiles) {
                if (subFile.isFile() && subFile.name === filename) {
                  actualFilePath = path.join(uploadsDir, file.name, subFile.name);
                  exists = true;
                  console.log('[api/files] Found file in subdirectory:', { requested: sanitizedFile, found: path.join(file.name, subFile.name), actualPath: actualFilePath });
                  break;
                }
              }
              if (exists) break;
            } catch {
              // Skip subdirectory if can't read
            }
          }
        }
      } catch (err) {
        console.error('[api/files] Error searching for file:', err);
      }
    }
    
    // Debug logging
    console.log('[api/files] request for:', { sanitizedFile, filePath, actualFilePath, exists, ext, projectId: project?.id, projectTitle: project?.title });
    if (!exists) {
      // File exists in database but not on disk - this is a data inconsistency
      console.error('[api/files] File exists in database but not on disk:', { sanitizedFile, filePath, projectId: project?.id, projectTitle: project?.title });
      return res.status(404).json({ error: 'File not found on server. The file may have been deleted.' });
    }

    // Check if project is public or user has access
    const user = getUserFromRequest(req);
    const userId = user && typeof user !== 'string' ? (user as any).userId : null;
    
    // Owner always has access
    const isOwner = userId && userId === project.user_id;
    
    // Check if user has purchased the design (for for_sale items)
    let hasPurchased = false;
    if (project.for_sale && project.price > 0 && userId && !isOwner) {
      const purchase = await db.get(
        `SELECT id FROM orders 
         WHERE buyer_id = ? AND project_id = ? AND payment_status = 'succeeded'`,
        [userId, project.id]
      );
      hasPurchased = !!purchase;
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
    
    // Grant access if: public, owner, folder member, or purchased
    // Note: For 3D preview, we allow viewing even for for_sale items (download is restricted separately)
    const hasAccess = project.is_public || isOwner || isFolderMember || hasPurchased;

    // Debug access decision
    console.log('[api/files] db project:', project ? { id: project.id, user_id: project.user_id, is_public: project.is_public, folder_id: project.folder_id, for_sale: project.for_sale } : null, { userId, isOwner, isFolderMember, hasAccess });
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Set secure headers
    const stats = fs.statSync(actualFilePath);
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
    const fileStream = fs.createReadStream(actualFilePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
}
