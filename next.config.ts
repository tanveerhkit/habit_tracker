import path from 'path';
import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  ...(process.env.GITHUB_ACTIONS ? { output: 'export' as const, basePath: '/habit_tracker', assetPrefix: '/habit_tracker/', images: { unoptimized: true } } : {}),
  typescript: {
    ignoreBuildErrors: false,
  },
  outputFileTracingRoot: path.join(__dirname, './'),
};

export default withPWA({
  dest: 'public',
  register: false,
  skipWaiting: true,
  // Habitly already has browser-storage fallbacks. Avoid a stale service worker
  // serving old app bundles after a deploy or trapping users on an old schema.
  disable: true,
})(nextConfig);
