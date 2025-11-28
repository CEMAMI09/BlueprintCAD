import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/db/db';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { entityType, entityId } = req.query;
  const db = await getDb();
  const authUser = getUserFromRequest(req);

  // GET - Fetch comments
  if (req.method === 'GET') {
    try {
      const userId = authUser?.userId || null;
      const comments = await db.all(`
        SELECT 
          c.*,
          u.username,
          u.avatar,
          u.subscription_tier,
          (SELECT COUNT(*) FROM comment_reactions WHERE comment_id = c.id) as reaction_count,
          (SELECT GROUP_CONCAT(reaction_type) FROM comment_reactions WHERE comment_id = c.id AND user_id = ?) as user_reactions
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.entity_type = ? AND c.entity_id = ?
        ORDER BY c.created_at ASC
      `, [userId, entityType, entityId]);

      // Fetch mentions for each comment
      const commentsWithMentions = await Promise.all(
        comments.map(async (comment: any) => {
          const mentions = await db.all(`
            SELECT cm.*, u.username
            FROM comment_mentions cm
            JOIN users u ON cm.mentioned_user_id = u.id
            WHERE cm.comment_id = ?
          `, [comment.id]);

          return {
            ...comment,
            mentions,
            annotation_data: comment.annotation_data ? JSON.parse(comment.annotation_data) : null
          };
        })
      );

      // Build threaded structure
      const commentMap = new Map();
      const rootComments: any[] = [];

      commentsWithMentions.forEach((comment: any) => {
        comment.replies = [];
        commentMap.set(comment.id, comment);
      });

      commentsWithMentions.forEach((comment: any) => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      return res.status(200).json(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  // POST - Create comment
  if (req.method === 'POST') {
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { content, parent_id, is_annotation, annotation_data } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      // Validate entity exists and user has access
      if (entityType === 'project') {
        const project = await db.get('SELECT id FROM projects WHERE id = ?', [entityId]);
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
      } else if (entityType === 'folder') {
        const folder = await db.get('SELECT id FROM folders WHERE id = ?', [entityId]);
        if (!folder) {
          return res.status(404).json({ error: 'Folder not found' });
        }
      }

      // Create comment
      const result = await db.run(`
        INSERT INTO comments (content, entity_type, entity_id, user_id, parent_id, is_annotation, annotation_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        content,
        entityType,
        entityId,
        authUser.userId,
        parent_id || null,
        is_annotation ? 1 : 0,
        annotation_data ? JSON.stringify(annotation_data) : null
      ]);

      const commentId = result.lastID;

      // Extract mentions (@username)
      const mentionRegex = /@(\w+)/g;
      const mentions = [...content.matchAll(mentionRegex)].map((m: any) => m[1]);
      const uniqueMentions = [...new Set(mentions)];

      // Get current user info for notifications
      const currentUser = await db.get('SELECT username FROM users WHERE id = ?', [authUser.userId]);

      // Create mention records and notifications
      for (const username of uniqueMentions) {
        const mentionedUser = await db.get(
          'SELECT id, username FROM users WHERE username = ?',
          [username]
        );

        if (mentionedUser && mentionedUser.id !== authUser.userId) {
          // Create mention record
          await db.run(`
            INSERT INTO comment_mentions (comment_id, mentioned_user_id)
            VALUES (?, ?)
          `, [commentId, mentionedUser.id]);

          // Create notification
          await db.run(`
            INSERT INTO notifications (user_id, type, content, project_id, comment_id)
            VALUES (?, 'mention', ?, ?, ?)
          `, [
            mentionedUser.id,
            `${currentUser.username} mentioned you in a comment`,
            entityType === 'project' ? entityId : null,
            commentId
          ]);
        }
      }

      // Notify parent comment author if this is a reply
      if (parent_id) {
        const parentComment = await db.get(
          'SELECT user_id FROM comments WHERE id = ?',
          [parent_id]
        );

        if (parentComment && parentComment.user_id !== authUser.userId) {
          await db.run(`
            INSERT INTO notifications (user_id, type, content, project_id, comment_id)
            VALUES (?, 'reply', ?, ?, ?)
          `, [
            parentComment.user_id,
            `${currentUser.username} replied to your comment`,
            entityType === 'project' ? entityId : null,
            commentId
          ]);
        }
      }

      // Notify project owner if this is a comment on their design (not a reply)
      if (entityType === 'project' && !parent_id) {
        const project = await db.get('SELECT user_id, title FROM projects WHERE id = ?', [entityId]);
        if (project && project.user_id !== authUser.userId) {
          await db.run(`
            INSERT INTO notifications (user_id, type, content, project_id, comment_id)
            VALUES (?, 'comment', ?, ?, ?)
          `, [
            project.user_id,
            `${currentUser.username} commented on your design "${project.title}"`,
            entityId,
            commentId
          ]);
        }
      }

      // Fetch the created comment with user info
      const newComment = await db.get(`
        SELECT 
          c.*,
          u.username,
          u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `, [commentId]);

      return res.status(201).json({
        ...newComment,
        replies: [],
        mentions: uniqueMentions,
        annotation_data: annotation_data || null
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      return res.status(500).json({ error: 'Failed to create comment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
