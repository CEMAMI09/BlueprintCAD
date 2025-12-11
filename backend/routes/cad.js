// CAD file routes
const express = require('express');
const router = express.Router();
const { getDb } = require('../../db/db');
const { verifyToken } = require('../lib/auth');
const jwt = require('jsonwebtoken');

// Middleware to verify authentication
const authenticate = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// List user's CAD files
router.get('/list', authenticate, async (req, res) => {
  try {
    const db = await getDb();

    // Get user's CAD files
    const files = await db.all(
      `SELECT cf.*, p.title as project_title
       FROM cad_files cf
       LEFT JOIN projects p ON cf.project_id = p.id
       WHERE cf.user_id = ?
       ORDER BY cf.updated_at DESC`,
      [req.user.userId]
    );

    // Get tier info
    const userTier = req.user.tier || 'free';
    const tierLimits = {
      free: { maxFiles: 5, storage: 1024 * 1024 * 1024 },
      pro: { maxFiles: 25, storage: 10 * 1024 * 1024 * 1024 },
      team: { maxFiles: 50, storage: 50 * 1024 * 1024 * 1024 },
      enterprise: { maxFiles: -1, storage: -1 }
    };

    const limits = tierLimits[userTier];
    const totalStorage = files.reduce((sum, f) => sum + (f.file_size || 0), 0);

    res.json({
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
    res.status(500).json({ error: 'Failed to list files' });
  }
});

module.exports = router;

