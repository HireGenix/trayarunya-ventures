/**
 * Blog post store — backed by Azure Postgres (Prisma).
 */
import { prisma } from '@/lib/prisma';

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
}

function toPost(row: {
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
}): BlogPost {
  return {
    ...row,
    coverImage: row.coverImage ?? undefined,
    status: row.status === 'Published' ? 'Published' : 'Draft',
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
