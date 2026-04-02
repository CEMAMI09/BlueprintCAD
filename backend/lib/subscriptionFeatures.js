/**
 * Subscription tier → feature flags for PostgreSQL API routes.
 * Keep in sync with frontend expectations (SubscriptionGate, UpgradeModal).
 */

const TIER_FEATURES = {
  free: {
    name: "Free",
    features: {
      maxProjects: -1,
      maxPublicProjects: -1,
      maxPrivateProjects: 2,
      maxFolders: 3,
      maxTeamMembers: 0,
      maxConversations: -1,
      storageGB: 0.5,
      canSell: true,
      canPostForums: true,
      canSaveQuotes: true,
      maxQuoteRequests: 3,
      platformFee: 0.15,
      analytics: "none",
      apiAccess: false,
      fileVersioning: false,
      storefrontCustomization: false,
      manufacturingOrders: false,
      teamCollaboration: false,
      featuredListing: false,
      licensingControls: false,
      salesAnalytics: false,
    },
  },
  creator: {
    name: "Creator",
    features: {
      maxProjects: -1,
      maxPublicProjects: -1,
      maxPrivateProjects: -1,
      maxFolders: -1,
      maxTeamMembers: 0,
      maxConversations: -1,
      storageGB: 50,
      canSell: true,
      canPostForums: true,
      canSaveQuotes: true,
      maxQuoteRequests: -1,
      platformFee: 0.05,
      analytics: "sales",
      apiAccess: false,
      fileVersioning: true,
      storefrontCustomization: true,
      manufacturingOrders: true,
      teamCollaboration: false,
      featuredListing: true,
      licensingControls: true,
      salesAnalytics: true,
    },
  },
  studio: {
    name: "Studio",
    features: {
      maxProjects: -1,
      maxPublicProjects: -1,
      maxPrivateProjects: -1,
      maxFolders: -1,
      maxTeamMembers: 10,
      maxConversations: -1,
      storageGB: 200,
      canSell: true,
      canPostForums: true,
      canSaveQuotes: true,
      maxQuoteRequests: -1,
      platformFee: 0.05,
      analytics: "advanced",
      apiAccess: true,
      fileVersioning: true,
      storefrontCustomization: true,
      manufacturingOrders: true,
      teamCollaboration: true,
      roleBasedPermissions: true,
      sharedStorefront: true,
      priorityQuoting: true,
      featuredListing: true,
      licensingControls: true,
      salesAnalytics: true,
    },
  },
};

/** Map legacy / alternate DB values to canonical tier keys used in TIER_FEATURES */
function normalizeTier(raw) {
  if (raw == null || raw === "") return "free";
  const r = String(raw).toLowerCase().trim();
  const legacy = {
    enterprise: "studio",
    pro: "creator",
    premium: "creator",
    team: "studio",
  };
  if (legacy[r]) return legacy[r];
  if (TIER_FEATURES[r]) return r;
  return "free";
}

function getFeaturesFlat(tier) {
  const t = normalizeTier(tier);
  const config = TIER_FEATURES[t] || TIER_FEATURES.free;
  return { ...config.features };
}

/** Minimum tier name for upgrade CTAs (matches UpgradeModal TIER_INFO keys). */
const FEATURE_MIN_TIER = {
  maxPrivateProjects: "creator",
  maxFolders: "creator",
  maxTeamMembers: "studio",
  analytics: "creator",
  storefrontCustomization: "creator",
  fileVersioning: "creator",
  apiAccess: "studio",
  manufacturingOrders: "creator",
  teamCollaboration: "studio",
  featuredListing: "creator",
  licensingControls: "creator",
  salesAnalytics: "creator",
  sharedStorefront: "studio",
  roleBasedPermissions: "studio",
  priorityQuoting: "studio",
  maxProjects: "creator",
};

function getRequiredTierForFeature(featureName) {
  return FEATURE_MIN_TIER[featureName] || "creator";
}

module.exports = {
  TIER_FEATURES,
  normalizeTier,
  getFeaturesFlat,
  getRequiredTierForFeature,
};
