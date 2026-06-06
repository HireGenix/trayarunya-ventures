'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  AiAssist,
  ghostPillSx,
} from '@/components/PremiumDialog';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type Block = { type: string; order?: number; props?: Record<string, unknown> };

interface PageCard {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  blocks: Block[] | null;
  seo_title: string | null;
  seo_description: string | null;
  views: number;
  submissions: number;
  conversion: number;
}

interface FunnelRow {
  id: string;
  name: string;
  steps: unknown[] | null;
  status: string;
}

interface Overview {
  pages: number;
  published: number;
  avg_conversion: number;
  total_views: number;
}

const TABS = ['pages', 'funnels', 'overview'] as const;
type Tab = (typeof TABS)[number];

const GOALS = [
  { value: 'signup', label: 'Sign up' },
  { value: 'demo', label: 'Book a demo' },
  { value: 'lead', label: 'Capture lead' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'waitlist', label: 'Join waitlist' },
];

function statusChip(status: string): { bg: string; fg: string; label: string } {
  if (status === 'published')
    return { bg: BRAND.tealSoft, fg: BRAND.tealDeep, label: 'Published' };
  return { bg: BRAND.amberSoft, fg: BRAND.amberDeep, label: 'Draft' };
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function FunnelsPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<Tab>('pages');
  const [pages, setPages] = useState<PageCard[]>([]);
  const [funnels, setFunnels] = useState<FunnelRow[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState('');
  const [goal, setGoal] = useState('signup');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Block[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, f, o] = await Promise.all([
        api<PageCard[]>('/funnels/pages', { workspace: true }),
        api<FunnelRow[]>('/funnels/funnels', { workspace: true }),
        api<Overview>('/funnels/overview', { workspace: true }),
      ]);
      setPages(p);
      setFunnels(f);
      setOverview(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load funnels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const kpis = useMemo(() => {
    const published = overview?.published ?? pages.filter((p) => p.status === 'published').length;
    return [
      { label: 'Pages', value: String(overview?.pages ?? pages.length), tone: INK },
      { label: 'Published', value: String(published), tone: BRAND.tealDeep },
      { label: 'Avg conversion', value: pct(overview?.avg_conversion ?? 0), tone: BRAND.amberDeep },
      { label: 'Total views', value: String(overview?.total_views ?? 0), tone: BRAND.pink },
    ];
  }, [overview, pages]);

  const handleGenerate = async () => {
    if (!brief.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await api<{ generated: { blocks: Block[] }; page: PageCard | null }>(
        '/funnels/pages/generate',
        { method: 'POST', body: { brief, goal, save: true }, workspace: true },
      );
      setGenerated(res.generated?.blocks ?? []);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const resetDialog = () => {
    setOpen(false);
    setBrief('');
    setGoal('signup');
    setGenerated(null);
  };

  if (!activeWorkspace) {
    return (
      <Box sx={{ p: 1 }}>
        <Alert severity="info">Select a workspace to build funnels.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2.5, px: 0.5 }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.12,
              fontSize: { xs: 28, md: 38 },
              color: INK,
            }}
          >
            Funnel{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 800,
              }}
            >
              builder
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Design landing pages, wire up funnels and let AI write the copy.
          </Typography>
        </Box>
        <Button
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{
            px: 2.5,
            py: 1.25,
            borderRadius: '999px',
            fontWeight: 700,
            textTransform: 'none',
            color: '#fff',
            background: INK,
            backgroundImage: 'none',
            boxShadow: '0 8px 20px rgba(14,17,22,0.25)',
            '&:hover': { background: '#1B2330' },
          }}
        >
          New page
        </Button>
      </Stack>

      {/* Pill tabs */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, px: 0.5 }}>
        {TABS.map((t) => (
          <Button
            key={t}
            disableRipple
            onClick={() => setTab(t)}
            sx={{
              px: 2.25,
              py: 0.85,
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: 13.5,
              textTransform: 'capitalize',
              color: tab === t ? '#fff' : 'text.secondary',
              bgcolor: tab === t ? INK : 'transparent',
              '&:hover': {
                bgcolor: tab === t ? '#1B2330' : 'rgba(14,17,22,0.05)',
                color: tab === t ? '#fff' : INK,
              },
            }}
          >
            {t}
          </Button>
        ))}
      </Stack>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 2.5, px: 0.5 }}>
        {kpis.map((k) => (
          <Grid size={{ xs: 6, md: 3 }} key={k.label}>
            <Box
              sx={{
                bgcolor: '#fff',
                border: `1px solid ${LINE}`,
                borderRadius: CARD_RADIUS,
                boxShadow: CARD_SHADOW,
                p: 2.25,
              }}
            >
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: SUBTLE }}>
                {k.label}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 28, color: k.tone, mt: 0.5 }}>
                {k.value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : tab === 'pages' ? (
        <PagesGrid pages={pages} onNew={() => setOpen(true)} />
      ) : tab === 'funnels' ? (
        <FunnelsList funnels={funnels} />
      ) : (
        <OverviewPanel overview={overview} pages={pages} />
      )}

      {/* New page dialog */}
      <PremiumDialog open={open} onClose={resetDialog} maxWidth="md">
        <DialogHero
          icon={<FilterAltRoundedIcon />}
          title="Create a landing page"
          subtitle="Describe the offer and let AI compose the page blocks"
          onClose={resetDialog}
        />
        <DialogBody sx={{ p: 0 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              minHeight: { md: 380 },
            }}
          >
            {/* Form column */}
            <Box sx={{ px: { xs: 2.5, sm: 3.25 }, py: 3, borderRight: { md: `1px solid ${LINE}` } }}>
              <Stack gap={2.25}>
                <Box>
                  <SectionLabel>Page goal</SectionLabel>
                  <TextField
                    select
                    label="Goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    fullWidth
                    size="small"
                  >
                    {GOALS.map((g) => (
                      <MenuItem key={g.value} value={g.value}>
                        {g.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box>
                  <SectionLabel>Brief</SectionLabel>
                  <AiAssist
                    brief={brief}
                    setBrief={setBrief}
                    loading={generating}
                    onGenerate={handleGenerate}
                    label="Describe the offer, audience and the outcome you want — AI builds the page."
                    placeholder="Describe the offer, audience and the outcome you want…"
                    buttonText="AI generate"
                    minRows={4}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Live preview column */}
            <Box sx={{ background: 'rgba(14,17,22,0.025)', px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
              <SectionLabel sx={{ mb: 1.5 }}>Page preview</SectionLabel>
              {generated && generated.length ? (
                <Stack spacing={1.25}>
                  {generated.map((b, i) => (
                    <Box
                      key={i}
                      sx={{
                        bgcolor: '#fff',
                        border: `1px solid ${LINE}`,
                        borderRadius: '14px',
                        p: 1.75,
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: '7px',
                            flexShrink: 0,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 11.5,
                            fontWeight: 800,
                            bgcolor: 'rgba(14,17,22,0.05)',
                            color: SUBTLE,
                          }}
                        >
                          {i + 1}
                        </Box>
                        <Chip
                          label={b.type}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            bgcolor: BRAND.tealSoft,
                            color: BRAND.tealDeep,
                          }}
                        />
                        <Typography sx={{ fontSize: 13, color: SUBTLE, minWidth: 0 }} noWrap>
                          {blockSummary(b)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <FilterAltRoundedIcon sx={{ fontSize: 30, color: 'rgba(14,17,22,0.18)' }} />
                  <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 1 }}>
                    The page blocks will appear here once you generate with AI.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogBody>
        <DialogFooter
          hint={
            generated && generated.length
              ? `${generated.length} block${generated.length === 1 ? '' : 's'} generated and saved`
              : 'AI writes the copy and saves the page.'
          }
        >
          <Button onClick={resetDialog} sx={ghostPillSx}>
            Close
          </Button>
        </DialogFooter>
      </PremiumDialog>
    </Box>
  );
}

function blockSummary(b: Block): string {
  const p = (b.props || {}) as Record<string, unknown>;
  if (typeof p.headline === 'string') return p.headline;
  if (typeof p.quote === 'string') return p.quote;
  if (Array.isArray(p.items)) return `${p.items.length} items`;
  if (Array.isArray(p.fields)) return `${p.fields.length} fields`;
  return b.type;
}

function PagesGrid({ pages, onNew }: { pages: PageCard[]; onNew: () => void }) {
  if (!pages.length) {
    return (
      <Box
        sx={{
          bgcolor: '#fff',
          border: `1px dashed ${LINE}`,
          borderRadius: CARD_RADIUS,
          p: 6,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontWeight: 700, color: INK, mb: 0.5 }}>No pages yet</Typography>
        <Typography sx={{ color: SUBTLE, mb: 2 }}>
          Create your first AI-generated landing page.
        </Typography>
        <Button
          onClick={onNew}
          startIcon={<AddIcon />}
          sx={{
            borderRadius: '999px',
            textTransform: 'none',
            fontWeight: 700,
            color: '#fff',
            background: INK,
            backgroundImage: 'none',
            '&:hover': { background: '#1B2330' },
          }}
        >
          New page
        </Button>
      </Box>
    );
  }

  return (
    <Grid container spacing={2} sx={{ px: 0.5 }}>
      {pages.map((p) => {
        const chip = statusChip(p.status);
        return (
          <Grid size={{ xs: 12, md: 6 }} key={p.id}>
            <Box
              sx={{
                bgcolor: '#fff',
                border: `1px solid ${LINE}`,
                borderRadius: CARD_RADIUS,
                boxShadow: CARD_SHADOW,
                p: 2.5,
                height: '100%',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, color: INK, fontSize: 17 }} noWrap>
                    {p.name}
                  </Typography>
                  {p.slug && (
                    <Typography sx={{ color: SUBTLE, fontSize: 12.5 }} noWrap>
                      /{p.slug}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={chip.label}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: chip.bg, color: chip.fg }}
                />
              </Stack>

              <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                <Metric label="Views" value={String(p.views)} />
                <Metric label="Submissions" value={String(p.submissions)} />
                <Metric label="Conversion" value={pct(p.conversion)} tone={BRAND.tealDeep} />
              </Stack>

              <Stack direction="row" spacing={0.75} sx={{ mt: 2, flexWrap: 'wrap' }}>
                {(p.blocks || []).slice(0, 6).map((b, i) => (
                  <Chip
                    key={i}
                    label={b.type}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: 11.5,
                      textTransform: 'capitalize',
                      bgcolor: 'rgba(14,17,22,0.05)',
                      color: INK,
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

function FunnelsList({ funnels }: { funnels: FunnelRow[] }) {
  if (!funnels.length) {
    return (
      <Box
        sx={{
          bgcolor: '#fff',
          border: `1px dashed ${LINE}`,
          borderRadius: CARD_RADIUS,
          p: 6,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontWeight: 700, color: INK }}>No funnels yet</Typography>
        <Typography sx={{ color: SUBTLE }}>
          Chain pages into a multi-step funnel to track conversion end to end.
        </Typography>
      </Box>
    );
  }
  return (
    <Grid container spacing={2} sx={{ px: 0.5 }}>
      {funnels.map((f) => {
        const chip = statusChip(f.status);
        return (
          <Grid size={{ xs: 12, md: 6 }} key={f.id}>
            <Box
              sx={{
                bgcolor: '#fff',
                border: `1px solid ${LINE}`,
                borderRadius: CARD_RADIUS,
                boxShadow: CARD_SHADOW,
                p: 2.5,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontWeight: 800, color: INK, fontSize: 17 }} noWrap>
                  {f.name}
                </Typography>
                <Chip
                  label={chip.label}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: chip.bg, color: chip.fg }}
                />
              </Stack>
              <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 1 }}>
                {f.steps?.length ?? 0} step{(f.steps?.length ?? 0) === 1 ? '' : 's'}
              </Typography>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

function OverviewPanel({ overview, pages }: { overview: Overview | null; pages: PageCard[] }) {
  const top = [...pages].sort((a, b) => b.conversion - a.conversion).slice(0, 5);
  return (
    <Box sx={{ px: 0.5 }}>
      <Box
        sx={{
          bgcolor: '#fff',
          border: `1px solid ${LINE}`,
          borderRadius: CARD_RADIUS,
          boxShadow: CARD_SHADOW,
          p: 2.5,
        }}
      >
        <Typography sx={{ fontWeight: 800, color: INK, mb: 0.5 }}>Performance summary</Typography>
        <Typography sx={{ color: SUBTLE, fontSize: 13.5, mb: 2 }}>
          {overview?.pages ?? 0} pages · {overview?.published ?? 0} published · avg conversion{' '}
          {pct(overview?.avg_conversion ?? 0)} · {overview?.total_views ?? 0} total views.
        </Typography>

        <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14, mb: 1 }}>
          Top converting pages
        </Typography>
        {top.length ? (
          <Stack spacing={1.25}>
            {top.map((p) => (
              <Stack key={p.id} direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ color: INK, fontSize: 14 }} noWrap>
                  {p.name}
                </Typography>
                <Chip
                  label={pct(p.conversion)}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }}
                />
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>No page data yet.</Typography>
        )}
      </Box>
    </Box>
  );
}

function Metric({ label, value, tone = INK }: { label: string; value: string; tone?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: SUBTLE }}>{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 18, color: tone }}>{value}</Typography>
    </Box>
  );
}
