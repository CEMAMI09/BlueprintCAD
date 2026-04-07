// backend/lib/db.js
// PostgreSQL database connection for BlueprintCAD
const { Pool } = require('pg');

let pool = null;

/**
 * Resolves which connection string to use. Order (first non-empty wins for local dev):
 * 1) DATABASE_PUBLIC_URL
 * 2) POSTGRES_PUBLIC_URL / RAILWAY_DATABASE_PUBLIC_URL (common Railway / template aliases)
 * 3) DATABASE_URL
 *
 * postgres.railway.internal only resolves inside Railway's network. When running the API on your
 * laptop, use the public URL from Railway → Postgres → Connect (or set DATABASE_PUBLIC_URL).
 */
function getDatabaseUrl() {
  const pub =
    (process.env.DATABASE_PUBLIC_URL && String(process.env.DATABASE_PUBLIC_URL).trim()) ||
    (process.env.POSTGRES_PUBLIC_URL && String(process.env.POSTGRES_PUBLIC_URL).trim()) ||
    (process.env.RAILWAY_DATABASE_PUBLIC_URL &&
      String(process.env.RAILWAY_DATABASE_PUBLIC_URL).trim()) ||
    '';
  const primary = process.env.DATABASE_URL ? String(process.env.DATABASE_URL).trim() : '';
  const url = pub || primary;

  if (!url) {
    throw new Error('Set DATABASE_URL (or DATABASE_PUBLIC_URL) in .env.local');
  }

  const onRailway = !!process.env.RAILWAY_ENVIRONMENT;
  if (url.includes('railway.internal') && !onRailway) {
    throw new Error(
      '[db] Your active DB URL uses *.railway.internal — that only works inside Railway, not on your PC.\n' +
        '  Fix: In Railway open Postgres → Connect → copy the PUBLIC connection string.\n' +
        '  Add a line to repo-root .env.local:\n' +
        '    DATABASE_PUBLIC_URL=postgresql://USER:PASSWORD@PUBLIC_HOST:PORT/railway\n' +
        '  (DATABASE_PUBLIC_URL is used before DATABASE_URL when both are set.)\n' +
        '  Or replace DATABASE_URL in .env.local with that public URL.\n' +
        '  If your shell still exports an internal DATABASE_URL, run:  Remove-Item Env:DATABASE_URL  (PowerShell) ' +
        'or unset DATABASE_URL in the terminal before npm run dev:api.'
    );
  }

  return url;
}

function connectionHost(connectionString) {
  const m = String(connectionString).match(/@([^/:]+)/);
  return m ? m[1] : '?';
}

function useSsl(connectionString) {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') return true;
  const host = connectionHost(connectionString);
  if (host === 'localhost' || host === '127.0.0.1') return false;
  // Railway public proxy and most cloud Postgres require TLS
  return true;
}

function getPool() {
  if (!pool) {
    const connectionString = getDatabaseUrl();

    if (process.env.NODE_ENV === 'development') {
      console.log('[db] Postgres host:', connectionHost(connectionString));
    }

    pool = new Pool({
      connectionString,
      ssl: useSsl(connectionString) ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      process.exit(-1);
    });
  }

  return pool;
}

// Execute a query and return results
async function query(text, params) {
  const pool = getPool();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('Query error', { text, duration, error: error.message });
    throw error;
  }
}

// Get a single row (convenience method)
async function getOne(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// Get all rows (convenience method)
async function getAll(text, params) {
  const result = await query(text, params);
  return result.rows;
}

// Execute a query that doesn't return rows (INSERT, UPDATE, DELETE)
// Also handles queries with RETURNING clause
async function execute(text, params) {
  const result = await query(text, params);
  return {
    rowCount: result.rowCount,
    rows: result.rows, // For RETURNING clauses
    lastID: result.rows[0]?.id || null, // For INSERT with RETURNING id
  };
}

module.exports = {
  getPool,
  query,
  getOne,
  getAll,
  execute,
  getDatabaseUrl,
};

