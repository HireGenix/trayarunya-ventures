/**
 * Free web search — no API key required.
 *
 * Uses DuckDuckGo's HTML endpoint (html.duckduckgo.com) and parses the results
 * with cheerio (already a dependency). This is the zero-cost fallback used when
 * TAVILY_API_KEY is not configured, or when Tavily fails. Works fully in-process
 * inside Next.js server routes.
 */

import * as cheerio from 'cheerio';

export interface FreeSearchResult {
  ok: boolean;
  query: string;
  results: { title: string; url: string; content: string }[];
  reason?: string;
}

const ENDPOINTS = [
  'https://html.duckduckgo.com/html/',
  'https://lite.duckduckgo.com/lite/',
];

/** DuckDuckGo wraps target links in a redirect (/l/?uddg=...). Decode it. */
function decodeDdgUrl(href: string): string {
  if (!href) return '';
  try {
    let u = href;
    if (u.startsWith('//')) u = `https:${u}`;
    const parsed = new URL(u, 'https://duckduckgo.com');
    const target = parsed.searchParams.get('uddg');
    if (target) return decodeURIComponent(target);
    // lite endpoint sometimes returns the direct link already
    return /^https?:\/\//i.test(href) ? href : '';
  } catch {
    return /^https?:\/\//i.test(href) ? href : '';
  }
}

function parseHtmlEndpoint($: cheerio.CheerioAPI, max: number) {
  const out: { title: string; url: string; content: string }[] = [];
  $('.result').each((_, el) => {
    if (out.length >= max) return;
    const a = $(el).find('a.result__a').first();
    const title = a.text().replace(/\s+/g, ' ').trim();
    const url = decodeDdgUrl(a.attr('href') || '');
    const content = $(el).find('.result__snippet').first().text().replace(/\s+/g, ' ').trim();
    if (title && url) out.push({ title: title.slice(0, 200), url, content: content.slice(0, 500) });
  });
  return out;
}

function parseLiteEndpoint($: cheerio.CheerioAPI, max: number) {
  const out: { title: string; url: string; content: string }[] = [];
  $('a.result-link').each((_, el) => {
    if (out.length >= max) return;
    const a = $(el);
    const title = a.text().replace(/\s+/g, ' ').trim();
    const url = decodeDdgUrl(a.attr('href') || '');
    // snippet sits in the following table row
    const content = a
      .closest('tr')
      .next('tr')
      .find('.result-snippet')
      .text()
      .replace(/\s+/g, ' ')
      .trim();
    if (title && url) out.push({ title: title.slice(0, 200), url, content: content.slice(0, 500) });
  });
  return out;
}

export async function freeSearch(query: string, maxResults = 5): Promise<FreeSearchResult> {
  const q = query.trim().slice(0, 300);
  if (!q) return { ok: false, query: q, results: [], reason: 'empty_query' };

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        body: new URLSearchParams({ q, kl: 'us-en' }).toString(),
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);
      const results = endpoint.includes('/lite/')
        ? parseLiteEndpoint($, maxResults)
        : parseHtmlEndpoint($, maxResults);

      if (results.length) return { ok: true, query: q, results };
    } catch (err) {
      console.error('[freeSearch] error on', endpoint, err);
    }
  }

  return { ok: false, query: q, results: [], reason: 'no_results' };
}
