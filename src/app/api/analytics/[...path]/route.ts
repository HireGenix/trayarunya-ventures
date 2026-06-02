import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/authToken';
import type { Timeframe } from '@/lib/analyticsStore';
import * as agg from '@/lib/analyticsAggregate';

export const runtime = 'nodejs';

const VALID: Timeframe[] = ['today', 'yesterday', 'week', 'month', 'year'];

function tf(req: NextRequest): Timeframe {
  const t = req.nextUrl.searchParams.get('timeframe') as Timeframe;
  return VALID.includes(t) ? t : 'month';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!getAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await params;
  const endpoint = (path?.[0] || '').toLowerCase();
  const timeframe = tf(req);

  switch (endpoint) {
    case 'overview':
      return NextResponse.json(agg.overview(timeframe));
    case 'traffic-sources':
      return NextResponse.json(agg.trafficSources(timeframe));
    case 'pages':
      return NextResponse.json(agg.pagePerformance(timeframe));
    case 'devices':
      return NextResponse.json(agg.devices(timeframe));
    case 'browsers':
      return NextResponse.json(agg.browsers(timeframe));
    case 'countries':
      return NextResponse.json(agg.countries(timeframe));
    case 'time-series':
      return NextResponse.json(agg.timeSeries(timeframe));
    case 'conversions':
      return NextResponse.json(agg.conversions(timeframe));
    case 'user-journeys':
      return NextResponse.json([]);
    case 'events':
      return NextResponse.json(agg.events(timeframe));
    case 'export': {
      const type = req.nextUrl.searchParams.get('type') || 'overview';
      const rows = buildExport(type, timeframe);
      return new NextResponse(rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${type}-${timeframe}.csv"`,
        },
      });
    }
    default:
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}

function buildExport(type: string, timeframe: Timeframe): string {
  if (type === 'pages') {
    const rows = agg.pagePerformance(timeframe);
    const header = 'path,title,views,uniqueViews,avgTimeOnPage,bounceRate';
    const body = rows
      .map((r) => `${r.path},"${r.title}",${r.views},${r.uniqueViews},${r.avgTimeOnPage},${r.bounceRate}`)
      .join('\n');
    return `${header}\n${body}`;
  }
  const o = agg.overview(timeframe);
  return `metric,value\ntotalVisitors,${o.totalVisitors}\nuniqueVisitors,${o.uniqueVisitors}\npageViews,${o.pageViews}\nbounceRate,${o.bounceRate}\nconversionRate,${o.conversionRate}`;
}
