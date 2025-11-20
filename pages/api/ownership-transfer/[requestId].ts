import type { NextApiRequest, NextApiResponse } from 'next';
const { getDb } = require('../../../lib/db');
const { getUserFromRequest } = require('../../../lib/auth');

// Helper to collect all nested folders recursively
async function collectNestedFolders(db: any, folderId: number): Promise<number[]> {
  const folderIds = [folderId];
  const children = await db.all('SELECT id FROM folders WHERE parent_id = ?', [folderId]);
  
  for (const child of children) {
    const nestedIds = await collectNestedFolders(db, child.id);
    folderIds.push(...nestedIds);
  }
  
  return folderIds;
}

// Helper to transfer folder ownership with nested children
async function transferFolderOwnership(db: any, folderId: number, newOwnerId: number, oldOwnerId: number) {
  const allFolderIds = await collectNestedFolders(db, folderId);
  
  // Update all folders
  for (const id of allFolderIds) {
    await db.run(
      'UPDATE folders SET owner_id = COALESCE(owner_id, user_id), user_id = ? WHERE id = ?',
      [newOwnerId, id]
    );
    
    // Record history
    await db.run(`
      INSERT INTO ownership_transfer_history (entity_type, entity_id, from_user_id, to_user_id, notes)
      VALUES ('folder', ?, ?, ?, 'Transferred as part of parent folder transfer')
    `, [id, oldOwnerId, newOwnerId]);
  }
  
  // Update all projects in these folders
  const projects = await db.all(
    `SELECT id FROM projects WHERE folder_id IN (${allFolderIds.join(',')})`
  );
  
  for (const project of projects) {
    await db.run('UPDATE projects SET user_id = ? WHERE id = ?', [newOwnerId, project.id]);
    
    // Record history
    await db.run(`
      INSERT INTO ownership_transfer_history (entity_type, entity_id, from_user_id, to_user_id, notes)
      VALUES ('project', ?, ?, ?, 'Transferred as part of parent folder transfer')
    `, [project.id, oldOwnerId, newOwnerId]);
  }
  
  return { folders: allFolderIds.length, projects: projects.length };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const authUser = getUserFromRequest(req);

  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { requestId } = req.query;

  // POST - Accept transfer request
  if (req.method === 'POST' && req.body.action === 'accept') {
    try {
      // Get transfer request
      const request = await db.get(
        'SELECT * FROM ownership_transfer_requests WHERE id = ?',
        [requestId]
      );

      if (!request) {
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      // Verify recipient
      if (request.to_user_id !== authUser.userId) {
        return res.status(403).json({ error: 'Only the recipient can accept this request' });
      }

      // Verify status
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'This request has already been processed' });
      }

      // Begin transfer process
      let transferResult;
      
      if (request.entity_type === 'project') {
        // Transfer project
        await db.run('UPDATE projects SET user_id = ? WHERE id = ?', [request.to_user_id, request.entity_id]);
        
        // Record history
        await db.run(`
          INSERT INTO ownership_transfer_history (entity_type, entity_id, from_user_id, to_user_id)
          VALUES ('project', ?, ?, ?)
        `, [request.entity_id, request.from_user_id, request.to_user_id]);

        transferResult = { transferred: 1 };
      } else if (request.entity_type === 'folder') {
        // Transfer folder and all nested content
        transferResult = await transferFolderOwnership(
          db,
          request.entity_id,
          request.to_user_id,
          request.from_user_id
        );
      }

      // Update request status
      await db.run(
        'UPDATE ownership_transfer_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['accepted', requestId]
      );

      // Notify sender
      const toUser = await db.get('SELECT username FROM users WHERE id = ?', [request.to_user_id]);
      const entityName = request.entity_type === 'project'
        ? (await db.get('SELECT title as name FROM projects WHERE id = ?', [request.entity_id])).name
        : (await db.get('SELECT name FROM folders WHERE id = ?', [request.entity_id])).name;

      await db.run(`
        INSERT INTO notifications (user_id, type, content, project_id)
        VALUES (?, 'transfer_accepted', ?, ?)
      `, [
        request.from_user_id,
        `${toUser.username} accepted your ownership transfer of "${entityName}"`,
        request.entity_type === 'project' ? request.entity_id : null
      ]);

      return res.status(200).json({
        success: true,
        message: 'Ownership transferred successfully',
        details: transferResult
      });
    } catch (error) {
      console.error('Error accepting transfer:', error);
      return res.status(500).json({ error: 'Failed to process transfer' });
    }
  }

  // POST - Reject transfer request
  if (req.method === 'POST' && req.body.action === 'reject') {
    try {
      // Get transfer request
      const request = await db.get(
        'SELECT * FROM ownership_transfer_requests WHERE id = ?',
        [requestId]
      );

      if (!request) {
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      // Verify recipient
      if (request.to_user_id !== authUser.userId) {
        return res.status(403).json({ error: 'Only the recipient can reject this request' });
      }

      // Verify status
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'This request has already been processed' });
      }

      // Update request status
      await db.run(
        'UPDATE ownership_transfer_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['rejected', requestId]
      );

      // Notify sender
      const toUser = await db.get('SELECT username FROM users WHERE id = ?', [request.to_user_id]);
      const entityName = request.entity_type === 'project'
        ? (await db.get('SELECT title as name FROM projects WHERE id = ?', [request.entity_id])).name
        : (await db.get('SELECT name FROM folders WHERE id = ?', [request.entity_id])).name;

      await db.run(`
        INSERT INTO notifications (user_id, type, content, project_id)
        VALUES (?, 'transfer_rejected', ?, ?)
      `, [
        request.from_user_id,
        `${toUser.username} declined your ownership transfer of "${entityName}"`,
        request.entity_type === 'project' ? request.entity_id : null
      ]);

      return res.status(200).json({
        success: true,
        message: 'Transfer request rejected'
      });
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      return res.status(500).json({ error: 'Failed to reject transfer' });
    }
  }

  // POST - Cancel transfer request
  if (req.method === 'POST' && req.body.action === 'cancel') {
    try {
      // Get transfer request
      const request = await db.get(
        'SELECT * FROM ownership_transfer_requests WHERE id = ?',
        [requestId]
      );

      if (!request) {
        return res.status(404).json({ error: 'Transfer request not found' });
      }

      // Verify sender
      if (request.from_user_id !== authUser.userId) {
        return res.status(403).json({ error: 'Only the sender can cancel this request' });
      }

      // Verify status
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'This request has already been processed' });
      }

      // Update request status
      await db.run(
        'UPDATE ownership_transfer_requests SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['cancelled', requestId]
      );

      return res.status(200).json({
        success: true,
        message: 'Transfer request cancelled'
      });
    } catch (error) {
      console.error('Error cancelling transfer:', error);
      return res.status(500).json({ error: 'Failed to cancel transfer' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
