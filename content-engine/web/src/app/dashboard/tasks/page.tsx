'use client';

import { useCallback, useEffect, useState } from 'react';
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
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TaskAltIcon from '@mui/icons-material/TaskAltOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import BoltIcon from '@mui/icons-material/BoltOutlined';
import { useAuth } from '@/lib/auth';
import { Automation, type AutomationTask } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

const COLUMNS: { key: AutomationTask['status']; label: string; color: string }[] = [
  { key: 'open', label: 'Open', color: BRAND.amber },
  { key: 'in_progress', label: 'In Progress', color: BRAND.teal },
  { key: 'done', label: 'Done', color: SUBTLE },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: BRAND.pink,
  normal: BRAND.teal,
  low: SUBTLE,
};

const NEXT_STATUS: Record<string, AutomationTask['status']> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'open',
};

export default function TasksPage() {
  const { activeWorkspace } = useAuth();
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'normal', assignee: '' });

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
      });
      setOpen(false);
      setForm({ title: '', description: '', priority: 'normal', assignee: '' });
      setToast('Task created');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  async function advance(t: AutomationTask) {
    const next = NEXT_STATUS[t.status];
    try {
      const updated = await Automation.updateTask(t.id, { status: next });
      setTasks((ts) => ts.map((x) => (x.id === t.id ? updated : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update task');
    }
  }

  async function remove(t: AutomationTask) {
    try {
      await Automation.deleteTask(t.id);
      setTasks((ts) => ts.filter((x) => x.id !== t.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete task');
    }
  }

  if (!activeWorkspace) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">Select a workspace to manage tasks.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: CANVAS, minHeight: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TaskAltIcon sx={{ color: BRAND.teal }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: INK }}>
              Tasks
            </Typography>
          </Stack>
          <Typography sx={{ color: SUBTLE, mt: 0.5 }}>
            Work created by your team and by automation workflows, in one board.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: BRAND.teal }}
        >
          New Task
        </Button>
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.key);
            return (
              <Box key={col.key} sx={{ flex: 1, width: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color }} />
                  <Typography sx={{ fontWeight: 800, color: INK }}>{col.label}</Typography>
                  <Chip size="small" label={items.length} variant="outlined" />
                </Stack>
                <Stack spacing={1.25}>
                  {items.length === 0 && (
                    <Card sx={{ border: `1px dashed ${BORDER}`, boxShadow: 'none', borderRadius: 2 }}>
                      <CardContent sx={{ py: '16px !important', textAlign: 'center' }}>
                        <Typography sx={{ color: SUBTLE, fontSize: 13 }}>Nothing here</Typography>
                      </CardContent>
                    </Card>
                  )}
                  {items.map((t) => (
                    <Card key={t.id} sx={{ border: `1px solid ${BORDER}`, boxShadow: 'none', borderRadius: 2 }}>
                      <CardContent sx={{ pb: '12px !important' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              color: INK,
                              textDecoration: t.status === 'done' ? 'line-through' : 'none',
                            }}
                          >
                            {t.title}
                          </Typography>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => remove(t)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                        {t.description && (
                          <Typography sx={{ color: SUBTLE, fontSize: 13, mt: 0.5 }}>{t.description}</Typography>
                        )}
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={t.priority}
                            sx={{ bgcolor: `${PRIORITY_COLOR[t.priority]}22`, color: PRIORITY_COLOR[t.priority], fontWeight: 700 }}
                          />
                          {t.source === 'automation' && (
                            <Chip
                              size="small"
                              icon={<BoltIcon sx={{ fontSize: 14 }} />}
                              label="auto"
                              sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700 }}
                            />
                          )}
                          {t.assignee && <Chip size="small" label={t.assignee} variant="outlined" />}
                        </Stack>
                        <Button
                          size="small"
                          onClick={() => advance(t)}
                          sx={{ textTransform: 'none', mt: 1, color: col.color, fontWeight: 700 }}
                        >
                          {t.status === 'open' ? 'Start →' : t.status === 'in_progress' ? 'Complete ✓' : 'Reopen'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>New Task</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                size="small"
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </TextField>
              <TextField
                label="Assignee"
                value={form.assignee}
                onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={create}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: BRAND.teal }}
          >
            {saving ? 'Saving…' : 'Create Task'}
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
