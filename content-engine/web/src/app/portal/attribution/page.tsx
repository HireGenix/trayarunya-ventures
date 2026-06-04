'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PortalShell from '@/components/PortalShell';
import { Portal, type AttributionSummary } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';

const CHANNEL_COLOR: Record<string, string> = {
  linkedin: '#2563EB',
  content: BRAND.teal,
  ads: BRAND.amber,
  email: '#7C3AED',
  organic: '#0EA5A4',
  referral: BRAND.pink,
  events: '#F97316',
  other: SUBTLE,
};

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function AttributionBody() {
  const [data, setData] = useState<AttributionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await Portal.attribution());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load attribution');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box>;
  }
  if (error || !data) {
    return <Alert severity="error" sx={{ borderRadius: 2 }}>{error || 'No data'}</Alert>;
  }

  const channels = [...data.channels].sort(
    (a, b) => b.attributed_revenue.linear - a.attributed_revenue.linear,
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={800} color={INK}>Revenue Attribution</Typography>
        <Typography variant="body2" color={SUBTLE}>
          Exactly where pipeline and revenue come from — by channel, with ROI.
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3 }}>
        <CardContent>
          {channels.length === 0 ? (
            <Typography variant="body2" color={SUBTLE} sx={{ py: 2 }}>
              No attribution data yet. As campaigns run, channel performance will appear here.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: SUBTLE, fontWeight: 700 }}>Channel</TableCell>
                    <TableCell align="right" sx={{ color: SUBTLE, fontWeight: 700 }}>Leads</TableCell>
                    <TableCell align="right" sx={{ color: SUBTLE, fontWeight: 700 }}>Deals</TableCell>
                    <TableCell align="right" sx={{ color: SUBTLE, fontWeight: 700 }}>Attributed Rev.</TableCell>
                    <TableCell align="right" sx={{ color: SUBTLE, fontWeight: 700 }}>Pipeline</TableCell>
                    <TableCell align="right" sx={{ color: SUBTLE, fontWeight: 700 }}>Cost</TableCell>
                    <TableCell align="right" sx={{ color: SUBTLE, fontWeight: 700 }}>ROI</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {channels.map((c) => {
                    const color = CHANNEL_COLOR[c.channel] || SUBTLE;
                    const roi = c.roi_linear;
                    return (
                      <TableRow key={c.channel} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                            <Typography variant="body2" fontWeight={700} color={INK} textTransform="capitalize">
                              {c.channel}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{c.leads}</TableCell>
                        <TableCell align="right">{c.deals_won}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color={INK}>
                            {money(c.attributed_revenue.linear)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{money(c.pipeline)}</TableCell>
                        <TableCell align="right">{money(c.cost)}</TableCell>
                        <TableCell align="right">
                          {roi != null ? (
                            <Chip
                              size="small"
                              label={`${roi.toFixed(2)}x`}
                              sx={{
                                fontWeight: 700,
                                bgcolor: roi >= 1 ? BRAND.tealSoft : '#FDE8EC',
                                color: roi >= 1 ? BRAND.tealDeep : BRAND.pink,
                              }}
                            />
                          ) : (
                            <Typography variant="body2" color={SUBTLE}>—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default function PortalAttributionPage() {
  return (
    <PortalShell>
      <AttributionBody />
    </PortalShell>
  );
}
