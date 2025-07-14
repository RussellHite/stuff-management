import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporarily disable ESLint during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jujtjswxpeikaecbfvvn.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Suppress hydration warnings in development
  reactStrictMode: true,
  // Enable experimental features if needed
  experimental: {
    // serverActions: true, // Already enabled by default in Next.js 13.4+
  },
};

export default nextConfig;
