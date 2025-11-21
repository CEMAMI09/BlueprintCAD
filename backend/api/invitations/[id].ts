import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../backend/lib/db';
import { getUserFromRequest } from '../../../backend/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const user = getUserFromRequest(req);

  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;
  const db = await getDb();

  if (req.method === 'POST') {
    try {
      const { action } = req.body; // 'accept' or 'decline'

      const invitation = await db.get(
        'SELECT * FROM folder_invitations WHERE id = ? AND invited_user_id = ?',
        [id, userId]
      );

      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: 'Invitation already responded to' });
      }

      if (action === 'accept') {
        // Add user to folder members
        await db.run(
          `INSERT INTO folder_members (folder_id, user_id, role, invited_by)
           VALUES (?, ?, ?, ?)`,
          [invitation.folder_id, userId, invitation.role, invitation.invited_by]
        );

        // Update invitation status
        await db.run(
          `UPDATE folder_invitations 
           SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [id]
        );

        // Log activity
        await db.run(
          `INSERT INTO folder_activity (folder_id, user_id, action)
           VALUES (?, ?, 'joined_folder')`,
          [invitation.folder_id, userId]
        );

        res.status(200).json({ message: 'Invitation accepted' });
      } else if (action === 'decline') {
        await db.run(
          `UPDATE folder_invitations 
           SET status = 'declined', responded_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [id]
        );

        res.status(200).json({ message: 'Invitation declined' });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Respond to invitation error:', error);
      res.status(500).json({ error: 'Failed to respond to invitation' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}