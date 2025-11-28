// Subscription utility functions for checking features and limits
const { getDb } = require('../../db/db');

// Subscription tier definitions with features and limits
// 3-Tier System: Base (Free), Premium ($10), Pro ($25)
const TIER_FEATURES = {
  free: {
    name: 'Base',
    price: 0,
    features: {
      // Storage
      storageGB: 3,
      maxFileSizeMB: 250,
      
      // Uploads
      maxProjects: -1, // Unlimited public uploads
      maxPublicProjects: -1,
      maxPrivateProjects: 0, // No private uploads
      canSell: true, // Can sell on marketplace
      platformFee: 0.15, // 15% commission
      
      // Folders
      maxFolders: 5,
      maxFilesPerFolder: 10,
      canCreatePrivateFolders: false,
      canCreateNestedFolders: false,
      canCreateTeamFolders: false,
      maxTeamMembers: 0,
      
      // Versioning & Branching
      canCreateBranches: false,
      canViewActivityLogs: false,
      canViewChangeLogs: false,
      canCreateFolderNotes: false,
      canViewFileMetadata: false,
      
      // AI Features
      maxQuotesPerDay: 5,
      aiMaterials: ['PLA'], // Only PLA
      canUsePrintabilityAnalysis: false,
      canUseSupportMaterialEstimate: false,
      canUseWeightTimeCalculation: false,
      canUseAutoQuoteGeneration: false,
      canUseAISuggestedPrice: false,
      canUseAIRepair: false,
      canUseAIClassification: false,
      
      // Analytics
      analyticsLevel: 'basic', // Only dashboard stats (total sales, downloads)
      canAccessAdvancedAnalytics: false,
      
      // Profile Features
      canPinDesigns: false,
      canGetVerifiedBadge: false,
      canCustomizeStorefront: false,
      canUseCustomCSS: false,
      
      // Share Links
      canCreatePasswordLinks: false,
      canCreateExpiringLinks: false,
      canCreateViewOnlyLinks: false,
      canCreateDownloadBlockedLinks: false,
      canViewLinkAnalytics: false,
      
      // Other
      canPostForums: true,
      canSaveQuotes: false,
      prioritySearchRanking: false,
      taxDocumentsHandled: false,
      multiplePayoutMethods: false,
    }
  },
  pro: { // Premium tier - $10/month (backend name is "pro")
    name: 'Premium',
    price: 10,
    features: {
      // Storage
      storageGB: 50,
      maxFileSizeMB: 2048, // 2GB
      
      // Uploads
      maxProjects: -1, // Unlimited
      maxPublicProjects: -1,
      maxPrivateProjects: -1, // Unlimited private uploads
      canSell: true,
      platformFee: 0.05, // 5% commission
      
      // Folders
      maxFolders: -1, // Unlimited folders
      maxFilesPerFolder: -1, // Unlimited files per folder
      canCreatePrivateFolders: true,
      canCreateNestedFolders: true,
      canCreateTeamFolders: true,
      maxTeamMembers: 10, // Up to 10 collaborators per folder
      
      // Versioning & Branching
      canCreateBranches: true,
      canViewActivityLogs: true,
      canViewChangeLogs: true,
      canCreateFolderNotes: true,
      canViewFileMetadata: true,
      
      // AI Features
      maxQuotesPerDay: 50,
      aiMaterials: ['PLA', 'PETG', 'ABS', 'TPU'],
      canUsePrintabilityAnalysis: true,
      canUseSupportMaterialEstimate: true,
      canUseWeightTimeCalculation: true,
      canUseAutoQuoteGeneration: false,
      canUseAISuggestedPrice: false,
      canUseAIRepair: false,
      canUseAIClassification: false,
      
      // Analytics
      analyticsLevel: 'advanced', // Full analytics page
      canAccessAdvancedAnalytics: true,
      
      // Profile Features
      canPinDesigns: true,
      canGetVerifiedBadge: true,
      canCustomizeStorefront: false,
      canUseCustomCSS: false,
      
      // Share Links
      canCreatePasswordLinks: true,
      canCreateExpiringLinks: true,
      canCreateViewOnlyLinks: true,
      canCreateDownloadBlockedLinks: true,
      canViewLinkAnalytics: false,
      
      // Other
      canPostForums: true,
      canSaveQuotes: true,
      prioritySearchRanking: false,
      taxDocumentsHandled: false,
      multiplePayoutMethods: false,
    }
  },
  creator: { // Pro tier - $25/month (backend name is "creator")
    name: 'Pro',
    price: 25,
    features: {
      // Storage
      storageGB: 500,
      maxFileSizeMB: 5120, // 5GB
      
      // Uploads
      maxProjects: -1, // Unlimited
      maxPublicProjects: -1,
      maxPrivateProjects: -1,
      canSell: true,
      platformFee: 0.0, // 0% commission
      
      // Folders
      maxFolders: -1, // Unlimited
      maxFilesPerFolder: -1, // Unlimited
      canCreatePrivateFolders: true,
      canCreateNestedFolders: true,
      canCreateTeamFolders: true,
      maxTeamMembers: -1, // Unlimited collaborators
      
      // Versioning & Branching
      canCreateBranches: true,
      canViewActivityLogs: true,
      canViewChangeLogs: true,
      canCreateFolderNotes: true,
      canViewFileMetadata: true,
      canUseBranchPermissions: true, // GitHub-style CAD versioning
      canUseBranchPreviews: true,
      
      // AI Features
      maxQuotesPerDay: -1, // Unlimited quotes
      aiMaterials: 'all', // All materials supported
      canUsePrintabilityAnalysis: true,
      canUseSupportMaterialEstimate: true,
      canUseWeightTimeCalculation: true,
      canUseAutoQuoteGeneration: true,
      canUseAISuggestedPrice: true,
      canUseAIRepair: true,
      canUseAIClassification: true,
      
      // Analytics
      analyticsLevel: 'advanced',
      canAccessAdvancedAnalytics: true,
      
      // Profile Features
      canPinDesigns: true,
      canGetVerifiedBadge: true,
      canCustomizeStorefront: true,
      canUseCustomCSS: true,
      
      // Share Links
      canCreatePasswordLinks: true,
      canCreateExpiringLinks: true,
      canCreateViewOnlyLinks: true,
      canCreateDownloadBlockedLinks: true,
      canViewLinkAnalytics: true, // Full link analytics
      
      // Other
      canPostForums: true,
      canSaveQuotes: true,
      prioritySearchRanking: true,
      taxDocumentsHandled: true,
      multiplePayoutMethods: true,
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
  
  if (!user) return 'free';
  
  const tier = user.subscription_tier || 'free';
  
  // Map old tier names to new tier system
  // "enterprise" -> "creator" (Pro tier)
  if (tier === 'enterprise') {
    return 'creator';
  }
  
  // If subscription is inactive or expired, default to free (unless tier is explicitly set)
  // But if user has a paid tier set, respect it even if status is not active
  // (this handles cases where status might not be set correctly)
  if (user.subscription_status !== 'active' && tier === 'free') {
    return 'free';
  }
  
  // If user has a paid tier but status is not active, still return the tier
  // (the status check is mainly for free tier users)
  return tier;
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
  const featureValue = features.features[featureName];
  
  // Handle boolean features
  if (typeof featureValue === 'boolean') {
    return featureValue === true;
  }
  
  // Handle unlimited features (-1)
  if (featureValue === -1) {
    return true;
  }
  
  // Handle numeric limits (0 means not allowed)
  if (typeof featureValue === 'number') {
    return featureValue > 0;
  }
  
  // Handle array features (like aiMaterials)
  if (Array.isArray(featureValue)) {
    return featureValue.length > 0;
  }
  
  // Handle string features (like 'all')
  if (typeof featureValue === 'string') {
    return featureValue === 'all' || featureValue.length > 0;
  }
  
  return false;
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
    
    case 'maxFilesPerFolder':
      // This is checked per-folder, not globally
      return 0; // Will be checked separately in folder API
    
    case 'maxQuotesPerDay':
      // Count quotes created today
      const today = new Date().toISOString().split('T')[0];
      const quotesToday = await db.get(`
        SELECT COUNT(*) as count 
        FROM quote_calculations 
        WHERE user_id = ? AND DATE(created_at) = ?
      `, [userId, today]);
      return quotesToday?.count || 0;
    
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
  return 'pro'; // Default to pro (Premium) if not found
}

/**
 * Get platform fee for user's tier
 */
async function getPlatformFee(userId) {
  const features = await getUserFeatures(userId);
  return features.features.platformFee;
}

/**
 * Get storage info for user (calculates actual storage from files)
 */
async function getStorageInfo(userId) {
  const db = await getDb();
  
  // Get user's tier to determine storage limit (don't rely on database storage_limit_gb)
  const tier = await getUserTier(userId);
  const tierConfig = TIER_FEATURES[tier] || TIER_FEATURES.free;
  const limit = tierConfig.features.storageGB;
  
  // Calculate actual storage used by summing file sizes
  let totalSizeBytes = 0;
  
  // Sum file sizes from projects (using file_size_bytes if available, otherwise calculate from file system)
  const projects = await db.all(
    `SELECT file_path, file_size_bytes, folder_id 
     FROM projects 
     WHERE user_id = ? AND file_path IS NOT NULL`,
    [userId]
  );
  
  const fs = require('fs');
  const path = require('path');
  
  for (const project of projects) {
    if (project.file_size_bytes) {
      // Use stored file size if available
      totalSizeBytes += project.file_size_bytes;
    } else {
      // Fallback: try to get file size from file system
      try {
        let filePath = project.file_path;
        if (filePath.startsWith('/storage/')) {
          filePath = path.join(process.cwd(), filePath.replace('/storage/', 'storage/'));
        } else if (filePath.startsWith('storage/')) {
          filePath = path.join(process.cwd(), filePath);
        } else {
          filePath = path.join(process.cwd(), 'storage', 'uploads', filePath);
        }
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          totalSizeBytes += stats.size;
        }
      } catch (e) {
        // File doesn't exist or can't be accessed, skip
        console.warn(`[Storage] Could not get size for file: ${project.file_path}`);
      }
    }
  }
  
  // Also check file branches
  const branches = await db.all(
    `SELECT fb.file_path 
     FROM file_branches fb
     JOIN projects p ON fb.project_id = p.id
     WHERE p.user_id = ? AND fb.file_path IS NOT NULL`,
    [userId]
  );
  
  for (const branch of branches) {
    try {
      let filePath = branch.file_path;
      if (filePath.startsWith('/storage/')) {
        filePath = path.join(process.cwd(), filePath.replace('/storage/', 'storage/'));
      } else if (filePath.startsWith('storage/')) {
        filePath = path.join(process.cwd(), filePath);
      } else {
        filePath = path.join(process.cwd(), 'storage', 'branches', filePath);
      }
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        totalSizeBytes += stats.size;
      }
    } catch (e) {
      // File doesn't exist or can't be accessed, skip
      console.warn(`[Storage] Could not get size for branch file: ${branch.file_path}`);
    }
  }
  
  // Convert bytes to GB
  const used = totalSizeBytes / (1024 * 1024 * 1024);
  const remaining = Math.max(0, limit - used);
  const percentUsed = limit > 0 ? (used / limit) * 100 : 0;
  
  return { 
    limit, 
    used: parseFloat(used.toFixed(2)), 
    remaining: parseFloat(remaining.toFixed(2)), 
    percentUsed: parseFloat(percentUsed.toFixed(2))
  };
}

/**
 * Get max file size in bytes for user's tier
 */
async function getMaxFileSize(userId) {
  const features = await getUserFeatures(userId);
  const maxSizeMB = features.features.maxFileSizeMB || 250;
  return maxSizeMB * 1024 * 1024; // Convert to bytes
}

/**
 * Check if user can use a specific AI material
 */
async function canUseAIMaterial(userId, material) {
  const features = await getUserFeatures(userId);
  const aiMaterials = features.features.aiMaterials;
  
  if (aiMaterials === 'all') {
    return true;
  }
  
  if (Array.isArray(aiMaterials)) {
    return aiMaterials.includes(material);
  }
  
  return false;
}

/**
 * Get storage limit for a tier (used in webhooks)
 */
function getStorageLimitForTier(tier) {
  const tierConfig = TIER_FEATURES[tier] || TIER_FEATURES.free;
  return tierConfig.features.storageGB;
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
  getStorageInfo,
  getMaxFileSize,
  canUseAIMaterial,
  getStorageLimitForTier
};
