import { createRevalidateRoute } from '@marketiq/nextjs/revalidate';

// Optional: if this site is also configured in pull mode, the engine pings here
// to trigger on-demand ISR. (Push-mode sites get articles via /api/marketiq/ingest.)
export const { POST } = createRevalidateRoute({
  secret: process.env.MARKETIQ_REVALIDATE_SECRET || '',
  alwaysPaths: ['/blog', '/blog/rss.xml', '/sitemap.xml'],
});
