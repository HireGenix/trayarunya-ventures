import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/authToken';
import type { Lead, LeadSource, LeadStatus, LeadPriority } from '@/app/admin/leads/types';

export const runtime = 'nodejs';

/** Admin-only lead creation. No emails, no rate limit, supports all fields. */
export async function POST(req: NextRequest) {
  if (!getAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Partial<Lead>;
    if (!body.name || !body.email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }
    const newLead: Omit<Lead, 'id'> = {
      name: body.name,
      email: body.email,
      phone: body.phone || undefined,
      company: body.company || undefined,
      position: body.position || undefined,
      message: body.message || undefined,
      source: (body.source as LeadSource) || 'Other',
      status: (body.status as LeadStatus) || 'New',
      priority: (body.priority as LeadPriority) || 'Medium',
      date: new Date().toISOString(),
      formType: body.formType || 'Manual Entry',
      notes: body.notes || [],
      tags: body.tags || [],
    };
    const saved = await db.leads.create(newLead);
    return NextResponse.json(saved, {
      status: 201,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
