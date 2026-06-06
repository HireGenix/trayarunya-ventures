'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip as MuiTooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import FilterAltRoundedIcon from '@mui/icons-material/FilterAltRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from 'recharts';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { BRAND } from '@/theme/theme';
import {
  INK,
  SUBTLE,
  LINE,
  CARD_RADIUS,
  CARD_SHADOW,
  type Block,
  makeBlock,
  blocksFromRaw,
  blocksToRaw,
  rawBlocksToHtml,
  csvToSubscribers,
  type ParsedSubscriber,
} from './blocks';
import BlockEditor from './BlockEditor';
import CampaignBuilder, { type EmailSegment, type CampaignSeed } from './CampaignBuilder';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
} from '@/components/PremiumDialog';

/* -------------------------------------------------------------------------- */
/* Types (mirror backend Pydantic schemas)                                    */
/* -------------------------------------------------------------------------- */

interface EmailList {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
}
interface Subscriber {
  id: string;
  list_id: string;
  email: string;
  name?: string | null;
  status: string;
  tags?: string[] | null;
  attributes?: Record<string, unknown> | null;
  created_at?: string;
}
interface CampaignStats {
  sent?: number;
  opens?: number;
  clicks?: number;
  bounces?: number;
  open_rate?: number;
  click_rate?: number;
}
interface Campaign {
  id: string;
  list_id?: string | null;
  segment_id?: string | null;
  name: string;
  subject: string;
  preheader?: string | null;
  from_name?: string | null;
  body_html?: string | null;
  body_blocks?: unknown;
  status: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  stats?: CampaignStats | null;
  ab_test?: {
    enabled?: boolean;
    decided_variant?: string | null;
    variants?: { subject: string; key: string }[];
  } | null;
  created_at: string;
}
interface Template {
  id: string;
  name: string;
  subject: string;
  preheader?: string | null;
  body_blocks?: unknown;
  thumbnail?: string | null;
  description?: string | null;
  category?: string | null;
  is_starter: boolean;
  created_at?: string | null;
}
interface Segment {
  id: string;
  list_id?: string | null;
  name: string;
  rules?: { match?: string; conditions?: SegCondition[] } | null;
  created_at?: string;
}
interface SegCondition {
  field: string;
  op: string;
  value: string;
  key?: string;
}
interface Sequence {
  id: string;
  list_id?: string | null;
  name: string;
  trigger: string;
  steps?: unknown[] | null;
  is_active: boolean;
  autonomy: string;
  created_at?: string;
}
interface Suppression {
  id: string;
  email: string;
  reason?: string | null;
  created_at?: string;
}
interface Overview {
  subscribers: number;
  lists: number;
  campaigns_sent: number;
  active_sequences: number;
  total_sent: number;
  avg_open_rate: number;
  avg_click_rate: number;
  growth_rate: number;
  new_subscribers: number;
}
interface Compliance {
  suppression_count: number;
  unsubscribe_url_template: string;
  preference_url_template: string;
  confirm_url_template: string;
}
interface SequenceProgress {
  total: number;
  enrolled: number;
  completed: number;
  cancelled: number;
}
interface SeriesPoint {
  date: string;
  count: number;
}
interface CampaignAnalytics {
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  opens_over_time: SeriesPoint[];
  clicks_over_time: SeriesPoint[];
  link_clicks: { url: string; count: number }[];
  variant_comparison: {
    key?: string;
    subject?: string;
    open_rate?: number;
    click_rate?: number;
  }[];
}
interface SegmentPreview {
  count: number;
  sample: { id: string; email: string; name: string | null; status: string }[];
}

type TabKey =
  | 'campaigns'
  | 'templates'
  | 'lists'
  | 'segments'
  | 'sequences'
  | 'journeys'
  | 'analytics'
  | 'compliance';

/* -------------------------------------------------------------------------- */
/* Shared UI primitives                                                       */
/* -------------------------------------------------------------------------- */

const inkButton = {
  background: INK,
  backgroundImage: 'none',
  borderRadius: '999px',
  textTransform: 'none' as const,
  fontWeight: 700,
  color: '#fff',
  '&:hover': { background: '#000' },
};

const ghostButton = {
  borderRadius: '999px',
  textTransform: 'none' as const,
  fontWeight: 700,
  color: INK,
  border: `1px solid ${LINE}`,
  '&:hover': { background: 'rgba(14,17,22,0.04)' },
};

function Card({ children, sx }: { children: ReactNode; sx?: object }) {
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
      sx={{ bgcolor: s.bg, color: s.c, fontWeight: 700, border: 'none', borderRadius: '999px' }}
    />
  );
}

