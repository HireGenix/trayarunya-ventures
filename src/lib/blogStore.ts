/**
 * Blog post store — file-backed CRUD persisted to data/blog.json.
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BLOG_FILE = path.join(DATA_DIR, 'blog.json');

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

function ensure() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(BLOG_FILE)) fs.writeFileSync(BLOG_FILE, '[]');
  } catch (err) {
    console.error('[blogStore] ensure error', err);
  }
}

function readAll(): BlogPost[] {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(BLOG_FILE, 'utf8')) as BlogPost[];
  } catch {
    return [];
  }
}

function writeAll(posts: BlogPost[]) {
  ensure();
  fs.writeFileSync(BLOG_FILE, JSON.stringify(posts, null, 2));
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
  list(): BlogPost[] {
    return readAll().sort((a, b) => (a.date < b.date ? 1 : -1));
  },

  get(id: string): BlogPost | null {
    return readAll().find((p) => p.id === id || p.slug === id) || null;
  },

  create(input: Partial<BlogPost>): BlogPost {
    const posts = readAll();
    const now = new Date().toISOString();
    const title = (input.title || 'Untitled').toString().slice(0, 200);
    let slug = input.slug ? slugify(input.slug) : slugify(title);
    if (!slug) slug = `post-${Date.now().toString(36)}`;
    // Ensure unique slug.
    let unique = slug;
    let n = 1;
    while (posts.some((p) => p.slug === unique)) unique = `${slug}-${++n}`;

    const post: BlogPost = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      title,
      slug: unique,
      excerpt: (input.excerpt || '').toString().slice(0, 400),
      content: (input.content || '').toString(),
      author: (input.author || 'Admin').toString().slice(0, 80),
      category: (input.category || 'General').toString().slice(0, 60),
      tags: Array.isArray(input.tags) ? input.tags.map((t) => String(t).slice(0, 40)).slice(0, 20) : [],
      coverImage: input.coverImage ? String(input.coverImage).slice(0, 500) : undefined,
      status: input.status === 'Published' ? 'Published' : 'Draft',
      views: 0,
      date: (input.date as string) || now.split('T')[0],
      updatedAt: now,
    };
    posts.push(post);
    writeAll(posts);
    return post;
  },

  update(id: string, patch: Partial<BlogPost>): BlogPost | null {
    const posts = readAll();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const cur = posts[idx];
    const updated: BlogPost = {
      ...cur,
      ...patch,
      id: cur.id,
      slug: patch.slug ? slugify(patch.slug) : cur.slug,
      tags: patch.tags ? patch.tags.map((t) => String(t).slice(0, 40)).slice(0, 20) : cur.tags,
      status: patch.status === 'Published' ? 'Published' : patch.status === 'Draft' ? 'Draft' : cur.status,
      updatedAt: new Date().toISOString(),
    };
    posts[idx] = updated;
    writeAll(posts);
    return updated;
  },

  remove(id: string): boolean {
    const posts = readAll();
    const next = posts.filter((p) => p.id !== id);
    if (next.length === posts.length) return false;
    writeAll(next);
    return true;
  },

  incrementViews(id: string): void {
    const posts = readAll();
    const idx = posts.findIndex((p) => p.id === id || p.slug === id);
    if (idx !== -1) {
      posts[idx].views += 1;
      writeAll(posts);
    }
  },
};
