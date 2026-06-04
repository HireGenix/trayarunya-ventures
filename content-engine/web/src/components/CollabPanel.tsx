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
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/SendOutlined';
import DoneIcon from '@mui/icons-material/DoneAllOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import EditNoteIcon from '@mui/icons-material/EditNoteOutlined';
import HistoryIcon from '@mui/icons-material/HistoryOutlined';
import RestoreIcon from '@mui/icons-material/RestoreOutlined';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import {
  Collab,
  type CollabEntity,
  type CollabComment,
  type CollabApproval,
  type ContentVersion,
} from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

type ApprovalStatus = CollabApproval['status'];

const STATUS_META: Record<ApprovalStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: BRAND.amberDeep, bg: BRAND.amberSoft },
  approved: { label: 'Approved', color: BRAND.tealDeep, bg: BRAND.tealSoft },
  changes_requested: { label: 'Changes requested', color: BRAND.amberDeep, bg: BRAND.amberSoft },
  rejected: { label: 'Rejected', color: BRAND.pink, bg: BRAND.pinkSoft },
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export interface CollabPanelProps {
  entityType: CollabEntity;
  entityId: string;
  contentItemId?: string;
}

export default function CollabPanel({ entityType, entityId, contentItemId }: CollabPanelProps) {
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  // Comments
  const [comments, setComments] = useState<CollabComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Approvals
  const [current, setCurrent] = useState<CollabApproval | null>(null);
  const [history, setHistory] = useState<CollabApproval[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [note, setNote] = useState('');
  const [savingApproval, setSavingApproval] = useState(false);

  // Versions
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);

  const loadComments = useCallback(() => {
    setCommentsLoading(true);
    Collab.listComments(entityType, entityId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [entityType, entityId]);

  const loadApprovals = useCallback(() => {
    setApprovalsLoading(true);
    Collab.getApprovals(entityType, entityId)
      .then((res) => {
        setCurrent(res.current);
        setHistory(res.history);
      })
      .catch(() => {
        setCurrent(null);
        setHistory([]);
      })
      .finally(() => setApprovalsLoading(false));
  }, [entityType, entityId]);

  const loadVersions = useCallback(() => {
    if (!contentItemId) return;
    setVersionsLoading(true);
    Collab.listVersions(contentItemId)
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setVersionsLoading(false));
  }, [contentItemId]);

  useEffect(() => {
    loadComments();
    loadApprovals();
    loadVersions();
  }, [loadComments, loadApprovals, loadVersions]);

  // ── Comment actions ──
  const handleAddComment = async () => {
    const body = newComment.trim();
    if (!body) return;
    setPosting(true);
    try {
      const created = await Collab.createComment({ entity_type: entityType, entity_id: entityId, body });
      setComments((prev) => [created, ...prev]);
      setNewComment('');
      setToast({ msg: 'Comment added', sev: 'success' });
    } catch {
      setToast({ msg: 'Failed to add comment', sev: 'error' });
    } finally {
      setPosting(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const updated = await Collab.resolveComment(id);
      setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch {
      setToast({ msg: 'Failed to resolve comment', sev: 'error' });
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await Collab.deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      setToast({ msg: 'Comment deleted', sev: 'success' });
    } catch {
      setToast({ msg: 'Failed to delete comment', sev: 'error' });
    }
  };

  // ── Approval actions ──
  const setApproval = async (status: ApprovalStatus) => {
    setSavingApproval(true);
    try {
      const created = await Collab.createApproval({
        entity_type: entityType,
        entity_id: entityId,
        status,
        note: note.trim() || undefined,
      });
      setCurrent(created);
      setHistory((prev) => [created, ...prev]);
      setNote('');
      setToast({ msg: 'Approval updated', sev: 'success' });
    } catch {
      setToast({ msg: 'Failed to update approval', sev: 'error' });
    } finally {
      setSavingApproval(false);
    }
  };

  // ── Version actions ──
  const handleSaveVersion = async () => {
    if (!contentItemId) return;
    setSavingVersion(true);
    try {
      const created = await Collab.createVersion(contentItemId);
      setVersions((prev) => [created, ...prev]);
      setToast({ msg: 'Version saved', sev: 'success' });
    } catch {
      setToast({ msg: 'Failed to save version', sev: 'error' });
    } finally {
      setSavingVersion(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!contentItemId) return;
    try {
      const restored = await Collab.restoreVersion(contentItemId, versionId);
      setVersions((prev) => [restored, ...prev]);
      setToast({ msg: `Restored to version ${restored.version}`, sev: 'success' });
    } catch {
      setToast({ msg: 'Failed to restore version', sev: 'error' });
    }
  };

  return (
    <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff' }}>
      <Box sx={{ borderBottom: `1px solid ${BORDER}` }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 800, color: SUBTLE, minHeight: 48 },
            '& .Mui-selected': { color: `${INK} !important` },
            '& .MuiTabs-indicator': { backgroundColor: BRAND.teal },
          }}
        >
          <Tab label={`Comments${comments.length ? ` (${comments.length})` : ''}`} />
          <Tab label="Approval" />
          {contentItemId && <Tab label={`Versions${versions.length ? ` (${versions.length})` : ''}`} />}
        </Tabs>
      </Box>

      <CardContent sx={{ p: 2.5 }}>
        {/* ── Comments tab ── */}
        {tab === 0 && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                fullWidth
                size="small"
                multiline
                maxRows={4}
                placeholder="Add a comment…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button
                variant="contained"
                onClick={handleAddComment}
                disabled={posting || !newComment.trim()}
                startIcon={posting ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
                sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, color: INK, background: BRAND.gradient, whiteSpace: 'nowrap' }}
              >
                Post
              </Button>
            </Stack>

            {commentsLoading ? (
              <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 120 }}><CircularProgress size={24} /></Box>
            ) : comments.length === 0 ? (
              <Typography variant="body2" sx={{ color: SUBTLE, textAlign: 'center', py: 3 }}>
                No comments yet. Start the conversation.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {comments.map((c) => (
                  <Box key={c.id} sx={{ p: 1.75, borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" fontWeight={800} sx={{ color: INK }}>
                          {c.author_name || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: SUBTLE }}>{fmtDate(c.created_at)}</Typography>
                        {c.resolved && (
                          <Chip size="small" label="Resolved" sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }} />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        {!c.resolved && (
                          <Tooltip title="Resolve">
                            <IconButton size="small" onClick={() => handleResolve(c.id)} sx={{ color: BRAND.tealDeep }}>
                              <DoneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteComment(c.id)} sx={{ color: BRAND.pink }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                    <Typography variant="body2" sx={{ color: INK, whiteSpace: 'pre-wrap' }}>{c.body}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        )}

        {/* ── Approval tab ── */}
        {tab === 1 && (
          <Stack spacing={2}>
            {approvalsLoading ? (
              <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 120 }}><CircularProgress size={24} /></Box>
            ) : (
              <>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="body2" sx={{ color: SUBTLE, fontWeight: 700 }}>Current status</Typography>
                  {current ? (
                    <Chip
                      label={STATUS_META[current.status].label}
                      sx={{ fontWeight: 800, color: STATUS_META[current.status].color, bgcolor: STATUS_META[current.status].bg }}
                    />
                  ) : (
                    <Chip label="No review yet" sx={{ fontWeight: 800, color: SUBTLE, bgcolor: CANVAS, border: `1px solid ${BORDER}` }} />
                  )}
                </Stack>

                {current?.note && (
                  <Box sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                    <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 700 }}>Latest note</Typography>
                    <Typography variant="body2" sx={{ color: INK, whiteSpace: 'pre-wrap' }}>{current.note}</Typography>
                  </Box>
                )}

                <TextField
                  fullWidth
                  size="small"
                  multiline
                  maxRows={3}
                  label="Note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => setApproval('approved')}
                    disabled={savingApproval}
                    startIcon={<CheckCircleIcon />}
                    sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, bgcolor: BRAND.tealDeep, '&:hover': { bgcolor: BRAND.teal } }}
                  >
                    Approve
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setApproval('changes_requested')}
                    disabled={savingApproval}
                    startIcon={<EditNoteIcon />}
                    sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, color: BRAND.amberDeep, borderColor: BRAND.amber }}
                  >
                    Request changes
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setApproval('rejected')}
                    disabled={savingApproval}
                    startIcon={<CancelIcon />}
                    sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, color: BRAND.pink, borderColor: BRAND.pink }}
                  >
                    Reject
                  </Button>
                </Stack>

                {history.length > 0 && (
                  <>
                    <Divider />
                    <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      History
                    </Typography>
                    <Stack spacing={1}>
                      {history.map((h) => (
                        <Stack key={h.id} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${BORDER}` }}>
                          <Chip
                            size="small"
                            label={STATUS_META[h.status].label}
                            sx={{ height: 22, fontWeight: 800, color: STATUS_META[h.status].color, bgcolor: STATUS_META[h.status].bg }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {h.note && <Typography variant="body2" sx={{ color: INK }} noWrap>{h.note}</Typography>}
                            <Typography variant="caption" sx={{ color: SUBTLE }}>
                              {h.reviewer_name || 'System'} · {fmtDate(h.created_at)}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                )}
              </>
            )}
          </Stack>
        )}

        {/* ── Versions tab ── */}
        {tab === 2 && contentItemId && (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <HistoryIcon sx={{ color: SUBTLE }} />
                <Typography variant="body2" fontWeight={800} sx={{ color: INK }}>Version history</Typography>
              </Stack>
              <Button
                variant="contained"
                onClick={handleSaveVersion}
                disabled={savingVersion}
                startIcon={savingVersion ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800, color: INK, background: BRAND.gradient }}
              >
                Save version
              </Button>
            </Stack>

            {versionsLoading ? (
              <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 120 }}><CircularProgress size={24} /></Box>
            ) : versions.length === 0 ? (
              <Typography variant="body2" sx={{ color: SUBTLE, textAlign: 'center', py: 3 }}>
                No saved versions yet.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {versions.map((v) => (
                  <Stack key={v.id} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: CANVAS }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: 2, flexShrink: 0, display: 'grid', placeItems: 'center', bgcolor: BRAND.tealSoft }}>
                      <Typography fontWeight={900} sx={{ color: BRAND.tealDeep, fontSize: 14 }}>v{v.version}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: INK }} noWrap>
                        {v.note || v.title || `Version ${v.version}`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: SUBTLE }}>
                        {v.author_name ? `${v.author_name} · ` : ''}{fmtDate(v.created_at)}
                      </Typography>
                    </Box>
                    <Tooltip title="Restore this version">
                      <IconButton size="small" onClick={() => handleRestore(v.id)} sx={{ color: BRAND.tealDeep }}>
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </CardContent>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.sev} onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Card>
  );
}
