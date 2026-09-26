import type { Article } from './index';
import { verifySignature } from './signature';

export interface IngestPayload {
  event?: string;
  article: Article;
}

/**
 * Verify a signed MarketIQ push request and return its parsed payload,
 * or `null` if the signature or body is invalid.
 */
export async function verifyIngestRequest(
  req: Request,
  secret: string,
): Promise<IngestPayload | null> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return null;
  }
  if (!verifySignature(raw, req.headers, secret)) return null;
  try {
    const parsed = JSON.parse(raw) as IngestPayload;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
