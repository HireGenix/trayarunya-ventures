'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import CampaignBuilder from './CampaignBuilder';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type TabKey = 'campaigns' | 'lists' | 'sequences' | 'overview';

interface EmailList {
  id: string;
  name: string;
  description?: string | null;
}
interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  list_id?: string | null;
  stats?: { sent?: number; opens?: number; clicks?: number } | null;
  created_at: string;
}
interface Sequence {
  id: string;
  name: string;
  trigger: string;
  is_active: boolean;
  autonomy: string;
  steps?: unknown[] | null;
}
interface Overview {
  subscribers: number;
  avg_open_rate: number;
  avg_click_rate: number;
  campaigns_sent: number;
  active_sequences: number;
  growth_rate: number;
}

const STATUS_CHIP: Record<string, { c: string; bg: string; label: string }> = {
  draft: { c: INK, bg: 'rgba(14,17,22,0.05)', label: 'Draft' },
  scheduled: { c: BRAND.amberDeep, bg: BRAND.amberSoft, label: 'Scheduled' },
  sending: { c: BRAND.amberDeep, bg: BRAND.amberSoft, label: 'Sending' },
  sent: { c: BRAND.tealDeep, bg: BRAND.tealSoft, label: 'Sent' },
  failed: { c: BRAND.pink, bg: BRAND.pinkSoft, label: 'Failed' },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_CHIP[status] || STATUS_CHIP.draft;
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: s.c,
        fontWeight: 700,
        border: 'none',
        borderRadius: '999px',
      }}
    />
  );
}

