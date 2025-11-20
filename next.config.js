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
    return config;
  }
}

module.exports = nextConfig