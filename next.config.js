const path = require('path');
const fs = require('fs');

// Ensure we have a valid project root
const projectRoot = path.resolve(__dirname);
if (!projectRoot || !fs.existsSync(projectRoot)) {
  throw new Error('Unable to resolve project root');
}

// Log for debugging
console.log('[next.config.js] Project root:', projectRoot);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Disable X-Powered-By header
  poweredByHeader: false,
  webpack: (config, { isServer, webpack, dir }) => {
    // Ensure __dirname is properly set - use dir from Next.js context if available
    const projectRoot = dir || path.resolve(__dirname);
    console.log('[webpack] Project root:', projectRoot);
    console.log('[webpack] dir parameter:', dir);
    
    // Add alias for reorganized directories - ensure all paths are absolute
    const aliases = {
      '@/components': path.resolve(projectRoot, 'app/components'),
      '@/lib': path.resolve(projectRoot, 'shared/utils'),
      '@/db': path.resolve(projectRoot, 'db'),
      '@/storage': path.resolve(projectRoot, 'storage'),
      '@/types': path.resolve(projectRoot, 'shared/types'),
      '@/backend': path.resolve(projectRoot, 'backend'),
    };
    
    // Verify all alias paths exist
    Object.entries(aliases).forEach(([key, value]) => {
      if (!fs.existsSync(value)) {
        console.warn(`[webpack] Warning: Alias path ${key} -> ${value} does not exist`);
      }
    });
    
    config.resolve.alias = {
      ...config.resolve.alias,
      ...aliases,
    };
    
    // Fix watchpack path issues - completely disable native watching
    // This forces webpack to use polling which avoids path.relative() errors
    const ignoredPaths = [
      '**/node_modules/**',
      '**/.git/**',
      '**/.next/**',
      '**/storage/**',
      '**/db/**/*.db',
      '**/db/**/*.db-journal',
    ];
    
    // Add absolute paths to ignored list
    [path.resolve(projectRoot, 'node_modules'), path.resolve(projectRoot, '.next'), path.resolve(projectRoot, '.git')]
      .filter(p => typeof p === 'string' && p.length > 0 && fs.existsSync(p))
      .forEach(p => {
        ignoredPaths.push(p);
      });
    
    // Filter ignoredPaths to only valid strings
    const filteredIgnoredPaths = ignoredPaths.filter(p => typeof p === 'string' && p.length > 0);
    console.log('[webpack] Final ignoredPaths:', filteredIgnoredPaths);
      // WATCHER CONFIG DISABLED DUE TO NEXT.JS/WATCHPACK BUG ON MACOS
      // config.watchOptions = {
      //   ignored: filteredIgnoredPaths,
      //   followSymlinks: false,
      //   aggregateTimeout: 500,
      //   poll: 2000, // Force polling with 2 second interval - avoids native watcher completely
      //   stdin: false, // Disable stdin watching
      // };
    
    // Ensure resolve.fallback is set to avoid undefined module issues
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    
    // Allow ESM modules to be imported dynamically at runtime
    if (isServer) {
      config.externals = config.externals || [];
      // Don't bundle three/examples/jsm modules - they're ESM and loaded dynamically
      config.externals.push(({ request }, callback) => {
        if (request && request.includes('three/examples/jsm/')) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
      
      // Don't bundle pg (PostgreSQL) - it's only used in backend
      config.externals.push(({ request }, callback) => {
        if (request === 'pg' || request === 'pg-pool') {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }
    
    return config;
  },
  // Disable file watching optimizations that can cause issues
  experimental: {
    // This can help with file watcher issues
    optimizePackageImports: ['lucide-react'],
  },
  // Proxy API routes to external backend (Railway in production, localhost in dev)
  async rewrites() {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.API_URL ||
      'http://localhost:3001';

    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig