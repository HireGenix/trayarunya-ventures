'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import CalendarTodayIcon from '@mui/icons-material/CalendarTodayRounded';
import { useAuth } from '@/lib/auth';
import { Automation, type AutomationTask } from '@/lib/api';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  FieldGrid,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

type Status = AutomationTask['status'];

const COLUMNS: { key: Status; label: string; color: string; soft: string }[] = [
  { key: 'open', label: 'To-do', color: INK, soft: 'rgba(14,17,22,0.05)' },
  { key: 'in_progress', label: 'In progress', color: BRAND.amberDeep, soft: BRAND.amberSoft },
  { key: 'done', label: 'Done', color: BRAND.tealDeep, soft: BRAND.tealSoft },
];

const PRIORITY: Record<string, { c: string; label: string }> = {
  high: { c: BRAND.pink, label: 'High' },
  normal: { c: BRAND.amberDeep, label: 'Normal' },
  low: { c: BRAND.tealDeep, label: 'Low' },
};

const AVATAR_COLORS = [BRAND.pink, BRAND.teal, BRAND.amberDeep, '#7C3AED', '#2563EB'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function isOverdue(iso: string | null, status: Status): boolean {
  if (!iso || status === 'done') return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now() - 86_400_000;
}
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function Asg({ name, size = 26 }: { name: string; size?: number }) {
  return (
    <Tooltip title={name}>
      <Avatar
        sx={{
          width: size,
          height: size,
          fontSize: size * 0.4,
          fontWeight: 800,
          bgcolor: colorFor(name),
          border: '2px solid #fff',
          boxShadow: '0 2px 6px rgba(0,0,0,.12)',
        }}
      >
        {initials(name)}
      </Avatar>
    </Tooltip>
  );
}

export default function TasksPage() {
  const { activeWorkspace } = useAuth();
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal', assignee: '', due: '' });

  const [active, setActive] = useState<AutomationTask | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setTasks(await Automation.listTasks());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) load();
  }, [activeWorkspace, load]);

  const counts = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    return { total, done, openCount: total - done };
  }, [tasks]);

  const pct = counts.total ? Math.round((counts.done / counts.total) * 100) : 0;

  async function create() {
    if (!form.title.trim()) {
      setErr('Title is required');
      return;
    }
    setSaving(true);
    try {
      await Automation.createTask({
        title: form.title.trim(),
        description: form.description || null,
        priority: form.priority,
        assignee: form.assignee || null,
        due_at: form.due ? new Date(form.due).toISOString() : null,
      });
      setOpen(false);
      setForm({ title: '', description: '', priority: 'normal', assignee: '', due: '' });
      setToast('Card added');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  async function patch(t: AutomationTask, body: Partial<AutomationTask>) {
    try {
      const updated = await Automation.updateTask(t.id, body as never);
      setTasks((ts) => ts.map((x) => (x.id === t.id ? updated : x)));
      setActive((a) => (a && a.id === t.id ? updated : a));
      return updated;
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update task');
      return null;
    }
  }

  function toggleComplete(t: AutomationTask) {
    patch(t, { status: t.status === 'done' ? 'open' : 'done' });
  }

  async function remove(t: AutomationTask) {
    try {
      await Automation.deleteTask(t.id);
      setTasks((ts) => ts.filter((x) => x.id !== t.id));
      setActive((a) => (a && a.id === t.id ? null : a));
      setToast('Card deleted');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete task');
    }
  }

  function onDrop(status: Status) {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const t = tasks.find((x) => x.id === id);
    if (t && t.status !== status) patch(t, { status });
  }

  if (!activeWorkspace) {
    return (
      <Box>
        <Alert severity="info">Select a workspace to manage tasks.</Alert>
      </Box>
    );
  }

  const activeCol = active ? COLUMNS.find((c) => c.key === active.status) : undefined;

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
            {activeWorkspace.name || 'Workspace'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Plan, assign and{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 700,
              }}
            >
              ship
            </Box>{' '}
            the work — one board for the whole team.
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
          New card
        </Button>
      </Stack>

      {/* Toolbar: view toggle + progress + counts */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        flexWrap="wrap"
        rowGap={1.5}
        sx={{ mb: 2.5, px: 0.5 }}
      >
        <Stack direction="row" spacing={0.5}>
          {(['board', 'list'] as const).map((v) => (
            <Button
              key={v}
              disableRipple
              onClick={() => setView(v)}
              sx={{
                px: 2.25,
                py: 0.85,
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: 13.5,
                textTransform: 'none',
                color: view === v ? '#fff' : 'text.secondary',
                bgcolor: view === v ? INK : 'transparent',
                '&:hover': {
                  bgcolor: view === v ? '#1B2330' : 'rgba(14,17,22,0.05)',
                  color: view === v ? '#fff' : INK,
                },
              }}
            >
              {v === 'board' ? 'Board' : 'List'}
            </Button>
          ))}
        </Stack>

        <Box sx={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ flex: 1, maxWidth: 260, height: 6, borderRadius: 999, bgcolor: 'rgba(14,17,22,0.06)', overflow: 'hidden' }}>
            <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: INK, transition: 'width .3s' }} />
          </Box>
          <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14 }}>{pct}%</Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Chip label={`${counts.openCount} open`} sx={{ fontWeight: 700, fontSize: 12.5, bgcolor: BRAND.amberSoft, color: BRAND.amberDeep }} />
          <Chip label={`${counts.done} done`} sx={{ fontWeight: 700, fontSize: 12.5, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }} />
        </Stack>
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : view === 'board' ? (
        /* ---------------- BOARD ---------------- */
        <Stack direction="row" spacing={2.5} alignItems="flex-start" sx={{ overflowX: 'auto', pb: 2, px: 0.5 }}>
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.key);
            const dragging = dragOver === col.key;
            return (
              <Box
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(col.key);
                }}
                onDragLeave={() => setDragOver((s) => (s === col.key ? null : s))}
                onDrop={() => onDrop(col.key)}
                sx={{ flex: '0 0 326px', maxWidth: 326 }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, px: 0.25 }}>
                  <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: col.color }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: INK }}>{col.label}</Typography>
                  <Box
                    sx={{
                      minWidth: 22,
                      height: 22,
                      px: 0.75,
                      borderRadius: 999,
                      bgcolor: col.soft,
                      color: col.color,
                      fontWeight: 700,
                      fontSize: 12,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {items.length}
                  </Box>
                </Stack>

                <Stack
                  spacing={1.5}
                  sx={{
                    p: dragging ? 1 : 0,
                    borderRadius: CARD_RADIUS,
                    bgcolor: dragging ? col.soft : 'transparent',
                    outline: dragging ? `1.5px dashed ${col.color}55` : 'none',
                    transition: 'background .15s',
                    minHeight: 60,
                  }}
                >
                  {items.length === 0 && (
                    <Box
                      sx={{
                        border: `1.5px dashed ${LINE}`,
                        borderRadius: '18px',
                        py: 4,
                        textAlign: 'center',
                        color: SUBTLE,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Drop cards here
                    </Box>
                  )}
                  {items.map((t) => {
                    const overdue = isOverdue(t.due_at, t.status);
                    return (
                      <Box
                        key={t.id}
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOver(null);
                        }}
                        onClick={() => setActive(t)}
                        sx={{
                          position: 'relative',
                          bgcolor: '#fff',
                          borderRadius: '18px',
                          p: 2,
                          cursor: 'pointer',
                          border: `1px solid ${LINE}`,
                          opacity: dragId === t.id ? 0.5 : 1,
                          boxShadow: CARD_SHADOW,
                          transition: 'transform .14s ease, box-shadow .16s ease, border-color .16s ease',
                          '&:hover': { transform: 'translateY(-2px)', borderColor: `${col.color}55` },
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: PRIORITY[t.priority]?.c || SUBTLE }} />
                            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: PRIORITY[t.priority]?.c || SUBTLE, letterSpacing: 0.2 }}>
                              {PRIORITY[t.priority]?.label || t.priority}
                            </Typography>
                          </Stack>
                          {t.source === 'automation' && (
                            <Chip
                              size="small"
                              icon={<BoltIcon sx={{ fontSize: 14 }} />}
                              label="Auto"
                              sx={{
                                height: 22,
                                fontWeight: 700,
                                fontSize: 11,
                                bgcolor: BRAND.amberSoft,
                                color: BRAND.amberDeep,
                                '& .MuiChip-icon': { color: BRAND.amberDeep },
                              }}
                            />
                          )}
                        </Stack>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            color: INK,
                            fontSize: 15,
                            lineHeight: 1.3,
                            textDecoration: t.status === 'done' ? 'line-through' : 'none',
                            opacity: t.status === 'done' ? 0.5 : 1,
                          }}
                        >
                          {t.title}
                        </Typography>
                        {t.description && (
                          <Typography
                            sx={{
                              color: SUBTLE,
                              fontSize: 13,
                              mt: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {t.description}
                          </Typography>
                        )}
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
                          {t.assignee ? (
                            <Asg name={t.assignee} />
                          ) : (
                            <Avatar sx={{ width: 26, height: 26, bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE }}>
                              <PersonAddAlt1Icon sx={{ fontSize: 15 }} />
                            </Avatar>
                          )}
                          {t.due_at && (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                              sx={{
                                px: 1,
                                py: 0.4,
                                borderRadius: 999,
                                bgcolor: overdue ? BRAND.pinkSoft : 'rgba(14,17,22,0.05)',
                                color: overdue ? BRAND.pink : SUBTLE,
                              }}
                            >
                              <CalendarTodayIcon sx={{ fontSize: 13 }} />
                              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{fmtDate(t.due_at)}</Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    justifyContent="center"
                    onClick={() => {
                      setForm((f) => ({ ...f, priority: 'normal' }));
                      setOpen(true);
                    }}
                    sx={{
                      py: 1.25,
                      borderRadius: '14px',
                      color: SUBTLE,
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 13,
                      border: `1px dashed ${LINE}`,
                      '&:hover': { bgcolor: 'rgba(14,17,22,0.03)', color: INK },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 17 }} /> Add a card
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        /* ---------------- LIST ---------------- */
        <Stack spacing={3} sx={{ px: 0.5 }}>
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.key);
            if (col.key === 'done' && items.length === 0) return null;
            return (
              <Box key={col.key}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: col.color }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: INK }}>{col.label}</Typography>
                  <Box
                    sx={{
                      minWidth: 22,
                      height: 22,
                      px: 0.75,
                      borderRadius: 999,
                      bgcolor: col.soft,
                      color: col.color,
                      fontWeight: 700,
                      fontSize: 12,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {items.length}
                  </Box>
                </Stack>
                <Stack spacing={1.25}>
                  {items.length === 0 ? (
                    <Typography sx={{ color: SUBTLE, fontSize: 13, px: 1 }}>Nothing here yet.</Typography>
                  ) : (
                    items.map((t) => {
                      const overdue = isOverdue(t.due_at, t.status);
                      return (
                        <Stack
                          key={t.id}
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                          onClick={() => setActive(t)}
                          sx={{
                            bgcolor: '#fff',
                            border: `1px solid ${LINE}`,
                            borderRadius: '16px',
                            px: 2,
                            py: 1.25,
                            cursor: 'pointer',
                            boxShadow: CARD_SHADOW,
                            transition: 'transform .12s ease, border-color .16s ease',
                            '&:hover': { transform: 'translateY(-1px)', borderColor: `${col.color}55` },
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleComplete(t);
                            }}
                            sx={{ p: 0.25, color: t.status === 'done' ? col.color : 'rgba(14,17,22,0.22)' }}
                          >
                            {t.status === 'done' ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                          </IconButton>
                          <Typography
                            sx={{
                              flex: 1,
                              fontWeight: 700,
                              color: INK,
                              fontSize: 14.5,
                              minWidth: 0,
                              textDecoration: t.status === 'done' ? 'line-through' : 'none',
                              opacity: t.status === 'done' ? 0.5 : 1,
                            }}
                            noWrap
                          >
                            {t.title}
                          </Typography>
                          <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: PRIORITY[t.priority]?.c || SUBTLE, flexShrink: 0 }} />
                          {t.source === 'automation' && <BoltIcon sx={{ fontSize: 16, color: BRAND.amberDeep }} />}
                          {t.due_at && (
                            <Chip
                              size="small"
                              label={fmtDate(t.due_at)}
                              sx={{
                                height: 22,
                                fontWeight: 700,
                                fontSize: 11,
                                bgcolor: overdue ? BRAND.pinkSoft : 'rgba(14,17,22,0.05)',
                                color: overdue ? BRAND.pink : SUBTLE,
                              }}
                            />
                          )}
                          {t.assignee ? (
                            <Asg name={t.assignee} size={24} />
                          ) : (
                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE }}>
                              <PersonAddAlt1Icon sx={{ fontSize: 13 }} />
                            </Avatar>
                          )}
                        </Stack>
                      );
                    })
                  )}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* New card dialog */}
      <PremiumDialog open={open} onClose={() => setOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<AddRoundedIcon />}
          title="New card"
          subtitle="Capture a task and route it to the right column."
          onClose={() => setOpen(false)}
        />
        <DialogBody>
          <Stack spacing={2.25}>
            <Box>
              <SectionLabel>Card details</SectionLabel>
              <Stack spacing={2}>
                <TextField label="Card title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} fullWidth autoFocus />
                <TextField label="Notes" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} fullWidth multiline minRows={2} placeholder="Describe your card here…" />
              </Stack>
            </Box>
            <Box>
              <SectionLabel>Scheduling &amp; ownership</SectionLabel>
              <Stack spacing={2}>
                <FieldGrid>
                  <TextField select label="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} fullWidth>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </TextField>
                  <TextField label="Due on" type="date" value={form.due} onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                </FieldGrid>
                <TextField
                  label="Assigned to"
                  value={form.assignee}
                  onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                  fullWidth
                  placeholder="Name of teammate"
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonAddAlt1Icon fontSize="small" /></InputAdornment> }}
                />
              </Stack>
            </Box>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={create} disabled={saving} sx={inkPillSx}>
            {saving ? 'Adding…' : 'Add card'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Card detail drawer */}
      <Drawer
        anchor="right"
        open={!!active}
        onClose={() => setActive(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 470 }, bgcolor: '#fff' } }}
      >
        {active && activeCol && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ px: 3, pt: 2.5, pb: 2.5, position: 'relative', borderBottom: `1px solid ${LINE}` }}>
              <IconButton
                size="small"
                onClick={() => setActive(null)}
                sx={{ position: 'absolute', right: 12, top: 12, color: SUBTLE, bgcolor: 'rgba(14,17,22,0.04)', '&:hover': { bgcolor: 'rgba(14,17,22,0.08)' } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: activeCol.color }} />
                <Chip label={activeCol.label} size="small" sx={{ fontWeight: 700, fontSize: 12, bgcolor: activeCol.soft, color: activeCol.color }} />
              </Stack>
              <TextField
                value={active.title}
                onChange={(e) => setActive({ ...active, title: e.target.value })}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== tasks.find((x) => x.id === active.id)?.title) patch(active, { title: v });
                }}
                fullWidth
                multiline
                variant="standard"
                InputProps={{ disableUnderline: true, sx: { fontWeight: 800, fontSize: 23, lineHeight: 1.2, color: INK } }}
              />
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.25 }}>
                {active.assignee && <Asg name={active.assignee} size={22} />}
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: SUBTLE }}>
                  {active.source === 'automation' ? 'Created by automation' : `Added by ${active.assignee || 'someone'}`}
                  {active.created_at ? ` · ${fmtDate(active.created_at)}` : ''}
                </Typography>
              </Stack>
            </Box>

            <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
              <Stack spacing={2}>
                <Field label="Status">
                  <Stack direction="row" spacing={1}>
                    {COLUMNS.map((c) => (
                      <Chip
                        key={c.key}
                        label={c.label}
                        onClick={() => patch(active, { status: c.key })}
                        sx={{
                          fontWeight: 700,
                          cursor: 'pointer',
                          color: active.status === c.key ? '#fff' : c.color,
                          bgcolor: active.status === c.key ? c.color : c.soft,
                          '&:hover': { bgcolor: active.status === c.key ? c.color : c.soft, filter: 'brightness(.97)' },
                        }}
                      />
                    ))}
                  </Stack>
                </Field>

                <Field label="Assigned to">
                  <TextField
                    value={active.assignee || ''}
                    onChange={(e) => setActive({ ...active, assignee: e.target.value })}
                    onBlur={(e) => patch(active, { assignee: e.target.value.trim() || null })}
                    fullWidth
                    size="small"
                    placeholder="Add assignee…"
                    InputProps={{
                      sx: { borderRadius: 999 },
                      startAdornment: active.assignee ? (
                        <InputAdornment position="start"><Asg name={active.assignee} size={22} /></InputAdornment>
                      ) : undefined,
                    }}
                  />
                </Field>

                <Stack direction="row" spacing={2}>
                  <Field label="Due on" flex>
                    <TextField
                      type="date"
                      value={toDateInput(active.due_at)}
                      onChange={(e) => patch(active, { due_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      size="small"
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Field>
                  <Field label="Priority" flex>
                    <TextField
                      select
                      value={active.priority}
                      onChange={(e) => patch(active, { priority: e.target.value as AutomationTask['priority'] })}
                      size="small"
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </TextField>
                  </Field>
                </Stack>

                <Field label="Notes">
                  <TextField
                    value={active.description || ''}
                    onChange={(e) => setActive({ ...active, description: e.target.value })}
                    onBlur={(e) => patch(active, { description: e.target.value.trim() || null })}
                    fullWidth
                    multiline
                    minRows={3}
                    size="small"
                    placeholder="Add details, links or context…"
                    InputProps={{ sx: { borderRadius: 3 } }}
                  />
                </Field>
              </Stack>

              <Button
                fullWidth
                startIcon={active.status === 'done' ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                onClick={() => toggleComplete(active)}
                sx={{
                  mt: 3,
                  py: 1.2,
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '999px',
                  color: '#fff',
                  background: active.status === 'done' ? BRAND.tealDeep : INK,
                  backgroundImage: 'none',
                  '&:hover': { background: active.status === 'done' ? BRAND.teal : '#1B2330' },
                }}
              >
                {active.status === 'done' ? 'Completed' : 'Mark as complete'}
              </Button>
            </Box>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 1.5, borderTop: `1px solid ${LINE}` }}>
              <Typography sx={{ color: SUBTLE, fontSize: 12 }}>{active.created_at ? `Created ${fmtDate(active.created_at)}` : ''}</Typography>
              <Button onClick={() => remove(active)} startIcon={<DeleteIcon />} sx={{ textTransform: 'none', fontWeight: 700, color: BRAND.pink }}>
                Delete
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>

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

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <Box sx={{ flex: flex ? 1 : undefined }}>
      <Typography sx={{ color: SUBTLE, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.75 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}