function Card({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: `1px solid ${LINE}`,
        borderRadius: CARD_RADIUS,
        boxShadow: CARD_SHADOW,
        p: 3,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

const inkButton = {
  background: INK,
  backgroundImage: 'none',
  borderRadius: '999px',
  textTransform: 'none' as const,
  fontWeight: 700,
  color: '#fff',
  '&:hover': { background: '#000' },
};

export default function EmailPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<TabKey>('campaigns');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [lists, setLists] = useState<EmailList[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, c, s, o] = await Promise.all([
        api<EmailList[]>('/email/lists', { workspace: true }),
        api<Campaign[]>('/email/campaigns', { workspace: true }),
        api<Sequence[]>('/email/sequences', { workspace: true }),
        api<Overview>('/email/overview', { workspace: true }),
      ]);
      setLists(l);
      setCampaigns(c);
      setSequences(s);
      setOverview(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const kpis = useMemo(
    () => [
      { label: 'Subscribers', value: overview ? overview.subscribers.toLocaleString() : '—', accent: INK },
      { label: 'Avg open rate', value: overview ? `${overview.avg_open_rate}%` : '—', accent: BRAND.tealDeep },
      { label: 'Avg click rate', value: overview ? `${overview.avg_click_rate}%` : '—', accent: BRAND.amberDeep },
      { label: 'Campaigns sent', value: overview ? overview.campaigns_sent.toLocaleString() : '—', accent: INK },
    ],
    [overview],
  );

  if (!activeWorkspace) {
    return (
      <Box>
        <Alert severity="info">Select a workspace to manage email marketing.</Alert>
      </Box>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'campaigns', label: 'Campaigns' },
    { key: 'lists', label: 'Lists' },
    { key: 'sequences', label: 'Sequences' },
    { key: 'overview', label: 'Overview' },
  ];

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2.5} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Email{' '}
            <Box component="span" sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Marketing
            </Box>
          </Typography>
          <Typography sx={{ color: SUBTLE, mt: 0.5 }}>
            Native campaigns, lists and AI-drafted drip sequences.
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} sx={inkButton} onClick={() => setDialogOpen(true)}>
          New campaign
        </Button>
      </Stack>

      {/* KPI cards */}
      <Stack direction="row" gap={2} flexWrap="wrap" mb={2.5}>
        {kpis.map((k) => (
          <Card key={k.label} sx={{ flex: '1 1 200px', minWidth: 180, p: 2.5 }}>
            <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 13 }}>{k.label}</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 30, color: k.accent, mt: 0.5 }}>{k.value}</Typography>
          </Card>
        ))}
      </Stack>

      {/* Pill tabs */}
      <Stack direction="row" gap={1} mb={2.5} flexWrap="wrap">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Box
              key={t.key}
              onClick={() => setTab(t.key)}
              sx={{
                cursor: 'pointer',
                px: 2,
                py: 0.75,
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: 14,
                bgcolor: active ? INK : 'transparent',
                color: active ? '#fff' : SUBTLE,
                border: `1px solid ${active ? INK : LINE}`,
                transition: 'all .15s',
              }}
            >
              {t.label}
            </Box>
          );
        })}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress />
        </Stack>
      ) : tab === 'campaigns' ? (
        <Card sx={{ p: 0, overflow: 'hidden' }}>
          {campaigns.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: SUBTLE }}>No campaigns yet.</Box>
          ) : (
            <Box>
              <Stack
                direction="row"
                sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${LINE}`, color: SUBTLE, fontWeight: 700, fontSize: 12 }}
              >
                <Box sx={{ flex: 2 }}>Campaign</Box>
                <Box sx={{ flex: 2 }}>Subject</Box>
                <Box sx={{ flex: 1 }}>Sent</Box>
                <Box sx={{ flex: 1 }}>Opens</Box>
                <Box sx={{ flex: 1, textAlign: 'right' }}>Status</Box>
              </Stack>
              {campaigns.map((c) => (
                <Stack
                  key={c.id}
                  direction="row"
                  alignItems="center"
                  sx={{ px: 3, py: 1.75, borderBottom: `1px solid ${LINE}`, '&:last-child': { borderBottom: 'none' } }}
                >
                  <Box sx={{ flex: 2, fontWeight: 700, color: INK }}>{c.name}</Box>
                  <Box sx={{ flex: 2, color: SUBTLE }}>{c.subject || '—'}</Box>
                  <Box sx={{ flex: 1 }}>{c.stats?.sent ?? 0}</Box>
                  <Box sx={{ flex: 1 }}>{c.stats?.opens ?? 0}</Box>
                  <Box sx={{ flex: 1, textAlign: 'right' }}>
                    <StatusChip status={c.status} />
                  </Box>
                </Stack>
              ))}
            </Box>
          )}
        </Card>
      ) : tab === 'lists' ? (
        <Stack gap={2}>
          {lists.length === 0 ? (
            <Card sx={{ textAlign: 'center', color: SUBTLE }}>No lists yet.</Card>
          ) : (
            lists.map((l) => (
              <Card key={l.id} sx={{ p: 2.5 }}>
                <Typography sx={{ fontWeight: 700, color: INK }}>{l.name}</Typography>
                <Typography sx={{ color: SUBTLE, mt: 0.5 }}>{l.description || 'No description'}</Typography>
              </Card>
            ))
          )}
        </Stack>
      ) : tab === 'sequences' ? (
        <Stack gap={2}>
          {sequences.length === 0 ? (
            <Card sx={{ textAlign: 'center', color: SUBTLE }}>No sequences yet.</Card>
          ) : (
            sequences.map((s) => (
              <Card key={s.id} sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: INK }}>{s.name}</Typography>
                    <Typography sx={{ color: SUBTLE, mt: 0.5, fontSize: 13 }}>
                      Trigger: {s.trigger} · {(s.steps?.length ?? 0)} steps · {s.autonomy}
                    </Typography>
                  </Box>
                  <Chip
                    label={s.is_active ? 'Active' : 'Paused'}
                    size="small"
                    sx={{
                      bgcolor: s.is_active ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                      color: s.is_active ? BRAND.tealDeep : INK,
                      fontWeight: 700,
                      borderRadius: '999px',
                    }}
                  />
                </Stack>
              </Card>
            ))
          )}
        </Stack>
      ) : (
        <Stack direction="row" gap={2} flexWrap="wrap">
          <Card sx={{ flex: '1 1 240px' }}>
            <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 13 }}>List growth (30d)</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 28, color: BRAND.tealDeep, mt: 0.5 }}>
              {overview ? `${overview.growth_rate}%` : '—'}
            </Typography>
          </Card>
          <Card sx={{ flex: '1 1 240px' }}>
            <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 13 }}>Active sequences</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 28, color: INK, mt: 0.5 }}>
              {overview ? overview.active_sequences : '—'}
            </Typography>
          </Card>
          <Card sx={{ flex: '1 1 240px' }}>
            <Typography sx={{ color: SUBTLE, fontWeight: 600, fontSize: 13 }}>Campaigns sent</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 28, color: BRAND.amberDeep, mt: 0.5 }}>
              {overview ? overview.campaigns_sent : '—'}
            </Typography>
          </Card>
        </Stack>
      )}

      {/* New campaign builder */}
      <CampaignBuilder
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        lists={lists}
        onCreated={load}
        onToast={(m) => setToast(m)}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        message={toast || ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
