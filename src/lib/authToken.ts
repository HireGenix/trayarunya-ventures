/**
 * Server-only JWT helpers shared across admin APIs.
 * NEVER import into client components.
 */
import { sign, verify } from 'jsonwebtoken';

export const JWT_SECRET =
  process.env.JWT_SECRET?.trim() || 'trayarunya-ventures-jwt-secret-key';

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'superadmin';
}

export function signToken(payload: TokenPayload): string {
  return sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/** Verify a raw token string. Returns the payload or null. */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = verify(token, JWT_SECRET) as Record<string, unknown>;
    if (!decoded || typeof decoded !== 'object') return null;
    return {
      id: String(decoded.id),
      email: String(decoded.email),
      name: String(decoded.name),
      role: decoded.role === 'superadmin' ? 'superadmin' : 'admin',
    };
  } catch {
    return null;
  }
}

/** Extract + verify the bearer token from a request's Authorization header. */
export function getAuth(req: Request): TokenPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  return verifyToken(token);
}
