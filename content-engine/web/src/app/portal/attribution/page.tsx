'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
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
import AccountTreeIcon from '@mui/icons-material/AccountTreeOutlined';
import PortalShell from '@/components/PortalShell';
import { Portal, type AttributionSummary } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

const headCellSx = {
  color: SUBTLE,
  fontWeight: 700,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: `1px solid ${LINE}`,
  py: 1.5,
} as const;

const bodyCellSx = {
  borderBottom: `1px solid ${LINE}`,
  py: 1.75,
  fontSize: 14,
  color: INK,
} as const;

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
    return <Alert severity="error" sx={{ borderRadius: 3 }}>{error || 'No data'}</Alert>;
  }

  const channels = [...data.channels].sort(
    (a, b) => b.attributed_revenue.linear - a.attributed_revenue.linear,
  );

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        spacing={2}
        sx={{ mb: 2.5, px: 0.5 }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12, fontSize: { xs: 26, md: 34 }, color: INK }}
          >
            Revenue{' '}
            <Box
              component="span"
              sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              Attribution
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Exactly where pipeline and revenue come from — by channel, with ROI.
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(14,17,22,0.05)', color: INK }}>
            <AccountTreeIcon fontSize="small" />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: INK }}>Channel Performance</Typography>
        </Stack>
        {channels.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No attribution data yet. As campaigns run, channel performance will appear here.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ '& td, & th': { borderBottom: 'none' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={headCellSx}>Channel</TableCell>
                  <TableCell align="right" sx={headCellSx}>Leads</TableCell>
                  <TableCell align="right" sx={headCellSx}>Deals</TableCell>
                  <TableCell align="right" sx={headCellSx}>Attributed Rev.</TableCell>
                  <TableCell align="right" sx={headCellSx}>Pipeline</TableCell>
                  <TableCell align="right" sx={headCellSx}>Cost</TableCell>
                  <TableCell align="right" sx={headCellSx}>ROI</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {channels.map((c) => {
                  const color = CHANNEL_COLOR[c.channel] || SUBTLE;
                  const roi = c.roi_linear;
                  return (
                    <TableRow key={c.channel} sx={{ '&:hover': { bgcolor: 'rgba(14,17,22,0.02)' } }}>
                      <TableCell sx={bodyCellSx}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                          <Typography variant="body2" fontWeight={700} color={INK} textTransform="capitalize">
                            {c.channel}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={bodyCellSx}>{c.leads}</TableCell>
                      <TableCell align="right" sx={bodyCellSx}>{c.deals_won}</TableCell>
                      <TableCell align="right" sx={bodyCellSx}>
                        <Typography variant="body2" fontWeight={700} color={INK}>
                          {money(c.attributed_revenue.linear)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={bodyCellSx}>{money(c.pipeline)}</TableCell>
                      <TableCell align="right" sx={bodyCellSx}>{money(c.cost)}</TableCell>
                      <TableCell align="right" sx={bodyCellSx}>
                        {roi != null ? (
                          <Chip
                            size="small"
                            label={`${roi.toFixed(2)}x`}
                            sx={{
                              fontWeight: 700,
                              fontSize: 12,
                              bgcolor: roi >= 1 ? BRAND.tealSoft : BRAND.pinkSoft,
                              color: roi >= 1 ? BRAND.tealDeep : BRAND.pink,
                            }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function PortalAttributionPage() {
  return (
    <PortalShell>
      <AttributionBody />
    </PortalShell>
  );
}
