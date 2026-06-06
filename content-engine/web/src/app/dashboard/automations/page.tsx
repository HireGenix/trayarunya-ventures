'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import EditIcon from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { useAuth } from '@/lib/auth';
import {
  Automation,
  type AutomationCatalog,
  type Workflow,
  type WorkflowCondition,
  type WorkflowAction,
  type WorkflowRun,
} from '@/lib/api';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

const RUN_STATUS: Record<string, { soft: string; deep: string }> = {
  success: { soft: BRAND.tealSoft, deep: BRAND.tealDeep },
  partial: { soft: BRAND.amberSoft, deep: BRAND.amberDeep },
  failed: { soft: BRAND.pinkSoft, deep: BRAND.pink },
  running: { soft: BRAND.amberSoft, deep: BRAND.amberDeep },
  pending: { soft: BRAND.amberSoft, deep: BRAND.amberDeep },
  skipped: { soft: 'rgba(14,17,22,0.05)', deep: SUBTLE },
};
const runStyle = (s: string) => RUN_STATUS[s] || { soft: 'rgba(14,17,22,0.05)', deep: SUBTLE };

const OPS = [
  { value: 'eq', label: 'equals' },
  { value: 'ne', label: 'not equals' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'in list' },
];

type DraftAction = { type: string; config: Record<string, string> };
type DraftCondition = { field: string; op: string; value: string };

interface Draft {
  id?: string;
  name: string;
  description: string;
  trigger_type: string;
  conditions: DraftCondition[];
  actions: DraftAction[];
  is_active: boolean;
}

const emptyDraft = (trigger = ''): Draft => ({
  name: '',
  description: '',
  trigger_type: trigger,
  conditions: [],
  actions: [],
  is_active: true,
});

