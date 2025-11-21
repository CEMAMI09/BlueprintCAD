// Get list of users that a user is following (with pagination)
import { getDb } from '../../../../backend/lib/db';
import { getUserFromRequest } from '../../../../backend/lib/auth';
import { isProfileVisible } from '../../../../backend/lib/privacy-utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const db = await getDb();

  try {
    // Get the target user
    const user = await db.get(
      'SELECT id, profile_private FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get authenticated user
    let viewerUsername = null;
    let viewerId = null;
    try {
      const auth = getUserFromRequest(req);
      viewerUsername = auth?.username || null;
      viewerId = auth?.userId || null;
    } catch (e) {
      // Not authenticated
    }

    const isOwner = viewerId && viewerId === user.id;

    // Check if profile is visible
    if (!isOwner) {
      const { visible } = await isProfileVisible(username, viewerUsername);
      if (!visible) {
        return res.status(403).json({ error: 'This account is private' });
      }
    }

    // Get total count
    const countResult = await db.get(
      `SELECT COUNT(*) as count 
       FROM follows 
       WHERE follower_id = ? AND status = 1`,
      [user.id]
    );

    const total = countResult.count;

    // Get following users with pagination
    const followingData = await db.all(
      `SELECT 
        u.id,
        u.username,
        u.profile_picture,
        u.bio,
        u.profile_private,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id AND status = 1) as followers
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ? AND f.status = 1
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [user.id, limit, offset]
    );

    // Check visibility for each followed user
    const following = await Promise.all(
      followingData.map(async (followedUser) => {
        // Check if this user's profile is visible to the viewer
        const { visible: userVisible } = await isProfileVisible(
          followedUser.username,
          viewerUsername
        );

        if (!userVisible) {
          // Hide private account details
          return {
            id: followedUser.id,
            username: followedUser.username,
            profile_picture: followedUser.profile_picture,
            bio: null,
            isPrivate: true
          };
        }

        return {
          id: followedUser.id,
          username: followedUser.username,
          profile_picture: followedUser.profile_picture,
          bio: followedUser.bio,
          followers: followedUser.followers,
          isPrivate: false
        };
      })
    );

    res.status(200).json({
      following,
      total,
      page,
      limit,
      hasMore: offset + following.length < total
    });
  } catch (error) {
    console.error('Fetch following error:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
}
