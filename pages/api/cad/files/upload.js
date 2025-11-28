import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '../../../../shared/utils/auth';
import { getDb } from '../../../../db/db';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;
    const db = await getDb();

    // Parse form data
    const uploadDir = path.join(process.cwd(), 'storage', 'uploads', 'cad');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      filename: (name, ext, part) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        return `${uniqueSuffix}${ext}`;
      }
    });

    const [fields, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = fields.filename?.[0] || uploadedFile.originalFilename || 'untitled';
    const fileType = path.extname(filename);
    const fileSize = uploadedFile.size;
    const filePath = `/uploads/cad/${path.basename(uploadedFile.filepath)}`;

    // Insert into database
    const result = await db.run(
      `INSERT INTO cad_files (
        user_id, filename, file_path, file_type, file_size, 
        version, is_draft, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`,
      [userId, filename, filePath, fileType, fileSize]
    );

    const file = await db.get('SELECT * FROM cad_files WHERE id = ?', [result.lastID]);

    res.status(200).json({
      success: true,
      file,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
}
