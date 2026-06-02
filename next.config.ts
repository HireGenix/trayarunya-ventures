/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'trayarunyaventures.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  typescript: {
    // Ignore TypeScript errors during build for production
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
