// backend/lib/db.js
// PostgreSQL database connection for BlueprintCAD
const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
};

