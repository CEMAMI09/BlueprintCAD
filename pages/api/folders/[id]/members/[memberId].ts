import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../shared/utils/db';
import { getUserFromRequest } from '../../../../shared/utils/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id, memberId } = req.query;
  const user = getUserFromRequest(req);

  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;
  const db = await getDb();

  if (req.method === 'PUT') {
    try {
      const { role } = req.body;

      // Check permissions
      const requesterMembership = await db.get(
        'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
        [id, userId]
      );

      const folder = await db.get('SELECT owner_id FROM folders WHERE id = ?', [id]);

      const canUpdate = folder.owner_id === userId || 
                       ['owner', 'admin'].includes(requesterMembership?.role);

      if (!canUpdate) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      await db.run(
        'UPDATE folder_members SET role = ? WHERE id = ?',
        [role, memberId]
      );

      // Log activity
      await db.run(
        `INSERT INTO folder_activity (folder_id, user_id, action, details)
         VALUES (?, ?, 'updated_member_role', ?)`,
        [id, userId, JSON.stringify({ memberId, role })]
      );

      res.status(200).json({ message: 'Member role updated' });
    } catch (error) {
      console.error('Update member error:', error);
      res.status(500).json({ error: 'Failed to update member' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const member = await db.get(
        'SELECT user_id FROM folder_members WHERE id = ?',
        [memberId]
      );

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const folder = await db.get('SELECT owner_id FROM folders WHERE id = ?', [id]);
      const requesterMembership = await db.get(
        'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
        [id, userId]
      );

      // Can remove if: owner, admin, or removing yourself
      const canRemove = folder.owner_id === userId || 
                       ['owner', 'admin'].includes(requesterMembership?.role) ||
                       member.user_id === userId;

      if (!canRemove) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      await db.run('DELETE FROM folder_members WHERE id = ?', [memberId]);

      // Log activity
      await db.run(
        `INSERT INTO folder_activity (folder_id, user_id, action, details)
         VALUES (?, ?, 'removed_member', ?)`,
        [id, userId, JSON.stringify({ memberId })]
      );

      res.status(200).json({ message: 'Member removed' });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}