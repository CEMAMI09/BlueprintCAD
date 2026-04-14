/**
 * Default notification preferences (all channels user can toggle in Settings).
 * Stored in users.notification_preferences (JSONB).
 */

const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailNotifications: true,
  pushNotifications: false,
  commentsOnDesigns: true,
  newFollowers: true,
  marketplaceUpdates: true,
};

const ALLOWED_KEYS = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES);

function mergeNotificationPreferences(raw) {
  const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  if (!raw || typeof raw !== "object") return merged;
  for (const key of ALLOWED_KEYS) {
    if (typeof raw[key] === "boolean") merged[key] = raw[key];
  }
  return merged;
}

/**
 * Accept partial body from client; only boolean keys in ALLOWED_KEYS are applied.
 */
function sanitizeNotificationPreferencesPatch(body) {
  if (!body || typeof body !== "object") return {};
  const out = {};
  for (const key of ALLOWED_KEYS) {
    if (typeof body[key] === "boolean") out[key] = body[key];
  }
  return out;
}

module.exports = {
  DEFAULT_NOTIFICATION_PREFERENCES,
  ALLOWED_KEYS,
  mergeNotificationPreferences,
  sanitizeNotificationPreferencesPatch,
};
