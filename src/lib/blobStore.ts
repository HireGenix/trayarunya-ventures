/**
 * Durable JSON storage that works on Vercel's read-only, multi-instance
 * serverless runtime.
 *
 * - When BLOB_READ_WRITE_TOKEN is present (i.e. a Vercel Blob store is
 *   provisioned), JSON documents are persisted to Vercel Blob at a stable
 *   pathname. This is shared across every serverless instance and team member.
 * - Otherwise (local dev, or no Blob store), it transparently falls back to a
 *   local file under data/ with an in-memory cache.
 *
 * This is NOT a database — it is server-side file/blob storage, which is what
 * the admin platform was designed around.
 */
import fs from 'fs';
import path from 'path';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const DATA_DIR = path.join(process.cwd(), 'data');

export function blobEnabled(): boolean {
  return !!TOKEN;
}

// Per-pathname in-memory cache (used as the dev/file fallback and to avoid
// re-fetching within a single warm invocation).
const memCache = new Map<string, unknown>();

function localFile(pathname: string): string {
  return path.join(DATA_DIR, pathname);
}

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    /* read-only fs */
  }
}

/** Read a JSON document, returning `fallback` when it does not exist. */
export async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  if (TOKEN) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: pathname, token: TOKEN, limit: 100 });
      const found = blobs.find((b) => b.pathname === pathname);
      if (!found) return fallback;
      const res = await fetch(found.url, { cache: 'no-store' });
      if (!res.ok) return fallback;
      return (await res.json()) as T;
    } catch {
      // Fall through to in-memory cache if Blob read fails.
      if (memCache.has(pathname)) return memCache.get(pathname) as T;
      return fallback;
    }
  }

  // Local/dev fallback.
  if (memCache.has(pathname)) return memCache.get(pathname) as T;
  try {
    ensureDir();
    const file = localFile(pathname);
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/** Persist a JSON document at a stable pathname. */
export async function writeJson<T>(pathname: string, data: T): Promise<void> {
  memCache.set(pathname, data);

  if (TOKEN) {
    try {
      const { put } = await import('@vercel/blob');
      await put(pathname, JSON.stringify(data), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: TOKEN,
        cacheControlMaxAge: 0,
      });
      return;
    } catch {
      // Keep in memCache so the value is at least readable within this instance.
      return;
    }
  }

  // Local/dev fallback.
  try {
    ensureDir();
    fs.writeFileSync(localFile(pathname), JSON.stringify(data, null, 2));
  } catch {
    /* read-only fs — value stays in memCache */
  }
}
