// Subscription utility functions for checking features and limits
const { getDb } = require('../../db/db');

// Subscription tier definitions with features and limits
const TIER_FEATURES = {
  free: {
    name: 'Free',
    price: 0,
    features: {
      maxProjects: 5,
      maxPublicProjects: 5,
      maxPrivateProjects: 0,
      maxFolders: 3,
      maxTeamMembers: 0,
      maxConversations: 5,
      maxForumThreads: 0,
      maxForumMessages: 0,
      storageGB: 1,
      canSell: false,
      canPostForums: false,
      canSaveQuotes: false,
      platformFee: null,
      analytics: 'none',
      apiAccess: false,
      fileVersioning: false,
      storefrontCustomization: false,
      whiteLabel: false
    }
  },
  pro: {
    name: 'Pro',
    price: 10,
    features: {
      maxProjects: -1, // unlimited
      maxPublicProjects: -1,
      maxPrivateProjects: -1,
      maxFolders: 10,
      maxTeamMembers: 2,
      maxConversations: -1,
      maxForumThreads: -1,
      maxForumMessages: -1,
      storageGB: 10,
      canSell: true,
      canPostForums: true,
      canSaveQuotes: true,
      platformFee: 0.05, // 5%
      analytics: 'basic',
      apiAccess: false,
      fileVersioning: false,
      storefrontCustomization: false,
      whiteLabel: false
    }
  },
  creator: {
    name: 'Creator',
    price: 25,
    features: {
      maxProjects: -1,
      maxPublicProjects: -1,
      maxPrivateProjects: -1,
      maxFolders: -1,
      maxTeamMembers: 5,
      maxConversations: -1,
      maxForumThreads: -1,
      maxForumMessages: -1,
      storageGB: 50,
      canSell: true,
      canPostForums: true,
      canSaveQuotes: true,
      platformFee: 0.03, // 3%
      analytics: 'advanced',
      apiAccess: true,
      fileVersioning: true,
      storefrontCustomization: true,
      whiteLabel: false
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 49,
    features: {
      maxProjects: -1,
      maxPublicProjects: -1,
      maxPrivateProjects: -1,
      maxFolders: -1,
      maxTeamMembers: -1,
      maxConversations: -1,
      maxForumThreads: -1,
      maxForumMessages: -1,
      storageGB: 200,
      canSell: true,
      canPostForums: true,
      canSaveQuotes: true,
      platformFee: 0.01, // 1% (negotiable)
      analytics: 'advanced',
      apiAccess: true,
      fileVersioning: true,
      storefrontCustomization: true,
      whiteLabel: true
    }
  }
};

/**
 * Get user's subscription tier
 */
async function getUserTier(userId) {
  const db = await getDb();
  const user = await db.get(
    'SELECT subscription_tier, subscription_status FROM users WHERE id = ?',
    [userId]
  );
  
  if (!user) return null;
  
  // If subscription is inactive or expired, default to free
  if (user.subscription_status !== 'active') {
    return 'free';
  }
  
  return user.subscription_tier || 'free';
}

/**
 * Get user's subscription features
 */
async function getUserFeatures(userId) {
  const tier = await getUserTier(userId);
  return TIER_FEATURES[tier] || TIER_FEATURES.free;
}

/**
 * Check if user has access to a feature
 */
async function hasFeature(userId, featureName) {
  const features = await getUserFeatures(userId);
  return features.features[featureName] === true || features.features[featureName] === -1;
}

/**
 * Check if user is within limit for a feature
 */
async function checkLimit(userId, featureName, currentCount) {
  const features = await getUserFeatures(userId);
  const limit = features.features[featureName];
  
  // -1 means unlimited
  if (limit === -1) return { allowed: true, remaining: -1 };
  
  // 0 or false means not allowed
  if (limit === 0 || limit === false) return { allowed: false, remaining: 0 };
  
  const remaining = limit - currentCount;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining)
  };
}

/**
 * Get current usage count for a feature
 */
