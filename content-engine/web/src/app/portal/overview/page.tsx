'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import PaidIcon from '@mui/icons-material/PaidOutlined';
import TimelineIcon from '@mui/icons-material/TimelineOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import GroupsIcon from '@mui/icons-material/Groups2Outlined';
import FactCheckIcon from '@mui/icons-material/FactCheckOutlined';
import PendingActionsIcon from '@mui/icons-material/PendingActionsOutlined';
import PortalShell from '@/components/PortalShell';
import { Portal, type PortalOverview } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

const cardSx = {
  bgcolor: '#fff',
  border: `1px solid ${LINE}`,
  borderRadius: CARD_RADIUS,
  boxShadow: CARD_SHADOW,
  p: 2.5,
} as const;

const chipSx = {
  width: 34,
  height: 34,
  borderRadius: '11px',
  display: 'grid',
  placeItems: 'center',
  bgcolor: 'rgba(14,17,22,0.05)',
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

const FUNNEL_ORDER = ['touch', 'lead', 'mql', 'sql', 'opportunity', 'closed_won'];
const FUNNEL_LABEL: Record<string, string> = {
  touch: 'Touches',
  lead: 'Leads',
  mql: 'MQLs',
  sql: 'SQLs',
  opportunity: 'Opportunities',
  closed_won: 'Closed Won',
};

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}
function num(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

function StatCard({
  label, value, icon,
}: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <Box
      sx={{
        ...cardSx,
        height: '100%',
        transition: 'transform .16s ease, box-shadow .16s ease, border-color .16s ease',
        '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(14,17,22,0.12)' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box sx={chipSx}>{icon}</Box>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: SUBTLE }}>{label}</Typography>
      </Stack>
      <Typography
        sx={{
          mt: 1.75,
          fontWeight: 800,
          fontSize: { xs: 30, md: 38 },
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: INK,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function OverviewBody() {
  const [data, setData] = useState<PortalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await Portal.overview());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load overview');
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

  const t = data.totals;
  const maxFunnel = Math.max(1, ...FUNNEL_ORDER.map((k) => data.funnel[k] || 0));

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
            Performance{' '}
            <Box
              component="span"
              sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              Overview
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            A live view of the pipeline and revenue we are generating together.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2.5}>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Revenue" value={money(t.revenue)} icon={<PaidIcon fontSize="small" />} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Pipeline" value={money(t.pipeline)} icon={<TimelineIcon fontSize="small" />} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Deals Won" value={num(t.deals_won)} icon={<EmojiEventsIcon fontSize="small" />} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Leads" value={num(t.leads)} icon={<GroupsIcon fontSize="small" />} />
          </Grid>
        </Grid>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ ...cardSx, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2.5 }}>
                <Box sx={chipSx}><TimelineIcon fontSize="small" /></Box>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: INK }}>Pipeline Funnel</Typography>
              </Stack>
              <Stack spacing={1.75}>
                {FUNNEL_ORDER.map((k) => {
                  const v = data.funnel[k] || 0;
                  return (
                    <Box key={k}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                        <Typography variant="body2" color="text.secondary">{FUNNEL_LABEL[k]}</Typography>
                        <Typography variant="body2" fontWeight={700} color={INK}>{num(v)}</Typography>
                      </Stack>
                      <Box sx={{ height: 6, borderRadius: 999, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: `${(v / maxFunnel) * 100}%`,
                            height: '100%',
                            borderRadius: 999,
                            bgcolor: BRAND.teal,
                            transition: 'width .3s',
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ ...cardSx, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2.5 }}>
                <Box sx={chipSx}><GroupsIcon fontSize="small" /></Box>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: INK }}>Top Channels</Typography>
              </Stack>
              {data.top_channels.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No channel data yet.</Typography>
              ) : (
                <Stack spacing={1.75}>
                  {data.top_channels.map((c) => {
                    const color = CHANNEL_COLOR[c.channel] || SUBTLE;
                    return (
                      <Stack key={c.channel} direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                          <Typography variant="body2" fontWeight={600} color={INK} textTransform="capitalize">
                            {c.channel}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700} color={INK}>
                          {money(c.attributed_revenue.linear)}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Pending Approvals" value={num(data.pending_approvals)} icon={<PendingActionsIcon fontSize="small" />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Published" value={num(data.published_count)} icon={<FactCheckIcon fontSize="small" />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard label="Reports" value={num(data.reports_count)} icon={<TimelineIcon fontSize="small" />} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ ...cardSx, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Box sx={chipSx}><EmojiEventsIcon fontSize="small" /></Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: SUBTLE }}>Blended ROI</Typography>
              </Stack>
              <Typography
                sx={{
                  mt: 1.75,
                  fontWeight: 800,
                  fontSize: { xs: 30, md: 38 },
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: t.blended_roi && t.blended_roi >= 1 ? BRAND.tealDeep : INK,
                }}
              >
                {t.blended_roi != null ? `${t.blended_roi.toFixed(2)}x` : '—'}
              </Typography>
              <Chip
                size="small"
                label="Revenue ÷ Cost"
                sx={{ mt: 1.5, fontWeight: 700, fontSize: 12, bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE }}
              />
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}

export default function PortalOverviewPage() {
  return (
    <PortalShell>
      <OverviewBody />
    </PortalShell>
  );
}
