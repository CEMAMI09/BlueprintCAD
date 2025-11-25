// API endpoint for searching users (supports both 'q' and 'query' parameters)
import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../../db/db';
import { getUserFromRequest } from '../../../backend/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Support both 'q' (for general search) and 'query' (for @ mention autocomplete)
  const searchQuery = (req.query.query as string) || (req.query.q as string);
  const followingOnly = req.query.following === 'true';
  const authUser = getUserFromRequest(req);

  console.log('[UserSearch] Request:', { 
    searchQuery, 
    followingOnly, 
    hasAuthUser: !!authUser,
    authUserId: authUser?.userId,
    queryParam: req.query.query,
    qParam: req.query.q
  });

  // For @ mention autocomplete with following only, empty query is allowed
  if ((!searchQuery || searchQuery.trim().length === 0) && req.query.query !== undefined && followingOnly) {
    if (authUser) {
      // Return all following users when no query
      try {
        const db = await getDb();
        let followingData;
        try {
          followingData = await db.all(
            `SELECT 
              u.id,
              u.username,
              u.profile_picture as avatar
             FROM follows f
             JOIN users u ON f.following_id = u.id
             WHERE f.follower_id = ? AND (f.status = 1 OR f.status IS NULL)
             ORDER BY u.username ASC`,
            [authUser.userId]
          );
        } catch (err: any) {
          if (err.message && err.message.includes('no such column: status')) {
            followingData = await db.all(
              `SELECT 
                u.id,
                u.username,
                u.profile_picture as avatar
               FROM follows f
               JOIN users u ON f.following_id = u.id
               WHERE f.follower_id = ?
               ORDER BY u.username ASC`,
              [authUser.userId]
            );
          } else {
            throw err;
          }
        }

        console.log('[UserSearch] Returning following users:', followingData.length);
        return res.status(200).json(followingData.map((u: any) => ({
          id: u.id,
          username: u.username,
          avatar: u.avatar || u.profile_picture
        })));
      } catch (error) {
        console.error('Error fetching following users:', error);
        return res.status(200).json([]);
      }
    } else {
      // Not authenticated, return empty
      return res.status(200).json([]);
    }
  }

  // For general search without following filter, require query
  if (!searchQuery || searchQuery.trim().length === 0) {
    if (req.query.query !== undefined) {
      return res.status(200).json([]);
    }
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const db = await getDb();
    const searchTerm = `%${searchQuery.trim()}%`;
    
    // For @ mention autocomplete, return simplified user data
    if (req.query.query !== undefined) {
      let users;
      
      if (followingOnly && authUser) {
        // Filter to only following users
        try {
          users = await db.all(`
            SELECT 
              u.id,
              u.username,
              u.profile_picture as avatar
            FROM follows f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = ? 
              AND (f.status = 1 OR f.status IS NULL)
              AND u.username LIKE ? COLLATE NOCASE
            ORDER BY u.username ASC
            LIMIT 10
          `, [authUser.userId, searchTerm]);
        } catch (err: any) {
          if (err.message && err.message.includes('no such column: status')) {
            users = await db.all(`
              SELECT 
                u.id,
                u.username,
                u.profile_picture as avatar
              FROM follows f
              JOIN users u ON f.following_id = u.id
              WHERE f.follower_id = ? 
                AND u.username LIKE ? COLLATE NOCASE
              ORDER BY u.username ASC
              LIMIT 10
            `, [authUser.userId, searchTerm]);
          } else {
            throw err;
          }
        }
      } else {
        // Search all users
        users = await db.all(`
          SELECT id, username, avatar, profile_picture
          FROM users
          WHERE username LIKE ? COLLATE NOCASE
          ORDER BY username ASC
          LIMIT 10
        `, [searchTerm]);
      }

      return res.status(200).json(users.map((u: any) => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar || u.profile_picture
      })));
    }
    
    // For general search, return full user data
    const users = await db.all(`
      SELECT id, username, bio, profile_picture, created_at
      FROM users
      WHERE username LIKE ? COLLATE NOCASE
      ORDER BY username ASC
      LIMIT 20
    `, [searchTerm]);

    return res.status(200).json(users);
  } catch (error) {
    console.error('User search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
