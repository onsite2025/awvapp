/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  // For production, we want to enable server-side rendering
  // output: 'export', // Removed for server-side rendering
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable experimental features that cause issues
  experimental: {
  },
  webpack: (config, { isServer }) => {
    // If client-side, don't include server-only modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // These modules are server-only
        'firebase-admin': false,
      };
    }
    
    // Configure path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './'),
    };
    
    // Exclude .NO_STATIC_GEN directory from compilation
    config.module.rules.push({
      test: /app[\\\/]\.NO_STATIC_GEN/,
      loader: 'ignore-loader'
    });
    
    return config;
  },
}

module.exports = nextConfig 