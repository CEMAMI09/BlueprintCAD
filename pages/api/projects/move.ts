import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../shared/utils/auth.js';

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
  const { project_id, folder_id } = req.body;

  if (!project_id) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const db = await getDb();

  try {
    // Get the project to verify ownership
    const project = await db.get(
      'SELECT * FROM projects WHERE id = ?',
      [project_id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is the project owner
    if (project.user_id !== authUserId) {
      return res.status(403).json({ error: 'You can only move your own projects' });
    }

    // If moving to a folder, verify the folder exists and user has access
    if (folder_id) {
      const folder = await db.get(
        'SELECT * FROM folders WHERE id = ?',
        [folder_id]
      );

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      // Check if user has permission to add to this folder
      if (folder.is_team_folder) {
        const membership = await db.get(
          'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
          [folder_id, authUserId]
        );

        const isOwner = folder.owner_id === authUserId;
        const canEdit = isOwner || ['admin', 'editor'].includes(membership?.role);

        if (!canEdit) {
          return res.status(403).json({ error: 'You do not have permission to add files to this folder' });
        }
      } else {
        // For personal folders, only the owner can add files
        if (folder.owner_id !== authUserId) {
          return res.status(403).json({ error: 'You can only add files to your own folders' });
        }
      }

      // Log the activity
      await db.run(
        `INSERT INTO folder_activity (folder_id, user_id, action, details)
         VALUES (?, ?, 'uploaded', ?)`,
        [folder_id, authUserId, JSON.stringify({ 
          project_id, 
          title: project.title,
          moved: true 
        })]
      );
    }

    // Update the project's folder_id
    await db.run(
      'UPDATE projects SET folder_id = ? WHERE id = ?',
      [folder_id || null, project_id]
    );

    // Log activity in the old folder if it existed
    if (project.folder_id) {
      await db.run(
        `INSERT INTO folder_activity (folder_id, user_id, action, details)
         VALUES (?, ?, 'removed_file', ?)`,
        [project.folder_id, authUserId, JSON.stringify({ 
          project_id, 
          title: project.title 
        })]
      );
    }

    res.status(200).json({ 
      success: true, 
      message: 'Project moved successfully',
      project_id,
      old_folder_id: project.folder_id,
      new_folder_id: folder_id || null
    });
  } catch (error) {
    console.error('Move project error:', error);
    res.status(500).json({ error: 'Failed to move project' });
  }
}
