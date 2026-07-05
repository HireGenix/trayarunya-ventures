import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { toNextMetadata, jsonLdScriptProps } from '@marketiq/nextjs';
import { blogStore } from '@/lib/blogStore';
import { toArticle, SITE_URL, SITE_NAME } from '@/lib/blogRender';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  try {
    const post = await blogStore.get(slug);
    if (!post || post.status !== 'Published') return null;
    return post;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Article not found' };
  return toNextMetadata(toArticle(post), { siteUrl: SITE_URL, siteName: SITE_NAME }) as Metadata;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const article = toArticle(post);

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '4rem 1.25rem', color: '#1A1F2B' }}>
      {/* JSON-LD structured data (BlogPosting) for rich results */}
      <script {...jsonLdScriptProps(article)} />

      <p style={{ marginBottom: 16 }}>
        <Link href="/blog" style={{ color: '#2D6CDF', textDecoration: 'none' }}>
          ← Blog
        </Link>
      </p>

      <article>
        <h1 style={{ fontSize: '2.25rem', lineHeight: 1.15, margin: '0 0 0.75rem', fontWeight: 800 }}>
          {article.title}
        </h1>
        <p style={{ color: '#8A93A3', margin: '0 0 1.5rem' }}>
          By {article.author} · {article.published_at}
          {article.reading_time_min ? ` · ${article.reading_time_min} min read` : ''}
        </p>

        {article.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.cover_image_url}
            alt={article.seo.image_alt}
            style={{ width: '100%', borderRadius: 14, marginBottom: '1.5rem' }}
          />
        ) : null}

        <div
          className="marketiq-article"
          dangerouslySetInnerHTML={{ __html: article.html }}
          style={{ lineHeight: 1.75, fontSize: '1.0625rem' }}
        />
      </article>
    </main>
  );
}
