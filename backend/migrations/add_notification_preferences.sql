-- Add per-user notification preferences (Settings → Notifications).
-- Run once against your PostgreSQL database.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN users.notification_preferences IS 'Email/push/category toggles from Settings; merged with server defaults when read.';
