import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/authToken';
import { conversationStore } from '@/lib/conversationStore';

export const runtime = 'nodejs';

const saveSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  provider: z.enum(['gpt-5.5', 'claude-opus']),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        ts: z.number().optional(),
      })
    )
    .default([]),
});

export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (id) {
    const conv = conversationStore.get(auth.id, id);
    if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ conversation: conv });
  }
  return NextResponse.json({ conversations: conversationStore.list(auth.id) });
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }
  const messages = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
    ts: m.ts ?? Date.now(),
  }));
  const conv = conversationStore.save(auth.id, {
    id: parsed.data.id,
    title: parsed.data.title,
    provider: parsed.data.provider,
    messages,
  });
  return NextResponse.json({ conversation: conv });
}

export async function DELETE(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  conversationStore.delete(auth.id, id);
  return NextResponse.json({ ok: true });
}
