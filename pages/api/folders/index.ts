import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = getUserFromRequest(req);

  if (req.method === 'GET') {
    try {
      const db = await getDb();
      const { parent_id } = req.query;

      let query = `
        SELECT 
          f.*,
          u.username as owner_username,
          (SELECT COUNT(*) FROM folder_members WHERE folder_id = f.id) as member_count,
          (SELECT COUNT(*) FROM projects WHERE folder_id = f.id) as project_count
      `;

      if (user) {
        query += `,
          COALESCE(
            (SELECT role FROM folder_members WHERE folder_id = f.id AND user_id = ?),
            CASE WHEN f.owner_id = ? THEN 'owner' ELSE NULL END
          ) as user_role
        `;
      }

      query += `
        FROM folders f
        JOIN users u ON f.owner_id = u.id
        WHERE (f.owner_id = ? OR f.id IN (
          SELECT folder_id FROM folder_members WHERE user_id = ?
        ))
      `;

      const userId = user && typeof user !== 'string' ? (user as any).userId : 0;
      const params: any[] = user ? [userId, userId, userId, userId] : [0, 0];

      // If all=true, return all folders regardless of parent_id
      const { all } = req.query;
      if (all === 'true') {
        // Return all folders (including subfolders)
        // No parent_id filter needed
      } else if (parent_id) {
        query += ' AND f.parent_id = ?';
        params.push(parent_id);
      } else {
        query += ' AND f.parent_id IS NULL';
      }

      query += ' ORDER BY f.is_team_folder DESC, f.updated_at DESC';

      const folders = await db.all(query, params);
      res.status(200).json(folders);
    } catch (error) {
      console.error('Fetch folders error:', error);
      res.status(500).json({ error: 'Failed to fetch folders' });
    }
  } else if (req.method === 'POST') {
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = (user as any).userId;

    try {
      const { name, description, parent_id, is_team_folder, color, is_public } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Folder name is required' });
      }

      const db = await getDb();

      // --- Subscription Check: Max Folders ---
      const { canPerformAction, hasFeature } = require('../../../shared/utils/subscription-utils');
      const folderCheck = await canPerformAction(userId, 'maxFolders');
      if (!folderCheck.allowed) {
        return res.status(403).json({
          error: `You have reached your folder limit of ${folderCheck.limit} on the ${folderCheck.requiredTier} plan. Please upgrade to create more folders.`,
          reason: folderCheck.reason,
          requiredTier: folderCheck.requiredTier,
          current: folderCheck.current,
          limit: folderCheck.limit
        });
      }

      // --- Subscription Check: Private Folders ---
      if (is_public === false || (is_public === undefined && is_team_folder)) {
        const canCreatePrivate = await hasFeature(userId, 'canCreatePrivateFolders');
        if (!canCreatePrivate) {
          return res.status(403).json({
            error: 'Private folders are not available on the Base plan. Please upgrade to Premium to create private folders.',
            reason: 'feature_not_available',
            requiredTier: 'pro' // Premium tier
          });
        }
      }

      // --- Subscription Check: Team Folders ---
      if (is_team_folder) {
        const canCreateTeam = await hasFeature(userId, 'canCreateTeamFolders');
        if (!canCreateTeam) {
          return res.status(403).json({
            error: 'Team folders are not available on the Base plan. Please upgrade to Premium to create team folders.',
            reason: 'feature_not_available',
            requiredTier: 'pro' // Premium tier
          });
        }
      }

      // --- Subscription Check: Nested Folders ---
      if (parent_id) {
        const canCreateNested = await hasFeature(userId, 'canCreateNestedFolders');
        if (!canCreateNested) {
          return res.status(403).json({
            error: 'Nested folders are not available on the Base plan. Please upgrade to Premium to create nested folders.',
            reason: 'feature_not_available',
            requiredTier: 'pro' // Premium tier
          });
        }
      }

      // Create folder
      const folderIsPublic = is_public !== false; // Default to public if not specified
      const result = await db.run(
        `INSERT INTO folders (name, description, owner_id, parent_id, is_team_folder, is_public, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, description || null, userId, parent_id || null, is_team_folder ? 1 : 0, folderIsPublic ? 1 : 0, color || '#3b82f6']
      );

      // If team folder, add owner as member
      if (is_team_folder) {
        await db.run(
          `INSERT INTO folder_members (folder_id, user_id, role)
           VALUES (?, ?, 'owner')`,
          [result.lastID, userId]
        );
      }

      // Log activity
      await db.run(
        `INSERT INTO folder_activity (folder_id, user_id, action, details)
         VALUES (?, ?, 'created', ?)`,
        [result.lastID, userId, JSON.stringify({ name, is_team_folder })]
      );

      const folder = await db.get(
        'SELECT * FROM folders WHERE id = ?',
        [result.lastID]
      );

      res.status(201).json(folder);
    } catch (error) {
      console.error('Create folder error:', error);
      res.status(500).json({ error: 'Failed to create folder' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}