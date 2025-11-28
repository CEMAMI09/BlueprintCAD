import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const user = getUserFromRequest(req);
  const db = await getDb();

  if (req.method === 'GET') {
    try {
      // Get folder owner info
      const folder = await db.get(
        `SELECT f.*, u.username as owner_username, u.email as owner_email, u.avatar as owner_avatar
         FROM folders f
         JOIN users u ON f.owner_id = u.id
         WHERE f.id = ?`,
        [id]
      );

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      // Get all members
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

      // Check if owner is already in members list
      const ownerInMembers = members.some((m: any) => m.user_id === folder.owner_id);

      // If owner is not in members list, add them
      if (!ownerInMembers) {
        members.unshift({
          id: null,
          folder_id: parseInt(id as string),
          user_id: folder.owner_id,
          username: folder.owner_username,
          email: folder.owner_email,
          avatar: folder.owner_avatar,
          role: 'owner',
          invited_by: null,
          joined_at: folder.created_at
        });
      }

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

      // Check if there's already a pending invitation
      const existingInvitation = await db.get(
        'SELECT id FROM folder_invitations WHERE folder_id = ? AND invited_user_id = ? AND status = ?',
        [id, invitedUser.id, 'pending']
      );

      if (existingInvitation) {
        return res.status(400).json({ error: 'Invitation already sent to this user' });
      }

      // --- Subscription Check: Max Team Members ---
      const teamMembersCount = await db.get(`
        SELECT COUNT(DISTINCT fm.user_id) as count
        FROM folder_members fm
        WHERE fm.folder_id = ? AND fm.user_id != ?
      `, [id, folder.owner_id]); // Count members excluding the owner

      const { canPerformAction } = require('../../../../shared/utils/subscription-utils');
      const teamMemberCheck = await canPerformAction(userId, 'maxTeamMembers', teamMembersCount.count);
      if (!teamMemberCheck.allowed) {
        return res.status(403).json({
          error: `You have reached your team member limit of ${teamMemberCheck.limit} on the ${teamMemberCheck.requiredTier} plan. Please upgrade to invite more members.`,
          reason: teamMemberCheck.reason,
          requiredTier: teamMemberCheck.requiredTier,
          current: teamMembersCount.count,
          limit: teamMemberCheck.limit
        });
      }

      // Get inviter username for notification
      const inviter = await db.get('SELECT username FROM users WHERE id = ?', [userId]);

      // Create invitation
      const invitationResult = await db.run(
        `INSERT INTO folder_invitations (folder_id, invited_user_id, invited_by, role)
         VALUES (?, ?, ?, ?)`,
        [id, invitedUser.id, userId, role]
      );

      // Send notification to invited user
      await db.run(
        `INSERT INTO notifications (user_id, type, related_id, message)
         VALUES (?, ?, ?, ?)`,
        [
          invitedUser.id,
          'folder_invitation',
          invitationResult.lastID,
          `${inviter.username} invited you to join "${folder.name}" as ${role}`
        ]
      );

      // Log activity
      const { logActivity } = require('../../../../shared/utils/activity-logger');
      await logActivity({
        userId: userId,
        action: 'collaborator_added',
        entityType: 'member',
        folderId: parseInt(id as string),
        entityId: invitedUser.id,
        entityName: username,
        details: {
          role: role,
          invitation_id: invitationResult.lastID
        }
      });

      res.status(201).json({ message: 'Invitation sent', invitationId: invitationResult.lastID });
    } catch (error) {
      console.error('Invite member error:', error);
      res.status(500).json({ error: 'Failed to invite member' });
    }
  } else if (req.method === 'DELETE') {
    if (!user || typeof user === 'string') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = (user as any).userId;

    try {
      const { memberId } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: 'Member ID is required' });
      }

      // Check if requester has permission
      const folder = await db.get('SELECT * FROM folders WHERE id = ?', [id]);
      
      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      // Get the member being removed
      const memberToRemove = await db.get(
        'SELECT user_id, role FROM folder_members WHERE id = ? AND folder_id = ?',
        [memberId, id]
      );

      if (!memberToRemove) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Cannot remove the owner
      if (folder.owner_id === memberToRemove.user_id) {
        return res.status(403).json({ error: 'Cannot remove folder owner' });
      }

      // Check permissions: owner or admin can remove members
      const requesterMembership = await db.get(
        'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
        [id, userId]
      );

      const canRemove = folder.owner_id === userId || 
                       ['owner', 'admin'].includes(requesterMembership?.role);

      if (!canRemove) {
        return res.status(403).json({ error: 'Insufficient permissions to remove members' });
      }

      // Get member username for activity log
      const removedUser = await db.get('SELECT username FROM users WHERE id = ?', [memberToRemove.user_id]);

      // Remove member
      await db.run(
        'DELETE FROM folder_members WHERE id = ? AND folder_id = ?',
        [memberId, id]
      );

      // Log activity
      const { logActivity } = require('../../../../shared/utils/activity-logger');
      await logActivity({
        userId: userId,
        action: 'collaborator_removed',
        entityType: 'member',
        folderId: parseInt(id as string),
        entityId: memberToRemove.user_id,
        entityName: removedUser.username,
        details: {
          role: memberToRemove.role
        }
      });

      res.status(200).json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}