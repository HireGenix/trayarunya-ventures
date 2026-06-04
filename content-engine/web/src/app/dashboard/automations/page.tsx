'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import EditIcon from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import { useAuth } from '@/lib/auth';
import {
  Automation,
  type AutomationCatalog,
  type Workflow,
  type WorkflowCondition,
  type WorkflowAction,
  type WorkflowRun,
} from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

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

const RUN_COLOR: Record<string, string> = {
  success: BRAND.teal,
  partial: BRAND.amber,
  failed: BRAND.pink,
  skipped: SUBTLE,
};

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
        <Alert severity="info">Select a workspace to manage automations.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: CANVAS, minHeight: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <BoltIcon sx={{ color: BRAND.amber }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: INK }}>
              Automation
            </Typography>
          </Stack>
          <Typography sx={{ color: SUBTLE, mt: 0.5 }}>
            Turn real marketing signals into automatic actions — Slack, email, tasks, CRM webhooks.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          disabled={!catalog}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: BRAND.teal }}
        >
          New Workflow
        </Button>
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Workflows (${workflows.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
        <Tab label="Run History" sx={{ textTransform: 'none', fontWeight: 700 }} />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        workflows.length === 0 ? (
          <Card sx={{ border: `1px dashed ${BORDER}`, boxShadow: 'none', borderRadius: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <BoltIcon sx={{ fontSize: 48, color: BRAND.amber, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: INK }}>
                No workflows yet
              </Typography>
              <Typography sx={{ color: SUBTLE, mb: 2 }}>
                Create your first automation to react to leads, content and performance in real time.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ textTransform: 'none', bgcolor: BRAND.teal }}>
                New Workflow
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {workflows.map((wf) => (
              <Card key={wf.id} sx={{ border: `1px solid ${BORDER}`, boxShadow: 'none', borderRadius: 3 }}>
                <CardContent>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 800, color: INK }}>{wf.name}</Typography>
                        <Chip
                          size="small"
                          label={triggerLabel[wf.trigger_type] || wf.trigger_type}
                          sx={{ bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, fontWeight: 700 }}
                        />
                        <Chip
                          size="small"
                          label={`${wf.actions.length} action${wf.actions.length === 1 ? '' : 's'}`}
                          variant="outlined"
                        />
                        <Chip size="small" label={`${wf.run_count} runs`} variant="outlined" />
                      </Stack>
                      {wf.description && (
                        <Typography sx={{ color: SUBTLE, mt: 0.75, fontSize: 14 }}>{wf.description}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Tooltip title={wf.is_active ? 'Active' : 'Paused'}>
                        <Switch checked={wf.is_active} onChange={() => toggle(wf)} size="small" />
                      </Tooltip>
                      <Tooltip title="Test run">
                        <IconButton onClick={() => runTest(wf)} size="small">
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => openEdit(wf)} size="small">
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
                </CardContent>
              </Card>
            ))}
          </Stack>
        )
      ) : (
        <RunsTable runs={runs} triggerLabel={triggerLabel} onOpen={setRunDialog} />
      )}

      {/* Builder dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{draft.id ? 'Edit Workflow' : 'New Workflow'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
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

            <Box>
              <Typography sx={{ fontWeight: 700, color: INK, mb: 1 }}>When this happens</Typography>
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
                <Typography sx={{ fontWeight: 700, color: INK }}>Only if (all match)</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addCondition} sx={{ textTransform: 'none' }}>
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
                <Typography sx={{ fontWeight: 700, color: INK }}>Do this</Typography>
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
                    <Card key={i} sx={{ border: `1px solid ${BORDER}`, boxShadow: 'none', borderRadius: 2 }}>
                      <CardContent sx={{ pb: '12px !important' }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Chip size="small" label={meta?.label || a.type} sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700 }} />
                          <IconButton
                            size="small"
                            onClick={() => setDraft((d) => ({ ...d, actions: d.actions.filter((_, j) => j !== i) }))}
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
                      </CardContent>
                    </Card>
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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: BRAND.teal }}
          >
            {saving ? 'Saving…' : draft.id ? 'Save Changes' : 'Create Workflow'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Run detail */}
      <Dialog open={!!runDialog} onClose={() => setRunDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <HistoryIcon />
            <span>Run detail</span>
            {runDialog && (
              <Chip
                size="small"
                label={runDialog.status}
                sx={{ bgcolor: `${RUN_COLOR[runDialog.status]}22`, color: RUN_COLOR[runDialog.status], fontWeight: 700 }}
              />
            )}
            {runDialog?.is_test && <Chip size="small" label="test" variant="outlined" />}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {runDialog && (
            <Stack spacing={1.5}>
              <Typography sx={{ fontSize: 13, color: SUBTLE }}>
                Trigger: {runDialog.trigger_type}
              </Typography>
              <Divider />
              {(runDialog.steps || []).map((s, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    label={s.status}
                    sx={{ bgcolor: `${RUN_COLOR[s.status] || SUBTLE}22`, color: RUN_COLOR[s.status] || SUBTLE, fontWeight: 700, minWidth: 70 }}
                  />
                  <Typography sx={{ fontWeight: 700, color: INK, minWidth: 70 }}>{s.type}</Typography>
                  <Typography sx={{ color: SUBTLE, fontSize: 13 }}>{s.detail}</Typography>
                </Stack>
              ))}
              {runDialog.error && <Alert severity="error">{runDialog.error}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRunDialog(null)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

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
      <Card sx={{ border: `1px dashed ${BORDER}`, boxShadow: 'none', borderRadius: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <HistoryIcon sx={{ fontSize: 40, color: SUBTLE, mb: 1 }} />
          <Typography sx={{ color: SUBTLE }}>No runs yet. They appear here as workflows fire.</Typography>
        </CardContent>
      </Card>
    );
  }
  return (
    <Stack spacing={1}>
      {runs.map((r) => (
        <Card
          key={r.id}
          onClick={() => onOpen(r)}
          sx={{ border: `1px solid ${BORDER}`, boxShadow: 'none', borderRadius: 2, cursor: 'pointer' }}
        >
          <CardContent sx={{ py: '12px !important' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <Chip
                  size="small"
                  label={r.status}
                  sx={{ bgcolor: `${RUN_COLOR[r.status]}22`, color: RUN_COLOR[r.status], fontWeight: 700 }}
                />
                <Typography sx={{ fontWeight: 700, color: INK }}>
                  {triggerLabel[r.trigger_type] || r.trigger_type}
                </Typography>
                {r.is_test && <Chip size="small" label="test" variant="outlined" />}
              </Stack>
              <Typography sx={{ color: SUBTLE, fontSize: 12 }}>
                {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
