'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
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
  label, value, icon, color,
}: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: `${color}1A`, color }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} color={INK} lineHeight={1.1}>{value}</Typography>
            <Typography variant="caption" color={SUBTLE}>{label}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
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
    return <Alert severity="error" sx={{ borderRadius: 2 }}>{error || 'No data'}</Alert>;
  }

  const t = data.totals;
  const maxFunnel = Math.max(1, ...FUNNEL_ORDER.map((k) => data.funnel[k] || 0));

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={800} color={INK}>Performance Overview</Typography>
        <Typography variant="body2" color={SUBTLE}>
          A live view of the pipeline and revenue we are generating together.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Revenue" value={money(t.revenue)} icon={<PaidIcon />} color={BRAND.teal} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Pipeline" value={money(t.pipeline)} icon={<TimelineIcon />} color={BRAND.amberDeep} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Deals Won" value={num(t.deals_won)} icon={<EmojiEventsIcon />} color={BRAND.pink} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Leads" value={num(t.leads)} icon={<GroupsIcon />} color="#2563EB" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} color={INK} sx={{ mb: 2 }}>
                Pipeline Funnel
              </Typography>
              <Stack spacing={1.5}>
                {FUNNEL_ORDER.map((k) => {
                  const v = data.funnel[k] || 0;
                  return (
                    <Box key={k}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" color={SUBTLE}>{FUNNEL_LABEL[k]}</Typography>
                        <Typography variant="body2" fontWeight={700} color={INK}>{num(v)}</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(v / maxFunnel) * 100}
                        sx={{ height: 8, borderRadius: 5, bgcolor: '#F0F2F5', '& .MuiLinearProgress-bar': { bgcolor: BRAND.teal } }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={800} color={INK} sx={{ mb: 2 }}>
                Top Channels
              </Typography>
              {data.top_channels.length === 0 ? (
                <Typography variant="body2" color={SUBTLE}>No channel data yet.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {data.top_channels.map((c) => {
                    const color = CHANNEL_COLOR[c.channel] || SUBTLE;
                    return (
                      <Stack key={c.channel} direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Pending Approvals" value={num(data.pending_approvals)} icon={<PendingActionsIcon />} color={BRAND.amberDeep} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Published" value={num(data.published_count)} icon={<FactCheckIcon />} color={BRAND.teal} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Reports" value={num(data.reports_count)} icon={<TimelineIcon />} color="#7C3AED" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color={SUBTLE}>Blended ROI</Typography>
              <Typography variant="h6" fontWeight={800} color={t.blended_roi && t.blended_roi >= 1 ? BRAND.tealDeep : INK}>
                {t.blended_roi != null ? `${t.blended_roi.toFixed(2)}x` : '—'}
              </Typography>
              <Chip size="small" label="Revenue ÷ Cost" sx={{ mt: 0.5, fontWeight: 600 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

export default function PortalOverviewPage() {
  return (
    <PortalShell>
      <OverviewBody />
    </PortalShell>
  );
}
