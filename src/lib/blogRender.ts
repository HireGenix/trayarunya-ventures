/**
 * Render helpers: turn a stored BlogPost into the connector's Article shape so
 * the @marketiq/nextjs metadata/JSON-LD helpers produce SEO-complete output —
 * whether the post was pushed by the MarketIQ engine (full SEO bundle stored) or
 * authored manually in the admin (SEO synthesized at render time).
 */
import type { Article, SeoBundle } from '@marketiq/nextjs';
import type { BlogPost } from '@/lib/blogStore';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://trayarunyaventures.com'
).replace(/\/$/, '');
export const SITE_NAME = 'Trayarunya Ventures';

/** Plain-text admin content → HTML; engine content is already HTML (passthrough). */
export function contentToHtml(content: string): string {
  const c = content || '';
  if (/<[a-z][\s\S]*>/i.test(c)) return c;
  return c
    .split(/\n{2,}/)
    .map((para) => `<p>${para.trim().replace(/\n/g, '<br/>')}</p>`)
    .filter((p) => p !== '<p></p>')
    .join('\n');
}

function synthesizeSeo(post: BlogPost): SeoBundle {
  const canonicalPath = `/blog/${post.slug}`;
  const canonicalUrl = post.canonical || `${SITE_URL}${canonicalPath}`;
  const metaTitle = (post.metaTitle || `${post.title} | ${SITE_NAME}`).slice(0, 70);
  const metaDescription = (post.metaDescription || post.excerpt || '').slice(0, 180);
  const image = post.ogImage || post.coverImage || null;
  return {
    meta_title: metaTitle,
    meta_description: metaDescription,
    canonical_path: canonicalPath,
    canonical_url: canonicalUrl,
    focus_keyword: post.focusKeyword || '',
    secondary_keywords: [],
    tags: post.tags || [],
    category: post.category || null,
    image_alt: post.title,
    reading_time_min: post.readingTime || 1,
    robots: 'index,follow',
    og: {
      type: 'article',
      title: metaTitle,
      description: metaDescription,
      image,
      url: canonicalUrl,
      site_name: SITE_NAME,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: metaTitle,
      description: metaDescription,
      image,
    },
    json_ld: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title.slice(0, 110),
      description: metaDescription,
      ...(image ? { image } : {}),
      author: { '@type': 'Person', name: post.author },
      datePublished: post.date,
      dateModified: post.updatedAt,
      url: canonicalUrl,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    },
    internal_links: [],
  };
}

export function toArticle(post: BlogPost): Article {
  const stored = post.seo && typeof post.seo === 'object' ? (post.seo as SeoBundle) : null;
  const seo = stored ?? synthesizeSeo(post);
  const canonicalPath = seo.canonical_path || `/blog/${post.slug}`;
  const canonicalUrl = seo.canonical_url || `${SITE_URL}${canonicalPath}`;
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    html: contentToHtml(post.content),
    cover_image_url: post.coverImage || null,
    author: post.author,
    category: post.category || null,
    tags: post.tags || [],
    status: post.status === 'Published' ? 'published' : 'draft',
    published_at: post.date,
    updated_at: post.updatedAt,
    reading_time_min: seo.reading_time_min,
    views: post.views,
    seo: { ...seo, canonical_path: canonicalPath, canonical_url: canonicalUrl },
  };
}
