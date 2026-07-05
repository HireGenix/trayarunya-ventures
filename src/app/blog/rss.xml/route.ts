import { buildRssXml } from '@marketiq/nextjs';
import type { FeedResponse } from '@marketiq/nextjs';
import { blogStore } from '@/lib/blogStore';
import { SITE_URL, SITE_NAME } from '@/lib/blogRender';

export const dynamic = 'force-dynamic';

export async function GET() {
  let items: FeedResponse['items'] = [];
  try {
    const posts = (await blogStore.list()).filter((p) => p.status === 'Published').slice(0, 50);
    items = posts.map((p) => ({
      title: p.title,
      link: `${SITE_URL}/blog/${p.slug}`,
      description: p.excerpt,
      pubDate: p.date,
      category: p.category,
      guid: p.id,
    }));
  } catch {
    items = [];
  }

  const feed: FeedResponse = {
    title: `${SITE_NAME} — Blog`,
    link: `${SITE_URL}/blog`,
    items,
  };
  const xml = buildRssXml(feed, {
    selfUrl: `${SITE_URL}/blog/rss.xml`,
    description: `Latest articles from ${SITE_NAME}.`,
  });
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
