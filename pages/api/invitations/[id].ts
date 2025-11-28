import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/db/db';
import { getUserFromRequest } from '@/lib/auth';

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
      const { action } = req.body;

      if (!action || !['accept', 'decline'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Must be "accept" or "decline"' });
      }

      // Get the invitation
      const invitation = await db.get(
        `SELECT 
          fi.*,
          f.name as folder_name,
          f.owner_id as folder_owner_id,
          u.username as invited_by_username
         FROM folder_invitations fi
         JOIN folders f ON fi.folder_id = f.id
         JOIN users u ON fi.invited_by = u.id
         WHERE fi.id = ? AND fi.invited_user_id = ? AND fi.status = 'pending'`,
        [id, userId]
      );

      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found or already responded to' });
      }

      if (action === 'accept') {
        // Check if user is already a member
        const existingMember = await db.get(
          'SELECT id FROM folder_members WHERE folder_id = ? AND user_id = ?',
          [invitation.folder_id, userId]
        );

        if (existingMember) {
          // User is already a member, just mark invitation as accepted
          await db.run(
            'UPDATE folder_invitations SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['accepted', id]
          );
          return res.status(200).json({ message: 'Invitation accepted (already a member)' });
        }

        // Add user as folder member
        await db.run(
          `INSERT INTO folder_members (folder_id, user_id, role, invited_by, joined_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [invitation.folder_id, userId, invitation.role, invitation.invited_by]
        );

        // Update invitation status
        await db.run(
          'UPDATE folder_invitations SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['accepted', id]
        );

                 // Log activity
                 const currentUser = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
                 const { logActivity } = require('../../../../shared/utils/activity-logger');
                 await logActivity({
                   userId: userId,
                   action: 'collaborator_added',
                   entityType: 'member',
                   folderId: invitation.folder_id,
                   entityId: userId,
                   entityName: currentUser.username,
                   details: {
                     role: invitation.role,
                     via_invitation: true
                   }
                 });

        // Send notification to folder owner (if not the inviter)
        if (invitation.folder_owner_id !== invitation.invited_by) {
          await db.run(
            `INSERT INTO notifications (user_id, type, related_id, message)
             VALUES (?, ?, ?, ?)`,
            [
              invitation.folder_owner_id,
              'folder_member_joined',
              invitation.folder_id,
              `${currentUser.username} accepted the invitation and joined "${invitation.folder_name}"`
            ]
          );
        }

        res.status(200).json({ message: 'Invitation accepted successfully' });
      } else if (action === 'decline') {
        // Update invitation status
        await db.run(
          'UPDATE folder_invitations SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['declined', id]
        );

        res.status(200).json({ message: 'Invitation declined' });
      }
    } catch (error) {
      console.error('Respond to invitation error:', error);
      res.status(500).json({ error: 'Failed to respond to invitation' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
