/**
 * Blueprint Backend Server
 * Express server for API routes
 * Handles Next.js-style API routes converted to Express
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initSchema } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const ROOT_DIR = path.resolve(__dirname, '..');

// Initialize database schema on startup
initSchema().catch(err => {
  console.error('Failed to initialize database schema:', err);
  process.exit(1);
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from storage
const storagePath = path.join(ROOT_DIR, 'storage');
if (fs.existsSync(storagePath)) {
  app.use('/storage', express.static(storagePath));
}

// Helper to convert Next.js request to Express-compatible
const adaptNextRequest = (req, res) => {
  // Next.js uses req.query for dynamic params, Express uses req.params
  // Merge them for compatibility
  const query = { ...req.query, ...req.params };
  return { ...req, query };
};

// Load API routes from pages/api structure
const loadRoutes = (dir, basePath = '') => {
  if (!fs.existsSync(dir)) return;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    let routePath = basePath;
    
    if (item.isDirectory()) {
      // Handle dynamic routes [id], [username], etc.
      if (item.name.startsWith('[') && item.name.endsWith(']')) {
        const paramName = item.name.slice(1, -1);
        routePath = `${basePath}/:${paramName}`;
      } else {
        routePath = `${basePath}/${item.name}`;
      }
      
      // Check for index file in directory
      const indexJs = path.join(fullPath, 'index.js');
      const indexTs = path.join(fullPath, 'index.ts');
      
      if (fs.existsSync(indexJs) || fs.existsSync(indexTs)) {
        const indexFile = fs.existsSync(indexJs) ? indexJs : indexTs;
        try {
          delete require.cache[require.resolve(indexFile)];
          const route = require(indexFile);
          
          if (route.default && typeof route.default === 'function') {
            const apiPath = `/api${routePath}`;
            app.all(`${apiPath}*`, async (req, res) => {
              try {
                // Adapt Express request to Next.js format
                const adaptedReq = adaptNextRequest(req, res);
                await route.default(adaptedReq, res);
              } catch (error) {
                console.error(`Error in ${apiPath}:`, error);
                if (!res.headersSent) {
                  res.status(500).json({ error: 'Internal server error' });
                }
              }
            });
            console.log(`[Backend] Mounted route: ${apiPath}*`);
          }
        } catch (error) {
          console.error(`Error loading route ${indexFile}:`, error);
        }
      }
      
      // Recursively load subdirectories
      loadRoutes(fullPath, routePath);
    } else if ((item.name.endsWith('.js') || item.name.endsWith('.ts')) && 
               item.name !== 'index.js' && item.name !== 'index.ts') {
      // Handle individual route files (not in [id] directories)
      try {
        delete require.cache[require.resolve(fullPath)];
        const route = require(fullPath);
        
        if (route.default && typeof route.default === 'function') {
          const routeName = item.name.replace(/\.(js|ts)$/, '');
          const apiPath = `/api${basePath}/${routeName}`;
          
          app.all(`${apiPath}*`, async (req, res) => {
            try {
              const adaptedReq = adaptNextRequest(req, res);
              await route.default(adaptedReq, res);
            } catch (error) {
              console.error(`Error in ${apiPath}:`, error);
              if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
              }
            }
          });
          console.log(`[Backend] Mounted route: ${apiPath}*`);
        }
      } catch (error) {
        console.error(`Error loading route ${fullPath}:`, error);
      }
    }
  });
};

// Load routes from pages/api (primary location)
const pagesApiPath = path.join(ROOT_DIR, 'pages', 'api');

if (fs.existsSync(pagesApiPath)) {
  console.log('[Backend] Loading routes from pages/api...');
  loadRoutes(pagesApiPath);
} else {
  console.warn('[Backend] Warning: pages/api directory not found');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Backend] Server running on http://localhost:${PORT}`);
  console.log(`[Backend] API routes available at http://localhost:${PORT}/api`);
});

module.exports = app;
