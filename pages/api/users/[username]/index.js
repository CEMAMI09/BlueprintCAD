import { getDb } from '../../../../lib/db';
import { getUserFromRequest } from '../../../../lib/auth';
import { isProfileVisible } from '../../../../lib/privacy-utils';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;
  const db = await getDb();

  try {
    const user = await db.get(
      'SELECT id, username, email, bio, profile_picture, banner, location, website, social_links, visibility_options, profile_private, oauth_providers, created_at FROM users WHERE username = ?',
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

    // Check if profile is visible to viewer
    if (!isOwner) {
      const { visible } = await isProfileVisible(username, viewerUsername);
      
      if (!visible) {
        // Check if viewer is following
        let isFollowing = false;
        if (viewerId) {
          const followRecord = await db.get(
            'SELECT status FROM follows WHERE follower_id = ? AND following_id = ?',
            [viewerId, user.id]
          );
          isFollowing = followRecord?.status === 1;
        }

        return res.status(200).json({
          username: user.username,
          isPrivate: true,
          isFollowing,
          message: 'This account is private'
        });
      }
    }

    // Get follower and following counts
    const followerCount = await db.get(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ? AND status = 1',
      [user.id]
    );
    const followingCount = await db.get(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND status = 1',
      [user.id]
    );

    // Check if viewer is following this user
    let isFollowing = false;
    if (viewerId && viewerId !== user.id) {
      const followRecord = await db.get(
        'SELECT status FROM follows WHERE follower_id = ? AND following_id = ?',
        [viewerId, user.id]
      );
      isFollowing = followRecord?.status === 1;
    }

    // Parse visibility options
    const visibilityOptions = user.visibility_options 
      ? JSON.parse(user.visibility_options)
      : {};

    // Parse social links
    const socialLinks = user.social_links 
      ? JSON.parse(user.social_links)
      : {};

    // Hide fields based on visibility options (if not owner)
    if (!isOwner) {
      if (!visibilityOptions.email) delete user.email;
      if (!visibilityOptions.location) delete user.location;
      if (!visibilityOptions.website) delete user.website;
      if (!visibilityOptions.social_links) delete user.social_links;
    }

    res.status(200).json({
      ...user,
      social_links: socialLinks,
      visibility_options: visibilityOptions,
      followers: followerCount.count,
      following: followingCount.count,
      isFollowing,
      isOwner
    });
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
