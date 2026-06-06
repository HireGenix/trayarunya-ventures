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
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/VerifiedUser';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import PermMediaRoundedIcon from '@mui/icons-material/PermMediaRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  FieldGrid,
  FullSpan,
  AiAssist,
  inkPillSx,
  ghostPillSx,
  softPillSx,
} from '@/components/PremiumDialog';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type Tab = 'creators' | 'campaigns' | 'ugc' | 'roi' | 'overview';

const TABS: { key: Tab; label: string }[] = [
  { key: 'creators', label: 'Creators' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'ugc', label: 'UGC' },
  { key: 'roi', label: 'ROI' },
  { key: 'overview', label: 'Overview' },
];

const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'x', 'linkedin'];
const STAGES = ['prospect', 'contacted', 'negotiating', 'active', 'completed'];

const STAGE_STYLE: Record<string, { c: string; bg: string; label: string }> = {
  prospect: { c: SUBTLE, bg: 'rgba(14,17,22,0.05)', label: 'Prospect' },
  contacted: { c: BRAND.amberDeep, bg: BRAND.amberSoft, label: 'Contacted' },
  negotiating: { c: BRAND.amberDeep, bg: BRAND.amberSoft, label: 'Negotiating' },
  active: { c: BRAND.tealDeep, bg: BRAND.tealSoft, label: 'Active' },
  completed: { c: BRAND.tealDeep, bg: BRAND.tealSoft, label: 'Completed' },
};

const PLATFORM_STYLE: Record<string, { c: string; bg: string }> = {
  instagram: { c: BRAND.pink, bg: BRAND.pinkSoft },
  youtube: { c: BRAND.pink, bg: BRAND.pinkSoft },
  tiktok: { c: INK, bg: 'rgba(14,17,22,0.05)' },
  x: { c: INK, bg: 'rgba(14,17,22,0.05)' },
  linkedin: { c: BRAND.tealDeep, bg: BRAND.tealSoft },
};

const RIGHTS_STYLE: Record<string, { c: string; bg: string; label: string }> = {
  none: { c: BRAND.pink, bg: BRAND.pinkSoft, label: 'No rights' },
  requested: { c: BRAND.amberDeep, bg: BRAND.amberSoft, label: 'Requested' },
  granted: { c: BRAND.tealDeep, bg: BRAND.tealSoft, label: 'Granted' },
};

const TIER_STYLE: Record<string, { c: string; bg: string; label: string }> = {
  nano: { c: SUBTLE, bg: 'rgba(14,17,22,0.05)', label: 'Nano' },
  micro: { c: BRAND.tealDeep, bg: BRAND.tealSoft, label: 'Micro' },
  mid: { c: BRAND.amberDeep, bg: BRAND.amberSoft, label: 'Mid' },
  macro: { c: BRAND.pink, bg: BRAND.pinkSoft, label: 'Macro' },
  mega: { c: INK, bg: 'rgba(14,17,22,0.08)', label: 'Mega' },
};

const TIERS = ['nano', 'micro', 'mid', 'macro', 'mega'];

function fraudBadge(risk: number | null) {
  if (risk == null) return softChip('No data', SUBTLE, 'rgba(14,17,22,0.05)');
  if (risk >= 60) return softChip('High risk', BRAND.pink, BRAND.pinkSoft);
  if (risk >= 30) return softChip('Medium', BRAND.amberDeep, BRAND.amberSoft);
  return softChip('Low risk', BRAND.tealDeep, BRAND.tealSoft);
}

function qualityBadge(qs: number | null) {
  if (qs == null) return softChip('--', SUBTLE, 'rgba(14,17,22,0.05)');
  if (qs >= 70) return softChip(`${qs}`, BRAND.tealDeep, BRAND.tealSoft);
  if (qs >= 40) return softChip(`${qs}`, BRAND.amberDeep, BRAND.amberSoft);
  return softChip(`${qs}`, BRAND.pink, BRAND.pinkSoft);
}

interface Creator {
  id: string;
  handle: string;
  name: string;
  platform: string;
  followers: number | null;
  engagement_rate: number | null;
  niche: string | null;
  email: string | null;
  stage: string;
  rate_card: number | null;
  tags: string[] | null;
  avg_likes: number | null;
  avg_comments: number | null;
  avg_views: number | null;
  quality_score: number | null;
  fraud_risk: number | null;
  fraud_flags: string[] | null;
  tier: string | null;
}

interface Campaign {
  id: string;
  name: string;
  brief: string | null;
  budget: number | null;
  status: string;
  deliverables: string[] | null;
  creator_ids: string[] | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
}

interface UGC {
  id: string;
  creator_id: string | null;
  url: string;
  type: string;
  usage_rights: string;
  status: string;
  source: string | null;
}

