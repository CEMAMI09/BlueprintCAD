// Get storage usage for the current user
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.userId;
    const db = await getDb();

    // Get user's tier using subscription utils
    const { getUserTier, getStorageLimitForTier } = require('../../../backend/lib/subscription-utils');
    const tier = await getUserTier(userId);
    
    // Get storage limit for tier (returns GB, convert to bytes)
    const storageLimitGB = getStorageLimitForTier(tier);
    const maxStorage = storageLimitGB === -1 ? -1 : storageLimitGB * 1024 * 1024 * 1024;

    // Get all file paths for this user's projects
    // First, try to get from file_versions (current versions)
    const fileVersions = await db.all(
      `SELECT fv.file_path, fv.file_size
       FROM file_versions fv
       JOIN projects p ON fv.project_id = p.id
       WHERE p.user_id = ? AND fv.is_current = 1`,
      [userId]
    );

    // Also get projects that might not have file_versions yet
    const projects = await db.all(
      `SELECT file_path FROM projects WHERE user_id = ? AND file_path IS NOT NULL`,
      [userId]
    );

    let totalSize = 0;
    const processedPaths = new Set();

    // Calculate from file_versions
    for (const version of fileVersions) {
      if (version.file_path && !processedPaths.has(version.file_path)) {
        processedPaths.add(version.file_path);
        
        if (version.file_size) {
          // Use stored file size if available
          totalSize += version.file_size;
        } else {
          // Calculate from actual file on disk
          try {
            // Try both possible paths
            let fullPath = path.join(process.cwd(), 'storage', 'uploads', version.file_path);
            if (!fs.existsSync(fullPath)) {
              fullPath = path.join(process.cwd(), 'uploads', version.file_path);
            }
            if (fs.existsSync(fullPath)) {
              const stats = fs.statSync(fullPath);
              totalSize += stats.size;
            }
          } catch (e) {
            console.warn(`Could not get file size for ${version.file_path}:`, e.message);
          }
        }
      }
    }

    // Calculate from projects that don't have file_versions
    for (const project of projects) {
      if (project.file_path && !processedPaths.has(project.file_path)) {
        processedPaths.add(project.file_path);
        try {
          // Try both possible paths
          let fullPath = path.join(process.cwd(), 'storage', 'uploads', project.file_path);
          if (!fs.existsSync(fullPath)) {
            fullPath = path.join(process.cwd(), 'uploads', project.file_path);
          }
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            totalSize += stats.size;
          }
        } catch (e) {
          console.warn(`Could not get file size for ${project.file_path}:`, e.message);
        }
      }
    }

    const usedStorage = totalSize;
    const percentage = maxStorage === -1 ? 0 : (usedStorage / maxStorage) * 100;

    res.status(200).json({
      used: usedStorage,
      max: maxStorage,
      percentage: Math.min(percentage, 100), // Cap at 100%
      tier: tier
    });
  } catch (error) {
    console.error('Storage calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate storage' });
  }
}
