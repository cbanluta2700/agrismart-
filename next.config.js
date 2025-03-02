// This file sets up the configuration for Next.js
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  
  // Enable source maps in production
  productionBrowserSourceMaps: true,

  // Configure redirects and rewrites if needed
  async redirects() {
    return [];
  },

  async rewrites() {
    return [];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  silent: true,
  hideSourceMaps: true,
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
};

// Export configuration with Sentry
module.exports = withSentryConfig(
  nextConfig,
  sentryWebpackPluginOptions
);
