// Feature tree API endpoint
// NOTE: Disabled in this deployment to avoid native DB dependencies (better-sqlite3/forge.db).
// The CAD feature-tree system is not required for core Blueprint functionality in production.

export default async function handler(req, res) {
  return res.status(501).json({
    success: false,
    error: 'Feature tree API is disabled in this deployment.',
  });
}


