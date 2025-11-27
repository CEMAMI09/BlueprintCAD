import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';

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
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const db = await getDb();

  try {
    // Get the project
    const project = await db.get(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check ownership
    if (project.user_id !== authUserId) {
      return res.status(403).json({ error: 'You can only rename your own projects' });
    }

    // Check if accessed via share link (share links are view-only)
    // But allow owners to rename even if they accessed via share link
    const shareToken = req.query.share;
    if (shareToken && project.user_id !== authUserId) {
      const shareLink = await db.get(
        'SELECT * FROM share_links WHERE link_token = ? AND entity_type = ? AND entity_id = ?',
        [shareToken, 'project', id]
      );
      if (shareLink) {
        return res.status(403).json({ error: 'Cannot edit files accessed via share link. Share links are view-only.' });
      }
    }

    // Allow owners to rename public files (removed restriction)

    // Check for naming conflicts in the same folder
    if (project.folder_id) {
      const conflict = await db.get(
        'SELECT id FROM projects WHERE folder_id = ? AND title = ? AND id != ?',
        [project.folder_id, title.trim(), id]
      );

      if (conflict) {
        return res.status(409).json({ error: 'A project with this name already exists in this folder' });
      }
    }

    const oldTitle = project.title;
    const newTitle = title.trim();

    // Generate new slug
    const baseSlug = newTitle.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const newSlug = `${baseSlug}-${id}`;

    // Update project
    await db.run(
      'UPDATE projects SET title = ?, slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newTitle, newSlug, id]
    );

    // Record history
    await db.run(
      `INSERT INTO rename_move_history (entity_type, entity_id, action, old_name, new_name, user_id)
       VALUES ('project', ?, 'rename', ?, ?, ?)`,
      [id, oldTitle, newTitle, authUserId]
    );

    // Log activity
    const { logActivity } = require('../../../../backend/lib/activity-logger');
    await logActivity({
      userId: authUserId,
      action: 'rename',
      entityType: 'file',
      folderId: project.folder_id || null,
      projectId: parseInt(id as string),
      entityId: parseInt(id as string),
      entityName: newTitle,
      details: {
        old_name: oldTitle,
        new_name: newTitle
      }
    });

    res.status(200).json({
      success: true,
      message: 'Project renamed successfully',
      project: {
        id: project.id,
        title: newTitle,
        slug: newSlug,
        old_title: oldTitle
      }
    });
  } catch (error) {
    console.error('Rename project error:', error);
    res.status(500).json({ error: 'Failed to rename project' });
  }
}
