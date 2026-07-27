import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  // Product imagery is served straight from the suppliers' CDNs. We never
  // re-host it, so the remote patterns list is the allow-list of hosts whose
  // images the app is permitted to render.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: '**.trendsi.com' },
      { protocol: 'https', hostname: 'img.trendsi.com' },
      { protocol: 'https', hostname: '**.alicdn.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
    ],
  },
  serverExternalPackages: ['@prisma/adapter-better-sqlite3', 'better-sqlite3', 'pino'],
};

export default config;
