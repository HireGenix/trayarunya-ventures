/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    domains: ['trayarunyaventures.com'],
    formats: ['image/avif', 'image/webp'],
  },
  // Disable ESLint during build for production
  eslint: {
    // Only run ESLint in development, not during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during build for production
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
