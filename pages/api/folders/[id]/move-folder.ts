import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../db/db.js';
import { getUserFromRequest } from '../../../../shared/utils/auth.js';
import { wouldCreateCircularReference } from '../../../../shared/utils/folder-utils.js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const authUserId = (user as any).userId;
  const { id } = req.query;
  const { new_parent_id } = req.body;

  const db = await getDb();

  try {
    // Get the folder
    const folder = await db.get(
      'SELECT * FROM folders WHERE id = ?',
      [id]
    );

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check permissions on source folder
    const membership = await db.get(
      'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
      [id, authUserId]
    );

    const isOwner = folder.owner_id === authUserId;
    if (!isOwner) {
      return res.status(403).json({ error: 'Only the folder owner can move it' });
    }

    // Validate circular reference
    if (new_parent_id && await wouldCreateCircularReference(Number(id), new_parent_id)) {
      return res.status(400).json({ error: 'Cannot move folder into its own subfolder' });
    }

    // Check permissions on target parent folder if moving to a folder
    if (new_parent_id) {
      const parentFolder = await db.get(
        'SELECT * FROM folders WHERE id = ?',
        [new_parent_id]
      );

      if (!parentFolder) {
        return res.status(404).json({ error: 'Target folder not found' });
      }

      // Check if user can add to parent
      if (parentFolder.owner_id !== authUserId) {
        const parentMembership = await db.get(
          'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
          [new_parent_id, authUserId]
        );

        if (!['admin', 'editor'].includes(parentMembership?.role)) {
          return res.status(403).json({ error: 'You do not have permission to add to the target folder' });
        }
      }

      // Check naming conflicts in target
      const conflict = await db.get(
        'SELECT id FROM folders WHERE parent_id = ? AND name = ? AND id != ?',
        [new_parent_id, folder.name, id]
      );

      if (conflict) {
        return res.status(409).json({ 
          error: 'A folder with this name already exists in the target location',
          conflict: true
        });
      }
    } else {
      // Moving to root - check root conflicts
      const conflict = await db.get(
        'SELECT id FROM folders WHERE parent_id IS NULL AND name = ? AND id != ? AND owner_id = ?',
        [folder.name, id, authUserId]
      );

      if (conflict) {
        return res.status(409).json({ 
          error: 'A folder with this name already exists at root level',
          conflict: true
        });
      }
    }

    const oldParentId = folder.parent_id;

    // Update folder
    await db.run(
      'UPDATE folders SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [new_parent_id || null, id]
    );

    // Record history
    await db.run(
      `INSERT INTO rename_move_history (entity_type, entity_id, action, old_parent_id, new_parent_id, user_id)
       VALUES ('folder', ?, 'move', ?, ?, ?)`,
      [id, oldParentId, new_parent_id, authUserId]
    );

    // Log activity in both old and new parent folders
    if (oldParentId) {
      await db.run(
        `INSERT INTO folder_activity (folder_id, user_id, action, target_type, target_id, details)
         VALUES (?, ?, 'moved_folder_out', 'folder', ?, ?)`,
        [oldParentId, authUserId, id, JSON.stringify({ folder_name: folder.name, to_parent_id: new_parent_id })]
      );
    }

    if (new_parent_id) {
      await db.run(
        `INSERT INTO folder_activity (folder_id, user_id, action, target_type, target_id, details)
         VALUES (?, ?, 'moved_folder_in', 'folder', ?, ?)`,
        [new_parent_id, authUserId, id, JSON.stringify({ folder_name: folder.name, from_parent_id: oldParentId })]
      );
    }

    // Log in the moved folder itself
    await db.run(
      `INSERT INTO folder_activity (folder_id, user_id, action, details)
       VALUES (?, ?, 'moved', ?)`,
      [id, authUserId, JSON.stringify({ old_parent_id: oldParentId, new_parent_id: new_parent_id })]
    );

    res.status(200).json({
      success: true,
      message: 'Folder moved successfully',
      folder: {
        id: folder.id,
        name: folder.name,
        old_parent_id: oldParentId,
        new_parent_id: new_parent_id
      }
    });
  } catch (error) {
    console.error('Move folder error:', error);
    res.status(500).json({ error: 'Failed to move folder' });
  }
}
