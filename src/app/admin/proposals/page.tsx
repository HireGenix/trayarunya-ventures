'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Slideshow as SlideshowIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  AutoAwesome as AutoAwesomeIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import type {
  ArtifactType,
  ProposalSummary,
  Proposal,
  DeckSpec,
  ProposalSpec,
} from '@/lib/proposalTypes';

const GOLD = '#ffaf06';

export default function ProposalsPage() {
  const theme = useTheme();
  const [items, setItems] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' | 'info' } | null>(null);
  const [preview, setPreview] = useState<Proposal | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<ArtifactType>('deck');
  const [createPrompt, setCreatePrompt] = useState('');
  const [creating, setCreating] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const authHeaders = useCallback(
    (): HeadersInit => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/proposals', { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      setItems(Array.isArray(data.proposals) ? data.proposals : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const fetchFull = async (id: string): Promise<Proposal | null> => {
    const res = await fetch(`/api/admin/proposals?id=${encodeURIComponent(id)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.proposal || null;
  };

  const download = async (item: ProposalSummary | Proposal) => {
    setBusyId(item.id);
    try {
      const full = 'spec' in item ? (item as Proposal) : await fetchFull(item.id);
      if (!full) {
        setToast({ msg: 'Could not load this document.', sev: 'error' });
        return;
      }
      if (full.type === 'deck') {
        const { buildDeckPptx } = await import('@/lib/pptxBuilder');
        await buildDeckPptx(full.spec as DeckSpec);
      } else {
        const { buildProposalPdf } = await import('@/lib/pdfBuilder');
        await buildProposalPdf(full.spec as ProposalSpec);
      }
      setToast({ msg: 'Download started.', sev: 'success' });
    } catch {
      setToast({ msg: 'Failed to build the file.', sev: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const openPreview = async (summary: ProposalSummary) => {
    setBusyId(summary.id);
    const full = await fetchFull(summary.id);
    setBusyId(null);
    if (full) setPreview(full);
    else setToast({ msg: 'Could not load preview.', sev: 'error' });
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/proposals?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((p) => p.id !== id));
        setToast({ msg: 'Deleted.', sev: 'success' });
      } else {
        setToast({ msg: 'Delete failed.', sev: 'error' });
      }
    } finally {
      setBusyId(null);
    }
  };

  const createNew = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type: createType, prompt: createPrompt.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.proposal) {
        setToast({ msg: data?.message || 'Generation failed.', sev: 'error' });
        return;
      }
      setCreateOpen(false);
      setCreatePrompt('');
      setToast({ msg: 'Created — building file…', sev: 'success' });
      const proposal = data.proposal as Proposal;
      if (proposal.type === 'deck') {
        const { buildDeckPptx } = await import('@/lib/pptxBuilder');
        await buildDeckPptx(proposal.spec as DeckSpec);
      } else {
        const { buildProposalPdf } = await import('@/lib/pdfBuilder');
        await buildProposalPdf(proposal.spec as ProposalSpec);
      }
      load();
    } catch {
      setToast({ msg: 'Something went wrong.', sev: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          background: 'linear-gradient(135deg, #0e1726 0%, #15223a 100%)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Proposals & Decks
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.8, maxWidth: 560 }}>
            Every AI-generated PowerPoint deck and PDF proposal, branded with the Trayarunya kit.
            Preview, re-download, or generate a new one.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={load} sx={{ color: '#fff', bgcolor: alpha('#fff', 0.1) }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ bgcolor: GOLD, color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#ffc046' } }}
          >
            New document
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Card
          elevation={0}
          sx={{ borderRadius: 4, border: '1px dashed', borderColor: 'divider', p: 6, textAlign: 'center' }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 48, color: GOLD, mb: 2 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>
            No documents yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Generate a branded deck or proposal here, or from the AI Assistant chat using the ✨ button.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ bgcolor: GOLD, color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#ffc046' } }}
          >
            Create your first document
          </Button>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {items.map((p) => {
            const isDeck = p.type === 'deck';
            const color = isDeck ? theme.palette.primary.main : theme.palette.error.main;
            return (
              <Card
                key={p.id}
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'transform .2s, box-shadow .2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.1)' },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(color, 0.12),
                        color,
                      }}
                    >
                      {isDeck ? <SlideshowIcon /> : <PictureAsPdfIcon />}
                    </Box>
                    <Chip
                      label={isDeck ? 'PowerPoint' : 'PDF Proposal'}
                      size="small"
                      sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 600 }}
                    />
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.5 }}>
                    {p.title}
                  </Typography>
                  {p.client && (
                    <Typography variant="body2" color="text.secondary">
                      For {p.client}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                    {fmtDate(p.createdAt)} · {p.createdBy}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 0.5 }}>
                  <Button
                    size="small"
                    startIcon={busyId === p.id ? <CircularProgress size={14} /> : <DownloadIcon />}
                    onClick={() => download(p)}
                    disabled={busyId === p.id}
                    variant="contained"
                    sx={{ bgcolor: color, '&:hover': { bgcolor: color }, fontWeight: 600 }}
                  >
                    Download
                  </Button>
                  <Tooltip title="Preview">
                    <IconButton size="small" onClick={() => openPreview(p)} disabled={busyId === p.id}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Box sx={{ flexGrow: 1 }} />
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => remove(p.id)} disabled={busyId === p.id}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Generate a new document</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Type"
            value={createType}
            onChange={(e) => setCreateType(e.target.value as ArtifactType)}
            sx={{ mt: 1, mb: 2 }}
          >
            <MenuItem value="deck">PowerPoint deck (.pptx)</MenuItem>
            <MenuItem value="proposal">PDF proposal (.pdf)</MenuItem>
          </TextField>
          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Brief"
            placeholder="e.g. A pitch deck for a B2B SaaS client targeting CFOs, focused on LinkedIn-led pipeline and a 90-day plan."
            value={createPrompt}
            onChange={(e) => setCreatePrompt(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            The AI writes the content; it&apos;s rendered with Trayarunya&apos;s brand templates and saved here.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createNew}
            disabled={creating}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            sx={{ bgcolor: GOLD, color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#ffc046' } }}
          >
            {creating ? 'Generating…' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {preview?.title}
          {preview?.client ? ` — ${preview.client}` : ''}
        </DialogTitle>
        <DialogContent dividers>{preview && <PreviewBody proposal={preview} />}</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPreview(null)}>Close</Button>
          {preview && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => preview && download(preview)}
              sx={{ fontWeight: 600 }}
            >
              Download {preview.type === 'deck' ? '.pptx' : '.pdf'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert onClose={() => setToast(null)} severity={toast.sev} variant="filled" sx={{ width: '100%' }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

function PreviewBody({ proposal }: { proposal: Proposal }) {
  if (proposal.type === 'deck') {
    const spec = proposal.spec as DeckSpec;
    return (
      <Box>
        {spec.subtitle && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {spec.subtitle}
          </Typography>
        )}
        {(spec.slides || []).map((s, i) => (
          <Box key={i} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Chip label={`${i + 1}. ${s.layout}`} size="small" sx={{ mb: 1 }} />
            {s.kicker && (
              <Typography variant="caption" sx={{ color: '#ffaf06', fontWeight: 700, letterSpacing: 1, display: 'block', textTransform: 'uppercase' }}>
                {s.kicker}
              </Typography>
            )}
            {s.heading && (
              <Typography variant="subtitle1" fontWeight={700}>
                {s.heading}
              </Typography>
            )}
            {s.subheading && (
              <Typography variant="body2" color="text.secondary">
                {s.subheading}
              </Typography>
            )}
            {s.quote && <Typography sx={{ fontStyle: 'italic' }}>&ldquo;{s.quote}&rdquo;</Typography>}
            {Array.isArray(s.bullets) && (
              <ul style={{ marginTop: 4 }}>
                {s.bullets.map((b, j) => (
                  <li key={j}>
                    <Typography variant="body2">{b}</Typography>
                  </li>
                ))}
              </ul>
            )}
            {Array.isArray(s.cards) && s.cards.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1, mt: 1 }}>
                {s.cards.map((c, j) => (
                  <Box key={j} sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight={700}>
                      {c.badge ? `${c.badge} · ` : ''}{c.title}
                    </Typography>
                    {c.body && (
                      <Typography variant="caption" color="text.secondary">
                        {c.body}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}
            {(Array.isArray(s.left) || Array.isArray(s.right)) && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
                {[{ h: s.leftHeading, items: s.left }, { h: s.rightHeading, items: s.right }].map((col, j) => (
                  <Box key={j}>
                    {col.h && (
                      <Typography variant="caption" fontWeight={700} color={j === 0 ? 'error.main' : 'success.main'}>
                        {col.h}
                      </Typography>
                    )}
                    <ul style={{ marginTop: 2, paddingLeft: 18 }}>
                      {(col.items || []).map((it, k) => (
                        <li key={k}><Typography variant="body2">{it}</Typography></li>
                      ))}
                    </ul>
                  </Box>
                ))}
              </Box>
            )}
            {Array.isArray(s.phases) && s.phases.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {s.phases.map((p, j) => (
                  <Box key={j} sx={{ display: 'flex', gap: 1, py: 0.25 }}>
                    <Typography variant="body2" fontWeight={700} color="primary">{p.phase}</Typography>
                    {p.detail && <Typography variant="body2" color="text.secondary">— {p.detail}</Typography>}
                  </Box>
                ))}
              </Box>
            )}
            {Array.isArray(s.stats) && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                {s.stats.map((st, j) => (
                  <Box key={j}>
                    <Typography variant="h6" fontWeight={800} color="primary">
                      {st.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {st.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  }
  const spec = proposal.spec as ProposalSpec;
  return (
    <Box>
      {spec.intro && <Typography sx={{ mb: 2, fontStyle: 'italic' }}>{spec.intro}</Typography>}
      {(spec.sections || []).map((sec, i) => (
        <Box key={i} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {sec.heading}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {sec.body}
          </Typography>
          {Array.isArray(sec.bullets) && (
            <ul>
              {sec.bullets.map((b, j) => (
                <li key={j}>
                  <Typography variant="body2">{b}</Typography>
                </li>
              ))}
            </ul>
          )}
        </Box>
      ))}
      {Array.isArray(spec.pricing) && spec.pricing.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Investment
          </Typography>
          {spec.pricing.map((p, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">{p.item}</Typography>
              <Typography variant="body2" fontWeight={700} color="success.main">
                {p.price}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      {spec.cta && (
        <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: alpha('#ffaf06', 0.15) }}>
          <Typography fontWeight={700}>{spec.cta}</Typography>
        </Box>
      )}
    </Box>
  );
}
