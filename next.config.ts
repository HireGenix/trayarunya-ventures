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
  async redirects() {
    return [
      { source: '/services/linkedin-lead-generation', destination: '/services/ai-gtm-marketiq', permanent: true },
      { source: '/services/b2b-demand-generation', destination: '/services/performance-marketing', permanent: true },
      { source: '/services/personal-branding', destination: '/services/social-media-content', permanent: true },
      { source: '/services/content-performance-creative', destination: '/services/brand-creative-web', permanent: true },
      { source: '/services/paid-advertising', destination: '/services/performance-marketing', permanent: true },
      { source: '/services/funnels-automation-fractional-cmo', destination: '/services/marketing-automation-cro', permanent: true },
    ];
  },
};

export default nextConfig;
