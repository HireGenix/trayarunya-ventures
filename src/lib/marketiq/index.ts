/**
 * In-repo MarketIQ connector (replaces the uncommitted `@marketiq/nextjs`
 * tarball dependency). Provides the types and SEO/RSS helpers used by the blog.
 */

export interface SeoBundle {
  meta_title: string;
  meta_description: string;
  canonical_path: string;
  canonical_url: string;
  focus_keyword: string;
  secondary_keywords: string[];
  tags: string[];
  category: string | null;
  image_alt: string;
  reading_time_min: number;
  robots: string;
  og: {
    type: string;
    title: string;
    description: string;
    image: string | null;
    url: string;
    site_name: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image: string | null;
  };
  json_ld: Record<string, unknown> | Record<string, unknown>[];
  internal_links: Array<{ anchor?: string; url?: string; [k: string]: unknown }>;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  html: string;
  cover_image_url: string | null;
  author: string;
  category: string | null;
  tags: string[];
  status: 'published' | 'draft';
  published_at: string | null;
  updated_at: string;
  reading_time_min: number;
  views?: number;
  seo: SeoBundle;
}

export interface FeedItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  category?: string | null;
  guid?: string;
}

export interface FeedResponse {
  title: string;
  link: string;
  items: FeedItem[];
}

export interface MetadataOptions {
  siteUrl: string;
  siteName: string;
}

function absoluteUrl(url: string | null | undefined, siteUrl: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

/** Build a Next.js `Metadata`-compatible object from an article's SEO bundle. */
export function toNextMetadata(article: Article, opts: MetadataOptions) {
  const seo = article.seo;
  const canonical =
    seo.canonical_url || absoluteUrl(seo.canonical_path || `/blog/${article.slug}`, opts.siteUrl);
  const title = seo.meta_title || article.title;
  const description = seo.meta_description || article.excerpt;
  const ogImage = absoluteUrl(seo.og?.image ?? article.cover_image_url, opts.siteUrl);
  const twImage = absoluteUrl(seo.twitter?.image ?? ogImage, opts.siteUrl);
  const robots = (seo.robots || 'index,follow').toLowerCase();
  const keywords = [seo.focus_keyword, ...(seo.secondary_keywords || [])].filter(Boolean);

  return {
    title,
    description,
    keywords: keywords.length ? keywords : undefined,
    authors: article.author ? [{ name: article.author }] : undefined,
    alternates: { canonical },
    robots: {
      index: !robots.includes('noindex'),
      follow: !robots.includes('nofollow'),
    },
    openGraph: {
      type: 'article' as const,
      title: seo.og?.title || title,
      description: seo.og?.description || description,
      url: seo.og?.url || canonical,
      siteName: seo.og?.site_name || opts.siteName,
      images: ogImage ? [{ url: ogImage, alt: seo.image_alt || article.title }] : undefined,
      publishedTime: article.published_at || undefined,
      modifiedTime: article.updated_at || undefined,
      authors: article.author ? [article.author] : undefined,
      section: article.category || undefined,
      tags: article.tags?.length ? article.tags : undefined,
    },
    twitter: {
      card: (seo.twitter?.card === 'summary' || !twImage ? 'summary' : 'summary_large_image') as
        | 'summary'
        | 'summary_large_image',
      title: seo.twitter?.title || title,
      description: seo.twitter?.description || description,
      images: twImage ? [twImage] : undefined,
    },
  };
}

/** Props for a `<script type="application/ld+json">` tag, safely escaped. */
export function jsonLdScriptProps(article: Article) {
  const json = JSON.stringify(article.seo?.json_ld ?? {})
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: json },
  };
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rfc822(date?: string): string | null {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d.toUTCString();
}

/** Serialize a feed into RSS 2.0 XML. */
export function buildRssXml(
  feed: FeedResponse,
  opts: { selfUrl?: string; description?: string } = {},
): string {
  const items = feed.items
    .map((item) => {
      const parts = [
        `<title>${xmlEscape(item.title || '')}</title>`,
        `<link>${xmlEscape(item.link)}</link>`,
        `<guid isPermaLink="${item.guid ? 'false' : 'true'}">${xmlEscape(item.guid || item.link)}</guid>`,
      ];
      if (item.description) parts.push(`<description>${xmlEscape(item.description)}</description>`);
      const pub = rfc822(item.pubDate);
      if (pub) parts.push(`<pubDate>${pub}</pubDate>`);
      if (item.category) parts.push(`<category>${xmlEscape(item.category)}</category>`);
      return `<item>${parts.join('')}</item>`;
    })
    .join('\n');

  const selfLink = opts.selfUrl
    ? `<atom:link href="${xmlEscape(opts.selfUrl)}" rel="self" type="application/rss+xml"/>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xmlEscape(feed.title)}</title>
<link>${xmlEscape(feed.link)}</link>
<description>${xmlEscape(opts.description || feed.title)}</description>
${selfLink}
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;
}
