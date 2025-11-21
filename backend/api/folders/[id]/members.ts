import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../backend/lib/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const user = getUserFromRequest(req);
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      const members = await db.all(
        `SELECT 
          fm.*,
          u.username,
          u.email,
          u.avatar
         FROM folder_members fm
         JOIN users u ON fm.user_id = u.id
         WHERE fm.folder_id = ?
         ORDER BY 
           CASE fm.role 
             WHEN 'owner' THEN 1 
             WHEN 'admin' THEN 2 
             WHEN 'editor' THEN 3 
             WHEN 'viewer' THEN 4 
           END`,
        [id]
      );

      res.status(200).json(members);
    } catch (error) {
      console.error('Fetch members error:', error);
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  } else if (req.method === 'POST') {
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = (user as any).userId;

    try {
      const { username, role } = req.body;

      if (!username || !role) {
        return res.status(400).json({ error: 'Username and role are required' });
      }

      // Check if requester has permission
      const folder = await db.get('SELECT * FROM folders WHERE id = ?', [id]);
      
      if (!folder || !folder.is_team_folder) {
        return res.status(400).json({ error: 'Not a team folder' });
      }

      const requesterMembership = await db.get(
        'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
        [id, userId]
      );

      const canInvite = folder.owner_id === userId || 
                       ['owner', 'admin'].includes(requesterMembership?.role);

      if (!canInvite) {
        return res.status(403).json({ error: 'Insufficient permissions to invite members' });
      }

      // Find user to invite
      const invitedUser = await db.get(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!invitedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if already a member
      const existing = await db.get(
        'SELECT id FROM folder_members WHERE folder_id = ? AND user_id = ?',
        [id, invitedUser.id]
      );

      if (existing) {
        return res.status(400).json({ error: 'User is already a member' });
      }

      // Create invitation
      await db.run(
        `INSERT INTO folder_invitations (folder_id, invited_user_id, invited_by, role)
         VALUES (?, ?, ?, ?)`,
        [id, invitedUser.id, userId, role]
      );

      // Log activity
      await db.run(
        `INSERT INTO folder_activity (folder_id, user_id, action, details)
         VALUES (?, ?, 'invited_member', ?)`,
        [id, userId, JSON.stringify({ username, role })]
      );

      res.status(201).json({ message: 'Invitation sent' });
    } catch (error) {
      console.error('Invite member error:', error);
      res.status(500).json({ error: 'Failed to invite member' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}