// File versioning API
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';
import { getUserTier } from '../../../../backend/lib/subscription-utils';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const { id } = req.query;
  const user = getUserFromRequest(req);
  
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const tier = await getUserTier(userId);

  // Check if user has access to file versioning
  if (tier !== 'creator' && tier !== 'enterprise') {
    return res.status(403).json({ error: 'File versioning requires Creator subscription or higher' });
  }

  const db = await getDb();

  // Verify project ownership
  const project = await db.get('SELECT user_id FROM projects WHERE id = ?', [id]);
  if (!project || project.user_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      const versions = await db.all(
        `SELECT 
          fv.*,
          u.username as created_by
         FROM file_versions fv
         JOIN users u ON fv.created_by = u.id
         WHERE fv.project_id = ?
         ORDER BY fv.created_at DESC`,
        [id]
      );

      res.status(200).json(versions);
    } catch (error) {
      console.error('Get versions error:', error);
      res.status(500).json({ error: 'Failed to fetch versions' });
    }
  } else if (req.method === 'POST') {
    try {
      const form = formidable({
        uploadDir: path.join(process.cwd(), 'storage', 'versions'),
        keepExtensions: true,
        maxFileSize: 100 * 1024 * 1024, // 100MB
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          return res.status(400).json({ error: 'Failed to parse form data' });
        }

        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;

        if (!file) {
          return res.status(400).json({ error: 'File is required' });
        }

        // Get current version count
        const versionCount = await db.get(
          'SELECT COUNT(*) as count FROM file_versions WHERE project_id = ?',
          [id]
        );

        const newVersion = (versionCount?.count || 0) + 1;

        // Move file to storage
        const fileExtension = path.extname(file.originalFilename || '');
        const fileName = `v${newVersion}_${Date.now()}${fileExtension}`;
        const storagePath = path.join(process.cwd(), 'storage', 'versions', fileName);
        fs.mkdirSync(path.dirname(storagePath), { recursive: true });
        fs.renameSync(file.filepath, storagePath);

        // Get file size
        const stats = fs.statSync(storagePath);
        const fileSize = stats.size;

        // Mark all previous versions as not current
        await db.run(
          'UPDATE file_versions SET is_current = 0 WHERE project_id = ?',
          [id]
        );

        // Insert new version
        const result = await db.run(
          `INSERT INTO file_versions (project_id, version, file_path, file_size, description, created_by, is_current)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [id, newVersion.toString(), `/storage/versions/${fileName}`, fileSize, description || null, userId]
        );

        const version = await db.get(
          `SELECT fv.*, u.username as created_by
           FROM file_versions fv
           JOIN users u ON fv.created_by = u.id
           WHERE fv.id = ?`,
          [result.lastID]
        );

        res.status(201).json(version);
      });
    } catch (error) {
      console.error('Create version error:', error);
      res.status(500).json({ error: 'Failed to create version' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

