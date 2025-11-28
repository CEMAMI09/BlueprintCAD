import jwt from 'jsonwebtoken';
import db from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    // Verify authentication
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get file and check permissions
    const file = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM cad_files WHERE id = ?`,
        [parseInt(id)],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.user_id !== decoded.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all versions
    const versions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT v.*, u.username as created_by_username
         FROM cad_file_versions v
         LEFT JOIN users u ON v.created_by = u.id
         WHERE v.cad_file_id = ?
         ORDER BY v.version DESC`,
        [file.id],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows || []);
        }
      );
    });

    return res.status(200).json({
      file,
      versions,
      currentVersion: file.version
    });
  } catch (error) {
    console.error('Error loading versions:', error);
    return res.status(500).json({ error: 'Failed to load versions' });
  }
}
