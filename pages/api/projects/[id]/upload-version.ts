// API endpoint to upload a new version of a project file
import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;
  const { id } = req.query;

  try {
    const db = await getDb();

    // Get the project
    const project = await db.get(
      'SELECT id, user_id, file_path FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user owns the project
    if (project.user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to update this project' });
    }

    // Setup formidable to handle file upload
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      filename: (name, ext, part) => {
        return `${Date.now()}-${part.originalFilename}`;
      }
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }

      const file = files.file;
      if (!file || !file[0]) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = path.basename(file[0].filepath);
      const fullFilePath = file[0].filepath;
      const fileSize = file[0].size;
      const changeNotes = fields.change_notes?.[0] || 'Updated file';

      // Get the current highest version number
      const currentMaxVersion = await db.get(
        'SELECT MAX(version_number) as max_version FROM file_versions WHERE project_id = ?',
        [id]
      );

      const newVersionNumber = (currentMaxVersion?.max_version || 0) + 1;

      // Get the current version ID to use as parent
      const currentVersion = await db.get(
        'SELECT id FROM file_versions WHERE project_id = ? AND is_current = 1',
        [id]
      );

      // Validate file format
      const { validateExtension, isViewable } = require('../../../../lib/cad-formats');
      const validation = validateExtension(file[0].originalFilename || filePath);
      
      if (!validation.valid) {
        // Delete uploaded file
        fs.unlinkSync(fullFilePath);
        return res.status(400).json({ 
          error: `Unsupported file format. Supported formats: ${validation.supportedExtensions.join(', ')}` 
        });
      }

      // Generate thumbnail for viewable 3D files
      let thumbnailPath = null;
      const ext = path.extname(filePath).toLowerCase().slice(1); // Remove leading dot
      const is3DFile = isViewable(ext);

      if (is3DFile) {
        try {
          const { generatePlaceholderThumbnail } = require('../../../../lib/thumbnailGeneratorSimple');
          const thumbsDir = path.join(process.cwd(), 'uploads', 'thumbnails');
          if (!fs.existsSync(thumbsDir)) {
            fs.mkdirSync(thumbsDir, { recursive: true });
          }

          const basename = path.basename(filePath, ext);
          const thumbPath = path.join(thumbsDir, `${basename}_thumb.png`);

          await generatePlaceholderThumbnail(filePath, thumbPath);
          thumbnailPath = `thumbnails/${basename}_thumb.png`;
        } catch (thumbError: any) {
          console.warn('Thumbnail generation failed (non-fatal):', thumbError?.message);
        }
      }

      // Mark all previous versions as not current
      await db.run(
        'UPDATE file_versions SET is_current = 0 WHERE project_id = ?',
        [id]
      );

      // Create new version
      const versionResult = await db.run(
        `INSERT INTO file_versions (
          project_id, parent_version_id, version_number, file_path,
          file_size, thumbnail_path, uploaded_by, is_current, change_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          currentVersion?.id || null,
          newVersionNumber,
          filePath,
          fileSize,
          thumbnailPath,
          userId,
          1,
          changeNotes
        ]
      );

      // Update project with new file path and current version
      await db.run(
        'UPDATE projects SET file_path = ?, thumbnail = ?, current_version_id = ? WHERE id = ?',
        [filePath, thumbnailPath, versionResult.lastID, id]
      );

      return res.status(200).json({
        message: 'New version uploaded successfully',
        version: {
          id: versionResult.lastID,
          version_number: newVersionNumber,
          file_path: filePath,
          thumbnail_path: thumbnailPath,
          change_notes: changeNotes
        }
      });
    });
  } catch (error) {
    console.error('Upload version error:', error);
    return res.status(500).json({ error: 'Failed to upload new version' });
  }
}
