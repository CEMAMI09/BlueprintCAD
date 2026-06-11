// Ensures forum tables exist (PostgreSQL). Safe to call multiple times.
const { query } = require("./db");

let ensured = false;

async function ensureForumTables() {
  if (ensured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS forum_threads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        views INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT false,
        is_locked BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS forum_replies (
        id SERIAL PRIMARY KEY,
        thread_id INTEGER NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(
      `CREATE INDEX IF NOT EXISTS idx_forum_threads_user ON forum_threads(user_id)`
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category)`
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON forum_replies(thread_id)`
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_forum_replies_user ON forum_replies(user_id)`
    );
    ensured = true;
  } catch (e) {
    console.warn("[forumSchema] ensureForumTables:", e.message);
  }
}

module.exports = { ensureForumTables };
