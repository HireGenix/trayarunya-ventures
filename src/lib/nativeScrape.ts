/**
 * Native in-process web scraper (a Next.js-friendly stand-in for Crawl4AI).
 *
 * Crawl4AI itself is Python + Playwright and cannot run inside Next.js serverless.
 * This module replicates the part we actually need for ICP enrichment: fetch a
 * page, strip chrome (nav/script/style/footer), and return clean readable text +
 * key metadata for the LLM. Works for server-rendered marketing/company sites
 * (the vast majority). For heavy client-only SPAs, the caller falls back to Tavily.
 */

import * as cheerio from 'cheerio';

export interface ScrapeResult {
  ok: boolean;
  content: string;
  title?: string;
  description?: string;
  source: 'native';
}

function normaliseUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

function collapse(text: string): string {
  return text
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \n]+\n/g, '\n')
    .trim();
}

/** Fetch + extract readable content from a URL using native Node + cheerio. */
export async function nativeScrape(rawUrl: string, maxChars = 2500): Promise<ScrapeResult> {
  const target = normaliseUrl(rawUrl);

  const res = await fetch(target, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; TrayarunyaBot/1.0; +https://trayarunyaventures.com)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    return { ok: false, content: '', source: 'native' };
  }

  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('html')) {
    return { ok: false, content: '', source: 'native' };
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Strip non-content elements
  $('script, style, noscript, svg, iframe, nav, footer, header, form, aside').remove();
  $('[aria-hidden="true"]').remove();

  const title = ($('title').first().text() || '').trim();
  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  // Prefer main/article if present, else body
  const root = $('main').length ? $('main') : $('article').length ? $('article') : $('body');

  const parts: string[] = [];
  root.find('h1, h2, h3, h4, li, p').each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() || '';
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (!txt || txt.length < 2) return;
    if (/^h[1-4]$/.test(tag)) parts.push(`\n## ${txt}`);
    else if (tag === 'li') parts.push(`- ${txt}`);
    else parts.push(txt);
  });

  const body = collapse(parts.join('\n'));
  const content = collapse(
    [title ? `# ${title}` : '', description ? `> ${description}` : '', body]
      .filter(Boolean)
      .join('\n\n')
  ).slice(0, maxChars);

  return {
    ok: Boolean(content && content.length > 40),
    content,
    title,
    description,
    source: 'native',
  };
}
