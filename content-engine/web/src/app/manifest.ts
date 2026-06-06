import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#0E1116',
    theme_color: '#0E1116',
    categories: ['business', 'productivity', 'marketing'],
    icons: [
      {
        src: '/brand/marketiq-icon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/favicon.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  };
}
