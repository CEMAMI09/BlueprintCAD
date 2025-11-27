// API endpoint for branch comments
import { getDb } from '../../../../../../db/db';
import { getUserFromRequest } from '../../../../../../backend/lib/auth';

export default async function handler(req, res) {
  const { id, branchId } = req.query;
  const user = getUserFromRequest(req);

  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.userId;
  const db = await getDb();

  // Verify branch exists and user has access
  const branch = await db.get(
    `SELECT fb.*, p.folder_id 
     FROM file_branches fb
     JOIN projects p ON fb.project_id = p.id
     WHERE fb.id = ? AND fb.project_id = ?`,
    [branchId, id]
  );

  if (!branch) {
    return res.status(404).json({ error: 'Branch not found' });
  }

  // Check folder access
  const folder = await db.get('SELECT owner_id, is_team_folder FROM folders WHERE id = ?', [branch.folder_id]);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const isOwner = folder.owner_id === userId;
  let hasAccess = isOwner;

  if (folder.is_team_folder && !isOwner) {
    const membership = await db.get(
      'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
      [branch.folder_id, userId]
    );
    hasAccess = !!membership;
  }

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (req.method === 'GET') {
    try {
      const comments = await db.all(
        `SELECT 
          bc.*,
          u.username,
          u.avatar,
          (SELECT COUNT(*) FROM branch_comments WHERE parent_id = bc.id) as reply_count
        FROM branch_comments bc
        JOIN users u ON bc.user_id = u.id
        WHERE bc.branch_id = ?
        ORDER BY bc.created_at ASC`,
        [branchId]
      );

      res.status(200).json({ comments });
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  } else if (req.method === 'POST') {
    try {
      const { content, parent_id } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      const result = await db.run(
        `INSERT INTO branch_comments (branch_id, user_id, content, parent_id)
         VALUES (?, ?, ?, ?)`,
        [branchId, userId, content.trim(), parent_id || null]
      );

      const comment = await db.get(
        `SELECT bc.*, u.username, u.avatar
         FROM branch_comments bc
         JOIN users u ON bc.user_id = u.id
         WHERE bc.id = ?`,
        [result.lastID]
      );

      res.status(201).json(comment);
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

