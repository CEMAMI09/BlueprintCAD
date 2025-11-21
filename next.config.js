const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Disable X-Powered-By header
  poweredByHeader: false,
  webpack: (config) => {
    // Removed preferRelative to avoid potential watchpack path issues
    // Add alias for reorganized directories
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components': path.resolve(__dirname, 'frontend/components'),
      '@/lib': path.resolve(__dirname, 'backend/lib'),
      '@/db': path.resolve(__dirname, 'db'),
      '@/storage': path.resolve(__dirname, 'storage'),
    };
    return config;
  }
}

module.exports = nextConfig