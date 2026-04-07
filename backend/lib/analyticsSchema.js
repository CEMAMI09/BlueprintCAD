// Ensures analytics tables exist (PostgreSQL). Safe to call multiple times.
const { query } = require("./db");

let ensured = false;

async function ensureProjectViewEventsTable() {
  if (ensured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS project_view_events (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        viewer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(
      `CREATE INDEX IF NOT EXISTS idx_project_view_events_project_time ON project_view_events (project_id, viewed_at DESC)`
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_project_view_events_time ON project_view_events (viewed_at DESC)`
    );
    ensured = true;
  } catch (e) {
    console.warn("[analyticsSchema] ensureProjectViewEventsTable:", e.message);
  }
}

module.exports = { ensureProjectViewEventsTable };
