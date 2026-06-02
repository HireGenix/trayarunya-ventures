/**
 * Real SEO analysis — crawls the site's own pages, computes on-page metrics
 * and issues, and persists the latest snapshot to data/seo.json.
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SEO_FILE = path.join(DATA_DIR, 'seo.json');

// Public routes to audit (static routes only).
export const SEO_ROUTES = [
  '/',
  '/about',
  '/about/leadership',
  '/services',
  '/how-we-work',
  '/insights',
  '/contact',
  '/ai-chat',
  '/privacy',
  '/terms',
  '/cookies',
  '/compliance',
];

export interface PageMetric {
  id: number;
  url: string;
  title: string;
  description: string;
  keywords: string;
  status: 'Optimized' | 'Needs Improvement' | 'Critical';
  score: number;
  issues: number;
}

export interface SEOIssue {
  id: number;
  page: string;
  issue: string;
  severity: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Fixed';
}

export interface KeywordRanking {
  keyword: string;
  position: number;
  change: number;
  volume: number;
}

export interface SEOSnapshot {
  generatedAt: string;
  pages: PageMetric[];
  issues: SEOIssue[];
  keywords: KeywordRanking[];
}

// In-memory fallback for read-only filesystems (e.g. Vercel serverless).
let memSnapshot: SEOSnapshot | null = null;

function ensure() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    /* read-only fs — fall back to memory */
  }
}

export function readSnapshot(): SEOSnapshot | null {
  if (memSnapshot) return memSnapshot;
  ensure();
  try {
    if (!fs.existsSync(SEO_FILE)) return null;
    return JSON.parse(fs.readFileSync(SEO_FILE, 'utf8')) as SEOSnapshot;
  } catch {
    return memSnapshot;
  }
}

function writeSnapshot(snap: SEOSnapshot) {
  // Always keep an in-memory copy so reads work even when the FS is read-only.
  memSnapshot = snap;
  try {
    ensure();
    fs.writeFileSync(SEO_FILE, JSON.stringify(snap, null, 2));
  } catch (err) {
    // Serverless read-only filesystem — in-memory snapshot is the source of truth.
    console.warn('[seoStore] could not persist snapshot, using in-memory copy:', (err as Error)?.message);
  }
}

function extract(re: RegExp, html: string): string {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function countMatches(re: RegExp, html: string): number {
  const m = html.match(re);
  return m ? m.length : 0;
}

interface PageAudit {
  metric: PageMetric;
  issues: Omit<SEOIssue, 'id'>[];
}

function auditHtml(url: string, html: string, id: number): PageAudit {
  const title = extract(/<title[^>]*>([^<]*)<\/title>/i, html);
  const description = extract(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
    html
  ) || extract(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i, html);
  const keywords = extract(
    /<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i,
    html
  );
  const h1Count = countMatches(/<h1[\s>]/gi, html);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const wordCount = (text.match(/\b\w+\b/g) || []).length;
  const imgTags = html.match(/<img[\s\S]*?>/gi) || [];
  const imgsMissingAlt = imgTags.filter((t) => !/\balt=/.test(t)).length;
  const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);
  const hasOg = /<meta[^>]*property=["']og:/i.test(html);
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);

  const issues: Omit<SEOIssue, 'id'>[] = [];

  if (!title) issues.push({ page: url, issue: 'Missing <title> tag', severity: 'High', status: 'Open' });
  else if (title.length < 30) issues.push({ page: url, issue: `Title too short (${title.length} chars, aim for 30–60)`, severity: 'Medium', status: 'Open' });
  else if (title.length > 65) issues.push({ page: url, issue: `Title too long (${title.length} chars, aim for 30–60)`, severity: 'Low', status: 'Open' });

  if (!description) issues.push({ page: url, issue: 'Missing meta description', severity: 'High', status: 'Open' });
  else if (description.length < 70) issues.push({ page: url, issue: `Meta description too short (${description.length} chars, aim for 70–160)`, severity: 'Medium', status: 'Open' });
  else if (description.length > 165) issues.push({ page: url, issue: `Meta description too long (${description.length} chars)`, severity: 'Low', status: 'Open' });

  if (h1Count === 0) issues.push({ page: url, issue: 'No <h1> heading found', severity: 'High', status: 'Open' });
  else if (h1Count > 1) issues.push({ page: url, issue: `Multiple <h1> headings (${h1Count})`, severity: 'Medium', status: 'Open' });

  if (imgsMissingAlt > 0) issues.push({ page: url, issue: `${imgsMissingAlt} image(s) missing alt text`, severity: 'Medium', status: 'Open' });
  if (wordCount < 300) issues.push({ page: url, issue: `Thin content (${wordCount} words, aim for 300+)`, severity: 'Low', status: 'Open' });
  if (!hasCanonical) issues.push({ page: url, issue: 'Missing canonical link', severity: 'Low', status: 'Open' });
  if (!hasOg) issues.push({ page: url, issue: 'Missing Open Graph tags', severity: 'Low', status: 'Open' });
  if (!hasViewport) issues.push({ page: url, issue: 'Missing viewport meta (mobile)', severity: 'Medium', status: 'Open' });

  // Score: start at 100, subtract per issue by severity.
  let score = 100;
  for (const i of issues) score -= i.severity === 'High' ? 20 : i.severity === 'Medium' ? 10 : 4;
  score = Math.max(0, Math.min(100, score));

  const status: PageMetric['status'] = score >= 80 ? 'Optimized' : score >= 55 ? 'Needs Improvement' : 'Critical';

  return {
    metric: { id, url, title: title || '(no title)', description, keywords, status, score, issues: issues.length },
    issues,
  };
}

