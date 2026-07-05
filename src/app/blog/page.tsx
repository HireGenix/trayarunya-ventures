import type { Metadata } from 'next';
import Link from 'next/link';
import { blogStore } from '@/lib/blogStore';
import { SITE_URL, SITE_NAME } from '@/lib/blogRender';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Blog | ${SITE_NAME}`,
  description: `Insights on B2B growth, LinkedIn lead generation, and demand generation from ${SITE_NAME}.`,
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/blog`,
    title: `Blog | ${SITE_NAME}`,
    description: `Insights on B2B growth, LinkedIn lead generation, and demand generation from ${SITE_NAME}.`,
  },
};

async function getPublished() {
  try {
    return (await blogStore.list()).filter((p) => p.status === 'Published');
  } catch {
    return [];
  }
}

export default async function BlogIndexPage() {
  const posts = await getPublished();

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '4rem 1.25rem', color: '#1A1F2B' }}>
      <p style={{ marginBottom: 8 }}>
        <Link href="/" style={{ color: '#2D6CDF', textDecoration: 'none' }}>
          ← {SITE_NAME}
        </Link>
      </p>
      <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem', fontWeight: 800 }}>Blog</h1>
      <p style={{ color: '#5A6473', marginTop: 0 }}>
        B2B growth, LinkedIn lead generation, and demand generation — published and SEO-optimized
        automatically.
      </p>

      {posts.length === 0 ? (
        <p style={{ color: '#5A6473', marginTop: '3rem' }}>No articles published yet. Check back soon.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '2.5rem' }}>
          {posts.map((post) => (
            <li key={post.id} style={{ padding: '1.5rem 0', borderTop: '1px solid #E7EAF0' }}>
              <Link href={`/blog/${post.slug}`} style={{ color: '#1A1F2B', textDecoration: 'none' }}>
                <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.35rem', fontWeight: 700 }}>{post.title}</h2>
              </Link>
              <p style={{ color: '#5A6473', margin: '0 0 0.5rem' }}>{post.excerpt}</p>
              <small style={{ color: '#8A93A3' }}>
                {post.category ? `${post.category} · ` : ''}
                {post.date}
                {post.readingTime ? ` · ${post.readingTime} min read` : ''}
              </small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
