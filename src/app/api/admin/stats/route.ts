import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/authToken';
import { userStore } from '@/lib/userStore';
import { conversationStore } from '@/lib/conversationStore';
import type { Lead } from '@/app/admin/leads/types';

export const runtime = 'nodejs';

/** Aggregated, 100%-real metrics for the main admin dashboard. */
export async function GET(req: NextRequest) {
  if (!getAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const stats = await db.leads.getStats();
    const recentLeads = (await db.leads.findMany({
      take: 6,
      orderBy: { date: 'desc' },
    })) as Lead[];

    const total = stats.total || 0;
    const wonCount =
      stats.leadsByStatus.find((s) => s.status === 'Won')?.count || 0;

    // Leads in the last 30 days (from the trend the DB already computes is only 7d,
    // so derive a 14-day trend here for a richer chart).
    const trend14: { date: string; count: number }[] = [];
    const dateMap = new Map<string, number>();
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dateMap.set(d.toISOString().split('T')[0], 0);
    }
    const allLeads = (await db.leads.findMany({})) as Lead[];
    allLeads.forEach((l) => {
      const key = new Date(l.date).toISOString().split('T')[0];
      if (dateMap.has(key)) dateMap.set(key, (dateMap.get(key) || 0) + 1);
    });
    dateMap.forEach((count, date) => trend14.push({ date, count }));

    const withPct = <T extends { count: number }>(rows: T[]) =>
      rows.map((r) => ({
        ...r,
        percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
      }));

    const users = userStore.list();
    const conversations = conversationStore.countAll();

    return NextResponse.json(
      {
        leads: {
          total: stats.total,
          newLeads: stats.newLeads,
          qualifiedLeads: stats.qualifiedLeads,
          wonLeads: wonCount,
          conversionRate: stats.conversionRate,
          averageResponseTime: stats.averageResponseTime,
          bySource: withPct(stats.leadsBySource),
          byStatus: withPct(stats.leadsByStatus),
          trend: trend14,
          recent: recentLeads.map((l) => ({
            id: l.id,
            name: l.name,
            email: l.email,
            company: l.company || '',
            date: l.date,
            status: l.status,
            source: l.source,
          })),
        },
        users: {
          total: users.length,
          admins: users.filter((u) => u.role === 'admin').length,
          superadmins: users.filter((u) => u.role === 'superadmin').length,
        },
        conversations: { total: conversations },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error building admin stats:', error);
    return NextResponse.json({ error: 'Failed to build dashboard stats' }, { status: 500 });
  }
}
