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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import PublishIcon from '@mui/icons-material/PublishRounded';
import InsightsIcon from '@mui/icons-material/InsightsRounded';
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
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type Tab = 'forms' | 'submissions' | 'overview';

interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  answer?: string;
}

interface FormCard {
  id: string;
  name: string;
  kind: string;
  fields: FormField[] | null;
  settings: Record<string, unknown> | null;
  status: string;
  slug: string | null;
  description: string | null;
  views: number;
  submissions: number;
  completion_rate: number;
  created_at: string;
}

interface Submission {
  id: string;
  form_id: string;
  data: Record<string, unknown> | null;
  contact_email: string | null;
  score: number | null;
  anon_id: string | null;
  submitted_at: string;
}

interface Overview {
  forms: number;
  published: number;
  submissions: number;
  views: number;
  avg_completion: number;
  by_kind: Record<string, number>;
}

interface Generated {
  name: string;
  kind: string;
  fields: FormField[];
  source?: string;
}

interface Insights {
  status: string;
  responses?: number;
  summary?: string;
  themes?: string[];
  insights?: string[];
}

const KINDS = ['form', 'quiz', 'survey', 'poll'];

const KIND_CHIP: Record<string, { bg: string; fg: string }> = {
  form: { bg: BRAND.amberSoft, fg: BRAND.amberDeep },
  quiz: { bg: BRAND.tealSoft, fg: BRAND.tealDeep },
  survey: { bg: 'rgba(124,58,237,0.10)', fg: '#7C3AED' },
  poll: { bg: BRAND.pinkSoft, fg: BRAND.pink },
};

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'https://api.example.com';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FormsPage() {
  const { activeWorkspace } = useAuth();
  const [tab, setTab] = useState<Tab>('forms');
  const [forms, setForms] = useState<FormCard[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New-form dialog
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('form');
  const [brief, setBrief] = useState('');
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [building, setBuilding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Submissions tab
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  // Insights
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsFor, setInsightsFor] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, o] = await Promise.all([
        api<FormCard[]>('/forms/forms', { workspace: true }),
        api<Overview>('/forms/overview', { workspace: true }),
      ]);
      setForms(f);
      setOverview(o);
      setSelectedForm((cur) => cur || (f.length ? f[0].id : ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const loadSubmissions = useCallback(async (formId: string) => {
    if (!formId) return;
    setSubsLoading(true);
    try {
      setSubmissions(
        await api<Submission[]>(`/forms/forms/${formId}/submissions`, { workspace: true }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load submissions');
    } finally {
      setSubsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'submissions' && selectedForm) loadSubmissions(selectedForm);
  }, [tab, selectedForm, loadSubmissions]);

  async function buildWithAI() {
    if (!brief.trim()) return;
    setBuilding(true);
    setError(null);
    try {
      const g = await api<Generated>('/forms/forms/generate', {
        method: 'POST',
        body: { brief, kind },
        workspace: true,
      });
      setGenerated(g);
      if (!name.trim() && g.name) setName(g.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI build failed');
    } finally {
      setBuilding(false);
    }
  }

  async function createForm() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api<FormCard>('/forms/forms', {
        method: 'POST',
        body: {
          name,
          kind,
          fields: generated?.fields ?? [],
          description: brief || null,
        },
        workspace: true,
      });
      closeDialog();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create form');
    } finally {
      setSaving(false);
    }
  }

  async function publish(form: FormCard) {
    try {
      await api<FormCard>(`/forms/forms/${form.id}/publish`, {
        method: 'POST',
        workspace: true,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish');
    }
  }

  async function loadInsights(form: FormCard) {
    setInsightsFor(form.id);
    setInsightsLoading(true);
    setInsights(null);
    try {
      setInsights(
        await api<Insights>(`/forms/forms/${form.id}/insights`, { workspace: true }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load insights');
    } finally {
      setInsightsLoading(false);
    }
  }

  function closeDialog() {
    setOpen(false);
    setName('');
    setKind('form');
    setBrief('');
    setGenerated(null);
  }

  const selectedFormObj = useMemo(
    () => forms.find((f) => f.id === selectedForm) || null,
    [forms, selectedForm],
  );

  const submissionColumns = useMemo(() => {
    const fields = selectedFormObj?.fields || [];
    return fields.slice(0, 4);
  }, [selectedFormObj]);

  const kpis = useMemo(() => {
    const totalSubs = overview?.submissions ?? forms.reduce((a, f) => a + f.submissions, 0);
    return [
      { label: 'Forms', value: overview?.forms ?? forms.length, soft: BRAND.amberSoft, fg: BRAND.amberDeep },
      { label: 'Submissions', value: totalSubs, soft: BRAND.tealSoft, fg: BRAND.tealDeep },
      { label: 'Avg completion', value: `${overview?.avg_completion ?? 0}%`, soft: 'rgba(124,58,237,0.10)', fg: '#7C3AED' },
      { label: 'Published', value: overview?.published ?? forms.filter((f) => f.status === 'published').length, soft: BRAND.pinkSoft, fg: BRAND.pink },
    ];
  }, [overview, forms]);

  if (!activeWorkspace) {
    return (
      <Box>
        <Alert severity="info">Select a workspace to manage forms.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
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
            Forms, quizzes &{' '}
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
              surveys
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Build, publish and analyze real responses — let AI design the fields for you.
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
          New form
        </Button>
      </Stack>

      {/* Pill tabs */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, px: 0.5 }}>
        {(['forms', 'submissions', 'overview'] as Tab[]).map((t) => (
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
      <Grid container spacing={2} sx={{ mb: 3, px: 0.5 }}>
        {kpis.map((k) => (
          <Grid key={k.label} size={{ xs: 6, md: 3 }}>
            <Box
              sx={{
                bgcolor: '#fff',
                border: `1px solid ${LINE}`,
                borderRadius: CARD_RADIUS,
                boxShadow: CARD_SHADOW,
                p: 2.5,
              }}
            >
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {k.label}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 30, fontWeight: 800, color: INK }}>
                {k.value}
              </Typography>
              <Box sx={{ mt: 1, width: 36, height: 6, borderRadius: 999, bgcolor: k.soft }}>
                <Box sx={{ width: '100%', height: '100%', borderRadius: 999, bgcolor: k.fg, opacity: 0.55 }} />
              </Box>
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
      ) : tab === 'forms' ? (
        <FormsTab
          forms={forms}
          onPublish={publish}
          onInsights={loadInsights}
          insightsFor={insightsFor}
          insights={insights}
          insightsLoading={insightsLoading}
          onNew={() => setOpen(true)}
        />
      ) : tab === 'submissions' ? (
        <SubmissionsTab
          forms={forms}
          selectedForm={selectedForm}
          setSelectedForm={setSelectedForm}
          submissions={submissions}
          loading={subsLoading}
          columns={submissionColumns}
        />
      ) : (
        <OverviewTab overview={overview} forms={forms} />
      )}

      {/* New form dialog */}
      <PremiumDialog open={open} onClose={closeDialog} maxWidth="md">
        <DialogHero
          icon={<DescriptionRoundedIcon />}
          title="New form"
          subtitle="Describe what you want to capture and preview the fields live"
          onClose={closeDialog}
        />
        <DialogBody sx={{ p: 0 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              minHeight: { md: 420 },
            }}
          >
            {/* Form column */}
            <Box sx={{ px: { xs: 2.5, sm: 3.25 }, py: 3, borderRight: { md: `1px solid ${LINE}` } }}>
              <Stack spacing={2.25}>
                <Box>
                  <SectionLabel>Form basics</SectionLabel>
                  <Stack spacing={1.75}>
                    <TextField
                      select
                      label="Kind"
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                      fullWidth
                      size="small"
                    >
                      {KINDS.map((k) => (
                        <MenuItem key={k} value={k} sx={{ textTransform: 'capitalize' }}>
                          {k}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Form name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="e.g. Q3 customer NPS survey"
                    />
                  </Stack>
                </Box>
                <Box>
                  <SectionLabel>Brief</SectionLabel>
                  <AiAssist
                    brief={brief}
                    setBrief={setBrief}
                    loading={building}
                    onGenerate={buildWithAI}
                    label="Describe what you want to learn or capture — AI builds the fields."
                    placeholder="Describe what you want to learn or capture — AI builds the fields."
                    buttonText="AI build form"
                    minRows={2}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Live preview column */}
            <Box sx={{ background: 'rgba(14,17,22,0.025)', px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
              <SectionLabel sx={{ mb: 1.5 }}>Live preview</SectionLabel>
              <Box
                sx={{
                  bgcolor: '#fff',
                  border: `1px solid ${LINE}`,
                  borderRadius: '18px',
                  boxShadow: '0 8px 30px -12px rgba(14,17,22,0.18)',
                  p: 2.5,
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }}>
                  {name.trim() || generated?.name || 'Untitled form'}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: SUBTLE, mt: 0.25, textTransform: 'capitalize' }}>
                  {kind}
                </Typography>
                {generated && generated.fields.length ? (
                  <Stack spacing={1.75} sx={{ mt: 2 }}>
                    {generated.fields.map((f, i) => (
                      <Box key={f.id || i}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK, mb: 0.5 }}>
                          {f.label}
                          {f.required && (
                            <Box component="span" sx={{ color: BRAND.pink, ml: 0.5 }}>
                              *
                            </Box>
                          )}
                        </Typography>
                        {f.options && f.options.length > 0 ? (
                          <TextField
                            select
                            fullWidth
                            size="small"
                            value=""
                            disabled
                            SelectProps={{ displayEmpty: true }}
                          >
                            <MenuItem value="">Select…</MenuItem>
                            {f.options.map((o, oi) => (
                              <MenuItem key={oi} value={o}>
                                {o}
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <TextField
                            fullWidth
                            size="small"
                            disabled
                            multiline={f.type === 'textarea'}
                            minRows={f.type === 'textarea' ? 2 : undefined}
                            placeholder={f.type}
                          />
                        )}
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <DescriptionRoundedIcon sx={{ fontSize: 30, color: 'rgba(14,17,22,0.18)' }} />
                    <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 1 }}>
                      Your form fields will render here once AI builds them.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </DialogBody>
        <DialogFooter
          hint={
            generated && generated.fields.length
              ? `${generated.fields.length} field${generated.fields.length === 1 ? '' : 's'} ready`
              : undefined
          }
        >
          <Button onClick={closeDialog} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={createForm} disabled={saving || !name.trim()} sx={inkPillSx}>
            {saving ? 'Creating…' : 'Create form'}
          </Button>
        </DialogFooter>
      </PremiumDialog>
    </Box>
  );
}

/* ----------------------------- Forms tab ----------------------------- */
function FormsTab({
  forms,
  onPublish,
  onInsights,
  insightsFor,
  insights,
  insightsLoading,
  onNew,
}: {
  forms: FormCard[];
  onPublish: (f: FormCard) => void;
  onInsights: (f: FormCard) => void;
  insightsFor: string | null;
  insights: Insights | null;
  insightsLoading: boolean;
  onNew: () => void;
}) {
  if (!forms.length) {
    return (
      <Box
        sx={{
          bgcolor: '#fff',
          border: `1px solid ${LINE}`,
          borderRadius: CARD_RADIUS,
          boxShadow: CARD_SHADOW,
          p: 6,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK }}>No forms yet</Typography>
        <Typography sx={{ color: SUBTLE, mt: 0.5 }}>
          Create your first form, quiz or survey — let AI design the fields.
        </Typography>
        <Button
          onClick={onNew}
          startIcon={<AddIcon />}
          sx={{
            mt: 2.5,
            px: 2.5,
            py: 1,
            borderRadius: '999px',
            fontWeight: 700,
            textTransform: 'none',
            color: '#fff',
            background: INK,
            backgroundImage: 'none',
            '&:hover': { background: '#1B2330' },
          }}
        >
          New form
        </Button>
      </Box>
    );
  }

  return (
    <Grid container spacing={2} sx={{ px: 0.5 }}>
      {forms.map((f) => {
        const chip = KIND_CHIP[f.kind] || KIND_CHIP.form;
        const showInsights = insightsFor === f.id;
        return (
          <Grid key={f.id} size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                bgcolor: '#fff',
                border: `1px solid ${LINE}`,
                borderRadius: CARD_RADIUS,
                boxShadow: CARD_SHADOW,
                p: 2.75,
                height: '100%',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap">
                    <Chip
                      label={f.kind}
                      size="small"
                      sx={{ fontWeight: 700, fontSize: 11, textTransform: 'capitalize', bgcolor: chip.bg, color: chip.fg }}
                    />
                    <Chip
                      label={f.status}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'capitalize',
                        bgcolor: f.status === 'published' ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                        color: f.status === 'published' ? BRAND.tealDeep : SUBTLE,
                      }}
                    />
                  </Stack>
                  <Typography sx={{ fontWeight: 800, fontSize: 16.5, color: INK, lineHeight: 1.25 }}>
                    {f.name}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: 22, color: INK, whiteSpace: 'nowrap' }}>
                  {f.completion_rate}%
                </Typography>
              </Stack>

              <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                <Metric label="Views" value={f.views} />
                <Metric label="Submissions" value={f.submissions} />
                <Metric label="Fields" value={(f.fields || []).length} />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 2.25 }} flexWrap="wrap" rowGap={1}>
                {f.status !== 'published' && (
                  <Button
                    size="small"
                    startIcon={<PublishIcon sx={{ fontSize: 16 }} />}
                    onClick={() => onPublish(f)}
                    sx={{
                      borderRadius: '999px',
                      textTransform: 'none',
                      fontWeight: 700,
                      color: BRAND.tealDeep,
                      bgcolor: BRAND.tealSoft,
                      backgroundImage: 'none',
                      '&:hover': { bgcolor: '#D2F1E5' },
                    }}
                  >
                    Publish
                  </Button>
                )}
                <Button
                  size="small"
                  startIcon={<InsightsIcon sx={{ fontSize: 16 }} />}
                  onClick={() => onInsights(f)}
                  sx={{
                    borderRadius: '999px',
                    textTransform: 'none',
                    fontWeight: 700,
                    color: '#7C3AED',
                    bgcolor: 'rgba(124,58,237,0.10)',
                    backgroundImage: 'none',
                    '&:hover': { bgcolor: 'rgba(124,58,237,0.18)' },
                  }}
                >
                  AI insights
                </Button>
              </Stack>

              {f.slug && <EmbedSnippet slug={f.slug} />}

              {showInsights && (
                <Box sx={{ mt: 2, borderTop: `1px solid ${LINE}`, pt: 2 }}>
                  {insightsLoading ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={16} />
                      <Typography sx={{ fontSize: 13, color: SUBTLE }}>Analyzing responses…</Typography>
                    </Stack>
                  ) : insights ? (
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: INK, mb: 0.5 }}>
                        {insights.summary || 'Insights'}
                      </Typography>
                      {(insights.themes || []).length > 0 && (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75} sx={{ mb: 1 }}>
                          {insights.themes!.map((t, i) => (
                            <Chip key={i} label={t} size="small" sx={{ fontSize: 11, bgcolor: BRAND.amberSoft, color: BRAND.amberDeep }} />
                          ))}
                        </Stack>
                      )}
                      <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.25 }}>
                        {(insights.insights || []).map((ins, i) => (
                          <Typography key={i} component="li" sx={{ fontSize: 13, color: '#374151' }}>
                            {ins}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}
                </Box>
              )}
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: INK }}>{value}</Typography>
    </Box>
  );
}

function EmbedSnippet({ slug }: { slug: string }) {
  const snippet = `<script src="${API_BASE}/embed.js" data-form="${slug}"></script>`;
  return (
    <Box sx={{ mt: 2 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: SUBTLE, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.5 }}>
        Embed
      </Typography>
      <TextField
        value={snippet}
        fullWidth
        size="small"
        InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: 12 } }}
      />
    </Box>
  );
}

/* -------------------------- Submissions tab -------------------------- */
function SubmissionsTab({
  forms,
  selectedForm,
  setSelectedForm,
  submissions,
  loading,
  columns,
}: {
  forms: FormCard[];
  selectedForm: string;
  setSelectedForm: (id: string) => void;
  submissions: Submission[];
  loading: boolean;
  columns: FormField[];
}) {
  return (
    <Box sx={{ px: 0.5 }}>
      <TextField
        select
        label="Form"
        value={selectedForm}
        onChange={(e) => setSelectedForm(e.target.value)}
        sx={{ mb: 2.5, minWidth: 260 }}
        size="small"
      >
        {forms.map((f) => (
          <MenuItem key={f.id} value={f.id}>
            {f.name}
          </MenuItem>
        ))}
      </TextField>

      <Box
        sx={{
          bgcolor: '#fff',
          border: `1px solid ${LINE}`,
          borderRadius: CARD_RADIUS,
          boxShadow: CARD_SHADOW,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : !submissions.length ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography sx={{ color: SUBTLE }}>No submissions yet for this form.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: SUBTLE }}>Submitted</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: SUBTLE }}>Email</TableCell>
                  {columns.map((c) => (
                    <TableCell key={c.id} sx={{ fontWeight: 700, color: SUBTLE }}>
                      {c.label}
                    </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 700, color: SUBTLE }}>Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontSize: 13.5, color: INK }}>{fmtDate(s.submitted_at)}</TableCell>
                    <TableCell sx={{ fontSize: 13.5, color: INK }}>{s.contact_email || '—'}</TableCell>
                    {columns.map((c) => {
                      const v = s.data?.[c.id];
                      const text = Array.isArray(v) ? v.join(', ') : v == null ? '—' : String(v);
                      return (
                        <TableCell key={c.id} sx={{ fontSize: 13.5, color: '#374151', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {text}
                        </TableCell>
                      );
                    })}
                    <TableCell sx={{ fontSize: 13.5, color: INK }}>
                      {s.score == null ? '—' : s.score}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}

/* ---------------------------- Overview tab --------------------------- */
function OverviewTab({ overview, forms }: { overview: Overview | null; forms: FormCard[] }) {
  const byKind = overview?.by_kind || {};
  const topForms = [...forms].sort((a, b) => b.submissions - a.submissions).slice(0, 6);

  return (
    <Grid container spacing={2} sx={{ px: 0.5 }}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Box
          sx={{
            bgcolor: '#fff',
            border: `1px solid ${LINE}`,
            borderRadius: CARD_RADIUS,
            boxShadow: CARD_SHADOW,
            p: 2.75,
            height: '100%',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, mb: 2 }}>By kind</Typography>
          <Stack spacing={1.5}>
            {Object.keys(byKind).length === 0 ? (
              <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>No forms yet.</Typography>
            ) : (
              Object.entries(byKind).map(([k, n]) => {
                const chip = KIND_CHIP[k] || KIND_CHIP.form;
                return (
                  <Stack key={k} direction="row" alignItems="center" justifyContent="space-between">
                    <Chip label={k} size="small" sx={{ fontWeight: 700, fontSize: 11, textTransform: 'capitalize', bgcolor: chip.bg, color: chip.fg }} />
                    <Typography sx={{ fontWeight: 800, color: INK }}>{n}</Typography>
                  </Stack>
                );
              })
            )}
          </Stack>
          <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${LINE}` }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>Total views</Typography>
              <Typography sx={{ fontWeight: 800, color: INK }}>{overview?.views ?? 0}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>Avg completion</Typography>
              <Typography sx={{ fontWeight: 800, color: INK }}>{overview?.avg_completion ?? 0}%</Typography>
            </Stack>
          </Box>
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Box
          sx={{
            bgcolor: '#fff',
            border: `1px solid ${LINE}`,
            borderRadius: CARD_RADIUS,
            boxShadow: CARD_SHADOW,
            p: 2.75,
            height: '100%',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK, mb: 2 }}>Top forms by submissions</Typography>
          {!topForms.length ? (
            <Typography sx={{ color: SUBTLE, fontSize: 13.5 }}>No data yet.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {topForms.map((f) => (
                <Stack key={f.id} direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Typography sx={{ fontSize: 14, color: INK, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 13, color: SUBTLE }}>{f.completion_rate}%</Typography>
                    <Typography sx={{ fontWeight: 800, color: INK }}>{f.submissions}</Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </Grid>
    </Grid>
  );
}
