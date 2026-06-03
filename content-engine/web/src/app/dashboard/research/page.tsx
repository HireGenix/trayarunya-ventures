'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useAuth } from '@/lib/auth';
import {
  Research,
  Strategies,
  type Competitor,
  type Insight,
  type ResearchJob,
} from '@/lib/api';

const STATUS_COLOR: Record<ResearchJob['status'], 'default' | 'info' | 'success' | 'error'> = {
  queued: 'default',
  running: 'info',
  succeeded: 'success',
  failed: 'error',
};

export default function ResearchPage() {
  const { activeWorkspace } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [topic, setTopic] = useState('');
  const [url, setUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ResearchJob | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [editJob, setEditJob] = useState<ResearchJob | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setJobs(await Research.list());
    } catch {
      setJobs([]);
    }
  }, []);

  useEffect(() => {
    if (activeWorkspace) loadJobs();
  }, [activeWorkspace, loadJobs]);

  // Poll while any job is queued/running.
  useEffect(() => {
    const active = jobs.some((j) => j.status === 'queued' || j.status === 'running');
    if (active && !pollRef.current) {
      pollRef.current = setInterval(loadJobs, 4000);
    } else if (!active && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobs, loadJobs]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const job = await Research.create({ topic, target_url: url || undefined });
      setTopic('');
      setUrl('');
      setJobs((prev) => [job, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start research');
    } finally {
      setCreating(false);
    }
  };

  const openJob = async (job: ResearchJob) => {
    setSelected(job);
    setInsights([]);
    setCompetitors([]);
    if (job.status === 'succeeded') {
      const [ins, comps] = await Promise.all([
        Research.insights(job.id).catch(() => []),
        Research.competitors(job.id).catch(() => []),
      ]);
      setInsights(ins);
      setCompetitors(comps);
    }
  };

  const generateStrategy = async () => {
    if (!selected) return;
    setGenLoading(true);
    try {
      const strat = await Strategies.create({ research_job_id: selected.id });
      router.push(`/dashboard/strategy?focus=${strat.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Strategy generation failed');
    } finally {
      setGenLoading(false);
    }
  };

  const deleteJob = async (job: ResearchJob) => {
    if (!confirm(`Delete research "${job.topic}"? This cannot be undone.`)) return;
    try {
      await Research.remove(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      if (selected?.id === job.id) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const openEdit = (job: ResearchJob) => {
    setEditJob(job);
    setEditTopic(job.topic);
  };

  const saveEdit = async () => {
    if (!editJob || !editTopic.trim()) return;
    try {
      const updated = await Research.update(editJob.id, { topic: editTopic.trim() });
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      if (selected?.id === updated.id) setSelected(updated);
      setEditJob(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const findings = (selected?.findings || {}) as Record<string, string[]>;

  return (
    <>
    <Grid container spacing={3}>
      {/* Left: create + list */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              New deep research
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <form onSubmit={onCreate}>
              <Stack spacing={2}>
                <TextField
                  label="Topic / market"
                  placeholder="B2B SaaS demand gen on LinkedIn"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Brand website (optional)"
                  placeholder="https://yourbrand.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  fullWidth
                />
                <Button type="submit" variant="contained" color="primary" disabled={creating}>
                  {creating ? 'Starting…' : 'Run research'}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          RECENT JOBS
        </Typography>
        <Stack spacing={1.5}>
          {jobs.length === 0 && (
            <Typography color="text.secondary">No research yet.</Typography>
          )}
          {jobs.map((job) => (
            <Card key={job.id} variant="outlined">
              <CardActionArea onClick={() => openJob(job)} sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={600} sx={{ pr: 1 }}>
                    {job.topic}
                  </Typography>
                  <Chip
                    label={job.status}
                    size="small"
                    color={STATUS_COLOR[job.status]}
                    variant={job.status === 'queued' ? 'outlined' : 'filled'}
                  />
                </Stack>
                {(job.status === 'queued' || job.status === 'running') && (
                  <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />
                )}
              </CardActionArea>
              <Stack
                direction="row"
                justifyContent="flex-end"
                spacing={0.5}
                sx={{ px: 1, pb: 0.5 }}
              >
                <Tooltip title="Rename">
                  <IconButton size="small" onClick={() => openEdit(job)} aria-label="edit">
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => deleteJob(job)} aria-label="delete">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Grid>

      {/* Right: detail */}
      <Grid size={{ xs: 12, md: 7 }}>
        {!selected ? (
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>Select a research job to see findings, insights and competitors.</Typography>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="h5" fontWeight={800} sx={{ pr: 2 }}>
                  {selected.topic}
                </Typography>
                <Chip label={selected.status} color={STATUS_COLOR[selected.status]} />
              </Stack>

              {selected.status === 'failed' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {selected.error || 'Research failed.'}
                </Alert>
              )}

              {(selected.status === 'queued' || selected.status === 'running') && (
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <CircularProgress sx={{ mb: 1 }} />
                  <Typography color="text.secondary">
                    Agents are searching the web and crawling pages…
                  </Typography>
                </Box>
              )}

              {selected.status === 'succeeded' && (
                <Box sx={{ mt: 2 }}>
                  {selected.summary && (
                    <Typography sx={{ mb: 3 }} color="text.secondary">
                      {selected.summary}
                    </Typography>
                  )}

                  {Object.entries(findings).map(([key, values]) =>
                    Array.isArray(values) && values.length ? (
                      <Box key={key} sx={{ mb: 2.5 }}>
                        <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 0.5 }}>
                          {key.replace(/_/g, ' ')}
                        </Typography>
                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                          {values.map((v, i) => (
                            <Chip key={i} label={v} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    ) : null
                  )}

                  {competitors.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Competitors
                      </Typography>
                      {competitors.map((c) => (
                        <Box key={c.id} sx={{ mb: 2 }}>
                          <Typography fontWeight={700}>{c.name}</Typography>
                          {c.positioning && (
                            <Typography variant="body2" color="text.secondary">
                              {c.positioning}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </>
                  )}

                  {insights.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Audience insights ({insights.length})
                      </Typography>
                      <List dense>
                        {insights.slice(0, 20).map((i) => (
                          <ListItem key={i.id} disableGutters>
                            <ListItemText
                              primary={i.text}
                              secondary={`${i.kind}${i.intent ? ` · ${i.intent}` : ''}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}

                  <Divider sx={{ my: 2 }} />
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={generateStrategy}
                    disabled={genLoading}
                  >
                    {genLoading ? 'Generating strategy…' : 'Generate strategy from this research'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>

    <Dialog open={!!editJob} onClose={() => setEditJob(null)} fullWidth maxWidth="sm">
      <DialogTitle>Rename research</DialogTitle>
      <DialogContent>
        <TextField
          label="Topic / market"
          value={editTopic}
          onChange={(e) => setEditTopic(e.target.value)}
          fullWidth
          autoFocus
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditJob(null)} color="inherit">
          Cancel
        </Button>
        <Button onClick={saveEdit} variant="contained" disabled={!editTopic.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
