import type { NextApiRequest, NextApiResponse } from 'next';
const { getDb } = require('../../shared/utils/db');
const { getUserFromRequest } = require('../../shared/utils/auth');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const authUser = getUserFromRequest(req);

  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // POST - Create transfer request
  if (req.method === 'POST') {
    try {
      const { entity_type, entity_id, to_username, message } = req.body;

      if (!entity_type || !entity_id || !to_username) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate entity type
      if (!['project', 'folder'].includes(entity_type)) {
        return res.status(400).json({ error: 'Invalid entity type' });
      }

      // Get recipient user
      const toUser = await db.get('SELECT id, username FROM users WHERE username = ?', [to_username]);
      if (!toUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (toUser.id === authUser.userId) {
        return res.status(400).json({ error: 'Cannot transfer to yourself' });
      }

      // Verify ownership
      if (entity_type === 'project') {
        const project = await db.get('SELECT user_id, title FROM projects WHERE id = ?', [entity_id]);
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        if (project.user_id !== authUser.userId) {
          return res.status(403).json({ error: 'Only the owner can transfer this project' });
        }
      } else if (entity_type === 'folder') {
        const folder = await db.get('SELECT user_id, owner_id, name FROM folders WHERE id = ?', [entity_id]);
        if (!folder) {
          return res.status(404).json({ error: 'Folder not found' });
        }
        const ownerId = folder.owner_id || folder.user_id;
        if (ownerId !== authUser.userId) {
          return res.status(403).json({ error: 'Only the owner can transfer this folder' });
        }
      }

      // Check for existing pending request
      const existing = await db.get(
        'SELECT id FROM ownership_transfer_requests WHERE entity_type = ? AND entity_id = ? AND status = ?',
        [entity_type, entity_id, 'pending']
      );

      if (existing) {
        return res.status(409).json({ error: 'A transfer request is already pending for this item' });
      }

      // Create transfer request
      const result = await db.run(`
        INSERT INTO ownership_transfer_requests (entity_type, entity_id, from_user_id, to_user_id, message, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `, [entity_type, entity_id, authUser.userId, toUser.id, message || null]);

      // Create notification for recipient
      const fromUser = await db.get('SELECT username FROM users WHERE id = ?', [authUser.userId]);
      const entityName = entity_type === 'project' 
        ? (await db.get('SELECT title as name FROM projects WHERE id = ?', [entity_id])).name
        : (await db.get('SELECT name FROM folders WHERE id = ?', [entity_id])).name;

      await db.run(`
        INSERT INTO notifications (user_id, type, content, project_id)
        VALUES (?, 'transfer_request', ?, ?)
      `, [
        toUser.id,
        `${fromUser.username} wants to transfer ownership of "${entityName}" to you`,
        entity_type === 'project' ? entity_id : null
      ]);

      return res.status(201).json({
        success: true,
        request_id: result.lastID,
        message: 'Transfer request sent successfully'
      });
    } catch (error) {
      console.error('Error creating transfer request:', error);
      return res.status(500).json({ error: 'Failed to create transfer request' });
    }
  }

  // GET - Get transfer requests
  if (req.method === 'GET') {
    try {
      const { type } = req.query;

      let requests;
      if (type === 'incoming') {
        // Requests where I'm the recipient
        requests = await db.all(`
          SELECT 
            otr.*,
            u_from.username as from_username,
            u_to.username as to_username,
            CASE 
              WHEN otr.entity_type = 'project' THEN (SELECT title FROM projects WHERE id = otr.entity_id)
              WHEN otr.entity_type = 'folder' THEN (SELECT name FROM folders WHERE id = otr.entity_id)
            END as entity_name
          FROM ownership_transfer_requests otr
          JOIN users u_from ON otr.from_user_id = u_from.id
          JOIN users u_to ON otr.to_user_id = u_to.id
          WHERE otr.to_user_id = ? AND otr.status = 'pending'
          ORDER BY otr.created_at DESC
        `, [authUser.userId]);
      } else if (type === 'outgoing') {
        // Requests I've sent
        requests = await db.all(`
          SELECT 
            otr.*,
            u_from.username as from_username,
            u_to.username as to_username,
            CASE 
              WHEN otr.entity_type = 'project' THEN (SELECT title FROM projects WHERE id = otr.entity_id)
              WHEN otr.entity_type = 'folder' THEN (SELECT name FROM folders WHERE id = otr.entity_id)
            END as entity_name
          FROM ownership_transfer_requests otr
          JOIN users u_from ON otr.from_user_id = u_from.id
          JOIN users u_to ON otr.to_user_id = u_to.id
          WHERE otr.from_user_id = ?
          ORDER BY otr.created_at DESC
        `, [authUser.userId]);
      } else {
        // All requests related to me
        requests = await db.all(`
          SELECT 
            otr.*,
            u_from.username as from_username,
            u_to.username as to_username,
            CASE 
              WHEN otr.entity_type = 'project' THEN (SELECT title FROM projects WHERE id = otr.entity_id)
              WHEN otr.entity_type = 'folder' THEN (SELECT name FROM folders WHERE id = otr.entity_id)
            END as entity_name
          FROM ownership_transfer_requests otr
          JOIN users u_from ON otr.from_user_id = u_from.id
          JOIN users u_to ON otr.to_user_id = u_to.id
          WHERE otr.from_user_id = ? OR otr.to_user_id = ?
          ORDER BY otr.created_at DESC
        `, [authUser.userId, authUser.userId]);
      }

      return res.status(200).json(requests);
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
      return res.status(500).json({ error: 'Failed to fetch transfer requests' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
