const path = require("path");

/**
 * Absolute path to the repo root (parent of `backend/`).
 * Use this instead of process.cwd() for storage/temp paths so thumbnail generation works
 * whether you run `node backend/server.js` from the repo root or from inside `backend/`.
 */
const REPO_ROOT = path.resolve(__dirname, "..", "..");

module.exports = { REPO_ROOT };
