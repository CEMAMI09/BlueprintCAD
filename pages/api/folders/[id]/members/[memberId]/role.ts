import type { NextApiRequest, NextApiResponse } from 'next';
const { getDb } = require('../../shared/utils/db');
const { getUserFromRequest } = require('../../shared/utils/auth');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = await getDb();
  const authUser = getUserFromRequest(req);

  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id: folderId, memberId } = req.query;
  const { role } = req.body;

  if (!role || !['viewer', 'editor', 'admin', 'owner'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    // Get folder and check permissions
    const folder = await db.get(
      'SELECT owner_id, user_id FROM folders WHERE id = ?',
      [folderId]
    );

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const ownerId = folder.owner_id || folder.user_id;

    // Get current user's role
    const currentUserRole = await db.get(
      'SELECT role FROM folder_members WHERE folder_id = ? AND user_id = ?',
      [folderId, authUser.userId]
    );

    const isOwner = ownerId === authUser.userId;
    const isAdmin = currentUserRole?.role === 'admin';

    // Get target member details
    const targetMember = await db.get(
      'SELECT user_id, role FROM folder_members WHERE id = ?',
      [memberId]
    );

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Permission checks
    if (targetMember.user_id === authUser.userId) {
      return res.status(403).json({ error: 'Cannot change your own role' });
    }

    if (targetMember.role === 'owner') {
      return res.status(403).json({ error: 'Cannot change owner role directly' });
    }

    // Owners can change anyone to any role
    // Admins can only change to viewer or editor (not admin or owner)
    // Editors and viewers cannot change roles
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to change roles' });
    }

    if (isAdmin && !isOwner && ['admin', 'owner'].includes(role)) {
      return res.status(403).json({ error: 'Admins cannot promote members to admin or owner' });
    }

    // Handle ownership transfer
    if (role === 'owner') {
      if (!isOwner) {
        return res.status(403).json({ error: 'Only the owner can transfer ownership' });
      }

      // Start transaction
      await db.run('BEGIN TRANSACTION');

      try {
        // Change new owner to owner role
        await db.run(
          'UPDATE folder_members SET role = ? WHERE id = ?',
          ['owner', memberId]
        );

        // Change current owner to admin
        await db.run(
          'UPDATE folder_members SET role = ? WHERE folder_id = ? AND user_id = ?',
          ['admin', folderId, authUser.userId]
        );

        // Update folder owner_id
        await db.run(
          'UPDATE folders SET owner_id = ?, user_id = ? WHERE id = ?',
          [targetMember.user_id, targetMember.user_id, folderId]
        );

        // Record in history
        await db.run(`
          INSERT INTO ownership_transfer_history (entity_type, entity_id, from_user_id, to_user_id, notes)
          VALUES ('folder', ?, ?, ?, 'Transferred via role change in members page')
        `, [folderId, authUser.userId, targetMember.user_id]);

        // Create notification
        const folderName = (await db.get('SELECT name FROM folders WHERE id = ?', [folderId])).name;
        const fromUsername = (await db.get('SELECT username FROM users WHERE id = ?', [authUser.userId])).username;
        
        await db.run(`
          INSERT INTO notifications (user_id, type, content)
          VALUES (?, 'ownership_transferred', ?)
        `, [targetMember.user_id, `${fromUsername} transferred ownership of "${folderName}" to you`]);

        // Log activity (already logged above)

        await db.run('COMMIT');

        return res.status(200).json({
          success: true,
          message: 'Ownership transferred successfully'
        });
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    }

    // Regular role change
    await db.run(
      'UPDATE folder_members SET role = ? WHERE id = ?',
      [role, memberId]
    );

    // Log activity
    const { logActivity } = require('../../../../shared/utils/activity-logger');
    await logActivity({
      userId: authUser.userId,
      action: role === 'owner' ? 'ownership_transferred' : 'role_changed',
      entityType: 'role',
      folderId: parseInt(folderId as string),
      entityId: parseInt(memberId as string),
      entityName: targetMember.user_id.toString(),
      details: {
        old_role: targetMember.role,
        new_role: role,
        target_user_id: targetMember.user_id
      }
    });

    // Create notification
    const folderName = (await db.get('SELECT name FROM folders WHERE id = ?', [folderId])).name;
    const fromUsername = (await db.get('SELECT username FROM users WHERE id = ?', [authUser.userId])).username;
    
    await db.run(`
      INSERT INTO notifications (user_id, type, content)
      VALUES (?, 'role_changed', ?)
    `, [targetMember.user_id, `${fromUsername} changed your role to ${role} in "${folderName}"`]);

    return res.status(200).json({
      success: true,
      message: 'Role updated successfully'
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    return res.status(500).json({ error: 'Failed to update role' });
  }
}
