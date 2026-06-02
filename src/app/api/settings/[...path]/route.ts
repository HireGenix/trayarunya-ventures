import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/authToken';
import { settingsStore } from '@/lib/settingsStore';
import { userStore, type Role } from '@/lib/userStore';

export const runtime = 'nodejs';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Map a real stored user to the settings-page User shape.
function toSettingsUser(u: ReturnType<typeof userStore.list>[number]) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === 'superadmin' ? 'Super Admin' : 'Administrator',
    status: u.active ? 'active' : 'inactive',
    createdAt: u.createdAt,
    lastLogin: u.updatedAt,
  };
}

function roleFromLabel(label?: string): Role {
  return label && /super/i.test(label) ? 'superadmin' : 'admin';
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const [section] = path || [];

  switch (section) {
    case 'general':
      return NextResponse.json(settingsStore.getGeneral());
    case 'notifications':
      return NextResponse.json(settingsStore.getNotifications());
    case 'integrations':
      return NextResponse.json(settingsStore.getIntegrations());
    case 'backup':
      return NextResponse.json(settingsStore.getBackup());
    case 'security':
      return NextResponse.json(settingsStore.getSecurity());
    case 'roles':
      return NextResponse.json(settingsStore.getRoles());
    case 'users':
      return NextResponse.json(userStore.list().map(toSettingsUser));
    default:
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!getAuth(req)) return unauthorized();
  const { path } = await params;
  const [section, id] = path || [];
  const body = await readBody(req);

  switch (section) {
    case 'general':
      return NextResponse.json(settingsStore.updateGeneral(body));
    case 'notifications':
      return NextResponse.json(settingsStore.updateNotifications(body));
    case 'backup':
      return NextResponse.json(settingsStore.updateBackup(body));
    case 'security':
      return NextResponse.json(settingsStore.updateSecurity(body));
    case 'integrations': {
      if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
      const updated = settingsStore.updateIntegration(id, body);
      return updated
        ? NextResponse.json(updated)
        : NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    case 'users': {
      if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
      const updated = userStore.update(id, {
        name: body.name as string | undefined,
        role: body.role ? roleFromLabel(body.role as string) : undefined,
        active: body.status ? body.status === 'active' : undefined,
        password: body.password as string | undefined,
      });
      return updated
        ? NextResponse.json(toSettingsUser(updated as ReturnType<typeof userStore.list>[number]))
        : NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    default:
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!getAuth(req)) return unauthorized();
  const { path } = await params;
  const [section] = path || [];
  const body = await readBody(req);

  switch (section) {
    case 'integrations':
      return NextResponse.json(
        settingsStore.createIntegration(body as never),
        { status: 201 }
      );
    case 'users': {
      try {
        const created = userStore.create({
          email: String(body.email || ''),
          name: String(body.name || ''),
          password: String(body.password || Math.random().toString(36).slice(2)),
          role: roleFromLabel(body.role as string),
        });
        return NextResponse.json(
          toSettingsUser(created as ReturnType<typeof userStore.list>[number]),
          { status: 201 }
        );
      } catch (err) {
        return NextResponse.json(
          { error: 'create_failed', message: (err as Error).message },
          { status: 400 }
        );
      }
    }
    default:
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!getAuth(req)) return unauthorized();
  const { path } = await params;
  const [section, id] = path || [];
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  switch (section) {
    case 'integrations':
      return settingsStore.deleteIntegration(id)
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: 'not_found' }, { status: 404 });
    case 'users':
      userStore.delete(id);
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}
