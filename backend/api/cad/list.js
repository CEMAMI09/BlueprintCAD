import jwt from 'jsonwebtoken';
import db from '../../../backend/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    // Get user's CAD files
    const files = await new Promise((resolve, reject) => {
      db.all(
        `SELECT cf.*, p.title as project_title
         FROM cad_files cf
         LEFT JOIN projects p ON cf.project_id = p.id
         WHERE cf.user_id = ?
         ORDER BY cf.updated_at DESC`,
        [decoded.userId],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows || []);
        }
      );
    });

    // Get tier info
    const userTier = decoded.tier || 'free';
    const tierLimits = {
      free: { maxFiles: 5, storage: 1024 * 1024 * 1024 },
      pro: { maxFiles: 25, storage: 10 * 1024 * 1024 * 1024 },
      team: { maxFiles: 50, storage: 50 * 1024 * 1024 * 1024 },
      enterprise: { maxFiles: -1, storage: -1 }
    };

    const limits = tierLimits[userTier];
    const totalStorage = files.reduce((sum, f) => sum + (f.file_size || 0), 0);

    return res.status(200).json({
      files,
      count: files.length,
      tier: userTier,
      limits,
      storage: {
        used: totalStorage,
        max: limits.storage,
        percentage: limits.storage === -1 ? 0 : (totalStorage / limits.storage) * 100
      }
    });
  } catch (error) {
    console.error('Error listing CAD files:', error);
    return res.status(500).json({ error: 'Failed to list files' });
  }
}
