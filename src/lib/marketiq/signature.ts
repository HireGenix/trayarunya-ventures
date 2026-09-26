import { createHmac, timingSafeEqual } from 'crypto';

/** Max allowed clock skew for timestamped signatures (5 minutes). */
const MAX_SKEW_SECONDS = 300;

/**
 * Verify an HMAC-SHA256 signature over the raw request body.
 *
 * Signature header: `x-marketiq-signature` (hex, optionally prefixed `sha256=`).
 * If `x-marketiq-timestamp` (unix seconds) is present, the signed message is
 * `${timestamp}.${body}` and the timestamp must be within ±5 minutes.
 */
export function verifySignature(rawBody: string, headers: Headers, secret: string): boolean {
  if (!secret) return false;
  const header = headers.get('x-marketiq-signature') || '';
  const provided = header.replace(/^sha256=/i, '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(provided)) return false;

  const timestamp = headers.get('x-marketiq-timestamp');
  let message = rawBody;
  if (timestamp) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false;
    message = `${timestamp}.${rawBody}`;
  }

  const expected = createHmac('sha256', secret).update(message).digest();
  const got = Buffer.from(provided, 'hex');
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
