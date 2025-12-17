// CAD file routes
const express = require('express');
const router = express.Router();
const { getAll, getOne } = require('../lib/db');
const { getUserFromRequest } = require('../lib/auth');

// List user's CAD files
router.get('/list', async (req, res) => {
  try {
    const decoded = getUserFromRequest(req);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's CAD files from PostgreSQL
    const files = await getAll(
      `SELECT cf.*, p.title as project_title
       FROM cad_files cf
       LEFT JOIN projects p ON cf.project_id = p.id
       WHERE cf.user_id = $1
       ORDER BY cf.updated_at DESC`,
      [decoded.userId]
    );

    // Get tier info from user
    const user = await getOne(
      'SELECT tier FROM users WHERE id = $1',
      [decoded.userId]
    );

    const userTier = user?.tier || 'free';
    const tierLimits = {
      free: { maxFiles: 5, storage: 1024 * 1024 * 1024 },
      pro: { maxFiles: 25, storage: 10 * 1024 * 1024 * 1024 },
      team: { maxFiles: 50, storage: 50 * 1024 * 1024 * 1024 },
      enterprise: { maxFiles: -1, storage: -1 }
    };

    const limits = tierLimits[userTier];
    const totalStorage = files.reduce((sum, f) => sum + (Number(f.file_size) || 0), 0);

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
