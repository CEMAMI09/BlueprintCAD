// API endpoint for messaging
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../shared/utils/auth.js';
import { getDb } from '../../db/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);
  if (!user || typeof user === 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (user as any).userId;

  try {
    if (req.method === 'GET') {
      // Get all conversations for the user
      const db = await getDb();
      
      // Get unique conversations with last message
      // Handle case where user has no messages
      let conversations: any[] = [];
      try {
        conversations = await db.all(`
          SELECT 
            m.*,
            CASE 
              WHEN m.sender_id = ? THEN m.receiver_id
              ELSE m.sender_id
            END as other_user_id,
            u.username as other_username,
            u.profile_picture as other_profile_picture
          FROM messages m
          INNER JOIN (
            SELECT 
              CASE 
                WHEN sender_id = ? THEN receiver_id
                ELSE sender_id
              END as other_user,
              MAX(created_at) as last_message_time
            FROM messages
            WHERE sender_id = ? OR receiver_id = ?
            GROUP BY other_user
          ) latest ON (
            (m.sender_id = ? AND m.receiver_id = latest.other_user) OR
            (m.receiver_id = ? AND m.sender_id = latest.other_user)
          ) AND m.created_at = latest.last_message_time
          INNER JOIN users u ON u.id = CASE 
            WHEN m.sender_id = ? THEN m.receiver_id
            ELSE m.sender_id
          END
          ORDER BY m.created_at DESC
        `, [userId, userId, userId, userId, userId, userId, userId]);
      } catch (err) {
        // If no messages exist, return empty array
        console.log('No conversations found or error:', err);
        conversations = [];
      }

      // Get unread counts
      let unreadCounts: any[] = [];
      try {
        unreadCounts = await db.all(`
          SELECT sender_id, COUNT(*) as count
          FROM messages
          WHERE receiver_id = ? AND read = 0
          GROUP BY sender_id
        `, [userId]);
      } catch (err) {
        console.log('No unread messages or error:', err);
        unreadCounts = [];
      }

      const unreadMap: { [key: number]: number } = {};
      unreadCounts.forEach((row: any) => {
        unreadMap[row.sender_id] = row.count;
      });

      const conversationsWithUnread = conversations.map((conv: any) => ({
        ...conv,
        unread_count: unreadMap[conv.other_user_id] || 0
      }));

      return res.status(200).json(conversationsWithUnread);
    }

    if (req.method === 'POST') {
      // Send a new message
      const { receiver_id, receiver_username, content } = req.body;

      if (!content || (!receiver_id && !receiver_username)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check conversation limit
      const { canPerformAction } = require('../../shared/utils/subscription-utils.js');
      const conversationCheck = await canPerformAction(userId, 'maxConversations');
      if (!conversationCheck.allowed) {
        return res.status(403).json({ 
          error: 'Conversation limit reached',
          reason: conversationCheck.reason,
          requiredTier: conversationCheck.requiredTier,
          current: conversationCheck.current,
          limit: conversationCheck.limit
        });
      }

      const db = await getDb();
      
      // Get receiver ID if username was provided
      let receiverId = receiver_id;
      if (receiver_username && !receiverId) {
        const receiver = await db.get('SELECT id FROM users WHERE username = ?', [receiver_username]);
        if (!receiver) {
          return res.status(404).json({ error: 'User not found' });
        }
        receiverId = receiver.id;
      }

      // Insert message
      const result = await db.run(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [userId, receiverId, content]
      );

      // Create notification for receiver
      await db.run(
        'INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)',
        [receiverId, 'message', result.lastID, `New message from ${(user as any).username}`]
      );

      return res.status(200).json({ success: true, id: result.lastID });
    }

    if (req.method === 'PATCH') {
      // Mark messages as read
      const { sender_id } = req.body;

      if (!sender_id) {
        return res.status(400).json({ error: 'Missing sender_id' });
      }

      const db = await getDb();
      await db.run(
        'UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0',
        [sender_id, userId]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Messages API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
