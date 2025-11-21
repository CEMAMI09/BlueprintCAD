const { getDb } = require('../db/db');

/**
 * Check if a user's profile is visible to the viewer
 * @param {string} targetUsername - Username of the profile being viewed
 * @param {string|null} viewerUsername - Username of the viewer (null if not logged in)
 * @returns {Promise<{visible: boolean, isFollowing: boolean, isOwner: boolean, targetUser: object}>}
 */
async function isProfileVisible(targetUsername, viewerUsername = null) {
  const db = await getDb();
  
  try {
    // Get target user info
    const targetUser = await db.get(
      'SELECT id, username, profile_private FROM users WHERE username = ?',
      [targetUsername]
    );
    
    if (!targetUser) {
      return { visible: false, isFollowing: false, isOwner: false, targetUser: null };
    }

    // If profile is public, always visible
    if (!targetUser.profile_private) {
      return { visible: true, isFollowing: false, isOwner: false, targetUser };
    }

    // If no viewer, private profile is not visible
    if (!viewerUsername) {
      return { visible: false, isFollowing: false, isOwner: false, targetUser };
    }

    // Check if viewer is the owner
    if (viewerUsername === targetUsername) {
      return { visible: true, isFollowing: false, isOwner: true, targetUser };
    }

    // Get viewer's user ID
    const viewerUser = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [viewerUsername]
    );

    if (!viewerUser) {
      return { visible: false, isFollowing: false, isOwner: false, targetUser };
    }

    // Check if viewer follows the target user (using IDs, only accepted follows)
    const follow = await db.get(
      `SELECT * FROM follows WHERE follower_id = ? AND following_id = ? AND status = 1`,
      [viewerUser.id, targetUser.id]
    );
    
    const isFollowing = !!follow;
    return { 
      visible: isFollowing, 
      isFollowing, 
      isOwner: false, 
      targetUser 
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Check if a user's projects are visible to the viewer
 * @param {string} targetUsername - Username whose projects are being viewed
 * @param {string|null} viewerUsername - Username of the viewer
 * @returns {Promise<boolean>}
 */
async function canViewProjects(targetUsername, viewerUsername = null) {
  const result = await isProfileVisible(targetUsername, viewerUsername);
  return result.visible;
}

/**
 * Check if a user's followers/following lists are visible to the viewer
 * @param {string} targetUsername - Username whose followers are being viewed
 * @param {string|null} viewerUsername - Username of the viewer
 * @returns {Promise<boolean>}
 */
async function canViewFollowers(targetUsername, viewerUsername = null) {
  const result = await isProfileVisible(targetUsername, viewerUsername);
  return result.visible;
}

/**
 * Filter projects based on privacy settings
 * @param {Array} projects - Array of project objects with user info
 * @param {string|null} viewerUsername - Username of the viewer
 * @returns {Promise<Array>} - Filtered projects
 */
async function filterProjectsByPrivacy(projects, viewerUsername = null) {
  if (!projects || projects.length === 0) {
    return [];
  }

  // Public projects (is_public = 1) should always be visible in explore/marketplace
  // Profile privacy only affects viewing the profile page, not public projects
  // Private projects (is_public = 0) require profile visibility check
  
  // Get unique usernames from PRIVATE projects only
  const privateProjects = projects.filter(p => !p.is_public);
  const usernames = [...new Set(privateProjects.map(p => p.username))];
  
  if (usernames.length === 0) {
    // All projects are public, no filtering needed
    return projects;
  }
  
  // Check visibility for each username (only for private projects)
  const visibilityChecks = await Promise.all(
    usernames.map(username => isProfileVisible(username, viewerUsername))
  );

  // Create a map of username -> visible
  const visibilityMap = {};
  usernames.forEach((username, idx) => {
    visibilityMap[username] = visibilityChecks[idx].visible;
  });

  // Filter: keep all public projects + private projects from visible profiles
  return projects.filter(project => {
    // Public projects are always visible
    if (project.is_public) {
      return true;
    }
    // Private projects require profile visibility
    return visibilityMap[project.username] !== false;
  });
}

module.exports = {
  isProfileVisible,
  canViewProjects,
  canViewFollowers,
  filterProjectsByPrivacy
};
