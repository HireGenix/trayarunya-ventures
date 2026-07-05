/**
 * Blog post store — backed by Azure Postgres (Prisma).
 */
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  coverImage?: string;
  status: 'Published' | 'Draft';
  views: number;
  date: string; // ISO date (publish/created)
  updatedAt: string;
  // On-page SEO (populated by the MarketIQ engine; optional for manual posts).
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  focusKeyword?: string;
  ogImage?: string;
  readingTime?: number;
  seo?: unknown;
  sourceId?: string;
}

type Row = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  coverImage: string | null;
  status: string;
  views: number;
  date: string;
  updatedAt: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonical: string | null;
  focusKeyword: string | null;
  ogImage: string | null;
  readingTime: number | null;
  seo: Prisma.JsonValue | null;
  sourceId: string | null;
};

function toPost(row: Row): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    author: row.author,
    category: row.category,
    tags: row.tags,
    coverImage: row.coverImage ?? undefined,
    status: row.status === 'Published' ? 'Published' : 'Draft',
    views: row.views,
    date: row.date,
    updatedAt: row.updatedAt,
    metaTitle: row.metaTitle ?? undefined,
    metaDescription: row.metaDescription ?? undefined,
    canonical: row.canonical ?? undefined,
    focusKeyword: row.focusKeyword ?? undefined,
    ogImage: row.ogImage ?? undefined,
    readingTime: row.readingTime ?? undefined,
    seo: (row.seo as unknown) ?? undefined,
    sourceId: row.sourceId ?? undefined,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export const blogStore = {
  async list(): Promise<BlogPost[]> {
    const rows = await prisma.blogPost.findMany({ orderBy: { date: 'desc' } });
    return rows.map(toPost);
  },

  async get(id: string): Promise<BlogPost | null> {
    const row =
      (await prisma.blogPost.findUnique({ where: { id } })) ||
      (await prisma.blogPost.findUnique({ where: { slug: id } }));
    return row ? toPost(row) : null;
  },

  async create(input: Partial<BlogPost>): Promise<BlogPost> {
    const now = new Date().toISOString();
    const title = (input.title || 'Untitled').toString().slice(0, 200);
    let slug = input.slug ? slugify(input.slug) : slugify(title);
    if (!slug) slug = `post-${Date.now().toString(36)}`;
    // Ensure unique slug.
    let unique = slug;
    let n = 1;
    while (await prisma.blogPost.findUnique({ where: { slug: unique } })) unique = `${slug}-${++n}`;

    const row = await prisma.blogPost.create({
      data: {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        title,
        slug: unique,
        excerpt: (input.excerpt || '').toString().slice(0, 400),
        content: (input.content || '').toString(),
        author: (input.author || 'Admin').toString().slice(0, 80),
        category: (input.category || 'General').toString().slice(0, 60),
        tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t).slice(0, 40)).slice(0, 20) : [],
        coverImage: input.coverImage ? String(input.coverImage).slice(0, 500) : null,
        status: input.status === 'Published' ? 'Published' : 'Draft',
        views: 0,
        date: (input.date as string) || now.split('T')[0],
        updatedAt: now,
        ...seoData(input),
      },
    });
    return toPost(row);
  },

  async update(id: string, patch: Partial<BlogPost>): Promise<BlogPost | null> {
    const cur = await prisma.blogPost.findUnique({ where: { id } });
    if (!cur) return null;
    const row = await prisma.blogPost.update({
      where: { id },
      data: {
        title: patch.title ?? undefined,
        slug: patch.slug ? slugify(patch.slug) : undefined,
        excerpt: patch.excerpt ?? undefined,
        content: patch.content ?? undefined,
        author: patch.author ?? undefined,
        category: patch.category ?? undefined,
        coverImage: patch.coverImage !== undefined ? patch.coverImage || null : undefined,
        tags: patch.tags ? patch.tags.map((t) => String(t).slice(0, 40)).slice(0, 20) : undefined,
        status:
          patch.status === 'Published' ? 'Published' : patch.status === 'Draft' ? 'Draft' : undefined,
        date: patch.date ?? undefined,
        updatedAt: new Date().toISOString(),
        ...seoData(patch),
      },
    });
    return toPost(row);
  },

  /**
   * Upsert a post pushed by the MarketIQ engine (keyed by slug). Stores the full
   * on-page SEO bundle so the public render is SEO-complete.
   */
  async upsertFromEngine(input: {
    slug: string;
    title: string;
    excerpt?: string;
    content: string;
    author?: string;
    category?: string;
    tags?: string[];
    coverImage?: string | null;
    status?: 'Published' | 'Draft';
    publishedAt?: string;
    sourceId?: string;
    metaTitle?: string;
    metaDescription?: string;
    canonical?: string;
    focusKeyword?: string;
    ogImage?: string | null;
    readingTime?: number;
    seo?: unknown;
  }): Promise<BlogPost> {
    const now = new Date().toISOString();
    const slug = slugify(input.slug || input.title);
    const base = {
      title: (input.title || 'Untitled').slice(0, 200),
      excerpt: (input.excerpt || '').slice(0, 400),
      content: input.content || '',
      author: (input.author || 'Editorial Team').slice(0, 80),
      category: (input.category || 'General').slice(0, 60),
      tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t).slice(0, 40)).slice(0, 20) : [],
      coverImage: input.coverImage ? String(input.coverImage).slice(0, 500) : null,
      status: input.status === 'Draft' ? 'Draft' : 'Published',
      date: (input.publishedAt || now).split('T')[0],
      updatedAt: now,
      sourceId: input.sourceId ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      canonical: input.canonical ?? null,
      focusKeyword: input.focusKeyword ?? null,
      ogImage: input.ogImage ?? null,
      readingTime: input.readingTime ?? null,
      seo: (input.seo as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    };
    const row = await prisma.blogPost.upsert({
      where: { slug },
      update: base,
      create: {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        slug,
        views: 0,
        ...base,
      },
    });
    return toPost(row);
  },

  async remove(id: string): Promise<boolean> {
    try {
      await prisma.blogPost.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async incrementViews(id: string): Promise<void> {
    const post =
      (await prisma.blogPost.findUnique({ where: { id } })) ||
      (await prisma.blogPost.findUnique({ where: { slug: id } }));
    if (post) {
      await prisma.blogPost.update({ where: { id: post.id }, data: { views: { increment: 1 } } });
    }
  },
};

function seoData(input: Partial<BlogPost>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.metaTitle !== undefined) out.metaTitle = input.metaTitle || null;
  if (input.metaDescription !== undefined) out.metaDescription = input.metaDescription || null;
  if (input.canonical !== undefined) out.canonical = input.canonical || null;
  if (input.focusKeyword !== undefined) out.focusKeyword = input.focusKeyword || null;
  if (input.ogImage !== undefined) out.ogImage = input.ogImage || null;
  if (input.readingTime !== undefined) out.readingTime = input.readingTime ?? null;
  if (input.sourceId !== undefined) out.sourceId = input.sourceId || null;
  if (input.seo !== undefined) out.seo = (input.seo as Prisma.InputJsonValue) ?? Prisma.JsonNull;
  return out;
}
