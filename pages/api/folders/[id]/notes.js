// API endpoint for folder notes
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';

export default async function handler(req, res) {
  const { id } = req.query; // Folder ID
  const user = getUserFromRequest(req);

  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const db = await getDb();

  // Verify folder access
  const folder = await db.get('SELECT owner_id, is_team_folder FROM folders WHERE id = ?', [id]);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const isOwner = folder.owner_id === userId;
  let hasAccess = isOwner;

  if (folder.is_team_folder && !isOwner) {
    const membership = await db.get(
      'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
      [id, userId]
    );
    hasAccess = !!membership;
  }

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (req.method === 'GET') {
    try {
      const { project_id, branch_id, folder_only } = req.query;

      let notes;
      if (branch_id) {
        // Get notes for a specific branch
        notes = await db.all(
          `SELECT 
            bn.*,
            u.username,
            u.avatar
          FROM branch_notes bn
          JOIN users u ON bn.user_id = u.id
          WHERE bn.folder_id = ? AND bn.branch_id = ?
          ORDER BY bn.created_at DESC`,
          [id, branch_id]
        );
      } else if (project_id) {
        // Get notes for a project (all branches)
        notes = await db.all(
          `SELECT 
            bn.*,
            u.username,
            u.avatar,
            fb.branch_name
          FROM branch_notes bn
          JOIN users u ON bn.user_id = u.id
          LEFT JOIN file_branches fb ON bn.branch_id = fb.id
          WHERE bn.folder_id = ? AND EXISTS (
            SELECT 1 FROM file_branches WHERE project_id = ? AND id = bn.branch_id
          )
          ORDER BY bn.created_at DESC`,
          [id, project_id]
        );
      } else if (folder_only === 'true') {
        // Get only folder-level notes (no branch_id)
        notes = await db.all(
          `SELECT 
            bn.*,
            u.username,
            u.avatar
          FROM branch_notes bn
          JOIN users u ON bn.user_id = u.id
          WHERE bn.folder_id = ? AND bn.branch_id IS NULL
          ORDER BY bn.created_at DESC`,
          [id]
        );
      } else {
        // Get all folder notes (including branch notes)
        notes = await db.all(
          `SELECT 
            bn.*,
            u.username,
            u.avatar,
            fb.branch_name,
            p.title as project_title
          FROM branch_notes bn
          JOIN users u ON bn.user_id = u.id
          LEFT JOIN file_branches fb ON bn.branch_id = fb.id
          LEFT JOIN projects p ON fb.project_id = p.id
          WHERE bn.folder_id = ?
          ORDER BY bn.created_at DESC`,
          [id]
        );
      }

      res.status(200).json({ notes });
    } catch (error) {
      console.error('Get notes error:', error);
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  } else if (req.method === 'POST') {
    try {
      const { note_text, branch_id } = req.body;

      if (!note_text || !note_text.trim()) {
        return res.status(400).json({ error: 'Note text is required' });
      }

      if (branch_id) {
        // Verify branch belongs to this folder
        const branch = await db.get(
          'SELECT id FROM file_branches WHERE id = ? AND folder_id = ?',
          [branch_id, id]
        );

        if (!branch) {
          return res.status(404).json({ error: 'Branch not found' });
        }
      }

      const result = await db.run(
        `INSERT INTO branch_notes (folder_id, branch_id, user_id, note_text)
         VALUES (?, ?, ?, ?)`,
        [id, branch_id || null, userId, note_text.trim()]
      );

      const note = await db.get(
        `SELECT bn.*, u.username, u.avatar
         FROM branch_notes bn
         JOIN users u ON bn.user_id = u.id
         WHERE bn.id = ?`,
        [result.lastID]
      );

      res.status(201).json(note);
    } catch (error) {
      console.error('Create note error:', error);
      res.status(500).json({ error: 'Failed to create note' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { note_id } = req.query;

      if (!note_id) {
        return res.status(400).json({ error: 'Note ID is required' });
      }

      // Verify note belongs to user or user is folder owner/admin
      const note = await db.get('SELECT user_id FROM branch_notes WHERE id = ? AND folder_id = ?', [note_id, id]);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const canDelete = note.user_id === userId || folder.owner_id === userId;
      if (!canDelete) {
        // Check if user is admin
        if (folder.is_team_folder) {
          const membership = await db.get(
            'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
            [id, userId]
          );
          if (membership?.role !== 'admin' && membership?.role !== 'owner') {
            return res.status(403).json({ error: 'Permission denied' });
          }
        } else {
          return res.status(403).json({ error: 'Permission denied' });
        }
      }

      await db.run('DELETE FROM branch_notes WHERE id = ?', [note_id]);
      res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error) {
      console.error('Delete note error:', error);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