export default function AutomationsPage() {
  const { activeWorkspace } = useAuth();
  const [catalog, setCatalog] = useState<AutomationCatalog | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const [runDialog, setRunDialog] = useState<WorkflowRun | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [cat, wfs, rns] = await Promise.all([
        Automation.catalog(),
        Automation.listWorkflows(),
        Automation.listRuns(50),
      ]);
      setCatalog(cat);
      setWorkflows(wfs);
      setRuns(rns);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load automations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const triggerLabel = useMemo(() => {
    const map: Record<string, string> = {};
    catalog?.triggers.forEach((t) => (map[t.type] = t.label));
    return map;
  }, [catalog]);

  const selectedTrigger = useMemo(
    () => catalog?.triggers.find((t) => t.type === draft.trigger_type),
    [catalog, draft.trigger_type],
  );

  function openCreate() {
    setDraft(emptyDraft(catalog?.triggers[0]?.type || ''));
    setDialogOpen(true);
  }

  function openEdit(wf: Workflow) {
    setDraft({
      id: wf.id,
      name: wf.name,
      description: wf.description || '',
      trigger_type: wf.trigger_type,
      conditions: (wf.conditions || []).map((c) => ({
        field: c.field,
        op: c.op,
        value: c.value == null ? '' : String(c.value),
      })),
      actions: (wf.actions || []).map((a) => ({
        type: a.type,
        config: Object.fromEntries(
          Object.entries(a.config || {}).map(([k, v]) => [k, v == null ? '' : String(v)]),
        ),
      })),
      is_active: wf.is_active,
    });
    setDialogOpen(true);
  }

  function addCondition() {
    setDraft((d) => ({
      ...d,
      conditions: [...d.conditions, { field: selectedTrigger?.fields[0] || '', op: 'eq', value: '' }],
    }));
  }
  function addAction(type: string) {
    setDraft((d) => ({ ...d, actions: [...d.actions, { type, config: {} }] }));
  }

  async function save() {
    if (!draft.name.trim()) {
      setErr('Workflow name is required');
      return;
    }
    setSaving(true);
    setErr(null);
    const body = {
      name: draft.name.trim(),
      description: draft.description || null,
      trigger_type: draft.trigger_type,
      conditions: draft.conditions
        .filter((c) => c.field)
        .map<WorkflowCondition>((c) => ({ field: c.field, op: c.op, value: c.value })),
      actions: draft.actions.map<WorkflowAction>((a) => ({ type: a.type, config: a.config })),
      is_active: draft.is_active,
    };
    try {
      if (draft.id) {
        await Automation.updateWorkflow(draft.id, body);
        setToast('Workflow updated');
      } else {
        await Automation.createWorkflow(body);
        setToast('Workflow created');
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(wf: Workflow) {
    try {
      await Automation.toggleWorkflow(wf.id);
      setWorkflows((ws) => ws.map((w) => (w.id === wf.id ? { ...w, is_active: !w.is_active } : w)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to toggle');
    }
  }

  async function remove(wf: Workflow) {
    if (!confirm(`Delete workflow "${wf.name}"?`)) return;
    try {
      await Automation.deleteWorkflow(wf.id);
      setWorkflows((ws) => ws.filter((w) => w.id !== wf.id));
      setToast('Workflow deleted');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  async function runTest(wf: Workflow) {
    try {
      const sample: Record<string, unknown> = {};
      const t = catalog?.triggers.find((x) => x.type === wf.trigger_type);
      t?.fields.forEach((f) => (sample[f] = f === 'value' || f === 'drop_pct' ? 1000 : `sample-${f}`));
      const run = await Automation.testWorkflow(wf.id, sample);
      setRunDialog(run);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Test failed');
    }
  }

  if (!activeWorkspace) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          Select a workspace to manage automations.
        </Alert>
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
            Workflows{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              on autopilot
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Turn real marketing signals into automatic actions — Slack, email, tasks, CRM webhooks.
          </Typography>
        </Box>
        <Button
          startIcon={<AddIcon />}
          onClick={openCreate}
          disabled={!catalog}
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
            '&.Mui-disabled': { color: 'rgba(255,255,255,0.7)', background: 'rgba(14,17,22,0.4)' },
          }}
        >
          New workflow
        </Button>
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, px: 0.5 }}>
        {[`Workflows (${workflows.length})`, 'Run History'].map((label, i) => (
          <Button
            key={label}
            disableRipple
            onClick={() => setTab(i)}
            sx={{
              px: 2.25,
              py: 0.85,
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: 13.5,
              textTransform: 'none',
              color: tab === i ? '#fff' : 'text.secondary',
              bgcolor: tab === i ? INK : 'transparent',
              '&:hover': {
                bgcolor: tab === i ? '#1B2330' : 'rgba(14,17,22,0.05)',
                color: tab === i ? '#fff' : INK,
              },
            }}
          >
            {label}
          </Button>
        ))}
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress sx={{ color: INK }} />
        </Box>
      ) : tab === 0 ? (
        workflows.length === 0 ? (
          <Box
            sx={{
              bgcolor: '#fff',
              border: `1px dashed ${LINE}`,
              borderRadius: CARD_RADIUS,
              boxShadow: CARD_SHADOW,
              textAlign: 'center',
              py: 7,
              px: 3,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(14,17,22,0.05)',
                color: INK,
                mx: 'auto',
                mb: 1.5,
              }}
            >
              <BoltIcon />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: INK }}>
              No workflows yet
            </Typography>
            <Typography sx={{ color: SUBTLE, mb: 2.5, mt: 0.5 }}>
              Create your first automation to react to leads, content and performance in real time.
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{
                px: 2.5,
                py: 1.1,
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
              New workflow
            </Button>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {workflows.map((wf) => (
              <Box
                key={wf.id}
                sx={{
                  bgcolor: '#fff',
                  border: `1px solid ${LINE}`,
                  borderRadius: '18px',
                  boxShadow: CARD_SHADOW,
                  p: 2.5,
                  transition: 'transform .18s ease, border-color .18s ease',
                  '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(14,17,22,0.16)' },
                }}
              >
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: '11px',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'rgba(14,17,22,0.05)',
                        color: INK,
                        flexShrink: 0,
                        mt: 0.25,
                      }}
                    >
                      <BoltIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                        <Typography sx={{ fontWeight: 800, color: INK }}>{wf.name}</Typography>
                        <Chip
                          size="small"
                          label={wf.is_active ? 'Enabled' : 'Disabled'}
                          sx={{
                            height: 22,
                            fontWeight: 700,
                            fontSize: 11.5,
                            bgcolor: wf.is_active ? BRAND.tealSoft : 'rgba(14,17,22,0.05)',
                            color: wf.is_active ? BRAND.tealDeep : SUBTLE,
                          }}
                        />
                      </Stack>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 0.75 }}>
                        <Chip
                          size="small"
                          label={triggerLabel[wf.trigger_type] || wf.trigger_type}
                          sx={{ height: 22, fontWeight: 700, fontSize: 11.5, bgcolor: BRAND.amberSoft, color: BRAND.amberDeep }}
                        />
                        <Chip
                          size="small"
                          label={`${wf.actions.length} action${wf.actions.length === 1 ? '' : 's'}`}
                          sx={{ height: 22, fontWeight: 600, fontSize: 11.5, bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE }}
                        />
                        <Chip
                          size="small"
                          label={`${wf.run_count} runs`}
                          sx={{ height: 22, fontWeight: 600, fontSize: 11.5, bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE }}
                        />
                      </Stack>
                      {wf.description && (
                        <Typography sx={{ color: SUBTLE, mt: 1, fontSize: 14 }}>{wf.description}</Typography>
                      )}
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Tooltip title={wf.is_active ? 'Active' : 'Paused'}>
                      <Switch checked={wf.is_active} onChange={() => toggle(wf)} size="small" />
                    </Tooltip>
                    <Tooltip title="Test run">
                      <IconButton onClick={() => runTest(wf)} size="small" sx={{ color: INK }}>
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => openEdit(wf)} size="small" sx={{ color: SUBTLE }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => remove(wf)} size="small">
                        <DeleteIcon fontSize="small" sx={{ color: BRAND.pink }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        )
      ) : (
        <RunsTable runs={runs} triggerLabel={triggerLabel} onOpen={setRunDialog} />
      )}

      {/* Builder dialog */}
      <PremiumDialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md">
        <DialogHero
          icon={<BoltRoundedIcon />}
          title={draft.id ? 'Edit workflow' : 'New workflow'}
          subtitle="Set a trigger, refine with conditions, then choose what happens."
          onClose={() => setDialogOpen(false)}
        />
        <DialogBody>
          <Stack spacing={2.5}>
            <Box>
              <SectionLabel>Workflow basics</SectionLabel>
              <Stack spacing={2}>
                <TextField
                  label="Name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Description (optional)"
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  fullWidth
                  size="small"
                  multiline
                />
              </Stack>
            </Box>

            <Box>
              <SectionLabel>When this happens</SectionLabel>
              <TextField
                select
                value={draft.trigger_type}
                onChange={(e) => setDraft((d) => ({ ...d, trigger_type: e.target.value, conditions: [] }))}
                fullWidth
                size="small"
              >
                {catalog?.triggers.map((t) => (
                  <MenuItem key={t.type} value={t.type}>
                    {t.label} — {t.description}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <SectionLabel sx={{ mb: 0 }}>Only if (all match)</SectionLabel>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addCondition}
                  sx={{ textTransform: 'none', fontWeight: 700, color: INK, borderRadius: '999px' }}
                >
                  Condition
                </Button>
              </Stack>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {draft.conditions.length === 0 && (
                  <Typography sx={{ color: SUBTLE, fontSize: 13 }}>
                    No conditions — runs on every {triggerLabel[draft.trigger_type] || 'event'}.
                  </Typography>
                )}
                {draft.conditions.map((c, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                    <TextField
                      select
                      size="small"
                      value={c.field}
                      onChange={(e) =>
                        setDraft((d) => {
                          const conditions = [...d.conditions];
                          conditions[i] = { ...conditions[i], field: e.target.value };
                          return { ...d, conditions };
                        })
                      }
                      sx={{ minWidth: 150 }}
                    >
                      {(selectedTrigger?.fields || []).map((f) => (
                        <MenuItem key={f} value={f}>
                          {f}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      size="small"
                      value={c.op}
                      onChange={(e) =>
                        setDraft((d) => {
                          const conditions = [...d.conditions];
                          conditions[i] = { ...conditions[i], op: e.target.value };
                          return { ...d, conditions };
                        })
                      }
                      sx={{ minWidth: 110 }}
                    >
                      {OPS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      size="small"
                      placeholder="value"
                      value={c.value}
                      onChange={(e) =>
                        setDraft((d) => {
                          const conditions = [...d.conditions];
                          conditions[i] = { ...conditions[i], value: e.target.value };
                          return { ...d, conditions };
                        })
                      }
                      fullWidth
                    />
                    <IconButton
                      size="small"
                      onClick={() =>
                        setDraft((d) => ({ ...d, conditions: d.conditions.filter((_, j) => j !== i) }))
                      }
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <SectionLabel sx={{ mb: 0 }}>Do this</SectionLabel>
                <TextField
                  select
                  size="small"
                  value=""
                  onChange={(e) => e.target.value && addAction(e.target.value)}
                  sx={{ minWidth: 160 }}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="" disabled>
                    + Add action
                  </MenuItem>
                  {catalog?.actions.map((a) => (
                    <MenuItem key={a.type} value={a.type}>
                      {a.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {draft.actions.length === 0 && (
                  <Typography sx={{ color: SUBTLE, fontSize: 13 }}>Add at least one action.</Typography>
                )}
                {draft.actions.map((a, i) => {
                  const meta = catalog?.actions.find((x) => x.type === a.type);
                  return (
                    <Box
                      key={i}
                      sx={{
                        border: `1px solid ${LINE}`,
                        bgcolor: '#fff',
                        boxShadow: 'none',
                        borderRadius: '16px',
                        p: 2,
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Chip size="small" label={meta?.label || a.type} sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700 }} />
                        <IconButton
                          size="small"
                          onClick={() => setDraft((d) => ({ ...d, actions: d.actions.filter((_, j) => j !== i) }))}
                          sx={{ color: SUBTLE }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Stack spacing={1}>
                        {(meta?.config || []).map((field) => (
                          <TextField
                            key={field}
                            label={field}
                            size="small"
                            value={a.config[field] || ''}
                            onChange={(e) =>
                              setDraft((d) => {
                                const actions = [...d.actions];
                                actions[i] = {
                                  ...actions[i],
                                  config: { ...actions[i].config, [field]: e.target.value },
                                };
                                return { ...d, actions };
                              })
                            }
                            fullWidth
                            helperText={field === 'body' || field === 'text' ? 'Use {{field}} to insert event data' : undefined}
                          />
                        ))}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                checked={draft.is_active}
                onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
              />
              <Typography sx={{ color: INK }}>Active</Typography>
            </Stack>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setDialogOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} sx={inkPillSx}>
            {saving ? 'Saving…' : draft.id ? 'Save changes' : 'Create workflow'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Run detail */}
      <PremiumDialog open={!!runDialog} onClose={() => setRunDialog(null)} maxWidth="sm">
        <DialogHero
          icon={<HistoryRoundedIcon />}
          title="Run detail"
          subtitle={runDialog ? `Trigger: ${runDialog.trigger_type}` : undefined}
          onClose={() => setRunDialog(null)}
          tintSoft="rgba(14,17,22,0.05)"
          tint={INK}
          right={
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mr: 0.5 }}>
              {runDialog && (
                <Chip
                  size="small"
                  label={runDialog.status}
                  sx={{ bgcolor: runStyle(runDialog.status).soft, color: runStyle(runDialog.status).deep, fontWeight: 700 }}
                />
              )}
              {runDialog?.is_test && (
                <Chip size="small" label="test" sx={{ bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE, fontWeight: 600 }} />
              )}
            </Stack>
          }
        />
        <DialogBody>
          {runDialog && (
            <Stack spacing={1.5}>
              {(runDialog.steps || []).map((s, i) => (
                <Stack
                  key={i}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ bgcolor: 'rgba(14,17,22,0.02)', borderRadius: '12px', p: 1.25 }}
                >
                  <Chip
                    size="small"
                    label={s.status}
                    sx={{ bgcolor: runStyle(s.status).soft, color: runStyle(s.status).deep, fontWeight: 700, minWidth: 70 }}
                  />
                  <Typography sx={{ fontWeight: 700, color: INK, minWidth: 70 }}>{s.type}</Typography>
                  <Typography sx={{ color: SUBTLE, fontSize: 13 }}>{s.detail}</Typography>
                </Stack>
              ))}
              {runDialog.error && <Alert severity="error" sx={{ borderRadius: 3 }}>{runDialog.error}</Alert>}
            </Stack>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setRunDialog(null)} sx={ghostPillSx}>
            Close
          </Button>
        </DialogFooter>
      </PremiumDialog>

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

function RunsTable({
  runs,
  triggerLabel,
  onOpen,
}: {
  runs: WorkflowRun[];
  triggerLabel: Record<string, string>;
  onOpen: (r: WorkflowRun) => void;
}) {
  if (runs.length === 0) {
    return (
      <Box
        sx={{
          bgcolor: '#fff',
          border: `1px dashed ${LINE}`,
          borderRadius: CARD_RADIUS,
          boxShadow: CARD_SHADOW,
          textAlign: 'center',
          py: 7,
          px: 3,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(14,17,22,0.05)',
            color: INK,
            mx: 'auto',
            mb: 1.5,
          }}
        >
          <HistoryIcon />
        </Box>
        <Typography sx={{ color: SUBTLE }}>No runs yet. They appear here as workflows fire.</Typography>
      </Box>
    );
  }
  return (
    <Stack spacing={1.25}>
      {runs.map((r) => (
        <Box
          key={r.id}
          onClick={() => onOpen(r)}
          sx={{
            bgcolor: '#fff',
            border: `1px solid ${LINE}`,
            borderRadius: '16px',
            boxShadow: CARD_SHADOW,
            p: 2,
            cursor: 'pointer',
            transition: 'transform .18s ease, border-color .18s ease',
            '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(14,17,22,0.16)' },
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Chip
                size="small"
                label={r.status}
                sx={{ bgcolor: runStyle(r.status).soft, color: runStyle(r.status).deep, fontWeight: 700 }}
              />
              <Typography sx={{ fontWeight: 700, color: INK }}>
                {triggerLabel[r.trigger_type] || r.trigger_type}
              </Typography>
              {r.is_test && (
                <Chip size="small" label="test" sx={{ bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE, fontWeight: 600 }} />
              )}
            </Stack>
            <Typography sx={{ color: SUBTLE, fontSize: 12 }}>
              {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
            </Typography>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
