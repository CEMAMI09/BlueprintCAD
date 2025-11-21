import jwt from 'jsonwebtoken';
import db from '../../../../db/db';

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

    // Get file from database
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

    // Check permissions
    if (file.user_id !== decoded.userId) {
      // Check if file is in a shared project
      if (file.project_id) {
        const project = await new Promise((resolve, reject) => {
          db.get(
            `SELECT * FROM projects WHERE id = ? AND (user_id = ? OR is_public = 1)`,
            [file.project_id, decoded.userId],
            (err, row) => {
              if (err) reject(err);
              resolve(row);
            }
          );
        });

        if (!project) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    return res.status(200).json(file);
  } catch (error) {
    console.error('Error loading CAD file:', error);
    return res.status(500).json({ error: 'Failed to load file' });
  }
}
