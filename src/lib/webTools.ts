/**
 * Web tools for the internal admin assistant: Tavily web search + page scraping.
 * Server-only (reads TAVILY_API_KEY).
 */
import { isTavilyConfigured } from '@/lib/realtimeConfig';
import { nativeScrape } from '@/lib/nativeScrape';

export interface WebSearchResult {
  ok: boolean;
  query: string;
  answer?: string;
  results: { title: string; url: string; content: string }[];
  reason?: string;
}

export async function webSearch(query: string, maxResults = 5): Promise<WebSearchResult> {
  const q = query.trim().slice(0, 300);
  if (!q) return { ok: false, query: q, results: [], reason: 'empty_query' };
  if (!isTavilyConfigured()) {
    return { ok: false, query: q, results: [], reason: 'tavily_not_configured' };
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: q,
        search_depth: 'advanced',
        include_answer: true,
        max_results: maxResults,
      }),
    });
    if (!res.ok) return { ok: false, query: q, results: [], reason: `tavily_${res.status}` };

    const data = await res.json();
    const results = (Array.isArray(data?.results) ? data.results : [])
      .slice(0, maxResults)
      .map((r: { title?: string; url?: string; content?: string }) => ({
        title: (r.title || '').slice(0, 200),
        url: r.url || '',
        content: (r.content || '').slice(0, 500),
      }));
    return { ok: true, query: q, answer: (data?.answer || '').toString(), results };
  } catch (err) {
    console.error('[webTools] search error', err);
    return { ok: false, query: q, results: [], reason: 'server_error' };
  }
}

export interface ScrapeOutput {
  ok: boolean;
  url: string;
  title?: string;
  description?: string;
  content: string;
  reason?: string;
}

export async function scrapeUrl(url: string, maxChars = 4000): Promise<ScrapeOutput> {
  const u = (url || '').trim();
  if (!u) return { ok: false, url: u, content: '', reason: 'empty_url' };
  try {
    const r = await nativeScrape(u, maxChars);
    return {
      ok: r.ok,
      url: u,
      title: r.title,
      description: r.description,
      content: r.content,
      reason: r.ok ? undefined : 'scrape_failed',
    };
  } catch (err) {
    console.error('[webTools] scrape error', err);
    return { ok: false, url: u, content: '', reason: 'server_error' };
  }
}

/**
 * Detect explicit tool requests in a user message.
 * Returns the search query and/or URLs to scrape.
 */
export function detectToolIntent(text: string): { search?: string; scrape?: string[] } {
  const out: { search?: string; scrape?: string[] } = {};
  const t = text.trim();

  // Explicit web search triggers.
  const searchPatterns = [
    /^\/search\s+(.+)/i,
    /\bsearch\s+(?:the\s+)?(?:web|online|internet|google)\s+(?:for\s+)?["“]?(.+?)["”]?$/i,
    /\b(?:web\s*search|google)\s*[:\-]\s*(.+)/i,
    /\bsearch\s+for\s+["“](.+?)["”]/i,
  ];
  for (const re of searchPatterns) {
    const m = t.match(re);
    if (m && m[1]) {
      out.search = m[1].trim();
      break;
    }
  }

  // URLs to scrape — when the user asks to scrape/analyse/read a link.
  if (/\b(scrape|crawl|analyse|analyze|read|summari[sz]e|check)\b/i.test(t)) {
    const urls = t.match(/https?:\/\/[^\s)]+/gi);
    if (urls && urls.length) out.scrape = urls.slice(0, 3);
  }

  return out;
}
