'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useAuth } from '@/lib/auth';
import { Analytics, type AnalyticsSummary } from '@/lib/api';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={800}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

export default function AnalyticsPage() {
  const { activeWorkspace } = useAuth();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Analytics.summary()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [activeWorkspace]);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return <Typography color="text.secondary">No analytics available.</Typography>;
  }

  const t = data.totals;
  const ctr = t.impressions ? ((t.clicks / t.impressions) * 100).toFixed(2) : '0.00';

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Content created" value={data.content_count} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Published" value={data.published_count} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Scheduled" value={data.scheduled_count} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="CTR" value={`${ctr}%`} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <StatCard label="Impressions" value={fmt(t.impressions || 0)} />
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <StatCard label="Clicks" value={fmt(t.clicks || 0)} />
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <StatCard label="Engagements" value={fmt(t.engagements || 0)} />
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <StatCard label="Conversions" value={fmt(t.conversions || 0)} />
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <StatCard label="Spend" value={`$${fmt(t.spend || 0)}`} />
        </Grid>
      </Grid>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            By source
          </Typography>
          {Object.keys(data.by_source).length === 0 ? (
            <Typography color="text.secondary">
              No metrics ingested yet. Connect analytics or publish content to populate this.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Impressions</TableCell>
                  <TableCell align="right">Clicks</TableCell>
                  <TableCell align="right">Conversions</TableCell>
                  <TableCell align="right">Spend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(data.by_source).map(([src, m]) => (
                  <TableRow key={src}>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{src}</TableCell>
                    <TableCell align="right">{fmt(m.impressions || 0)}</TableCell>
                    <TableCell align="right">{fmt(m.clicks || 0)}</TableCell>
                    <TableCell align="right">{fmt(m.conversions || 0)}</TableCell>
                    <TableCell align="right">${fmt(m.spend || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data.series.length > 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Daily trend
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Impressions</TableCell>
                  <TableCell align="right">Clicks</TableCell>
                  <TableCell align="right">Conversions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.series.map((s) => (
                  <TableRow key={s.date}>
                    <TableCell>{s.date}</TableCell>
                    <TableCell align="right">{fmt(s.impressions)}</TableCell>
                    <TableCell align="right">{fmt(s.clicks)}</TableCell>
                    <TableCell align="right">{fmt(s.conversions)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
