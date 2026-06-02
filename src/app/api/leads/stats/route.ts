import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/** Real lead statistics for the admin dashboard + leads page. */
export async function GET() {
  try {
    const stats = await db.leads.getStats();
    const total = stats.total || 0;

    const withPct = <T extends { count: number }>(rows: T[]) =>
      rows.map((r) => ({
        ...r,
        percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
      }));

    return NextResponse.json(
      {
        total: stats.total,
        newLeads: stats.newLeads,
        qualifiedLeads: stats.qualifiedLeads,
        conversionRate: stats.conversionRate,
        averageResponseTime: stats.averageResponseTime,
        leadsBySource: withPct(stats.leadsBySource),
        leadsByStatus: withPct(stats.leadsByStatus),
        leadTrend: stats.leadTrend,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error generating lead stats:', error);
    return NextResponse.json({ error: 'Failed to generate lead statistics' }, { status: 500 });
  }
}
