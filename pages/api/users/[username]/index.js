import { getDb } from '../../../../db/db';
import { getUserFromRequest } from '../../../../shared/utils/auth.js';
import { isProfileVisible } from '../../../../shared/utils/privacy-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;
  
  let db;
  try {
    db = await getDb();
  } catch (dbError) {
    console.error('Database connection error:', dbError);
    return res.status(500).json({ error: 'Database connection failed' });
  }

  if (!db) {
    console.error('Database is null');
    return res.status(500).json({ error: 'Database connection failed' });
  }

  try {
    // Check if subscription_tier column exists
    const columns = await db.all("PRAGMA table_info(users)");
    const hasSubscriptionTier = columns.some(col => col.name === 'subscription_tier');
    
    const subscriptionTierSelect = hasSubscriptionTier ? ', subscription_tier' : '';
    
    const user = await db.get(
      `SELECT id, username, email, bio, profile_picture, banner, location, website, social_links, visibility_options, profile_private, oauth_providers, created_at${subscriptionTierSelect} FROM users WHERE username = ?`,
      [username]
    );
    
    // If column doesn't exist, set default value
    if (!hasSubscriptionTier && user) {
      user.subscription_tier = 'free';
    }
    
    // Ensure subscription_tier is always set
    if (user && !user.subscription_tier) {
      user.subscription_tier = 'free';
    }

    if (!user) {
      console.log(`[API] User not found: ${username}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`[API] Found user: ${user.username}, subscription_tier: ${user.subscription_tier}`);

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
    // Note: follows table may or may not have a status column
    // Try querying without status first (since schema doesn't show status column)
    let followerCount, followingCount;
    try {
      // First try without status (standard schema)
      followerCount = await db.get(
        'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
        [user.id]
      );
      followingCount = await db.get(
        'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
        [user.id]
      );
    } catch (err) {
      // If that fails, try with status column (for migrated schemas)
      if (err.message && !err.message.includes('no such column')) {
        try {
          followerCount = await db.get(
            'SELECT COUNT(*) as count FROM follows WHERE following_id = ? AND (status = 1 OR status IS NULL)',
            [user.id]
          );
          followingCount = await db.get(
            'SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND (status = 1 OR status IS NULL)',
            [user.id]
          );
        } catch (err2) {
          throw err; // Re-throw original error
        }
      } else {
        throw err;
      }
    }

    // Get total stars (likes) across all user's projects
    const starsData = await db.get(
      'SELECT COALESCE(SUM(likes), 0) as total FROM projects WHERE user_id = ?',
      [user.id]
    );

    // Check if viewer is following this user
    let isFollowing = false;
    if (viewerId && viewerId !== user.id) {
      try {
        const followRecord = await db.get(
          'SELECT status FROM follows WHERE follower_id = ? AND following_id = ?',
          [viewerId, user.id]
        );
        isFollowing = followRecord && (followRecord.status === 1 || followRecord.status === null || followRecord.status === undefined);
      } catch (err) {
        // If status column doesn't exist, just check if record exists
        if (err.message && err.message.includes('no such column: status')) {
          const followRecord = await db.get(
            'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?',
            [viewerId, user.id]
          );
          isFollowing = !!followRecord;
        } else {
          throw err;
        }
      }
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
      followers_count: followerCount.count, // Also include as followers_count for compatibility
      following: followingCount.count,
      following_count: followingCount.count, // Also include as following_count for compatibility
      totalStars: starsData.total || 0,
      isFollowing,
      isOwner
    });
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