function PreviewFrame({ html, height = 460 }: { html: string; height?: number }) {
  return (
    <Box
      component="iframe"
      title="preview"
      srcDoc={html}
      sx={{
        width: '100%',
        height,
        border: `1px solid ${LINE}`,
        borderRadius: '14px',
        bgcolor: '#fff',
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Campaigns tab                                                              */
/* -------------------------------------------------------------------------- */

function CampaignAnalyticsPanel({
  campaign,
  onClose,
  onToast,
}: {
  campaign: Campaign;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const [data, setData] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<CampaignAnalytics>(`/email/campaigns/${campaign.id}/analytics`, { workspace: true })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) onToast(e instanceof ApiError ? e.message : 'Failed to load analytics');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [campaign.id, onToast]);

  const series = useMemo(() => {
    if (!data) return [] as { date: string; opens: number; clicks: number }[];
    const map = new Map<string, { date: string; opens: number; clicks: number }>();
    for (const p of data.opens_over_time) {
      map.set(p.date, { date: p.date, opens: p.count, clicks: 0 });
    }
    for (const p of data.clicks_over_time) {
      const cur = map.get(p.date) || { date: p.date, opens: 0, clicks: 0 };
      cur.clicks = p.count;
      map.set(p.date, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  return (
    <PremiumDialog open onClose={onClose} maxWidth="md" accent={BRAND.gradient}>
      <DialogHero
        icon={<InsightsRoundedIcon />}
        title={campaign.name}
        subtitle={campaign.subject}
        onClose={onClose}
        tint={BRAND.tealDeep}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        {loading ? (
          <Stack alignItems="center" py={5}>
            <CircularProgress />
          </Stack>
        ) : !data ? (
          <Typography sx={{ color: SUBTLE }}>No analytics available.</Typography>
        ) : (
          <Stack gap={2.5}>
            <Stack direction="row" gap={1.5} flexWrap="wrap">
              {[
                { label: 'Delivered', value: String(data.delivered), c: INK },
                { label: 'Opens', value: String(data.opens), c: BRAND.tealDeep },
                { label: 'Clicks', value: String(data.clicks), c: BRAND.amberDeep },
                { label: 'Open rate', value: `${data.open_rate}%`, c: BRAND.tealDeep },
                { label: 'Click rate', value: `${data.click_rate}%`, c: BRAND.amberDeep },
                { label: 'Bounce rate', value: `${data.bounce_rate}%`, c: BRAND.pink },
              ].map((m) => (
                <Box key={m.label} sx={{ flex: '1 1 130px', minWidth: 110 }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: SUBTLE }}>
                    {m.label}
                  </Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, color: m.c }}>
                    {m.value}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Box>
              <SectionLabel>Engagement over time</SectionLabel>
              <Box sx={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: SUBTLE }} />
                    <YAxis tick={{ fontSize: 11, fill: SUBTLE }} allowDecimals={false} />
                    <RTooltip />
                    <Line
                      type="monotone"
                      dataKey="opens"
                      stroke={BRAND.tealDeep}
                      strokeWidth={2.5}
                      dot={false}
                      name="Opens"
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      stroke={BRAND.amberDeep}
                      strokeWidth={2.5}
                      dot={false}
                      name="Clicks"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {data.link_clicks.length > 0 && (
              <Box>
                <SectionLabel>Top links</SectionLabel>
                <Stack gap={0.75}>
                  {data.link_clicks.slice(0, 6).map((lk) => (
                    <Stack
                      key={lk.url}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ py: 0.75, borderBottom: `1px solid ${LINE}` }}
                    >
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: INK,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 420,
                        }}
                      >
                        {lk.url}
                      </Typography>
                      <Chip
                        label={`${lk.count} clicks`}
                        size="small"
                        sx={{
                          bgcolor: BRAND.amberSoft,
                          color: BRAND.amberDeep,
                          fontWeight: 700,
                          borderRadius: '999px',
                        }}
                      />
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            {data.variant_comparison.length > 1 && (
              <Box>
                <SectionLabel>A/B variant comparison</SectionLabel>
                <Stack direction="row" gap={2} flexWrap="wrap">
                  {data.variant_comparison.map((v, i) => (
                    <Card key={v.key || i} sx={{ flex: '1 1 200px', p: 2 }}>
                      <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>
                        {v.subject || `Variant ${v.key || i + 1}`}
                      </Typography>
                      <Stack direction="row" gap={2} mt={1}>
                        <Box>
                          <Typography sx={{ fontSize: 11, color: SUBTLE }}>Open</Typography>
                          <Typography sx={{ fontWeight: 800, color: BRAND.tealDeep }}>
                            {v.open_rate ?? 0}%
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 11, color: SUBTLE }}>Click</Typography>
                          <Typography sx={{ fontWeight: 800, color: BRAND.amberDeep }}>
                            {v.click_rate ?? 0}%
                          </Typography>
                        </Box>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </DialogBody>
      <DialogFooter>
        <Button sx={ghostButton} onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

interface ABResults {
  enabled: boolean;
  variants: { key: string; subject: string }[];
  decided_variant: string | null;
  holdout_pct: number;
  winner_metric: string;
  variant_stats: {
    key: string;
    subject: string;
    sent: number;
    opens: number;
    clicks: number;
    open_rate: number;
    click_rate: number;
  }[];
}

function ABResultsPanel({
  campaign,
  onClose,
  onToast,
}: {
  campaign: Campaign;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const [data, setData] = useState<ABResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api<ABResults>(`/email/campaigns/${campaign.id}/ab-results`, { workspace: true })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) onToast(e instanceof ApiError ? e.message : 'Failed to load A/B results'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [campaign.id, onToast]);

  return (
    <PremiumDialog open onClose={onClose} maxWidth="sm" accent={BRAND.gradient}>
      <DialogHero
        icon={<InsightsRoundedIcon />}
        title={`A/B results: ${campaign.name}`}
        subtitle={`Winner by ${data?.winner_metric || 'opens'}, ${data?.holdout_pct || 0}% holdout`}
        onClose={onClose}
        tint={BRAND.amberDeep}
        tintSoft={BRAND.amberSoft}
      />
      <DialogBody>
        {loading ? (
          <Stack alignItems="center" py={5}><CircularProgress /></Stack>
        ) : !data || !data.enabled ? (
          <Typography sx={{ color: SUBTLE }}>A/B testing was not enabled for this campaign.</Typography>
        ) : data.variant_stats.length === 0 ? (
          <Typography sx={{ color: SUBTLE }}>No variant data yet -- results appear after sends begin.</Typography>
        ) : (
          <Stack gap={2}>
            {data.decided_variant && (
              <Alert severity="success" sx={{ borderRadius: '12px' }}>
                Winner: Variant {data.decided_variant}
              </Alert>
            )}
            <Stack direction="row" gap={2} flexWrap="wrap">
              {data.variant_stats.map((v) => (
                <Card key={v.key} sx={{ flex: '1 1 200px', p: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13.5 }}>
                    {v.subject || `Variant ${v.key}`}
                  </Typography>
                  <Stack direction="row" gap={2} mt={1}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: SUBTLE }}>Sent</Typography>
                      <Typography sx={{ fontWeight: 800, color: INK }}>{v.sent}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: SUBTLE }}>Open rate</Typography>
                      <Typography sx={{ fontWeight: 800, color: BRAND.tealDeep }}>{v.open_rate}%</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: SUBTLE }}>Click rate</Typography>
                      <Typography sx={{ fontWeight: 800, color: BRAND.amberDeep }}>{v.click_rate}%</Typography>
                    </Box>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        )}
      </DialogBody>
      <DialogFooter>
        <Button sx={ghostButton} onClick={onClose}>Close</Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function CampaignsTab({
  campaigns,
  onRefresh,
  onToast,
  onNew,
}: {
  campaigns: Campaign[];
  onRefresh: () => void;
  onToast: (m: string) => void;
  onNew: () => void;
}) {
  const [analytics, setAnalytics] = useState<Campaign | null>(null);
  const [abResults, setAbResults] = useState<Campaign | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const send = async (c: Campaign) => {
    setSending(c.id);
    try {
      await api(`/email/campaigns/${c.id}/send`, { method: 'POST', workspace: true });
      onToast(`Queued "${c.name}" for sending`);
      onRefresh();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to send campaign');
    } finally {
      setSending(null);
    }
  };

  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      {campaigns.length === 0 ? (
        <Stack alignItems="center" gap={1.5} sx={{ p: 5, textAlign: 'center' }}>
          <Typography sx={{ color: SUBTLE }}>No campaigns yet.</Typography>
          <Button startIcon={<AddIcon />} sx={inkButton} onClick={onNew}>
            Create your first campaign
          </Button>
        </Stack>
      ) : (
        <Box>
          <Stack
            direction="row"
            sx={{
              px: 3,
              py: 1.5,
              borderBottom: `1px solid ${LINE}`,
              color: SUBTLE,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            <Box sx={{ flex: 2 }}>Campaign</Box>
            <Box sx={{ flex: 2 }}>Subject</Box>
            <Box sx={{ flex: 1 }}>Sent</Box>
            <Box sx={{ flex: 1 }}>Open</Box>
            <Box sx={{ flex: 1 }}>Click</Box>
            <Box sx={{ flex: 1.4, textAlign: 'right' }}>Status</Box>
            <Box sx={{ flex: 1.4, textAlign: 'right' }}>Actions</Box>
          </Stack>
          {campaigns.map((c) => {
            const isSent = c.status === 'sent';
            const canSend = c.status === 'draft' || c.status === 'scheduled';
            return (
              <Stack
                key={c.id}
                direction="row"
                alignItems="center"
                sx={{
                  px: 3,
                  py: 1.75,
                  borderBottom: `1px solid ${LINE}`,
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Box sx={{ flex: 2, fontWeight: 700, color: INK }}>{c.name}</Box>
                <Box sx={{ flex: 2, color: SUBTLE, fontSize: 13 }}>{c.subject || '—'}</Box>
                <Box sx={{ flex: 1 }}>{c.stats?.sent ?? 0}</Box>
                <Box sx={{ flex: 1, color: BRAND.tealDeep, fontWeight: 600 }}>
                  {c.stats?.sent ? `${c.stats.open_rate ?? 0}%` : '—'}
                </Box>
                <Box sx={{ flex: 1, color: BRAND.amberDeep, fontWeight: 600 }}>
                  {c.stats?.sent ? `${c.stats.click_rate ?? 0}%` : '—'}
                </Box>
                <Box sx={{ flex: 1.4, textAlign: 'right' }}>
                  <Stack direction="row" gap={0.5} justifyContent="flex-end" alignItems="center">
                    {c.ab_test?.enabled && (
                      <Chip
                        label="A/B"
                        size="small"
                        sx={{
                          bgcolor: BRAND.amberSoft,
                          color: BRAND.amberDeep,
                          fontWeight: 700,
                          borderRadius: '999px',
                          height: 22,
                          fontSize: 11,
                        }}
                      />
                    )}
                    <StatusChip status={c.status} />
                  </Stack>
                </Box>
                <Box sx={{ flex: 1.4, textAlign: 'right' }}>
                  <Stack direction="row" gap={0.5} justifyContent="flex-end">
                    {canSend && (
                      <MuiTooltip title="Send now">
                        <span>
                          <IconButton
                            size="small"
                            disabled={sending === c.id}
                            onClick={() => send(c)}
                            sx={{ color: BRAND.tealDeep }}
                          >
                            {sending === c.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <SendRoundedIcon sx={{ fontSize: 18 }} />
                            )}
                          </IconButton>
                        </span>
                      </MuiTooltip>
                    )}
                    {isSent && (
                      <MuiTooltip title="Rendered preview">
                        <IconButton
                          size="small"
                          onClick={async () => {
                            try {
                              const res = await api<{ html: string }>(`/email/campaigns/${c.id}/render`, { workspace: true });
                              const w = window.open('', '_blank', 'width=700,height=600');
                              if (w) { w.document.write(res.html); w.document.close(); }
                            } catch (e) {
                              onToast(e instanceof ApiError ? e.message : 'Preview not available');
                            }
                          }}
                          sx={{ color: SUBTLE }}
                        >
                          <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </MuiTooltip>
                    )}
                    {isSent && (
                      <MuiTooltip title="View analytics">
                        <IconButton
                          size="small"
                          onClick={() => setAnalytics(c)}
                          sx={{ color: INK }}
                        >
                          <InsightsRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </MuiTooltip>
                    )}
                    {c.ab_test?.enabled && (
                      <MuiTooltip title="A/B results">
                        <IconButton
                          size="small"
                          onClick={() => setAbResults(c)}
                          sx={{ color: BRAND.amberDeep }}
                        >
                          <InsightsRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </MuiTooltip>
                    )}
                  </Stack>
                </Box>
              </Stack>
            );
          })}
        </Box>
      )}
      {abResults && (
        <ABResultsPanel
          campaign={abResults}
          onClose={() => setAbResults(null)}
          onToast={onToast}
        />
      )}
      {analytics && (
        <CampaignAnalyticsPanel
          campaign={analytics}
          onClose={() => setAnalytics(null)}
          onToast={onToast}
        />
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Templates tab                                                              */
/* -------------------------------------------------------------------------- */

function TemplatePreviewDialog({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const html = useMemo(() => rawBlocksToHtml(template.body_blocks), [template.body_blocks]);
  return (
    <PremiumDialog open onClose={onClose} maxWidth="sm" accent={BRAND.gradient}>
      <DialogHero
        icon={<DescriptionRoundedIcon />}
        title={template.name}
        subtitle={template.subject}
        onClose={onClose}
        tint={BRAND.amberDeep}
        tintSoft={BRAND.amberSoft}
      />
      <DialogBody>
        <PreviewFrame html={html} />
      </DialogBody>
      <DialogFooter>
        <Button sx={ghostButton} onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function TemplateEditorDialog({
  template,
  onClose,
  onSaved,
  onToast,
}: {
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
  onToast: (m: string) => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [preheader, setPreheader] = useState(template?.preheader ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [category, setCategory] = useState(template?.category ?? 'general');
  const [blocks, setBlocks] = useState<Block[]>(() =>
    template?.body_blocks
      ? blocksFromRaw(template.body_blocks)
      : [makeBlock('heading'), makeBlock('text')],
  );
  const [saving, setSaving] = useState(false);
  const isEdit = !!template;

  const save = async () => {
    if (!name.trim()) {
      onToast('Template name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        preheader: preheader.trim() || null,
        description: description.trim() || null,
        category: category.trim() || null,
        body_blocks: blocksToRaw(blocks),
      };
      if (isEdit && template) {
        await api(`/email/templates/${template.id}`, {
          method: 'PUT',
          body: payload,
          workspace: true,
        });
      } else {
        await api('/email/templates', { method: 'POST', body: payload, workspace: true });
      }
      onToast(isEdit ? 'Template updated' : 'Template created');
      onSaved();
      onClose();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumDialog open onClose={onClose} maxWidth="lg" accent={BRAND.gradient}>
      <DialogHero
        icon={<DescriptionRoundedIcon />}
        title={isEdit ? 'Edit template' : 'New template'}
        subtitle="Design a reusable email layout"
        onClose={onClose}
        tint={BRAND.amberDeep}
        tintSoft={BRAND.amberSoft}
      />
      <DialogBody>
        <Stack gap={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField
              label="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              size="small"
              select
              sx={{ minWidth: 180 }}
            >
              {['general', 'newsletter', 'promotional', 'transactional', 'onboarding'].map((c) => (
                <MenuItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField
              label="Subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Preheader"
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              fullWidth
              size="small"
            />
          </Stack>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            size="small"
          />
          <Divider />
          <SectionLabel>Content blocks</SectionLabel>
          <BlockEditor blocks={blocks} onChange={setBlocks} />
        </Stack>
      </DialogBody>
      <DialogFooter>
        <Button sx={ghostButton} onClick={onClose}>
          Cancel
        </Button>
        <Button sx={inkButton} onClick={save} disabled={saving}>
          {saving ? (
            <CircularProgress size={18} sx={{ color: '#fff' }} />
          ) : isEdit ? (
            'Save changes'
          ) : (
            'Create template'
          )}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function TemplatesTab({
  templates,
  onRefresh,
  onToast,
  onUsed,
}: {
  templates: Template[];
  onRefresh: () => void;
  onToast: (m: string) => void;
  onUsed: () => void;
}) {
  const [preview, setPreview] = useState<Template | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; template: Template | null }>({
    open: false,
    template: null,
  });
  const [busy, setBusy] = useState<string | null>(null);

  const use = async (t: Template) => {
    setBusy(t.id);
    try {
      await api(`/email/templates/${t.id}/use`, { method: 'POST', workspace: true });
      onToast(`Created campaign from "${t.name}"`);
      onUsed();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to use template');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (t: Template) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete template "${t.name}"?`)) return;
    try {
      await api(`/email/templates/${t.id}`, { method: 'DELETE', workspace: true });
      onToast('Template deleted');
      onRefresh();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to delete template');
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button
          startIcon={<AddIcon />}
          sx={inkButton}
          onClick={() => setEditor({ open: true, template: null })}
        >
          New template
        </Button>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
        }}
      >
        {templates.map((t) => (
          <Card key={t.id} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Typography sx={{ fontWeight: 800, color: INK, fontSize: 15.5 }}>{t.name}</Typography>
              {t.is_starter && (
                <Chip
                  label="Starter"
                  size="small"
                  sx={{
                    bgcolor: BRAND.tealSoft,
                    color: BRAND.tealDeep,
                    fontWeight: 700,
                    borderRadius: '999px',
                    height: 22,
                    fontSize: 11,
                  }}
                />
              )}
            </Stack>
            <Typography sx={{ color: SUBTLE, fontSize: 13 }}>{t.subject}</Typography>
            {t.description && (
              <Typography sx={{ color: SUBTLE, fontSize: 12.5, opacity: 0.85 }}>
                {t.description}
              </Typography>
            )}
            {t.category && (
              <Chip
                label={t.category}
                size="small"
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: 'rgba(14,17,22,0.05)',
                  color: SUBTLE,
                  fontWeight: 600,
                  borderRadius: '999px',
                  height: 22,
                  fontSize: 11,
                }}
              />
            )}
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" gap={0.5} flexWrap="wrap">
              <Button
                size="small"
                startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ ...ghostButton, px: 1.5 }}
                onClick={() => setPreview(t)}
              >
                Preview
              </Button>
              <Button
                size="small"
                sx={{ ...inkButton, px: 1.5 }}
                disabled={busy === t.id}
                onClick={() => use(t)}
              >
                {busy === t.id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Use'}
              </Button>
              {!t.is_starter && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => setEditor({ open: true, template: t })}
                    sx={{ color: INK }}
                  >
                    <EditRoundedIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => remove(t)} sx={{ color: BRAND.pink }}>
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </>
              )}
            </Stack>
          </Card>
        ))}
      </Box>
      {preview && <TemplatePreviewDialog template={preview} onClose={() => setPreview(null)} />}
      {editor.open && (
        <TemplateEditorDialog
          template={editor.template}
          onClose={() => setEditor({ open: false, template: null })}
          onSaved={onRefresh}
          onToast={onToast}
        />
      )}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Lists tab                                                                  */
/* -------------------------------------------------------------------------- */

function CsvImportDialog({
  list,
  onClose,
  onImported,
  onToast,
}: {
  list: EmailList;
  onClose: () => void;
  onImported: () => void;
  onToast: (m: string) => void;
}) {
  const [raw, setRaw] = useState('');
  const [doubleOptIn, setDoubleOptIn] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo(() => (raw.trim() ? csvToSubscribers(raw) : null), [raw]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const doImport = async () => {
    if (!parsed || parsed.rows.length === 0) {
      onToast('No valid rows to import');
      return;
    }
    setImporting(true);
    try {
      const rows = parsed.rows.map((r: ParsedSubscriber) => ({
        email: r.email,
        name: r.name ?? null,
        tags: r.tags ?? [],
        attributes: r.attributes ?? {},
      }));
      const res = await api<{ imported: number }>(`/email/lists/${list.id}/import`, {
        method: 'POST',
        body: { rows, double_opt_in: doubleOptIn },
        workspace: true,
      });
      onToast(`Imported ${res.imported} subscriber${res.imported === 1 ? '' : 's'}`);
      onImported();
      onClose();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to import subscribers');
    } finally {
      setImporting(false);
    }
  };

  return (
    <PremiumDialog open onClose={onClose} maxWidth="md" accent={BRAND.gradient}>
      <DialogHero
        icon={<UploadFileRoundedIcon />}
        title={`Import to ${list.name}`}
        subtitle="Paste CSV or upload a file — email column required"
        onClose={onClose}
        tint={BRAND.tealDeep}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        <Stack gap={2}>
          <Stack direction="row" gap={1}>
            <Button
              startIcon={<UploadFileRoundedIcon />}
              sx={ghostButton}
              onClick={() => fileRef.current?.click()}
            >
              Upload CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          </Stack>
          <TextField
            label="CSV content"
            placeholder={'email,name,tags\njane@acme.com,Jane,vip;lead'}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            multiline
            minRows={6}
            fullWidth
          />
          {parsed && (
            <Alert
              severity={parsed.rows.length ? 'success' : 'warning'}
              sx={{ borderRadius: '12px' }}
            >
              {parsed.rows.length} valid row{parsed.rows.length === 1 ? '' : 's'}
              {parsed.skipped > 0 ? ` · ${parsed.skipped} skipped` : ''}
              {parsed.headers.length > 0 ? ` · columns: ${parsed.headers.join(', ')}` : ''}
            </Alert>
          )}
          {parsed && parsed.rows.length > 0 && (
            <Box sx={{ border: `1px solid ${LINE}`, borderRadius: '12px', overflow: 'hidden' }}>
              {parsed.rows.slice(0, 5).map((r, i) => (
                <Stack
                  key={`${r.email}-${i}`}
                  direction="row"
                  sx={{ px: 2, py: 1, borderBottom: `1px solid ${LINE}`, fontSize: 13 }}
                >
                  <Box sx={{ flex: 2, fontWeight: 600, color: INK }}>{r.email}</Box>
                  <Box sx={{ flex: 1, color: SUBTLE }}>{r.name || '—'}</Box>
                  <Box sx={{ flex: 1.5, color: SUBTLE }}>{(r.tags || []).join(', ') || '—'}</Box>
                </Stack>
              ))}
            </Box>
          )}
          <Stack direction="row" alignItems="center" gap={1}>
            <Switch checked={doubleOptIn} onChange={(e) => setDoubleOptIn(e.target.checked)} />
            <Typography sx={{ fontSize: 13.5, color: INK }}>
              Require double opt-in confirmation
            </Typography>
          </Stack>
        </Stack>
      </DialogBody>
      <DialogFooter hint={parsed ? `${parsed.rows.length} ready` : undefined}>
        <Button sx={ghostButton} onClick={onClose}>
          Cancel
        </Button>
        <Button
          sx={inkButton}
          onClick={doImport}
          disabled={importing || !parsed || parsed.rows.length === 0}
        >
          {importing ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Import'}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function SubscriberManager({
  list,
  onClose,
  onToast,
}: {
  list: EmailList;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api<Subscriber[]>(`/email/lists/${list.id}/subscribers`, { workspace: true })
      .then(setSubs)
      .catch((e) => onToast(e instanceof ApiError ? e.message : 'Failed to load subscribers'))
      .finally(() => setLoading(false));
  }, [list.id, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.tags || []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [subs, query]);

  const removeSub = async (s: Subscriber) => {
    if (typeof window !== 'undefined' && !window.confirm(`Remove ${s.email}?`)) return;
    try {
      await api(`/email/lists/${list.id}/subscribers/${s.id}`, {
        method: 'DELETE',
        workspace: true,
      });
      onToast('Subscriber removed');
      load();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to remove subscriber');
    }
  };

  const engagement = (s: Subscriber, key: 'opens' | 'clicks') => {
    const v = s.attributes?.[key];
    return typeof v === 'number' ? String(v) : '—';
  };

  return (
    <PremiumDialog open onClose={onClose} maxWidth="md" accent={BRAND.gradient}>
      <DialogHero
        icon={<GroupsRoundedIcon />}
        title={list.name}
        subtitle={`${subs.length} subscriber${subs.length === 1 ? '' : 's'}`}
        onClose={onClose}
        tint={BRAND.tealDeep}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        <TextField
          placeholder="Search by email, name or tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        />
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress />
          </Stack>
        ) : filtered.length === 0 ? (
          <Typography sx={{ color: SUBTLE }}>No subscribers found.</Typography>
        ) : (
          <Box sx={{ border: `1px solid ${LINE}`, borderRadius: '12px', overflow: 'hidden' }}>
            <Stack
              direction="row"
              sx={{
                px: 2,
                py: 1,
                borderBottom: `1px solid ${LINE}`,
                color: SUBTLE,
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              <Box sx={{ flex: 2 }}>Email</Box>
              <Box sx={{ flex: 1 }}>Name</Box>
              <Box sx={{ flex: 1 }}>Status</Box>
              <Box sx={{ flex: 0.7 }}>Opens</Box>
              <Box sx={{ flex: 0.7 }}>Clicks</Box>
              <Box sx={{ flex: 0.6, textAlign: 'right' }} />
            </Stack>
            {filtered.slice(0, 200).map((s) => (
              <Stack
                key={s.id}
                direction="row"
                alignItems="center"
                sx={{
                  px: 2,
                  py: 1,
                  borderBottom: `1px solid ${LINE}`,
                  fontSize: 13,
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Box sx={{ flex: 2, fontWeight: 600, color: INK }}>{s.email}</Box>
                <Box sx={{ flex: 1, color: SUBTLE }}>{s.name || '—'}</Box>
                <Box sx={{ flex: 1 }}>
                  <Chip
                    label={s.status}
                    size="small"
                    sx={{
                      bgcolor: s.status === 'subscribed' ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                      color: s.status === 'subscribed' ? BRAND.tealDeep : SUBTLE,
                      fontWeight: 700,
                      borderRadius: '999px',
                      height: 20,
                      fontSize: 11,
                    }}
                  />
                </Box>
                <Box sx={{ flex: 0.7, color: SUBTLE }}>{engagement(s, 'opens')}</Box>
                <Box sx={{ flex: 0.7, color: SUBTLE }}>{engagement(s, 'clicks')}</Box>
                <Box sx={{ flex: 0.6, textAlign: 'right' }}>
                  <IconButton size="small" onClick={() => removeSub(s)} sx={{ color: BRAND.pink }}>
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Stack>
            ))}
          </Box>
        )}
      </DialogBody>
      <DialogFooter>
        <Button sx={ghostButton} onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function ListsTab({
  lists,
  onRefresh,
  onToast,
}: {
  lists: EmailList[];
  onRefresh: () => void;
  onToast: (m: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [manage, setManage] = useState<EmailList | null>(null);
  const [importTo, setImportTo] = useState<EmailList | null>(null);

  const create = async () => {
    if (!newName.trim()) {
      onToast('List name is required');
      return;
    }
    try {
      await api('/email/lists', {
        method: 'POST',
        body: { name: newName.trim(), description: newDesc.trim() || null },
        workspace: true,
      });
      onToast('List created');
      setNewName('');
      setNewDesc('');
      setCreating(false);
      onRefresh();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to create list');
    }
  };

  const remove = async (l: EmailList) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete list "${l.name}"?`)) return;
    try {
      await api(`/email/lists/${l.id}`, { method: 'DELETE', workspace: true });
      onToast('List deleted');
      onRefresh();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to delete list');
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button startIcon={<AddIcon />} sx={inkButton} onClick={() => setCreating((v) => !v)}>
          New list
        </Button>
      </Stack>
      {creating && (
        <Card sx={{ mb: 2 }}>
          <Stack gap={1.5}>
            <TextField
              label="List name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              size="small"
              fullWidth
            />
            <Stack direction="row" gap={1} justifyContent="flex-end">
              <Button sx={ghostButton} onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button sx={inkButton} onClick={create}>
                Create
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
        }}
      >
        {lists.map((l) => (
          <Card key={l.id} sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Typography sx={{ fontWeight: 800, color: INK, fontSize: 15.5 }}>{l.name}</Typography>
              <IconButton size="small" onClick={() => remove(l)} sx={{ color: BRAND.pink }}>
                <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Stack>
            {l.description && (
              <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.5 }}>{l.description}</Typography>
            )}
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" gap={0.75}>
              <Button
                size="small"
                startIcon={<GroupsRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ ...ghostButton, px: 1.5 }}
                onClick={() => setManage(l)}
              >
                Subscribers
              </Button>
              <Button
                size="small"
                startIcon={<UploadFileRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ ...inkButton, px: 1.5 }}
                onClick={() => setImportTo(l)}
              >
                Import
              </Button>
            </Stack>
          </Card>
        ))}
      </Box>
      {manage && (
        <SubscriberManager list={manage} onClose={() => setManage(null)} onToast={onToast} />
      )}
      {importTo && (
        <CsvImportDialog
          list={importTo}
          onClose={() => setImportTo(null)}
          onImported={onRefresh}
          onToast={onToast}
        />
      )}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Segments tab                                                               */
/* -------------------------------------------------------------------------- */

const SEG_FIELDS: { value: string; label: string; op: string; needsKey?: boolean }[] = [
  { value: 'status', label: 'Status', op: 'equals' },
  { value: 'tag', label: 'Has tag', op: 'contains' },
  { value: 'attribute', label: 'Attribute', op: 'equals', needsKey: true },
  { value: 'opened', label: 'Opened (last N days)', op: 'in_last_days' },
  { value: 'clicked', label: 'Clicked (last N days)', op: 'in_last_days' },
  { value: 'not_opened', label: 'Not opened (last N days)', op: 'in_last_days' },
];

function SegmentCountChip({ segmentId, onToast }: { segmentId: string; onToast: (m: string) => void }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    api<SegmentPreview>(`/email/segments/${segmentId}/preview`, { workspace: true })
      .then((p) => {
        if (alive) setCount(p.count);
      })
      .catch((e) => {
        if (alive) onToast(e instanceof ApiError ? e.message : 'Failed to preview segment');
      });
    return () => {
      alive = false;
    };
  }, [segmentId, onToast]);

  return (
    <Chip
      label={count === null ? '…' : `${count} match${count === 1 ? '' : 'es'}`}
      size="small"
      sx={{
        bgcolor: BRAND.tealSoft,
        color: BRAND.tealDeep,
        fontWeight: 700,
        borderRadius: '999px',
      }}
    />
  );
}

function SegmentEditor({
  segment,
  lists,
  onClose,
  onSaved,
  onToast,
}: {
  segment: Segment | null;
  lists: EmailList[];
  onClose: () => void;
  onSaved: () => void;
  onToast: (m: string) => void;
}) {
  const [name, setName] = useState(segment?.name ?? '');
  const [listId, setListId] = useState<string>(segment?.list_id ?? '');
  const [match, setMatch] = useState<'all' | 'any'>(
    segment?.rules?.match === 'any' ? 'any' : 'all',
  );
  const [conditions, setConditions] = useState<SegCondition[]>(
    segment?.rules?.conditions && segment.rules.conditions.length
      ? segment.rules.conditions
      : [{ field: 'status', op: 'equals', value: 'subscribed' }],
  );
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const isEdit = !!segment;

  const updateCond = (i: number, patch: Partial<SegCondition>) => {
    setConditions((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };
  const setField = (i: number, field: string) => {
    const meta = SEG_FIELDS.find((f) => f.value === field);
    updateCond(i, { field, op: meta?.op ?? 'equals', key: meta?.needsKey ? '' : undefined });
  };
  const addCond = () =>
    setConditions((cs) => [...cs, { field: 'tag', op: 'contains', value: '' }]);
  const removeCond = (i: number) => setConditions((cs) => cs.filter((_, idx) => idx !== i));

  const rules = useMemo(
    () => ({ match, conditions: conditions.filter((c) => c.value.trim() !== '') }),
    [match, conditions],
  );

  const runPreview = async () => {
    if (!isEdit || !segment) {
      onToast('Save the segment first to preview live counts');
      return;
    }
    setPreviewing(true);
    try {
      const p = await api<SegmentPreview>(`/email/segments/${segment.id}/preview`, {
        workspace: true,
      });
      setPreview(p);
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to preview segment');
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      onToast('Segment name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), list_id: listId || null, rules };
      if (isEdit && segment) {
        await api(`/email/segments/${segment.id}`, {
          method: 'PUT',
          body: payload,
          workspace: true,
        });
      } else {
        await api('/email/segments', { method: 'POST', body: payload, workspace: true });
      }
      onToast(isEdit ? 'Segment updated' : 'Segment created');
      onSaved();
      onClose();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to save segment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumDialog open onClose={onClose} maxWidth="md" accent={BRAND.gradient}>
      <DialogHero
        icon={<FilterAltRoundedIcon />}
        title={isEdit ? 'Edit segment' : 'New segment'}
        subtitle="Target subscribers with dynamic rules"
        onClose={onClose}
        tint={BRAND.tealDeep}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        <Stack gap={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField
              label="Segment name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="List (optional)"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              select
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All lists</MenuItem>
              {lists.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction="row" alignItems="center" gap={1}>
            <Typography sx={{ fontSize: 13.5, color: SUBTLE, fontWeight: 600 }}>Match</Typography>
            <ToggleButtonGroup
              value={match}
              exclusive
              size="small"
              onChange={(_, v: 'all' | 'any' | null) => {
                if (v) setMatch(v);
              }}
            >
              <ToggleButton value="all" sx={{ textTransform: 'none', fontWeight: 700 }}>
                All
              </ToggleButton>
              <ToggleButton value="any" sx={{ textTransform: 'none', fontWeight: 700 }}>
                Any
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography sx={{ fontSize: 13.5, color: SUBTLE }}>of the conditions</Typography>
          </Stack>

          <Stack gap={1.25}>
            {conditions.map((c, i) => {
              const meta = SEG_FIELDS.find((f) => f.value === c.field);
              return (
                <Stack
                  key={i}
                  direction={{ xs: 'column', sm: 'row' }}
                  gap={1}
                  alignItems={{ sm: 'center' }}
                  sx={{ p: 1.25, border: `1px solid ${LINE}`, borderRadius: '12px' }}
                >
                  <TextField
                    value={c.field}
                    onChange={(e) => setField(i, e.target.value)}
                    select
                    size="small"
                    sx={{ minWidth: 190 }}
                  >
                    {SEG_FIELDS.map((f) => (
                      <MenuItem key={f.value} value={f.value}>
                        {f.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {meta?.needsKey && (
                    <TextField
                      placeholder="attribute key"
                      value={c.key ?? ''}
                      onChange={(e) => updateCond(i, { key: e.target.value })}
                      size="small"
                      sx={{ minWidth: 150 }}
                    />
                  )}
                  <TextField
                    placeholder={meta?.op === 'in_last_days' ? 'days (e.g. 30)' : 'value'}
                    value={c.value}
                    onChange={(e) => updateCond(i, { value: e.target.value })}
                    size="small"
                    fullWidth
                  />
                  <IconButton size="small" onClick={() => removeCond(i)} sx={{ color: BRAND.pink }}>
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Stack>
              );
            })}
            <Button startIcon={<AddIcon />} sx={{ ...ghostButton, alignSelf: 'flex-start' }} onClick={addCond}>
              Add condition
            </Button>
          </Stack>

          {preview && (
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              {preview.count} subscriber{preview.count === 1 ? '' : 's'} match this segment
              {preview.sample.length > 0
                ? ` — e.g. ${preview.sample.slice(0, 3).map((s) => s.email).join(', ')}`
                : ''}
            </Alert>
          )}
        </Stack>
      </DialogBody>
      <DialogFooter>
        <Button sx={ghostButton} onClick={onClose}>
          Cancel
        </Button>
        {isEdit && (
          <Button sx={ghostButton} onClick={runPreview} disabled={previewing}>
            {previewing ? <CircularProgress size={16} /> : 'Preview'}
          </Button>
        )}
        <Button sx={inkButton} onClick={save} disabled={saving}>
          {saving ? (
            <CircularProgress size={18} sx={{ color: '#fff' }} />
          ) : isEdit ? (
            'Save changes'
          ) : (
            'Create segment'
          )}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function SegmentsTab({
  segments,
  lists,
  onRefresh,
  onToast,
}: {
  segments: Segment[];
  lists: EmailList[];
  onRefresh: () => void;
  onToast: (m: string) => void;
}) {
  const [editor, setEditor] = useState<{ open: boolean; segment: Segment | null }>({
    open: false,
    segment: null,
  });

  const remove = async (s: Segment) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete segment "${s.name}"?`)) return;
    try {
      await api(`/email/segments/${s.id}`, { method: 'DELETE', workspace: true });
      onToast('Segment deleted');
      onRefresh();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to delete segment');
    }
  };

  const listName = (id?: string | null) => lists.find((l) => l.id === id)?.name ?? 'All lists';

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button
          startIcon={<AddIcon />}
          sx={inkButton}
          onClick={() => setEditor({ open: true, segment: null })}
        >
          New segment
        </Button>
      </Stack>
      {segments.length === 0 ? (
        <Card>
          <Typography sx={{ color: SUBTLE }}>
            No segments yet. Create one to target subscribers dynamically.
          </Typography>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
          }}
        >
          {segments.map((s) => (
            <Card key={s.id} sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography sx={{ fontWeight: 800, color: INK, fontSize: 15.5 }}>{s.name}</Typography>
                <SegmentCountChip segmentId={s.id} onToast={onToast} />
              </Stack>
              <Typography sx={{ color: SUBTLE, fontSize: 12.5, mt: 0.5 }}>
                {listName(s.list_id)} ·{' '}
                {s.rules?.match === 'any' ? 'Any' : 'All'} of {s.rules?.conditions?.length ?? 0}{' '}
                condition{(s.rules?.conditions?.length ?? 0) === 1 ? '' : 's'}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" gap={0.5}>
                <Button
                  size="small"
                  startIcon={<EditRoundedIcon sx={{ fontSize: 16 }} />}
                  sx={{ ...ghostButton, px: 1.5 }}
                  onClick={() => setEditor({ open: true, segment: s })}
                >
                  Edit
                </Button>
                <IconButton size="small" onClick={() => remove(s)} sx={{ color: BRAND.pink }}>
                  <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Stack>
            </Card>
          ))}
        </Box>
      )}
      {editor.open && (
        <SegmentEditor
          segment={editor.segment}
          lists={lists}
          onClose={() => setEditor({ open: false, segment: null })}
          onSaved={onRefresh}
          onToast={onToast}
        />
      )}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Sequences tab                                                              */
/* -------------------------------------------------------------------------- */

interface LegacyStep {
  order?: number;
  delay_hours?: number;
  subject?: string;
  template?: string;
}

function SequenceProgressChip({ sequenceId }: { sequenceId: string }) {
  const [p, setP] = useState<SequenceProgress | null>(null);
  useEffect(() => {
    let alive = true;
    api<SequenceProgress>(`/email/sequences/${sequenceId}/progress`, { workspace: true })
      .then((d) => {
        if (alive) setP(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [sequenceId]);
  if (!p) return null;
  return (
    <Stack direction="row" gap={0.75} flexWrap="wrap">
      <Chip
        label={`${p.enrolled} active`}
        size="small"
        sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700, borderRadius: '999px', height: 22, fontSize: 11 }}
      />
      <Chip
        label={`${p.completed} done`}
        size="small"
        sx={{ bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, fontWeight: 700, borderRadius: '999px', height: 22, fontSize: 11 }}
      />
      <Chip
        label={`${p.total} total`}
        size="small"
        sx={{ bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE, fontWeight: 700, borderRadius: '999px', height: 22, fontSize: 11 }}
      />
    </Stack>
  );
}

interface SeqStepDraft {
  order: number;
  delay_hours: number;
  subject: string;
  template: string;
}

function SequenceBuilderDialog({
  lists,
  onClose,
  onCreated,
  onToast,
}: {
  lists: EmailList[];
  onClose: () => void;
  onCreated: () => void;
  onToast: (m: string) => void;
}) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('subscribe');
  const [listId, setListId] = useState('');
  const [steps, setSteps] = useState<SeqStepDraft[]>([{ order: 1, delay_hours: 0, subject: '', template: '' }]);
  const [saving, setSaving] = useState(false);

  const addStep = () => setSteps((s) => [...s, { order: s.length + 1, delay_hours: 24, subject: '', template: '' }]);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const patchStep = (i: number, p: Partial<SeqStepDraft>) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...p } : st)));

  const save = async () => {
    if (!name.trim()) { onToast('Sequence name is required'); return; }
    setSaving(true);
    try {
      await api('/email/sequences', {
        method: 'POST',
        body: {
          name: name.trim(),
          trigger,
          steps: steps.map((s, i) => ({ ...s, order: i + 1 })),
          list_id: listId || null,
          is_active: false,
          autonomy: 'suggest',
        },
        workspace: true,
      });
      onToast('Sequence created');
      onCreated();
      onClose();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Failed to create sequence');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumDialog open onClose={onClose} maxWidth="md">
      <DialogHero
        icon={<AccountTreeRoundedIcon />}
        title="New sequence"
        subtitle="Define steps with delays and email content"
        onClose={onClose}
        tint={BRAND.tealDeep}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        <Stack gap={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField label="Sequence name" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
            <TextField select label="Trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)} size="small" sx={{ minWidth: 160 }}>
              <MenuItem value="subscribe">On subscribe</MenuItem>
              <MenuItem value="tag_added">Tag added</MenuItem>
              <MenuItem value="manual">Manual enroll</MenuItem>
            </TextField>
            <TextField select label="List" value={listId} onChange={(e) => setListId(e.target.value)} size="small" sx={{ minWidth: 160 }}>
              <MenuItem value="">All lists</MenuItem>
              {lists.map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
            </TextField>
          </Stack>
          <SectionLabel>Steps</SectionLabel>
          {steps.map((st, i) => (
            <Box key={i} sx={{ p: 1.5, border: `1px solid ${LINE}`, borderRadius: '14px' }}>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: SUBTLE, minWidth: 50 }}>
                  Step {i + 1}
                </Typography>
                <TextField
                  label="Delay (hours)"
                  type="number"
                  value={st.delay_hours}
                  onChange={(e) => patchStep(i, { delay_hours: Number(e.target.value) || 0 })}
                  size="small"
                  sx={{ width: 110 }}
                />
                <TextField
                  label="Subject"
                  value={st.subject}
                  onChange={(e) => patchStep(i, { subject: e.target.value })}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Template / body"
                  value={st.template}
                  onChange={(e) => patchStep(i, { template: e.target.value })}
                  size="small"
                  fullWidth
                />
                {steps.length > 1 && (
                  <IconButton size="small" onClick={() => removeStep(i)} sx={{ color: BRAND.pink }}>
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                )}
              </Stack>
            </Box>
          ))}
          <Button onClick={addStep} sx={{ ...ghostButton, alignSelf: 'flex-start' }} startIcon={<AddIcon />}>
            Add step
          </Button>
        </Stack>
      </DialogBody>
      <DialogFooter>
        <Button sx={ghostButton} onClick={onClose}>Cancel</Button>
        <Button sx={inkButton} onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Create sequence'}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function EnrollDialog({
  sequence,
  onClose,
  onToast,
}: {
  sequence: Sequence;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const [subIds, setSubIds] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const enroll = async () => {
    const ids = subIds.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) { onToast('Enter at least one subscriber ID'); return; }
    setEnrolling(true);
    try {
      const res = await api<{ enrolled: number }>(`/email/sequences/${sequence.id}/enroll`, {
        method: 'POST',
        body: { subscriber_ids: ids },
        workspace: true,
      });
      onToast(`Enrolled ${res.enrolled} subscriber${res.enrolled === 1 ? '' : 's'}`);
      onClose();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <PremiumDialog open onClose={onClose} maxWidth="sm">
      <DialogHero
        icon={<GroupsRoundedIcon />}
        title={`Enroll into ${sequence.name}`}
        subtitle="Paste subscriber IDs (one per line or comma-separated)"
        onClose={onClose}
        tint={BRAND.tealDeep}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        <TextField
          label="Subscriber IDs"
          value={subIds}
          onChange={(e) => setSubIds(e.target.value)}
          multiline
          minRows={4}
          fullWidth
          size="small"
          placeholder="paste subscriber UUIDs here"
        />
      </DialogBody>
      <DialogFooter>
        <Button sx={ghostButton} onClick={onClose}>Cancel</Button>
        <Button sx={inkButton} onClick={enroll} disabled={enrolling}>
          {enrolling ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Enroll'}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

function SequencesTab({
  sequences,
  lists,
  onRefresh,
  onToast,
}: {
  sequences: Sequence[];
  lists: EmailList[];
  onRefresh: () => void;
  onToast: (m: string) => void;
}) {
  const [toggling, setToggling] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState<Sequence | null>(null);
  const [running, setRunning] = useState(false);
  const [sendTimeHint, setSendTimeHint] = useState<string | null>(null);
  const [loadingSendTime, setLoadingSendTime] = useState(false);

  const toggle = async (s: Sequence) => {
    setToggling(s.id);
    try {
      await api(`/email/sequences/${s.id}`, {
        method: 'PATCH',
        body: { is_active: !s.is_active },
        workspace: true,
      });
      onToast(s.is_active ? 'Sequence paused' : 'Sequence activated');
      onRefresh();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to update sequence');
    } finally {
      setToggling(null);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      await api('/email/sequences/run', { method: 'POST', workspace: true });
      onToast('Sequence run triggered');
      onRefresh();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  const optimizeSendTime = async () => {
    setLoadingSendTime(true);
    try {
      const res = await api<{ recommended_hour?: number; reason?: string }>(
        '/email/campaigns/optimize-send-time',
        { method: 'POST', workspace: true },
      );
      setSendTimeHint(
        res.recommended_hour != null
          ? `Best send time: ${res.recommended_hour}:00 -- ${res.reason || 'based on open patterns'}`
          : res.reason || 'Not enough data to recommend a send time yet.',
      );
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Could not optimize send time');
    } finally {
      setLoadingSendTime(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Stack direction="row" gap={1}>
          <Button startIcon={<AddIcon />} sx={inkButton} onClick={() => setBuilderOpen(true)}>
            New sequence
          </Button>
          <Button
            sx={ghostButton}
            onClick={runNow}
            disabled={running}
            startIcon={running ? <CircularProgress size={14} /> : <PlayArrowRoundedIcon sx={{ fontSize: 16 }} />}
          >
            {running ? 'Running...' : 'Run now'}
          </Button>
        </Stack>
        <Button
          sx={ghostButton}
          onClick={optimizeSendTime}
          disabled={loadingSendTime}
          startIcon={loadingSendTime ? <CircularProgress size={14} /> : <InsightsRoundedIcon sx={{ fontSize: 16 }} />}
        >
          {loadingSendTime ? 'Analyzing...' : 'Optimize send time'}
        </Button>
      </Stack>
      {sendTimeHint && (
        <Alert severity="info" sx={{ borderRadius: '14px', mb: 2 }} onClose={() => setSendTimeHint(null)}>
          {sendTimeHint}
        </Alert>
      )}
      {sequences.length === 0 ? (
        <Card>
          <Typography sx={{ color: SUBTLE }}>No automated sequences configured.</Typography>
        </Card>
      ) : (
        <Stack gap={1.5}>
          {sequences.map((s) => {
            const stepCount = Array.isArray(s.steps) ? s.steps.length : 0;
            return (
              <Card key={s.id} sx={{ p: 2.5 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ md: 'center' }}
                  gap={1.5}
                >
                  <Box>
                    <Stack direction="row" gap={1} alignItems="center">
                      <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16 }}>{s.name}</Typography>
                      <Chip
                        label={s.is_active ? 'Active' : 'Paused'}
                        size="small"
                        sx={{
                          bgcolor: s.is_active ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                          color: s.is_active ? BRAND.tealDeep : SUBTLE,
                          fontWeight: 700,
                          borderRadius: '999px',
                        }}
                      />
                    </Stack>
                    <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.5 }}>
                      Trigger: {s.trigger} · {stepCount} step{stepCount === 1 ? '' : 's'} · autonomy:{' '}
                      {s.autonomy}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <SequenceProgressChip sequenceId={s.id} />
                    </Box>
                  </Box>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Button
                      size="small"
                      startIcon={<GroupsRoundedIcon sx={{ fontSize: 16 }} />}
                      sx={{ ...ghostButton, px: 1.5 }}
                      onClick={() => setEnrollTarget(s)}
                    >
                      Enroll
                    </Button>
                    <Switch
                      checked={s.is_active}
                      disabled={toggling === s.id}
                      onChange={() => toggle(s)}
                    />
                    <Button
                      size="small"
                      startIcon={
                        s.is_active ? (
                          <PauseRoundedIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <PlayArrowRoundedIcon sx={{ fontSize: 16 }} />
                        )
                      }
                      sx={{ ...ghostButton, px: 1.5 }}
                      disabled={toggling === s.id}
                      onClick={() => toggle(s)}
                    >
                      {s.is_active ? 'Pause' : 'Activate'}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}
      {builderOpen && (
        <SequenceBuilderDialog
          lists={lists}
          onClose={() => setBuilderOpen(false)}
          onCreated={onRefresh}
          onToast={onToast}
        />
      )}
      {enrollTarget && (
        <EnrollDialog
          sequence={enrollTarget}
          onClose={() => setEnrollTarget(null)}
          onToast={onToast}
        />
      )}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Journeys tab (branching builder)                                           */
/* -------------------------------------------------------------------------- */

type JourneyStepType = 'send' | 'wait' | 'condition' | 'goal';
interface JourneyStep {
  id: string;
  type: JourneyStepType;
  subject?: string;
  template?: string;
  delay_hours?: number;
  condition_field?: string;
  yes_label?: string;
  no_label?: string;
  goal?: string;
}

function stepId(): string {
  return `js_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeSteps(raw: unknown[] | null | undefined): JourneyStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const obj = (s ?? {}) as Record<string, unknown>;
    const t = typeof obj.type === 'string' ? (obj.type as string) : 'send';
    const type: JourneyStepType =
      t === 'wait' || t === 'condition' || t === 'goal' ? (t as JourneyStepType) : 'send';
    return {
      id: typeof obj.id === 'string' ? obj.id : stepId(),
      type,
      subject: typeof obj.subject === 'string' ? obj.subject : undefined,
      template: typeof obj.template === 'string' ? obj.template : undefined,
      delay_hours: typeof obj.delay_hours === 'number' ? obj.delay_hours : undefined,
      condition_field:
        typeof obj.condition_field === 'string' ? obj.condition_field : undefined,
      yes_label: typeof obj.yes_label === 'string' ? obj.yes_label : undefined,
      no_label: typeof obj.no_label === 'string' ? obj.no_label : undefined,
      goal: typeof obj.goal === 'string' ? obj.goal : undefined,
    };
  });
}

const STEP_META: Record<JourneyStepType, { label: string; c: string; bg: string }> = {
  send: { label: 'Send email', c: BRAND.tealDeep, bg: BRAND.tealSoft },
  wait: { label: 'Wait', c: BRAND.amberDeep, bg: BRAND.amberSoft },
  condition: { label: 'Branch', c: BRAND.pink, bg: BRAND.pinkSoft },
  goal: { label: 'Goal', c: INK, bg: 'rgba(14,17,22,0.06)' },
};

function JourneyCard({
  sequence,
  onRefresh,
  onToast,
}: {
  sequence: Sequence;
  onRefresh: () => void;
  onToast: (m: string) => void;
}) {
  const [steps, setSteps] = useState<JourneyStep[]>(() => normalizeSteps(sequence.steps));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const mutate = (updater: (s: JourneyStep[]) => JourneyStep[]) => {
    setSteps((s) => updater(s));
    setDirty(true);
  };

  const addStep = (type: JourneyStepType) =>
    mutate((s) => [...s, { id: stepId(), type, delay_hours: type === 'wait' ? 24 : undefined }]);
  const removeStep = (id: string) => mutate((s) => s.filter((x) => x.id !== id));
  const patchStep = (id: string, patch: Partial<JourneyStep>) =>
    mutate((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const move = (id: string, dir: -1 | 1) =>
    mutate((s) => {
      const i = s.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const payload = steps.map((s, i) => ({ order: i, ...s }));
      await api(`/email/sequences/${sequence.id}`, {
        method: 'PATCH',
        body: { steps: payload },
        workspace: true,
      });
      onToast('Journey saved');
      setDirty(false);
      onRefresh();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to save journey');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        gap={1}
        mb={1.5}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, color: INK, fontSize: 16 }}>{sequence.name}</Typography>
          <Typography sx={{ color: SUBTLE, fontSize: 12.5 }}>
            Trigger: {sequence.trigger} · {steps.length} step{steps.length === 1 ? '' : 's'}
          </Typography>
        </Box>
        <Button sx={inkButton} onClick={save} disabled={!dirty || saving}>
          {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save journey'}
        </Button>
      </Stack>

      <Stack gap={1}>
        {steps.map((step, i) => {
          const meta = STEP_META[step.type];
          return (
            <Box key={step.id}>
              <Stack
                direction="row"
                gap={1}
                alignItems="flex-start"
                sx={{ p: 1.5, border: `1px solid ${LINE}`, borderRadius: '14px', bgcolor: '#fff' }}
              >
                <Chip
                  label={meta.label}
                  size="small"
                  sx={{ bgcolor: meta.bg, color: meta.c, fontWeight: 700, borderRadius: '999px', mt: 0.5 }}
                />
                <Box sx={{ flex: 1 }}>
                  {step.type === 'send' && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                      <TextField
                        placeholder="Subject"
                        value={step.subject ?? ''}
                        onChange={(e) => patchStep(step.id, { subject: e.target.value })}
                        size="small"
                        fullWidth
                      />
                      <TextField
                        placeholder="Template name"
                        value={step.template ?? ''}
                        onChange={(e) => patchStep(step.id, { template: e.target.value })}
                        size="small"
                        fullWidth
                      />
                    </Stack>
                  )}
                  {step.type === 'wait' && (
                    <TextField
                      placeholder="Delay (hours)"
                      type="number"
                      value={step.delay_hours ?? 0}
                      onChange={(e) =>
                        patchStep(step.id, { delay_hours: Number(e.target.value) || 0 })
                      }
                      size="small"
                      sx={{ maxWidth: 200 }}
                    />
                  )}
                  {step.type === 'condition' && (
                    <Stack gap={1}>
                      <TextField
                        placeholder="Condition (e.g. opened previous email)"
                        value={step.condition_field ?? ''}
                        onChange={(e) => patchStep(step.id, { condition_field: e.target.value })}
                        size="small"
                        fullWidth
                      />
                      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                        <TextField
                          placeholder="If yes → branch label"
                          value={step.yes_label ?? ''}
                          onChange={(e) => patchStep(step.id, { yes_label: e.target.value })}
                          size="small"
                          fullWidth
                        />
                        <TextField
                          placeholder="If no → branch label"
                          value={step.no_label ?? ''}
                          onChange={(e) => patchStep(step.id, { no_label: e.target.value })}
                          size="small"
                          fullWidth
                        />
                      </Stack>
                    </Stack>
                  )}
                  {step.type === 'goal' && (
                    <TextField
                      placeholder="Goal (e.g. purchased)"
                      value={step.goal ?? ''}
                      onChange={(e) => patchStep(step.id, { goal: e.target.value })}
                      size="small"
                      fullWidth
                    />
                  )}
                </Box>
                <Stack gap={0.25}>
                  <IconButton size="small" disabled={i === 0} onClick={() => move(step.id, -1)}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: INK }}>↑</Typography>
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={i === steps.length - 1}
                    onClick={() => move(step.id, 1)}
                  >
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: INK }}>↓</Typography>
                  </IconButton>
                  <IconButton size="small" onClick={() => removeStep(step.id)} sx={{ color: BRAND.pink }}>
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Stack>
              </Stack>
              {i < steps.length - 1 && (
                <Box sx={{ textAlign: 'center', color: SUBTLE, fontSize: 16, lineHeight: 1 }}>↓</Box>
              )}
            </Box>
          );
        })}
      </Stack>

      <Stack direction="row" gap={0.75} flexWrap="wrap" mt={1.5}>
        {(Object.keys(STEP_META) as JourneyStepType[]).map((t) => (
          <Button
            key={t}
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            sx={{ ...ghostButton, px: 1.5 }}
            onClick={() => addStep(t)}
          >
            {STEP_META[t].label}
          </Button>
        ))}
      </Stack>
    </Card>
  );
}

function JourneysTab({
  sequences,
  onRefresh,
  onToast,
}: {
  sequences: Sequence[];
  onRefresh: () => void;
  onToast: (m: string) => void;
}) {
  if (sequences.length === 0) {
    return (
      <Card>
        <Typography sx={{ color: SUBTLE }}>
          No journeys yet. Sequences appear here as visual, branching journeys you can edit.
        </Typography>
      </Card>
    );
  }
  return (
    <Stack gap={2}>
      {sequences.map((s) => (
        <JourneyCard key={s.id} sequence={s} onRefresh={onRefresh} onToast={onToast} />
      ))}
    </Stack>
  );
}

/* -------------------------------------------------------------------------- */
/* Analytics tab                                                              */
/* -------------------------------------------------------------------------- */

function AnalyticsTab({
  overview,
  campaigns,
}: {
  overview: Overview | null;
  campaigns: Campaign[];
}) {
  const sent = useMemo(
    () => campaigns.filter((c) => c.status === 'sent' && (c.stats?.sent ?? 0) > 0),
    [campaigns],
  );

  const chartData = useMemo(
    () =>
      sent.slice(0, 12).map((c) => ({
        name: c.name.length > 14 ? `${c.name.slice(0, 13)}…` : c.name,
        open: c.stats?.open_rate ?? 0,
        click: c.stats?.click_rate ?? 0,
      })),
    [sent],
  );

  const kpis = overview
    ? [
        { label: 'Subscribers', value: overview.subscribers, c: INK },
        { label: 'New (30d)', value: overview.new_subscribers, c: BRAND.tealDeep },
        { label: 'Growth rate', value: `${overview.growth_rate}%`, c: BRAND.tealDeep },
        { label: 'Campaigns sent', value: overview.campaigns_sent, c: INK },
        { label: 'Total emails sent', value: overview.total_sent, c: INK },
        { label: 'Avg open rate', value: `${overview.avg_open_rate}%`, c: BRAND.tealDeep },
        { label: 'Avg click rate', value: `${overview.avg_click_rate}%`, c: BRAND.amberDeep },
        { label: 'Active sequences', value: overview.active_sequences, c: INK },
      ]
    : [];

  return (
    <Stack gap={2}>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' },
        }}
      >
        {kpis.map((k) => (
          <Card key={k.label} sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: SUBTLE }}>{k.label}</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.c }}>{k.value}</Typography>
          </Card>
        ))}
      </Box>

      <Card>
        <SectionLabel>Campaign performance (open vs click rate)</SectionLabel>
        {chartData.length === 0 ? (
          <Typography sx={{ color: SUBTLE, mt: 1 }}>
            No sent campaigns yet — performance charts will appear here.
          </Typography>
        ) : (
          <Box sx={{ width: '100%', height: 320, mt: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: SUBTLE }} interval={0} angle={-15} height={50} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: SUBTLE }} unit="%" />
                <RTooltip />
                <Bar dataKey="open" name="Open rate" fill={BRAND.tealDeep} radius={[6, 6, 0, 0]} />
                <Bar dataKey="click" name="Click rate" fill={BRAND.amberDeep} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Card>
    </Stack>
  );
}

/* -------------------------------------------------------------------------- */
/* Compliance tab                                                             */
/* -------------------------------------------------------------------------- */

function ComplianceTab({
  compliance,
  onToast,
}: {
  compliance: Compliance | null;
  onToast: (m: string) => void;
}) {
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api<Suppression[]>('/email/suppressions', { workspace: true })
      .then(setSuppressions)
      .catch((e) => onToast(e instanceof ApiError ? e.message : 'Failed to load suppressions'))
      .finally(() => setLoading(false));
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!email.trim()) {
      onToast('Email is required');
      return;
    }
    setAdding(true);
    try {
      await api('/email/suppressions', {
        method: 'POST',
        body: { email: email.trim(), reason: reason.trim() || null },
        workspace: true,
      });
      onToast('Added to suppression list');
      setEmail('');
      setReason('');
      load();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to add suppression');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (s: Suppression) => {
    try {
      await api(`/email/suppressions/${s.id}`, { method: 'DELETE', workspace: true });
      onToast('Removed from suppression list');
      load();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : 'Failed to remove suppression');
    }
  };

  return (
    <Stack gap={2}>
      <Card>
        <SectionLabel>Compliance URLs</SectionLabel>
        <Stack gap={1.25} mt={1}>
          {[
            { label: 'Unsubscribe URL', value: compliance?.unsubscribe_url_template },
            { label: 'Preference center URL', value: compliance?.preference_url_template },
            { label: 'Confirm (double opt-in) URL', value: compliance?.confirm_url_template },
          ].map((u) => (
            <Box key={u.label}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: SUBTLE }}>{u.label}</Typography>
              <Typography
                sx={{
                  fontSize: 13.5,
                  color: INK,
                  fontFamily: 'monospace',
                  bgcolor: 'rgba(14,17,22,0.04)',
                  p: 1,
                  borderRadius: '8px',
                  wordBreak: 'break-all',
                }}
              >
                {u.value || '—'}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Card>

      <Card>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <SectionLabel>Suppression list</SectionLabel>
          <Chip
            label={`${compliance?.suppression_count ?? suppressions.length} suppressed`}
            size="small"
            sx={{ bgcolor: BRAND.pinkSoft, color: BRAND.pink, fontWeight: 700, borderRadius: '999px' }}
          />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mt={1.5}>
          <TextField
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            size="small"
            fullWidth
          />
          <Button sx={inkButton} onClick={add} disabled={adding}>
            {adding ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Suppress'}
          </Button>
        </Stack>

        <Box sx={{ mt: 2 }}>
          {loading ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress />
            </Stack>
          ) : suppressions.length === 0 ? (
            <Typography sx={{ color: SUBTLE }}>No suppressed addresses.</Typography>
          ) : (
            <Box sx={{ border: `1px solid ${LINE}`, borderRadius: '12px', overflow: 'hidden' }}>
              {suppressions.map((s) => (
                <Stack
                  key={s.id}
                  direction="row"
                  alignItems="center"
                  sx={{
                    px: 2,
                    py: 1,
                    borderBottom: `1px solid ${LINE}`,
                    fontSize: 13,
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ flex: 2, fontWeight: 600, color: INK }}>{s.email}</Box>
                  <Box sx={{ flex: 2, color: SUBTLE }}>{s.reason || '—'}</Box>
                  <Box sx={{ flex: 0.5, textAlign: 'right' }}>
                    <IconButton size="small" onClick={() => remove(s)} sx={{ color: BRAND.pink }}>
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Stack>
              ))}
            </Box>
          )}
        </Box>
      </Card>
    </Stack>
  );
}

/* -------------------------------------------------------------------------- */
/* Main page                                                                  */
/* -------------------------------------------------------------------------- */

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: 'campaigns', label: 'Campaigns', icon: <SendRoundedIcon sx={{ fontSize: 17 }} /> },
  { key: 'templates', label: 'Templates', icon: <DescriptionRoundedIcon sx={{ fontSize: 17 }} /> },
  { key: 'lists', label: 'Lists', icon: <GroupsRoundedIcon sx={{ fontSize: 17 }} /> },
  { key: 'segments', label: 'Segments', icon: <FilterAltRoundedIcon sx={{ fontSize: 17 }} /> },
  { key: 'sequences', label: 'Sequences', icon: <PlayArrowRoundedIcon sx={{ fontSize: 17 }} /> },
  { key: 'journeys', label: 'Journeys', icon: <AccountTreeRoundedIcon sx={{ fontSize: 17 }} /> },
  { key: 'analytics', label: 'Analytics', icon: <InsightsRoundedIcon sx={{ fontSize: 17 }} /> },
  { key: 'compliance', label: 'Compliance', icon: <ShieldRoundedIcon sx={{ fontSize: 17 }} /> },
];

export default function EmailMarketingPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<TabKey>('campaigns');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<EmailList[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [compliance, setCompliance] = useState<Compliance | null>(null);

  const [builderOpen, setBuilderOpen] = useState(false);

  const onToast = useCallback((m: string) => setToast(m), []);

  const loadAll = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const [ov, cs, tp, ls, sg, sq, cp] = await Promise.all([
        api<Overview>('/email/overview', { workspace: true }),
        api<Campaign[]>('/email/campaigns', { workspace: true }),
        api<Template[]>('/email/templates', { workspace: true }),
        api<EmailList[]>('/email/lists', { workspace: true }),
        api<Segment[]>('/email/segments', { workspace: true }),
        api<Sequence[]>('/email/sequences', { workspace: true }),
        api<Compliance>('/email/compliance', { workspace: true }),
      ]);
      setOverview(ov);
      setCampaigns(cs);
      setTemplates(tp);
      setLists(ls);
      setSegments(sg);
      setSequences(sq);
      setCompliance(cp);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load email data');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshCampaigns = useCallback(() => {
    api<Campaign[]>('/email/campaigns', { workspace: true })
      .then(setCampaigns)
      .catch((e) => setToast(e instanceof ApiError ? e.message : 'Failed to refresh campaigns'));
  }, []);

  const builderSegments: EmailSegment[] = useMemo(
    () =>
      segments.map((s) => ({
        id: s.id,
        name: s.name,
        list_id: s.list_id ?? undefined,
        rules: s.rules ?? undefined,
      })),
    [segments],
  );

  const builderSeed: CampaignSeed | null = null;

  if (!activeWorkspace) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info" sx={{ borderRadius: '14px' }}>
          Select or create a workspace to manage email marketing.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'flex-end' }}
        gap={2}
        mb={3}
      >
        <Box>
          <Typography sx={{ fontSize: 30, fontWeight: 900, color: INK, letterSpacing: -0.5 }}>
            Email Marketing
          </Typography>
          <Typography sx={{ color: SUBTLE, fontSize: 14.5, mt: 0.5 }}>
            Campaigns, automations and audience intelligence — enterprise grade.
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} sx={inkButton} onClick={() => setBuilderOpen(true)}>
          New campaign
        </Button>
      </Stack>

      {overview && (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' },
            mb: 3,
          }}
        >
          {[
            { label: 'Subscribers', value: overview.subscribers, c: INK },
            { label: 'Campaigns sent', value: overview.campaigns_sent, c: BRAND.tealDeep },
            { label: 'Avg open rate', value: `${overview.avg_open_rate}%`, c: BRAND.tealDeep },
            { label: 'Avg click rate', value: `${overview.avg_click_rate}%`, c: BRAND.amberDeep },
          ].map((k) => (
            <Card key={k.label} sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: SUBTLE }}>{k.label}</Typography>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: k.c }}>{k.value}</Typography>
            </Card>
          ))}
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          p: 0.5,
          mb: 3,
          bgcolor: 'rgba(14,17,22,0.04)',
          borderRadius: '999px',
          width: 'fit-content',
          maxWidth: '100%',
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Button
              key={t.key}
              onClick={() => setTab(t.key)}
              startIcon={t.icon}
              sx={{
                borderRadius: '999px',
                textTransform: 'none',
                fontWeight: 700,
                px: 2,
                color: active ? '#fff' : INK,
                background: active ? INK : 'transparent',
                '&:hover': { background: active ? '#000' : 'rgba(14,17,22,0.06)' },
              }}
            >
              {t.label}
            </Button>
          );
        })}
      </Box>

      {error && (
        <Alert severity="error" sx={{ borderRadius: '14px', mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack alignItems="center" py={8}>
          <CircularProgress />
        </Stack>
      ) : (
        <>
          {tab === 'campaigns' && (
            <CampaignsTab
              campaigns={campaigns}
              onRefresh={refreshCampaigns}
              onToast={onToast}
              onNew={() => setBuilderOpen(true)}
            />
          )}
          {tab === 'templates' && (
            <TemplatesTab
              templates={templates}
              onRefresh={loadAll}
              onToast={onToast}
              onUsed={refreshCampaigns}
            />
          )}
          {tab === 'lists' && <ListsTab lists={lists} onRefresh={loadAll} onToast={onToast} />}
          {tab === 'segments' && (
            <SegmentsTab
              segments={segments}
              lists={lists}
              onRefresh={loadAll}
              onToast={onToast}
            />
          )}
          {tab === 'sequences' && (
            <SequencesTab sequences={sequences} lists={lists} onRefresh={loadAll} onToast={onToast} />
          )}
          {tab === 'journeys' && (
            <JourneysTab sequences={sequences} onRefresh={loadAll} onToast={onToast} />
          )}
          {tab === 'analytics' && <AnalyticsTab overview={overview} campaigns={campaigns} />}
          {tab === 'compliance' && <ComplianceTab compliance={compliance} onToast={onToast} />}
        </>
      )}

      {builderOpen && (
        <CampaignBuilder
          open={builderOpen}
          onClose={() => setBuilderOpen(false)}
          lists={lists}
          segments={builderSegments}
          seed={builderSeed}
          onCreated={() => {
            setBuilderOpen(false);
            refreshCampaigns();
          }}
          onToast={onToast}
          onSegmentCreated={loadAll}
        />
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
