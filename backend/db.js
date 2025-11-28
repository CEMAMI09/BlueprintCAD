/**
 * PostgreSQL Database Connection
 * For Railway deployment with PostgreSQL
 */

// Lazy load pg to avoid issues during Next.js build
let Pool = null;
function getPoolClass() {
  if (!Pool) {
    try {
      Pool = require('pg').Pool;
    } catch (error) {
      // pg not available (e.g., during Next.js build)
      throw new Error('pg module not found. Install it with: npm install pg');
    }
  }
  return Pool;
}

let pool = null;

function getPool() {
  if (!pool) {
    // Railway provides DATABASE_URL automatically
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const PoolClass = getPoolClass();
    pool = new PoolClass({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  
  return pool;
}

/**
 * Get database connection
 * Returns a promise that resolves to a database client
 * For compatibility with SQLite interface, returns an object with query methods
 */
async function getDb() {
  const pool = getPool();
  
  // Return a compatible interface that matches SQLite's db object
  return {
    // Execute query and return all rows
    all: async (query, params = []) => {
      const result = await pool.query(query, params);
      return result.rows;
    },
    
    // Execute query and return first row
    get: async (query, params = []) => {
      const result = await pool.query(query, params);
      return result.rows[0] || null;
    },
    
    // Execute query (INSERT/UPDATE/DELETE)
    run: async (query, params = []) => {
      const result = await pool.query(query, params);
      return {
        lastID: result.rows[0]?.id || null,
        changes: result.rowCount || 0
      };
    },
    
    // Execute raw SQL (for schema initialization)
    exec: async (sql) => {
      await pool.query(sql);
    },
    
    // Transaction support
    transaction: async (callback) => {
      return transaction(callback);
    }
  };
}

/**
 * Execute a query and return results
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function query(query, params = []) {
  const pool = getPool();
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Execute a query and return a single row
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} Single row or null
 */
async function get(query, params = []) {
  const pool = getPool();
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

/**
 * Execute a query and return the number of affected rows
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} Number of affected rows
 */
async function run(query, params = []) {
  const pool = getPool();
  const result = await pool.query(query, params);
  return result.rowCount || 0;
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Function that receives a client and executes queries
 * @returns {Promise<any>} Result of the callback
 */
async function transaction(callback) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Initialize database schema
 * Converts SQLite schema to PostgreSQL
 */
async function initSchema() {
  const pool = getPool();
  
  try {
    // Convert SQLite schema to PostgreSQL
    await pool.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        bio TEXT,
        avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Folders table
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        parent_id INTEGER,
        is_team_folder BOOLEAN DEFAULT FALSE,
        color VARCHAR(50) DEFAULT '#3b82f6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
      );

      -- Folder members table
      CREATE TABLE IF NOT EXISTS folder_members (
        id SERIAL PRIMARY KEY,
        folder_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL CHECK(role IN ('owner', 'admin', 'editor', 'viewer')),
        invited_by INTEGER,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(folder_id, user_id),
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id)
      );

      -- Projects table
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        folder_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        file_type VARCHAR(50),
        tags TEXT,
        is_public BOOLEAN DEFAULT TRUE,
        for_sale BOOLEAN DEFAULT FALSE,
        price DECIMAL(10,2),
        ai_estimate TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      );

      -- Folder activity table
      CREATE TABLE IF NOT EXISTS folder_activity (
        id SERIAL PRIMARY KEY,
        folder_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INTEGER,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Folder comments table
      CREATE TABLE IF NOT EXISTS folder_comments (
        id SERIAL PRIMARY KEY,
        folder_id INTEGER NOT NULL,
        project_id INTEGER,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folder_comments(id) ON DELETE CASCADE
      );

      -- Folder invitations table
      CREATE TABLE IF NOT EXISTS folder_invitations (
        id SERIAL PRIMARY KEY,
        folder_id INTEGER NOT NULL,
        invited_user_id INTEGER NOT NULL,
        invited_by INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL CHECK(role IN ('admin', 'editor', 'viewer')),
        status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Follows table
      CREATE TABLE IF NOT EXISTS follows (
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        status INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        related_id INTEGER,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Comments table
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- CAD assemblies table
      CREATE TABLE IF NOT EXISTS cad_assemblies (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        folder_id INTEGER,
        author_id INTEGER NOT NULL,
        version INTEGER DEFAULT 1,
        description TEXT,
        tags TEXT,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- CAD files table
      CREATE TABLE IF NOT EXISTS cad_files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        filepath TEXT NOT NULL,
        folder_id INTEGER,
        version INTEGER DEFAULT 1,
        thumbnail TEXT,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders(owner_id);
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_folder_members_user ON folder_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_id);
      CREATE INDEX IF NOT EXISTS idx_folder_activity_folder ON folder_activity(folder_id);
      CREATE INDEX IF NOT EXISTS idx_folder_invitations_user ON folder_invitations(invited_user_id);
      CREATE INDEX IF NOT EXISTS idx_folder_comments_folder ON folder_comments(folder_id);
      CREATE INDEX IF NOT EXISTS idx_folder_comments_parent ON folder_comments(parent_id);
    `);

    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Database schema initialization failed:', error);
    throw error;
  }
}

module.exports = {
  getDb,
  query,
  get,
  run,
  transaction,
  initSchema
};

