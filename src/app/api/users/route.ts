import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/authToken';
import { userStore } from '@/lib/userStore';

export const runtime = 'nodejs';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'superadmin']).default('admin'),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'superadmin']).optional(),
  password: z.string().min(6).optional(),
  active: z.boolean().optional(),
});

/** Only superadmins may manage users. */
function requireSuperadmin(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return { error: 'Unauthorized', status: 401 as const, auth: null };
  if (auth.role !== 'superadmin')
    return { error: 'Forbidden — superadmin only', status: 403 as const, auth: null };
  return { error: null, status: 200 as const, auth };
}

export async function GET(req: NextRequest) {
  const guard = requireSuperadmin(req);
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ users: userStore.list() });
}

export async function POST(req: NextRequest) {
  const guard = requireSuperadmin(req);
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }
  try {
    const user = userStore.create(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create user' },
      { status: 409 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const guard = requireSuperadmin(req);
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const { id, ...patch } = parsed.data;
  try {
    const user = userStore.update(id, patch);
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update user' },
      { status: 404 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const guard = requireSuperadmin(req);
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Prevent superadmins from deleting their own account.
  if (guard.auth && guard.auth.id === id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }
  try {
    userStore.delete(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not delete user' },
      { status: 404 }
    );
  }
}