interface Overview {
  creators_by_stage: Record<string, number>;
  total_creators: number;
  active_creators: number;
  estimated_reach: number;
  campaigns_by_status: Record<string, number>;
  live_campaigns: number;
  ugc_by_status: Record<string, number>;
  ugc_approved: number;
  ugc_rights_pending: number;
  outreach_sent: number;
  tier_distribution: Record<string, number>;
  avg_engagement_rate: number;
  avg_quality_score: number;
  avg_fraud_risk: number;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function softChip(label: string, c: string, bg: string) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.35,
        borderRadius: 999,
        bgcolor: bg,
        color: c,
        fontWeight: 700,
        fontSize: 11.5,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

export default function InfluencersPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<Tab>('creators');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ugc, setUgc] = useState<UGC[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [creatorOpen, setCreatorOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [ugcOpen, setUgcOpen] = useState(false);
  const [outreachFor, setOutreachFor] = useState<Creator | null>(null);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [roiData, setRoiData] = useState<any[]>([]);
  const [draftDialog, setDraftDialog] = useState<Creator | null>(null);
  const [busy, setBusy] = useState(false);
  const [campaignRoi, setCampaignRoi] = useState<Record<string, any> | null>(null);
  const [campaignRoiLoading, setCampaignRoiLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cr, ca, ug, ov, roi] = await Promise.all([
        api<Creator[]>('/influencers/creators', { workspace: true }),
        api<Campaign[]>('/influencers/campaigns', { workspace: true }),
        api<UGC[]>('/influencers/ugc', { workspace: true }),
        api<Overview>('/influencers/overview', { workspace: true }),
        api<any[]>('/influencers/campaigns/roi', { workspace: true }).catch(() => []),
      ]);
      setCreators(cr);
      setCampaigns(ca);
      setUgc(ug);
      setOverview(ov);
      setRoiData(roi);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load influencers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const scoreAll = useCallback(async () => {
    setBusy(true);
    try {
      const result = await api<{ scored: number }>('/influencers/creators/score-all', {
        method: 'POST',
        workspace: true,
      });
      setToast(`Scored ${result.scored} creators`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to score creators');
    } finally {
      setBusy(false);
    }
  }, [load]);

  const runAgent = useCallback(async () => {
    setBusy(true);
    try {
      await api('/influencers/agent/run', { method: 'POST', workspace: true });
      setToast('Influencers agent completed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Agent run failed');
    } finally {
      setBusy(false);
    }
  }, [load]);

  const viewCampaignRoi = useCallback(async (campaignId: string) => {
    setCampaignRoiLoading(true);
    setCampaignRoi({});
    try {
      const r = await api<Record<string, any>>(`/influencers/campaigns/${campaignId}/roi`, {
        workspace: true,
      });
      setCampaignRoi(r);
    } catch (e) {
      setCampaignRoi(null);
      setError(e instanceof Error ? e.message : 'Failed to load campaign ROI');
    } finally {
      setCampaignRoiLoading(false);
    }
  }, []);

  const kpis = useMemo(
    () => [
      { label: 'Active creators', value: fmtNum(overview?.active_creators ?? 0), c: BRAND.tealDeep },
      { label: 'Est. reach', value: fmtNum(overview?.estimated_reach ?? 0), c: BRAND.amberDeep },
      { label: 'Avg quality', value: String(overview?.avg_quality_score ?? 0), c: BRAND.tealDeep },
      { label: 'Avg fraud risk', value: String(overview?.avg_fraud_risk ?? 0), c: BRAND.pink },
    ],
    [overview],
  );

  if (!activeWorkspace) {
    return (
      <Box>
        <Alert severity="info">Select a workspace to manage influencers.</Alert>
      </Box>
    );
  }

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
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.12,
              fontSize: { xs: 28, md: 38 },
              color: INK,
            }}
          >
            Influencer &{' '}
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
              UGC
            </Box>{' '}
            management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Find creators, run AI outreach, and track rights — end to end.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25}>
          <Button
            startIcon={<BoltIcon />}
            disabled={busy}
            onClick={runAgent}
            sx={{
              px: 2.5, py: 1.1, borderRadius: '999px', fontWeight: 700, textTransform: 'none',
              color: INK, background: '#fff', backgroundImage: 'none', border: `1px solid ${LINE}`,
              '&:hover': { background: BRAND.amberSoft, borderColor: BRAND.amber },
            }}
          >
            Run agent
          </Button>
          <Button
            startIcon={<AutoAwesomeIcon />}
            disabled={busy}
            onClick={scoreAll}
            sx={{
              px: 2.5, py: 1.1, borderRadius: '999px', fontWeight: 700, textTransform: 'none',
              color: INK, background: '#fff', backgroundImage: 'none', border: `1px solid ${LINE}`,
              '&:hover': { background: BRAND.amberSoft, borderColor: BRAND.amber },
            }}
          >
            Re-score all creators
          </Button>
          <Button
            startIcon={<SearchIcon />}
            onClick={() => setMatchOpen(true)}
            sx={{
              px: 2.25,
              py: 1.15,
              borderRadius: '999px',
              fontWeight: 700,
              textTransform: 'none',
              color: INK,
              background: '#fff',
              backgroundImage: 'none',
              border: `1px solid ${LINE}`,
              '&:hover': { background: '#fff', borderColor: BRAND.amber },
            }}
          >
            Find creators
          </Button>
          <Button
            startIcon={<AddIcon />}
            onClick={() => {
              if (tab === 'campaigns') setCampaignOpen(true);
              else if (tab === 'ugc') setUgcOpen(true);
              else setCreatorOpen(true);
            }}
            sx={{
              px: 2.5,
              py: 1.15,
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
            {tab === 'campaigns' ? 'New campaign' : tab === 'ugc' ? 'Add asset' : 'Add creator'}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {kpis.map((k) => (
          <Grid key={k.label} size={{ xs: 6, md: 3 }}>
            <Box
              sx={{
                bgcolor: '#fff',
                border: `1px solid ${LINE}`,
                borderRadius: CARD_RADIUS,
                boxShadow: CARD_SHADOW,
                p: 2.25,
              }}
            >
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: SUBTLE, mb: 0.75 }}>
                {k.label}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ fontSize: 30, fontWeight: 800, color: INK, lineHeight: 1 }}>
                  {k.value}
                </Typography>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: k.c }} />
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, px: 0.5 }} flexWrap="wrap" rowGap={1}>
        {TABS.map((t) => (
          <Button
            key={t.key}
            disableRipple
            onClick={() => setTab(t.key)}
            sx={{
              px: 2.25,
              py: 0.85,
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: 13.5,
              textTransform: 'none',
              color: tab === t.key ? '#fff' : 'text.secondary',
              bgcolor: tab === t.key ? INK : 'transparent',
              '&:hover': {
                bgcolor: tab === t.key ? '#1B2330' : 'rgba(14,17,22,0.05)',
                color: tab === t.key ? '#fff' : INK,
              },
            }}
          >
            {t.label}
          </Button>
        ))}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {tab === 'creators' && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, px: 0.5 }} flexWrap="wrap" rowGap={1}>
          {['all', ...TIERS].map((t) => (
            <Button
              key={t}
              disableRipple
              size="small"
              onClick={() => setTierFilter(t)}
              sx={{
                px: 1.5, py: 0.5, borderRadius: '999px', fontWeight: 600, fontSize: 12,
                textTransform: 'capitalize',
                color: tierFilter === t ? '#fff' : SUBTLE,
                bgcolor: tierFilter === t ? INK : 'transparent',
                border: `1px solid ${tierFilter === t ? INK : LINE}`,
                '&:hover': { bgcolor: tierFilter === t ? '#1B2330' : 'rgba(14,17,22,0.04)' },
              }}
            >
              {t === 'all' ? 'All tiers' : t}
            </Button>
          ))}
        </Stack>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : tab === 'creators' ? (
        <CreatorsTable
          creators={tierFilter === 'all' ? creators : creators.filter((c) => c.tier === tierFilter)}
          onOutreach={(c) => setOutreachFor(c)}
          onDraft={(c) => setDraftDialog(c)}
        />
      ) : tab === 'campaigns' ? (
        <CampaignsGrid campaigns={campaigns} creators={creators} onViewRoi={viewCampaignRoi} />
      ) : tab === 'ugc' ? (
        <UGCGrid
          assets={ugc}
          onRights={async (a, rights) => {
            try {
              await api(`/influencers/ugc/${a.id}/rights`, {
                method: 'POST',
                body: { usage_rights: rights },
                workspace: true,
              });
              setToast(rights === 'granted' ? 'Rights granted' : 'Rights updated');
              load();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Failed to update rights');
            }
          }}
        />
      ) : tab === 'roi' ? (
        <ROIPanel roiData={roiData} />
      ) : (
        <OverviewPanel overview={overview} />
      )}

      <CreatorDialog
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onSaved={() => {
          setCreatorOpen(false);
          setToast('Creator added');
          load();
        }}
        onError={setError}
      />

      <MatchDialog open={matchOpen} onClose={() => setMatchOpen(false)} onError={setError} />

      <CampaignDialog
        open={campaignOpen}
        creators={creators}
        onClose={() => setCampaignOpen(false)}
        onSaved={() => {
          setCampaignOpen(false);
          setToast('Campaign created');
          load();
        }}
        onError={setError}
      />

      <UGCDialog
        open={ugcOpen}
        creators={creators}
        onClose={() => setUgcOpen(false)}
        onSaved={() => {
          setUgcOpen(false);
          setToast('Asset added');
          load();
        }}
        onError={setError}
      />

      <OutreachDialog
        creator={outreachFor}
        onClose={() => setOutreachFor(null)}
        onSent={() => {
          setOutreachFor(null);
          setToast('Outreach sent');
          load();
        }}
        onError={setError}
      />

      <DraftOutreachDialog
        creator={draftDialog}
        onClose={() => setDraftDialog(null)}
        onError={setError}
      />

      <CampaignRoiDialog
        open={campaignRoi !== null}
        loading={campaignRoiLoading}
        roi={campaignRoi}
        onClose={() => setCampaignRoi(null)}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

