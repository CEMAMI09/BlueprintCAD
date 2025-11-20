import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';

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
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

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

    // Check permissions
    const membership = await db.get(
      'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
      [id, authUserId]
    );

    const isOwner = folder.owner_id === authUserId;
    const canEdit = isOwner || ['admin', 'editor'].includes(membership?.role);

    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to rename this folder' });
    }

    // Check for naming conflicts (same parent)
    const conflict = await db.get(
      'SELECT id FROM folders WHERE parent_id IS ? AND name = ? AND id != ? AND owner_id = ?',
      [folder.parent_id || null, name.trim(), id, folder.owner_id]
    );

    if (conflict) {
      return res.status(409).json({ error: 'A folder with this name already exists at this level' });
    }

    const oldName = folder.name;
    const newName = name.trim();

    // Generate new slug
    const baseSlug = newName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const newSlug = `${baseSlug}-${id}`;

    // Update folder
    await db.run(
      'UPDATE folders SET name = ?, slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newName, newSlug, id]
    );

    // Record history
    await db.run(
      `INSERT INTO rename_move_history (entity_type, entity_id, action, old_name, new_name, user_id)
       VALUES ('folder', ?, 'rename', ?, ?, ?)`,
      [id, oldName, newName, authUserId]
    );

    // Log activity
    await db.run(
      `INSERT INTO folder_activity (folder_id, user_id, action, details)
       VALUES (?, ?, 'renamed_folder', ?)`,
      [id, authUserId, JSON.stringify({ old_name: oldName, new_name: newName })]
    );

    res.status(200).json({
      success: true,
      message: 'Folder renamed successfully',
      folder: {
        id: folder.id,
        name: newName,
        slug: newSlug,
        old_name: oldName
      }
    });
  } catch (error) {
    console.error('Rename folder error:', error);
    res.status(500).json({ error: 'Failed to rename folder' });
  }
}