async function getUsageCount(userId, featureName) {
  const db = await getDb();
  
  switch (featureName) {
    case 'maxProjects':
      const allProjects = await db.get('SELECT COUNT(*) as count FROM projects WHERE user_id = ?', [userId]);
      return allProjects?.count || 0;
    
    case 'maxPublicProjects':
      const publicProjects = await db.get('SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND is_public = 1', [userId]);
      return publicProjects?.count || 0;
    
    case 'maxPrivateProjects':
      const privateProjects = await db.get('SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND is_public = 0', [userId]);
      return privateProjects?.count || 0;
    
    case 'maxFolders':
      const folders = await db.get('SELECT COUNT(*) as count FROM folders WHERE owner_id = ?', [userId]);
      return folders?.count || 0;
    
    case 'maxTeamMembers':
      // Count total team members across all user's folders
      const teamMembers = await db.get(`
        SELECT COUNT(DISTINCT fm.user_id) as count
        FROM folder_members fm
        JOIN folders f ON fm.folder_id = f.id
        WHERE f.owner_id = ? AND fm.user_id != ?
      `, [userId, userId]);
      return teamMembers?.count || 0;
    
    case 'maxConversations':
      const conversations = await db.get(`
        SELECT COUNT(DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END) as count
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
      `, [userId, userId, userId]);
      return conversations?.count || 0;
    
    case 'maxForumThreads':
      const forumThreads = await db.get('SELECT COUNT(*) as count FROM forum_threads WHERE user_id = ?', [userId]);
      return forumThreads?.count || 0;
    
    case 'maxForumMessages':
      const forumMessages = await db.get(`
        SELECT COUNT(*) as count 
        FROM forum_replies 
        WHERE user_id = ?
      `, [userId]);
      return forumMessages?.count || 0;
    
    default:
      // Check subscription_usage table
      const usage = await db.get(
        'SELECT count FROM subscription_usage WHERE user_id = ? AND feature = ?',
        [userId, featureName]
      );
      return usage?.count || 0;
  }
}

/**
 * Check if user can perform an action (combines feature check and limit check)
 */
async function canPerformAction(userId, featureName) {
  const features = await getUserFeatures(userId);
  const featureValue = features.features[featureName];
  
  // If feature is false or 0, not allowed
  if (featureValue === false || featureValue === 0) {
    return {
      allowed: false,
      reason: 'feature_not_available',
      requiredTier: getRequiredTier(featureName)
    };
  }
  
  // If feature is true or -1 (unlimited), check if it's a limit-based feature
  if (featureValue === true || featureValue === -1) {
    return { allowed: true };
  }
  
  // Otherwise, it's a numeric limit - check current usage
  const currentCount = await getUsageCount(userId, featureName);
  const limitCheck = await checkLimit(userId, featureName, currentCount);
  
  if (!limitCheck.allowed) {
    return {
      allowed: false,
      reason: 'limit_exceeded',
      current: currentCount,
      limit: featureValue,
      requiredTier: getRequiredTier(featureName)
    };
  }
  
  return {
    allowed: true,
    remaining: limitCheck.remaining
  };
}

/**
 * Get the minimum tier required for a feature
 */
function getRequiredTier(featureName) {
  for (const [tier, config] of Object.entries(TIER_FEATURES)) {
    if (tier === 'free') continue;
    const featureValue = config.features[featureName];
    if (featureValue === true || featureValue === -1 || (typeof featureValue === 'number' && featureValue > 0)) {
      return tier;
    }
  }
  return 'pro'; // Default to pro if not found
}

/**
 * Get platform fee for user's tier
 */
async function getPlatformFee(userId) {
  const features = await getUserFeatures(userId);
  return features.features.platformFee;
}

/**
 * Get storage info for user
 */
async function getStorageInfo(userId) {
  const db = await getDb();
  const user = await db.get(
    'SELECT storage_limit_gb, storage_used_gb FROM users WHERE id = ?',
    [userId]
  );
  
  if (!user) {
    return { limit: 1, used: 0, remaining: 1 };
  }
  
  const limit = user.storage_limit_gb || 1;
  const used = user.storage_used_gb || 0;
  const remaining = Math.max(0, limit - used);
  
  return { limit, used, remaining, percentUsed: (used / limit) * 100 };
}

module.exports = {
  TIER_FEATURES,
  getUserTier,
  getUserFeatures,
  hasFeature,
  checkLimit,
  getUsageCount,
  canPerformAction,
  getRequiredTier,
  getPlatformFee,
  getStorageInfo
};