/* ======================= Creators table ======================= */
function CreatorsTable({
  creators,
  onOutreach,
  onDraft,
}: {
  creators: Creator[];
  onOutreach: (c: Creator) => void;
  onDraft: (c: Creator) => void;
}) {
  if (!creators.length) {
    return <EmptyCard text="No creators yet. Add one or use Find creators to source matches." />;
  }
  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: `1px solid ${LINE}`,
        borderRadius: CARD_RADIUS,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}>
          <Box component="thead">
            <Box
              component="tr"
              sx={{
                '& th': {
                  textAlign: 'left',
                  px: 2.25,
                  py: 1.5,
                  fontSize: 12,
                  fontWeight: 700,
                  color: SUBTLE,
                  borderBottom: `1px solid ${LINE}`,
                },
              }}
            >
              <th>Creator</th>
              <th>Platform</th>
              <th>Tier</th>
              <th>Followers</th>
              <th>Engagement</th>
              <th>Quality</th>
              <th>Fraud risk</th>
              <th>Stage</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </Box>
          </Box>
          <Box component="tbody">
            {creators.map((c) => {
              const st = STAGE_STYLE[c.stage] || STAGE_STYLE.prospect;
              const pl = PLATFORM_STYLE[c.platform] || PLATFORM_STYLE.tiktok;
              const ti = c.tier ? TIER_STYLE[c.tier] || TIER_STYLE.nano : null;
              return (
                <Box
                  component="tr"
                  key={c.id}
                  sx={{
                    '& td': { px: 2.25, py: 1.5, borderBottom: `1px solid ${LINE}`, verticalAlign: 'middle' },
                    '&:hover': { bgcolor: 'rgba(14,17,22,0.015)' },
                  }}
                >
                  <td>
                    <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14 }}>{c.name}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: SUBTLE }}>
                      @{c.handle}
                      {c.niche ? ` · ${c.niche}` : ''}
                    </Typography>
                  </td>
                  <td>{softChip(c.platform, pl.c, pl.bg)}</td>
                  <td>{ti ? softChip(ti.label, ti.c, ti.bg) : softChip('--', SUBTLE, 'rgba(14,17,22,0.05)')}</td>
                  <td>
                    <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14 }}>{fmtNum(c.followers)}</Typography>
                  </td>
                  <td>
                    <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>
                      {c.engagement_rate != null ? `${(c.engagement_rate * 100).toFixed(1)}%` : '--'}
                    </Typography>
                  </td>
                  <td>{qualityBadge(c.quality_score)}</td>
                  <td>
                    <Stack spacing={0.5} alignItems="flex-start">
                      {fraudBadge(c.fraud_risk)}
                      {c.fraud_flags && c.fraud_flags.length > 0 && c.fraud_flags[0] !== 'low_data' && (
                        <Typography sx={{ fontSize: 10.5, color: SUBTLE, lineHeight: 1.3 }}>
                          {c.fraud_flags.join(', ')}
                        </Typography>
                      )}
                    </Stack>
                  </td>
                  <td>{softChip(st.label, st.c, st.bg)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                      <Button
                        size="small"
                        onClick={() => onDraft(c)}
                        sx={{
                          px: 1.25, borderRadius: '999px', fontWeight: 700, fontSize: 11.5,
                          textTransform: 'none', color: INK, background: '#fff', backgroundImage: 'none',
                          border: `1px solid ${LINE}`, minWidth: 0,
                          '&:hover': { background: BRAND.tealSoft, borderColor: BRAND.teal },
                        }}
                      >
                        Draft
                      </Button>
                      <Button
                        size="small"
                        startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                        onClick={() => onOutreach(c)}
                        sx={{
                          px: 1.5, borderRadius: '999px', fontWeight: 700, fontSize: 12.5,
                          textTransform: 'none', color: INK, background: '#fff', backgroundImage: 'none',
                          border: `1px solid ${LINE}`,
                          '&:hover': { background: BRAND.amberSoft, borderColor: BRAND.amber },
                        }}
                      >
                        AI outreach
                      </Button>
                    </Stack>
                  </td>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ======================= Campaigns grid ======================= */
function CampaignsGrid({ campaigns, creators, onViewRoi }: { campaigns: Campaign[]; creators: Creator[]; onViewRoi: (id: string) => void }) {
  if (!campaigns.length) {
    return <EmptyCard text="No campaigns yet. Create one to brief and assign creators." />;
  }
  const styleFor = (s: string) =>
    s === 'live'
      ? { c: BRAND.tealDeep, bg: BRAND.tealSoft }
      : s === 'done'
      ? { c: INK, bg: 'rgba(14,17,22,0.05)' }
      : { c: BRAND.amberDeep, bg: BRAND.amberSoft };
  return (
    <Grid container spacing={2}>
      {campaigns.map((c) => {
        const st = styleFor(c.status);
        const roster = (c.creator_ids || [])
          .map((id) => creators.find((cr) => cr.id === id)?.name)
          .filter(Boolean);
        return (
          <Grid key={c.id} size={{ xs: 12, md: 6 }}>
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
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16 }}>{c.name}</Typography>
                {softChip(c.status, st.c, st.bg)}
              </Stack>
              {c.brief && <Typography sx={{ color: SUBTLE, fontSize: 13.5, mb: 1.5 }}>{c.brief}</Typography>}
              <Stack direction="row" spacing={3} sx={{ mb: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: SUBTLE, fontWeight: 700 }}>Budget</Typography>
                  <Typography sx={{ fontWeight: 800, color: INK }}>
                    {c.budget != null ? `$${fmtNum(c.budget)}` : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: SUBTLE, fontWeight: 700 }}>Creators</Typography>
                  <Typography sx={{ fontWeight: 800, color: INK }}>{(c.creator_ids || []).length}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: SUBTLE, fontWeight: 700 }}>Deliverables</Typography>
                  <Typography sx={{ fontWeight: 800, color: INK }}>{(c.deliverables || []).length}</Typography>
                </Box>
              </Stack>
              {roster.length > 0 && (
                <Typography sx={{ fontSize: 12.5, color: SUBTLE, mt: 1 }}>{roster.join(', ')}</Typography>
              )}
              <Stack direction="row" sx={{ mt: 1.5 }}>
                <Button size="small" onClick={() => onViewRoi(c.id)} sx={pillBtnSx(false)}>
                  View ROI
                </Button>
              </Stack>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

/* ======================= UGC grid ======================= */
function UGCGrid({ assets, onRights }: { assets: UGC[]; onRights: (a: UGC, rights: string) => void }) {
  if (!assets.length) {
    return <EmptyCard text="No UGC assets yet. Add an asset to start tracking usage rights." />;
  }
  return (
    <Grid container spacing={2}>
      {assets.map((a) => {
        const r = RIGHTS_STYLE[a.usage_rights] || RIGHTS_STYLE.none;
        return (
          <Grid key={a.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Box
              sx={{
                bgcolor: '#fff',
                border: `1px solid ${LINE}`,
                borderRadius: CARD_RADIUS,
                boxShadow: CARD_SHADOW,
                overflow: 'hidden',
                height: '100%',
              }}
            >
              <Box
                sx={{
                  height: 150,
                  bgcolor: 'rgba(14,17,22,0.04)',
                  backgroundImage: a.type === 'image' ? `url(${a.url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {a.type === 'video' && (
                  <Typography sx={{ fontWeight: 800, color: SUBTLE, fontSize: 13 }}>VIDEO</Typography>
                )}
              </Box>
              <Box sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  {softChip(a.type, INK, 'rgba(14,17,22,0.05)')}
                  {softChip(r.label, r.c, r.bg)}
                </Stack>
                {a.source && (
                  <Typography sx={{ fontSize: 12, color: SUBTLE, mb: 1, wordBreak: 'break-all' }}>{a.source}</Typography>
                )}
                <Stack direction="row" spacing={1}>
                  {a.usage_rights !== 'requested' && a.usage_rights !== 'granted' && (
                    <Button size="small" onClick={() => onRights(a, 'requested')} sx={pillBtnSx(false)}>
                      Request
                    </Button>
                  )}
                  {a.usage_rights !== 'granted' && (
                    <Button
                      size="small"
                      startIcon={<VerifiedIcon sx={{ fontSize: 15 }} />}
                      onClick={() => onRights(a, 'granted')}
                      sx={pillBtnSx(true)}
                    >
                      Grant rights
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

/* ======================= ROI panel ======================= */
function ROIPanel({ roiData }: { roiData: any[] }) {
  if (!roiData.length) {
    return <EmptyCard text="No campaign ROI data yet. Add spend and outcome metrics to campaigns." />;
  }
  const chartData = roiData
    .filter((r: any) => r.spend)
    .map((r: any) => ({
      name: (r.campaign_name || '').slice(0, 20),
      spend: r.spend || 0,
      cpm: r.cpm || 0,
      cpe: r.cpe || 0,
      roi: r.roi_pct || 0,
    }));

  const COLORS = [BRAND.tealDeep, BRAND.amberDeep, BRAND.pink, INK];

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5 }}>
          <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, mb: 2 }}>Campaign spend</Typography>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: SUBTLE }} />
                <YAxis tick={{ fontSize: 11, fill: SUBTLE }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, '']}
                />
                <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
                  {chartData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography sx={{ color: SUBTLE, fontSize: 13 }}>Add spend data to see chart.</Typography>
          )}
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={2}>
          {roiData.map((r: any) => (
            <Box
              key={r.campaign_id}
              sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2 }}
            >
              <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14, mb: 0.75 }}>{r.campaign_name}</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" rowGap={0.75}>
                {r.spend != null && (
                  <Box>
                    <Typography sx={{ fontSize: 10.5, color: SUBTLE, fontWeight: 700 }}>Spend</Typography>
                    <Typography sx={{ fontWeight: 800, color: INK, fontSize: 13 }}>${fmtNum(r.spend)}</Typography>
                  </Box>
                )}
                {r.cpm != null && (
                  <Box>
                    <Typography sx={{ fontSize: 10.5, color: SUBTLE, fontWeight: 700 }}>CPM</Typography>
                    <Typography sx={{ fontWeight: 800, color: INK, fontSize: 13 }}>${r.cpm}</Typography>
                  </Box>
                )}
                {r.cpe != null && (
                  <Box>
                    <Typography sx={{ fontSize: 10.5, color: SUBTLE, fontWeight: 700 }}>CPE</Typography>
                    <Typography sx={{ fontWeight: 800, color: INK, fontSize: 13 }}>${r.cpe}</Typography>
                  </Box>
                )}
                {r.roi_pct != null && (
                  <Box>
                    <Typography sx={{ fontSize: 10.5, color: SUBTLE, fontWeight: 700 }}>ROI (proxy)</Typography>
                    <Typography sx={{ fontWeight: 800, color: r.roi_pct >= 0 ? BRAND.tealDeep : BRAND.pink, fontSize: 13 }}>
                      {r.roi_pct}%
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography sx={{ fontSize: 10.5, color: SUBTLE, fontWeight: 700 }}>Data</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 11, color: r.data_quality === 'good' ? BRAND.tealDeep : BRAND.amberDeep }}>
                    {r.data_quality}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Grid>
    </Grid>
  );
}

function CampaignRoiDialog({
  open,
  loading,
  roi,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  roi: Record<string, any> | null;
  onClose: () => void;
}) {
  const fmtKey = (k: string) =>
    k.replace(/_/g, ' ').replace(/\bpct\b/i, '%').replace(/^\w/, (m) => m.toUpperCase());
  const fmtVal = (v: any) => {
    if (v == null) return '—';
    if (typeof v === 'number') return Number.isInteger(v) ? fmtNum(v) : String(v);
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  };
  const entries = roi
    ? Object.entries(roi).filter(
        ([, v]) => v != null && typeof v !== 'object' && typeof v !== 'function',
      )
    : [];
  const title =
    (roi && (roi.campaign_name as string)) ||
    'Campaign ROI';

  return (
    <PremiumDialog open={open} onClose={onClose} maxWidth="sm">
      <DialogHero
        icon={<CampaignRoundedIcon />}
        title={title}
        subtitle="Per-campaign ROI breakdown"
        onClose={onClose}
        tint={BRAND.amberDeep}
        tintSoft={BRAND.amberSoft}
      />
      <DialogBody>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : !entries.length ? (
          <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>
            No ROI data available for this campaign yet.
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {entries.map(([k, v]) => (
              <Grid key={k} size={{ xs: 6, sm: 4 }}>
                <Box
                  sx={{
                    bgcolor: 'rgba(14,17,22,0.02)',
                    border: `1px solid ${LINE}`,
                    borderRadius: '16px',
                    p: 1.75,
                    height: '100%',
                  }}
                >
                  <Typography sx={{ fontSize: 11, color: SUBTLE, fontWeight: 700, textTransform: 'capitalize' }}>
                    {fmtKey(k)}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, color: INK, fontSize: 15, mt: 0.5, wordBreak: 'break-word' }}>
                    {fmtVal(v)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose} sx={ghostPillSx}>
          Close
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function pillBtnSx(primary: boolean) {
  return primary
    ? {
        px: 1.5,
        borderRadius: '999px',
        fontWeight: 700,
        fontSize: 12.5,
        textTransform: 'none' as const,
        color: '#fff',
        background: INK,
        backgroundImage: 'none',
        '&:hover': { background: '#1B2330' },
      }
    : {
        px: 1.5,
        borderRadius: '999px',
        fontWeight: 700,
        fontSize: 12.5,
        textTransform: 'none' as const,
        color: INK,
        background: '#fff',
        backgroundImage: 'none',
        border: `1px solid ${LINE}`,
        '&:hover': { background: BRAND.amberSoft, borderColor: BRAND.amber },
      };
}

/* ======================= Overview panel ======================= */
function OverviewPanel({ overview }: { overview: Overview | null }) {
  if (!overview) return <EmptyCard text="No data yet." />;
  const stages = STAGES.map((s) => ({ s, n: overview.creators_by_stage[s] || 0 }));
  const maxStage = Math.max(1, ...stages.map((x) => x.n));
  const tierData = TIERS.map((t) => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    value: overview.tier_distribution?.[t] || 0,
  }));
  const TIER_COLORS = [SUBTLE, BRAND.tealDeep, BRAND.amberDeep, BRAND.pink, INK];

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5 }}>
          <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, mb: 2 }}>Pipeline by stage</Typography>
          <Stack spacing={1.5}>
            {stages.map(({ s, n }) => {
              const st = STAGE_STYLE[s];
              return (
                <Box key={s}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK, textTransform: 'capitalize' }}>
                      {st.label}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: st.c }}>{n}</Typography>
                  </Stack>
                  <Box sx={{ height: 8, borderRadius: 999, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
                    <Box sx={{ width: `${(n / maxStage) * 100}%`, height: '100%', bgcolor: st.c, transition: 'width .3s' }} />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
        {tierData.some((d) => d.value > 0) && (
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.5, mt: 2 }}>
            <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16, mb: 2 }}>Tier distribution</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tierData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: SUBTLE }} />
                <YAxis tick={{ fontSize: 11, fill: SUBTLE }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {tierData.map((_: any, i: number) => (
                    <Cell key={i} fill={TIER_COLORS[i % TIER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={2}>
          <StatRow label="Estimated reach (active)" value={fmtNum(overview.estimated_reach)} c={BRAND.amberDeep} />
          <StatRow label="Avg engagement rate" value={`${(overview.avg_engagement_rate * 100).toFixed(1)}%`} c={BRAND.tealDeep} />
          <StatRow label="Avg quality score" value={String(overview.avg_quality_score)} c={BRAND.tealDeep} />
          <StatRow label="Avg fraud risk" value={String(overview.avg_fraud_risk)} c={BRAND.pink} />
          <StatRow label="Active campaigns" value={String(overview.live_campaigns)} c={BRAND.tealDeep} />
          <StatRow label="UGC approved" value={String(overview.ugc_approved)} c={BRAND.pink} />
          <StatRow label="UGC rights pending" value={String(overview.ugc_rights_pending)} c={INK} />
          <StatRow label="Outreach sent" value={String(overview.outreach_sent)} c={BRAND.tealDeep} />
        </Stack>
      </Grid>
    </Grid>
  );
}

function StatRow({ label, value, c }: { label: string; value: string; c: string }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${LINE}`, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, p: 2.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: SUBTLE }}>{label}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: INK }}>{value}</Typography>
          <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: c }} />
        </Stack>
      </Stack>
    </Box>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: `1.5px dashed ${LINE}`,
        borderRadius: CARD_RADIUS,
        py: 7,
        textAlign: 'center',
        color: SUBTLE,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {text}
    </Box>
  );
}

/* ======================= Dialogs ======================= */

function CreatorDialog({
  open,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [followers, setFollowers] = useState('');
  const [niche, setNiche] = useState('');
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState('prospect');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setHandle('');
    setName('');
    setPlatform('instagram');
    setFollowers('');
    setNiche('');
    setEmail('');
    setStage('prospect');
  };

  const save = async () => {
    if (!handle.trim()) return;
    setSaving(true);
    try {
      await api('/influencers/creators', {
        method: 'POST',
        body: {
          handle: handle.trim(),
          name: name.trim() || handle.trim(),
          platform,
          followers: followers ? Number(followers) : null,
          niche: niche.trim() || null,
          email: email.trim() || null,
          stage,
        },
        workspace: true,
      });
      reset();
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to add creator');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumDialog open={open} onClose={onClose} maxWidth="sm">
      <DialogHero
        icon={<GroupsRoundedIcon />}
        title="Add creator"
        subtitle="Bring a creator into your roster and track their stage"
        onClose={onClose}
      />
      <DialogBody>
        <SectionLabel>Creator profile</SectionLabel>
        <FieldGrid>
          <TextField label="Handle" value={handle} onChange={(e) => setHandle(e.target.value)} fullWidth size="small" />
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
          <TextField select label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)} fullWidth size="small">
            {PLATFORMS.map((p) => (
              <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Followers" type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} fullWidth size="small" />
          <TextField label="Niche" value={niche} onChange={(e) => setNiche(e.target.value)} fullWidth size="small" />
          <TextField select label="Stage" value={stage} onChange={(e) => setStage(e.target.value)} fullWidth size="small">
            {STAGES.map((s) => (
              <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <FullSpan>
            <TextField label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth size="small" />
          </FullSpan>
        </FieldGrid>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose} sx={ghostPillSx}>Cancel</Button>
        <Button onClick={save} disabled={saving || !handle.trim()} startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined} sx={inkPillSx}>
          {saving ? 'Saving…' : 'Add creator'}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

interface MatchResult {
  persona?: string;
  platforms?: string[];
  niches?: string[];
  follower_range?: string;
  min_engagement_rate?: number;
  search_keywords?: string[];
  outreach_angle?: string;
  rationale?: string;
}

function MatchDialog({
  open,
  onClose,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onError: (m: string) => void;
}) {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);

  const run = async () => {
    if (!brief.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await api<MatchResult>('/influencers/match', {
        method: 'POST',
        body: { brief: brief.trim() },
        workspace: true,
      });
      setResult(r);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Match failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumDialog
      open={open}
      onClose={() => {
        setResult(null);
        setBrief('');
        onClose();
      }}
      maxWidth="sm"
    >
      <DialogHero
        icon={<SearchRoundedIcon />}
        title="Find creators"
        subtitle="Describe the campaign and let AI define the ideal creator"
        onClose={() => {
          setResult(null);
          setBrief('');
          onClose();
        }}
        tint={BRAND.tealDeep}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        <Stack spacing={2}>
          <AiAssist
            brief={brief}
            setBrief={setBrief}
            loading={loading}
            onGenerate={run}
            label="What are we promoting, to whom, and the goal?"
            placeholder="What are we promoting, to whom, and the goal?"
            buttonText="AI match"
            minRows={3}
          />
          {result && (
            <Box sx={{ bgcolor: 'rgba(14,17,22,0.02)', border: `1px solid ${LINE}`, borderRadius: '16px', p: 2 }}>
              <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14, mb: 0.5 }}>Ideal creator</Typography>
              <Typography sx={{ color: SUBTLE, fontSize: 13.5, mb: 1.5 }}>{result.persona}</Typography>
              {result.outreach_angle && (
                <>
                  <Typography sx={{ fontWeight: 800, color: INK, fontSize: 13, mb: 0.25 }}>Outreach angle</Typography>
                  <Typography sx={{ color: SUBTLE, fontSize: 13, mb: 1.5 }}>{result.outreach_angle}</Typography>
                </>
              )}
              <Stack direction="row" spacing={3} sx={{ mb: 1.5 }} flexWrap="wrap" rowGap={1}>
                {result.follower_range && (
                  <Box>
                    <Typography sx={{ fontSize: 11.5, color: SUBTLE, fontWeight: 700 }}>Follower range</Typography>
                    <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>{result.follower_range}</Typography>
                  </Box>
                )}
                {result.min_engagement_rate != null && (
                  <Box>
                    <Typography sx={{ fontSize: 11.5, color: SUBTLE, fontWeight: 700 }}>Min engagement</Typography>
                    <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>
                      {(result.min_engagement_rate * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                )}
              </Stack>
              {!!(result.platforms || []).length && (
                <Stack direction="row" spacing={0.75} sx={{ mb: 1 }} flexWrap="wrap" rowGap={0.75}>
                  {result.platforms!.map((p) => {
                    const pl = PLATFORM_STYLE[p] || PLATFORM_STYLE.tiktok;
                    return <span key={p}>{softChip(p, pl.c, pl.bg)}</span>;
                  })}
                </Stack>
              )}
              {!!(result.search_keywords || []).length && (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                  {result.search_keywords!.map((k) => (
                    <Chip key={k} label={k} size="small" sx={{ fontWeight: 700, fontSize: 11.5, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }} />
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </Stack>
      </DialogBody>
      <DialogFooter>
        <Button
          onClick={() => {
            setResult(null);
            setBrief('');
            onClose();
          }}
          sx={ghostPillSx}
        >
          Close
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function CampaignDialog({
  open,
  creators,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  creators: Creator[];
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [budget, setBudget] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setBrief('');
    setBudget('');
    setDeliverables('');
    setSelected([]);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api('/influencers/campaigns', {
        method: 'POST',
        body: {
          name: name.trim(),
          brief: brief.trim() || null,
          budget: budget ? Number(budget) : null,
          deliverables: deliverables
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean),
          creator_ids: selected,
        },
        workspace: true,
      });
      reset();
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumDialog open={open} onClose={onClose} maxWidth="sm">
      <DialogHero
        icon={<CampaignRoundedIcon />}
        title="New campaign"
        subtitle="Brief the work, set a budget and assign creators"
        onClose={onClose}
      />
      <DialogBody>
        <SectionLabel>Campaign details</SectionLabel>
        <FieldGrid>
          <FullSpan>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
          </FullSpan>
          <FullSpan>
            <TextField label="Brief" value={brief} onChange={(e) => setBrief(e.target.value)} fullWidth multiline minRows={2} size="small" />
          </FullSpan>
          <TextField label="Budget ($)" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} fullWidth size="small" />
          <TextField label="Deliverables (comma-sep)" value={deliverables} onChange={(e) => setDeliverables(e.target.value)} fullWidth size="small" />
          <FullSpan>
            <TextField
              select
              label="Assign creators"
              value={selected}
              onChange={(e) =>
                setSelected(typeof e.target.value === 'string' ? [e.target.value] : (e.target.value as unknown as string[]))
              }
              SelectProps={{ multiple: true }}
              fullWidth
              size="small"
            >
              {creators.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} (@{c.handle})
                </MenuItem>
              ))}
            </TextField>
          </FullSpan>
        </FieldGrid>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose} sx={ghostPillSx}>Cancel</Button>
        <Button onClick={save} disabled={saving || !name.trim()} startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined} sx={inkPillSx}>
          {saving ? 'Creating…' : 'Create campaign'}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function UGCDialog({
  open,
  creators,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  creators: Creator[];
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [type, setType] = useState('image');
  const [creatorId, setCreatorId] = useState('');
  const [source, setSource] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUrl('');
    setType('image');
    setCreatorId('');
    setSource('');
  };

  const save = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      await api('/influencers/ugc', {
        method: 'POST',
        body: {
          url: url.trim(),
          type,
          creator_id: creatorId || null,
          source: source.trim() || null,
        },
        workspace: true,
      });
      reset();
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to add asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumDialog open={open} onClose={onClose} maxWidth="sm">
      <DialogHero
        icon={<PermMediaRoundedIcon />}
        title="Add UGC asset"
        subtitle="Register creator content and track its usage rights"
        onClose={onClose}
      />
      <DialogBody>
        <SectionLabel>Asset details</SectionLabel>
        <FieldGrid>
          <FullSpan>
            <TextField label="Asset URL" value={url} onChange={(e) => setUrl(e.target.value)} fullWidth size="small" />
          </FullSpan>
          <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value)} fullWidth size="small">
            <MenuItem value="image">Image</MenuItem>
            <MenuItem value="video">Video</MenuItem>
          </TextField>
          <TextField select label="Creator (optional)" value={creatorId} onChange={(e) => setCreatorId(e.target.value)} fullWidth size="small">
            <MenuItem value="">Unassigned</MenuItem>
            {creators.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <FullSpan>
            <TextField label="Source (optional)" value={source} onChange={(e) => setSource(e.target.value)} fullWidth size="small" />
          </FullSpan>
        </FieldGrid>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose} sx={ghostPillSx}>Cancel</Button>
        <Button onClick={save} disabled={saving || !url.trim()} startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined} sx={inkPillSx}>
          {saving ? 'Saving…' : 'Add asset'}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

interface OutreachDraft {
  channel?: string;
  subject?: string | null;
  body?: string;
}

function OutreachDialog({
  creator,
  onClose,
  onSent,
  onError,
}: {
  creator: Creator | null;
  onClose: () => void;
  onSent: () => void;
  onError: (m: string) => void;
}) {
  const [goal, setGoal] = useState('Explore a paid collaboration');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<OutreachDraft | null>(null);

  useEffect(() => {
    if (creator) {
      setDraft(null);
      setGoal('Explore a paid collaboration');
    }
  }, [creator]);

  const generate = async (send: boolean) => {
    if (!creator) return;
    setLoading(true);
    try {
      const r = await api<OutreachDraft>(`/influencers/creators/${creator.id}/outreach`, {
        method: 'POST',
        body: { goal: goal.trim(), send },
        workspace: true,
      });
      if (send) {
        onSent();
      } else {
        setDraft(r);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Outreach failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumDialog open={!!creator} onClose={onClose} maxWidth="sm">
      <DialogHero
        icon={<ChatRoundedIcon />}
        title={creator ? `AI outreach · ${creator.name}` : 'AI outreach'}
        subtitle="Draft a personalised message and send it in one step"
        onClose={onClose}
        tint={BRAND.tealDeep}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        <SectionLabel>Outreach goal</SectionLabel>
        <Stack spacing={2}>
          <TextField label="Outreach goal" value={goal} onChange={(e) => setGoal(e.target.value)} fullWidth size="small" />
          {draft && (
            <Box sx={{ bgcolor: 'rgba(14,17,22,0.02)', border: `1px solid ${LINE}`, borderRadius: '16px', p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
                {softChip(draft.channel || 'email', INK, 'rgba(14,17,22,0.05)')}
                {draft.subject && <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>{draft.subject}</Typography>}
              </Stack>
              <Typography sx={{ color: SUBTLE, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{draft.body}</Typography>
            </Box>
          )}
        </Stack>
      </DialogBody>
      <DialogFooter>
        <Button onClick={() => generate(false)} disabled={loading} startIcon={<AutoAwesomeIcon />} sx={softPillSx}>
          {loading ? 'Drafting…' : 'Draft'}
        </Button>
        <Button onClick={() => generate(true)} disabled={loading} sx={inkPillSx}>
          Draft & send
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

/* ======================= Draft outreach dialog (enterprise) ======================= */
function DraftOutreachDialog({
  creator,
  onClose,
  onError,
}: {
  creator: Creator | null;
  onClose: () => void;
  onError: (m: string) => void;
}) {
  const [goal, setGoal] = useState('Explore a collaboration');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<OutreachDraft | null>(null);

  useEffect(() => {
    if (creator) {
      setDraft(null);
      setGoal('Explore a collaboration');
    }
  }, [creator]);

  const generate = async () => {
    if (!creator) return;
    setLoading(true);
    try {
      const r = await api<OutreachDraft>(`/influencers/creators/${creator.id}/draft-outreach`, {
        method: 'POST',
        body: { goal: goal.trim() },
        workspace: true,
      });
      setDraft(r);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Draft failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumDialog open={!!creator} onClose={onClose} maxWidth="sm">
      <DialogHero
        icon={<ChatRoundedIcon />}
        title={creator ? `Draft outreach · ${creator.name}` : 'Draft outreach'}
        subtitle="LLM-drafted outreach grounded in creator and brand data (draft only)"
        onClose={onClose}
        tint={BRAND.tealDeep}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        <SectionLabel>Goal</SectionLabel>
        <Stack spacing={2}>
          <TextField label="Outreach goal" value={goal} onChange={(e) => setGoal(e.target.value)} fullWidth size="small" />
          {creator && (
            <Box sx={{ bgcolor: 'rgba(14,17,22,0.02)', border: `1px solid ${LINE}`, borderRadius: '16px', p: 1.5 }}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.5}>
                {creator.tier && softChip(creator.tier, (TIER_STYLE[creator.tier] || TIER_STYLE.nano).c, (TIER_STYLE[creator.tier] || TIER_STYLE.nano).bg)}
                {creator.quality_score != null && qualityBadge(creator.quality_score)}
                {fraudBadge(creator.fraud_risk)}
                {creator.engagement_rate != null && (
                  <Typography sx={{ fontSize: 12, color: SUBTLE }}>
                    ER: {(creator.engagement_rate * 100).toFixed(1)}%
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
          {draft && (
            <Box sx={{ bgcolor: 'rgba(14,17,22,0.02)', border: `1px solid ${LINE}`, borderRadius: '16px', p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
                {softChip(draft.channel || 'email', INK, 'rgba(14,17,22,0.05)')}
                {draft.subject && <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>{draft.subject}</Typography>}
              </Stack>
              <Typography sx={{ color: SUBTLE, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{draft.body}</Typography>
            </Box>
          )}
        </Stack>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose} sx={ghostPillSx}>Close</Button>
        <Button onClick={generate} disabled={loading} startIcon={<AutoAwesomeIcon />} sx={inkPillSx}>
          {loading ? 'Drafting...' : 'Generate draft'}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}