async function fetchPage(base: string, route: string): Promise<string | null> {
  try {
    const res = await fetch(`${base}${route}`, {
      headers: { 'User-Agent': 'TrayarunyaSEOBot/1.0' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function runAudit(baseUrl: string): Promise<SEOSnapshot> {
  const pages: PageMetric[] = [];
  const issues: SEOIssue[] = [];
  let issueId = 1;

  const results = await Promise.all(
    SEO_ROUTES.map(async (route, idx) => {
      const html = await fetchPage(baseUrl, route);
      if (html == null) {
        return {
          metric: {
            id: idx + 1,
            url: route,
            title: '(unreachable)',
            description: '',
            keywords: '',
            status: 'Critical' as const,
            score: 0,
            issues: 1,
          },
          issues: [{ page: route, issue: 'Page could not be fetched', severity: 'High' as const, status: 'Open' as const }],
        };
      }
      return auditHtml(route, html, idx + 1);
    })
  );

  // Derive keyword candidates from titles for a lightweight ranking table.
  const keywordSet = new Set<string>();

  for (const r of results) {
    pages.push(r.metric);
    for (const i of r.issues) issues.push({ ...i, id: issueId++ });
    r.metric.keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .forEach((k) => keywordSet.add(k));
  }

  const keywords: KeywordRanking[] = [...keywordSet].slice(0, 25).map((keyword) => ({
    keyword,
    position: 0,
    change: 0,
    volume: 0,
  }));

  const snap: SEOSnapshot = {
    generatedAt: new Date().toISOString(),
    pages,
    issues,
    keywords,
  };
  writeSnapshot(snap);
  return snap;
}

export function overviewFrom(snap: SEOSnapshot) {
  const pages = snap.pages;
  const totalPages = pages.length;
  const pagesIndexed = pages.filter((p) => p.score > 0).length;
  const overallScore = totalPages
    ? Math.round(pages.reduce((a, p) => a + p.score, 0) / totalPages)
    : 0;
  const open = snap.issues.filter((i) => i.status === 'Open');
  return {
    overallScore,
    pagesIndexed,
    totalPages,
    activeIssues: {
      total: open.length,
      high: open.filter((i) => i.severity === 'High').length,
      medium: open.filter((i) => i.severity === 'Medium').length,
      low: open.filter((i) => i.severity === 'Low').length,
      recentlyFixed: snap.issues.filter((i) => i.status === 'Fixed').length,
    },
    keywords: {
      total: snap.keywords.length,
      improved: snap.keywords.filter((k) => k.change > 0).length,
      topTen: snap.keywords.filter((k) => k.position > 0 && k.position <= 10).length,
    },
  };
}
