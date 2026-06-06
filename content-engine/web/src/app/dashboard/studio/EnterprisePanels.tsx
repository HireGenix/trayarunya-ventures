'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Drawer,
  TextField,
  Divider,
  Switch,
  Collapse,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import History from '@mui/icons-material/History';
import Restore from '@mui/icons-material/Restore';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Description from '@mui/icons-material/Description';
import Assignment from '@mui/icons-material/Assignment';
import PlaylistAddCheck from '@mui/icons-material/PlaylistAddCheck';
import Send from '@mui/icons-material/Send';
import DifferenceOutlined from '@mui/icons-material/DifferenceOutlined';
import {
  Content,
  ContentVersions,
  ContentOptimize,
  type ContentItem,
  type ContentVersion,
  type ContentBriefResult,
  type ContentBriefOutline,
  type TargetTerm,
  type ChannelInfo,
  type RepurposedVariant,
} from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = '#0E1116';

// ---------- shared helpers ----------

function relativeTime(iso: string): string {
  if (!iso) return '';
  const now = new Date().getTime();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function previewText(text: string | null | undefined, length: number): string {
  const clean = (text ?? '').trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length)}…`;
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Something went wrong. Please try again.';
}

interface DiffLine {
  text: string;
  type: 'added' | 'removed' | 'unchanged';
}

// Basic line-by-line diff: lines present in version but not current -> added (green),
// lines present in current but not version -> removed (red).
function computeDiff(currentBody: string, versionBody: string): DiffLine[] {
  const currentLines = (currentBody ?? '').split('\n');
  const versionLines = (versionBody ?? '').split('\n');
  const currentSet = new Set(currentLines.map((l) => l.trim()));
  const versionSet = new Set(versionLines.map((l) => l.trim()));
  const out: DiffLine[] = [];
  versionLines.forEach((line) => {
    out.push({
      text: line,
      type: currentSet.has(line.trim()) ? 'unchanged' : 'added',
    });
  });
  currentLines.forEach((line) => {
    if (!versionSet.has(line.trim())) {
      out.push({ text: line, type: 'removed' });
    }
  });
  return out;
}

// ============================================================================
// Component 1: VersionHistoryDrawer
// ============================================================================

export interface VersionHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  item: ContentItem;
  onRestore: (updated: ContentItem) => void;
}

export function VersionHistoryDrawer({
  open,
  onClose,
  item,
  onRestore,
}: VersionHistoryDrawerProps) {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ContentVersions.list(item.id);
      setVersions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, [item.id]);

  useEffect(() => {
    if (open) {
      setExpandedId(null);
      setSuccess(null);
      load();
    }
  }, [open, load]);

  const handleRestore = async (version: ContentVersion) => {
    setRestoringId(version.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await ContentVersions.restore(item.id, version.id);
      onRestore(updated);
      setSuccess(`Restored to version ${version.version}.`);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 480, maxWidth: '100vw', bgcolor: '#FFFFFF' } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: '1px solid #EFEFEF',
          position: 'sticky',
          top: 0,
          bgcolor: '#FFFFFF',
          zIndex: 1,
        }}
      >
        <History sx={{ color: BRAND.amberDeep }} />
        <Typography variant="h6" sx={{ fontWeight: 800, color: INK, flex: 1 }}>
          Version History
        </Typography>
        <Chip
          label={`${versions.length} version${versions.length === 1 ? '' : 's'}`}
          size="small"
          sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700 }}
        />
        <IconButton onClick={onClose} size="small" aria-label="Close version history">
          <Close />
        </IconButton>
      </Stack>

      <Box sx={{ p: 2.5, overflowY: 'auto' }}>
        {success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
            <CircularProgress size={32} sx={{ color: BRAND.teal }} />
          </Stack>
        ) : versions.length === 0 && !error ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
            <History sx={{ fontSize: 44, color: '#C9CDD3' }} />
            <Typography sx={{ color: '#6B7280', maxWidth: 320 }}>
              No versions yet — edits will create snapshots automatically.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {versions.map((version) => {
              const isExpanded = expandedId === version.id;
              const diff = isExpanded ? computeDiff(item.body, version.body ?? '') : [];
              return (
                <Paper
                  key={version.id}
                  variant="outlined"
                  sx={{
                    borderRadius: '14px',
                    overflow: 'hidden',
                    borderColor: isExpanded ? BRAND.amber : '#EAEAEA',
                  }}
                >
                  <Box
                    onClick={() => setExpandedId(isExpanded ? null : version.id)}
                    sx={{
                      p: 1.75,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#FAFAFA' },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip
                        label={`v${version.version}`}
                        size="small"
                        sx={{
                          bgcolor: BRAND.tealSoft,
                          color: BRAND.tealDeep,
                          fontWeight: 800,
                          height: 22,
                        }}
                      />
                      <Typography sx={{ fontWeight: 700, color: INK, fontSize: 13 }}>
                        {version.author_name || 'Unknown author'}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Typography sx={{ fontSize: 12, color: '#9AA0A6' }}>
                        {relativeTime(version.created_at)}
                      </Typography>
                      {isExpanded ? (
                        <ExpandLess sx={{ color: '#9AA0A6' }} />
                      ) : (
                        <ExpandMore sx={{ color: '#9AA0A6' }} />
                      )}
                    </Stack>
                    {!isExpanded && (
                      <Typography
                        sx={{ mt: 0.75, fontSize: 12.5, color: '#6B7280', lineHeight: 1.5 }}
                      >
                        {previewText(version.body_preview || version.body, 100)}
                      </Typography>
                    )}
                  </Box>

                  <Collapse in={isExpanded} unmountOnExit>
                    <Divider />
                    <Box sx={{ p: 1.75 }}>
                      <Typography
                        sx={{ fontSize: 11, fontWeight: 800, color: '#9AA0A6', letterSpacing: 0.4, mb: 0.75 }}
                      >
                        FULL CONTENT
                      </Typography>
                      <Box
                        sx={{
                          p: 1.25,
                          bgcolor: '#FAFAFA',
                          borderRadius: '10px',
                          maxHeight: 220,
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap',
                          fontSize: 12.5,
                          color: INK,
                          lineHeight: 1.55,
                        }}
                      >
                        {version.body || '(empty)'}
                      </Box>

                      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 2, mb: 0.75 }}>
                        <DifferenceOutlined sx={{ fontSize: 16, color: '#9AA0A6' }} />
                        <Typography
                          sx={{ fontSize: 11, fontWeight: 800, color: '#9AA0A6', letterSpacing: 0.4 }}
                        >
                          DIFF VS CURRENT
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          borderRadius: '10px',
                          border: '1px solid #EFEFEF',
                          overflow: 'hidden',
                          maxHeight: 240,
                          overflowY: 'auto',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: 12,
                        }}
                      >
                        {diff.map((line, i) => (
                          <Box
                            key={i}
                            sx={{
                              px: 1.25,
                              py: 0.3,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              bgcolor:
                                line.type === 'added'
                                  ? BRAND.tealSoft
                                  : line.type === 'removed'
                                  ? BRAND.pinkSoft
                                  : 'transparent',
                              color:
                                line.type === 'added'
                                  ? BRAND.tealDeep
                                  : line.type === 'removed'
                                  ? BRAND.pink
                                  : '#6B7280',
                              borderLeft:
                                line.type === 'added'
                                  ? `3px solid ${BRAND.teal}`
                                  : line.type === 'removed'
                                  ? `3px solid ${BRAND.pink}`
                                  : '3px solid transparent',
                            }}
                          >
                            <Box component="span" sx={{ opacity: 0.6, mr: 0.75 }}>
                              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                            </Box>
                            {line.text || ' '}
                          </Box>
                        ))}
                      </Box>

                      <Button
                        variant="contained"
                        startIcon={
                          restoringId === version.id ? (
                            <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
                          ) : (
                            <Restore />
                          )
                        }
                        disabled={restoringId === version.id}
                        onClick={() => handleRestore(version)}
                        sx={{
                          mt: 2,
                          borderRadius: '12px',
                          bgcolor: BRAND.tealDeep,
                          '&:hover': { bgcolor: BRAND.teal },
                          textTransform: 'none',
                          fontWeight: 700,
                        }}
                      >
                        {restoringId === version.id ? 'Restoring…' : 'Restore this version'}
                      </Button>
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}

// ============================================================================
// Component 2: ContentBriefPanel
// ============================================================================

export interface ContentBriefPanelProps {
  item: ContentItem;
  provider?: string;
}

export function ContentBriefPanel({ item }: ContentBriefPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContentBriefResult | null>(null);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);

  const bodyLower = useMemo(() => (item.body ?? '').toLowerCase(), [item.body]);

  const handleGenerate = async () => {
    const kw = keyword.trim();
    if (!kw) {
      setError('Enter a keyword to generate a brief.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await ContentOptimize.briefGenerate({ keyword: kw, content_item_id: item.id });
      setResult(data);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const termInBody = (term: TargetTerm) => bodyLower.includes((term.term ?? '').toLowerCase());
  const awaitingData = result?.status === 'awaiting_data';

  return (
    <Paper variant="outlined" sx={{ borderRadius: '16px', overflow: 'hidden', borderColor: '#EAEAEA' }}>
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          '&:hover': { bgcolor: '#FAFAFA' },
        }}
      >
        <AutoAwesome sx={{ color: BRAND.amberDeep }} />
        <Typography sx={{ fontWeight: 800, color: INK, flex: 1 }}>Content Brief</Typography>
        {expanded ? <ExpandLess sx={{ color: '#9AA0A6' }} /> : <ExpandMore sx={{ color: '#9AA0A6' }} />}
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <TextField
              fullWidth
              size="small"
              label="Target keyword"
              placeholder="e.g. content marketing strategy"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleGenerate();
              }}
            />
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <Description />
              }
              sx={{
                whiteSpace: 'nowrap',
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: BRAND.amberDeep,
                '&:hover': { bgcolor: BRAND.amber },
              }}
            >
              Generate Brief
            </Button>
          </Stack>

          {loading && <LinearProgress sx={{ mt: 2, borderRadius: 4 }} />}

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: '12px' }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {result && awaitingData && (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 5, textAlign: 'center' }}>
              <Description sx={{ fontSize: 40, color: '#C9CDD3' }} />
              <Typography sx={{ color: '#6B7280', maxWidth: 360 }}>
                No SERP data available for this keyword. Try a different keyword.
              </Typography>
            </Stack>
          )}

          {result && !awaitingData && (
            <Stack spacing={2.5} sx={{ mt: 2.5 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {result.target_audience && (
                  <Chip
                    label={`Audience: ${result.target_audience}`}
                    size="small"
                    sx={{ bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, fontWeight: 700 }}
                  />
                )}
                {result.search_intent && (
                  <Chip
                    label={`Intent: ${result.search_intent}`}
                    size="small"
                    sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700 }}
                  />
                )}
              </Stack>

              {result.outline && result.outline.length > 0 && (
                <Box>
                  <SectionTitle>Outline</SectionTitle>
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {result.outline.map((o: ContentBriefOutline, i) => {
                      const isH3 = (o.level ?? '').toLowerCase() === 'h3';
                      return (
                        <Typography
                          key={i}
                          sx={{
                            pl: isH3 ? 3 : 0,
                            fontWeight: isH3 ? 500 : 800,
                            fontSize: isH3 ? 13.5 : 14.5,
                            color: isH3 ? '#4B5563' : INK,
                          }}
                        >
                          {isH3 ? '– ' : ''}
                          {o.text}
                        </Typography>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {result.key_terms && result.key_terms.length > 0 && (
                <Box>
                  <SectionTitle>Key Terms</SectionTitle>
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {result.key_terms.map((term, i) => {
                      const present = termInBody(term);
                      const isActive = activeTerm === term.term;
                      return (
                        <Stack
                          key={i}
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          onClick={() => setActiveTerm(isActive ? null : term.term)}
                          sx={{
                            px: 1,
                            py: 0.6,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            bgcolor: isActive ? BRAND.amberSoft : 'transparent',
                            '&:hover': { bgcolor: '#FAFAFA' },
                          }}
                        >
                          <CheckCircle
                            sx={{ fontSize: 17, color: present ? BRAND.tealDeep : '#D0D4D9' }}
                          />
                          <Typography
                            sx={{
                              flex: 1,
                              fontSize: 13.5,
                              fontWeight: present ? 700 : 500,
                              color: present ? INK : '#6B7280',
                            }}
                          >
                            {term.term}
                          </Typography>
                          <Chip
                            label={`importance ${Math.round((term.importance ?? 0) * 100) / 100}`}
                            size="small"
                            sx={{ height: 20, fontSize: 11, bgcolor: '#F1F2F4', color: '#6B7280' }}
                          />
                        </Stack>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {result.competitor_angles && result.competitor_angles.length > 0 && (
                <Box>
                  <SectionTitle>Competitor Angles</SectionTitle>
                  <Stack component="ul" spacing={0.5} sx={{ mt: 1, pl: 2.5, m: 0 }}>
                    {result.competitor_angles.map((angle, i) => (
                      <Typography key={i} component="li" sx={{ fontSize: 13.5, color: '#4B5563' }}>
                        {angle}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}

              {(result.suggested_meta_title || result.suggested_meta_description) && (
                <Box>
                  <SectionTitle>Suggested Meta</SectionTitle>
                  <Box
                    sx={{
                      mt: 1,
                      p: 1.5,
                      borderRadius: '12px',
                      bgcolor: BRAND.tealSoft,
                      border: '1px solid #BFEBDC',
                    }}
                  >
                    {result.suggested_meta_title && (
                      <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14 }}>
                        {result.suggested_meta_title}
                      </Typography>
                    )}
                    {result.suggested_meta_description && (
                      <Typography sx={{ mt: 0.5, fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>
                        {result.suggested_meta_description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              {result.internal_link_targets && result.internal_link_targets.length > 0 && (
                <Box>
                  <SectionTitle>Internal Link Targets</SectionTitle>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {result.internal_link_targets.map((target, i) => (
                      <Chip
                        key={i}
                        label={target}
                        size="small"
                        sx={{ bgcolor: '#F1F2F4', color: '#4B5563', fontWeight: 600 }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{ fontSize: 11, fontWeight: 800, color: '#9AA0A6', letterSpacing: 0.5 }}
    >
      {String(children).toUpperCase()}
    </Typography>
  );
}

// ============================================================================
// Component 3: ReviewQueuePanel
// ============================================================================

export interface ReviewQueuePanelProps {
  open: boolean;
  onClose: () => void;
  onOpenItem: (item: ContentItem) => void;
}

export function ReviewQueuePanel({ open, onClose, onOpenItem }: ReviewQueuePanelProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteOpenId, setNoteOpenId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Content.listByStatus('in_review');
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setNoteOpenId(null);
      setNoteText('');
      load();
    }
  }, [open, load]);

  const handleApprove = async (item: ContentItem) => {
    setBusyId(item.id);
    setError(null);
    try {
      await Content.approve(item.id);
      await load();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleRequestChanges = async (item: ContentItem) => {
    setBusyId(item.id);
    setError(null);
    try {
      await Content.requestChanges(item.id, noteText.trim() || undefined);
      setNoteOpenId(null);
      setNoteText('');
      await load();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800, color: INK, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Assignment sx={{ color: BRAND.amberDeep }} />
        Review Queue
        <Chip
          label={`${items.length} pending`}
          size="small"
          sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700 }}
        />
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={onClose} size="small" aria-label="Close review queue">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
            <CircularProgress size={32} sx={{ color: BRAND.teal }} />
          </Stack>
        ) : items.length === 0 && !error ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
            <Assignment sx={{ fontSize: 44, color: '#C9CDD3' }} />
            <Typography sx={{ color: '#6B7280' }}>No items awaiting review</Typography>
          </Stack>
        ) : (
          <Stack spacing={1.75}>
            {items.map((item) => {
              const isBusy = busyId === item.id;
              const noteOpen = noteOpenId === item.id;
              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{ borderRadius: '16px', p: 2, borderColor: '#EAEAEA' }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography
                      onClick={() => {
                        onOpenItem(item);
                        onClose();
                      }}
                      sx={{
                        fontWeight: 800,
                        color: INK,
                        cursor: 'pointer',
                        flex: 1,
                        minWidth: 140,
                        '&:hover': { color: BRAND.amberDeep, textDecoration: 'underline' },
                      }}
                    >
                      {item.title || 'Untitled'}
                    </Typography>
                    {item.content_type && (
                      <Chip
                        label={item.content_type}
                        size="small"
                        sx={{ bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, fontWeight: 700 }}
                      />
                    )}
                    {item.platform && (
                      <Chip
                        label={item.platform}
                        size="small"
                        sx={{ bgcolor: '#F1F2F4', color: '#4B5563', fontWeight: 600 }}
                      />
                    )}
                  </Stack>

                  <Typography sx={{ mt: 1, fontSize: 13.5, color: '#6B7280', lineHeight: 1.55 }}>
                    {previewText(item.body, 150)}
                  </Typography>
                  <Typography sx={{ mt: 0.75, fontSize: 11.5, color: '#9AA0A6' }}>
                    {relativeTime(item.created_at)}
                  </Typography>

                  <Collapse in={noteOpen} unmountOnExit>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      label="Note (optional)"
                      placeholder="Describe what needs to change…"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      sx={{ mt: 1.5 }}
                    />
                  </Collapse>

                  <Stack direction="row" spacing={1} sx={{ mt: 1.75 }}>
                    <Button
                      variant="contained"
                      startIcon={
                        isBusy ? <CircularProgress size={15} sx={{ color: '#FFFFFF' }} /> : <CheckCircle />
                      }
                      disabled={isBusy}
                      onClick={() => handleApprove(item)}
                      sx={{
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: BRAND.tealDeep,
                        '&:hover': { bgcolor: BRAND.teal },
                      }}
                    >
                      Approve
                    </Button>
                    {noteOpen ? (
                      <Button
                        variant="contained"
                        disabled={isBusy}
                        startIcon={isBusy ? <CircularProgress size={15} sx={{ color: '#FFFFFF' }} /> : <Send />}
                        onClick={() => handleRequestChanges(item)}
                        sx={{
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 700,
                          bgcolor: BRAND.amberDeep,
                          '&:hover': { bgcolor: BRAND.amber },
                        }}
                      >
                        Send Request
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        disabled={isBusy}
                        onClick={() => {
                          setNoteOpenId(item.id);
                          setNoteText('');
                        }}
                        sx={{
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 700,
                          color: '#B87400',
                          borderColor: '#F0C97A',
                          '&:hover': { borderColor: BRAND.amber, bgcolor: BRAND.amberSoft },
                        }}
                      >
                        Request Changes
                      </Button>
                    )}
                    {noteOpen && (
                      <Button
                        variant="text"
                        disabled={isBusy}
                        onClick={() => {
                          setNoteOpenId(null);
                          setNoteText('');
                        }}
                        sx={{ borderRadius: '12px', textTransform: 'none', color: '#6B7280' }}
                      >
                        Cancel
                      </Button>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#6B7280' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================================
// Component 4: FanOutDialog
// ============================================================================

export interface FanOutDialogProps {
  open: boolean;
  onClose: () => void;
  item: ContentItem | null;
  provider: string;
  onCreated: (items: ContentItem[]) => void;
}

type ChannelStatus = 'pending' | 'generating' | 'done' | 'error';

interface FanOutChannelState {
  info: ChannelInfo;
  selected: boolean;
  status: ChannelStatus;
  variant: RepurposedVariant | null;
  saved: boolean;
  error?: string;
}

export function FanOutDialog({ open, onClose, item, provider, onCreated }: FanOutDialogProps) {
  const [channels, setChannels] = useState<FanOutChannelState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savingAll, setSavingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRunning(false);
    setProgress(0);
    try {
      const data = await ContentOptimize.repurposeChannels();
      const list = Array.isArray(data?.channels) ? data.channels : [];
      setChannels(
        list.map((info) => ({
          info,
          selected: true,
          status: 'pending' as ChannelStatus,
          variant: null,
          saved: false,
        })),
      );
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const toggleChannel = (key: string) => {
    if (running) return;
    setChannels((prev) =>
      prev.map((c) => (c.info.key === key ? { ...c, selected: !c.selected } : c)),
    );
  };

  const selectedChannels = useMemo(() => channels.filter((c) => c.selected), [channels]);

  const handleFanOut = async () => {
    if (!item) return;
    const targets = channels.filter((c) => c.selected);
    if (targets.length === 0) {
      setError('Select at least one channel.');
      return;
    }
    setRunning(true);
    setError(null);
    setProgress(0);
    setChannels((prev) =>
      prev.map((c) =>
        c.selected ? { ...c, status: 'pending', variant: null, saved: false, error: undefined } : c,
      ),
    );

    let completed = 0;
    for (const target of targets) {
      const key = target.info.key;
      setChannels((prev) =>
        prev.map((c) => (c.info.key === key ? { ...c, status: 'generating' } : c)),
      );
      try {
        const res = await ContentOptimize.repurpose({
          content_item_id: item.id,
          channels: [key],
          provider,
        });
        const variant =
          Array.isArray(res?.variants) && res.variants.length > 0 ? res.variants[0] : null;
        setChannels((prev) =>
          prev.map((c) =>
            c.info.key === key
              ? { ...c, status: variant ? 'done' : 'error', variant, error: variant ? undefined : 'No variant returned' }
              : c,
          ),
        );
      } catch (e) {
        setChannels((prev) =>
          prev.map((c) =>
            c.info.key === key ? { ...c, status: 'error', error: errMessage(e) } : c,
          ),
        );
      }
      completed += 1;
      setProgress(Math.round((completed / targets.length) * 100));
    }
    setRunning(false);
  };

  const saveVariant = async (state: FanOutChannelState) => {
    if (!state.variant) return;
    try {
      const created = await Content.createDraft({
        title: state.variant.title,
        body: state.variant.body,
        platform: state.info.key,
      });
      setChannels((prev) =>
        prev.map((c) => (c.info.key === state.info.key ? { ...c, saved: true } : c)),
      );
      onCreated([created]);
    } catch (e) {
      setError(errMessage(e));
    }
  };

  const handleSaveAll = async () => {
    const unsaved = channels.filter((c) => c.status === 'done' && c.variant && !c.saved);
    if (unsaved.length === 0) return;
    setSavingAll(true);
    setError(null);
    const createdItems: ContentItem[] = [];
    const savedKeys: string[] = [];
    for (const state of unsaved) {
      if (!state.variant) continue;
      try {
        const created = await Content.createDraft({
          title: state.variant.title,
          body: state.variant.body,
          platform: state.info.key,
        });
        createdItems.push(created);
        savedKeys.push(state.info.key);
      } catch (e) {
        setError(errMessage(e));
      }
    }
    if (savedKeys.length > 0) {
      setChannels((prev) =>
        prev.map((c) => (savedKeys.includes(c.info.key) ? { ...c, saved: true } : c)),
      );
      onCreated(createdItems);
    }
    setSavingAll(false);
  };

  const doneVariants = channels.filter((c) => c.status === 'done' && c.variant);
  const hasUnsaved = doneVariants.some((c) => !c.saved);

  const statusChip = (status: ChannelStatus) => {
    const map: Record<ChannelStatus, { label: string; bg: string; fg: string }> = {
      pending: { label: 'Pending', bg: '#F1F2F4', fg: '#6B7280' },
      generating: { label: 'Generating…', bg: BRAND.amberSoft, fg: BRAND.amberDeep },
      done: { label: 'Done', bg: BRAND.tealSoft, fg: BRAND.tealDeep },
      error: { label: 'Error', bg: BRAND.pinkSoft, fg: BRAND.pink },
    };
    const m = map[status];
    return <Chip label={m.label} size="small" sx={{ bgcolor: m.bg, color: m.fg, fontWeight: 700, height: 22 }} />;
  };

  return (
    <Dialog open={open} onClose={running ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800, color: INK, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <PlaylistAddCheck sx={{ color: BRAND.amberDeep }} />
        Multi-Channel Fan-Out
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={onClose} size="small" disabled={running} aria-label="Close fan-out">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {item && (
          <Typography sx={{ mb: 2, fontSize: 13.5, color: '#6B7280' }}>
            Repurposing{' '}
            <Box component="span" sx={{ fontWeight: 800, color: INK }}>
              {item.title || 'Untitled'}
            </Box>{' '}
            across selected channels.
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
            <CircularProgress size={32} sx={{ color: BRAND.teal }} />
          </Stack>
        ) : channels.length === 0 && !error ? (
          <Stack alignItems="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
            <PlaylistAddCheck sx={{ fontSize: 44, color: '#C9CDD3' }} />
            <Typography sx={{ color: '#6B7280' }}>No channels available for fan-out.</Typography>
          </Stack>
        ) : (
          <>
            {running && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ borderRadius: 4, height: 8 }}
                />
                <Typography sx={{ mt: 0.5, fontSize: 12, color: '#9AA0A6', textAlign: 'right' }}>
                  {progress}%
                </Typography>
              </Box>
            )}

            <Stack spacing={1.25}>
              {channels.map((c) => (
                <Paper
                  key={c.info.key}
                  variant="outlined"
                  sx={{
                    borderRadius: '14px',
                    p: 1.75,
                    borderColor: c.selected ? '#EAEAEA' : '#F1F2F4',
                    opacity: c.selected || c.status !== 'pending' ? 1 : 0.6,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Switch
                      checked={c.selected}
                      onChange={() => toggleChannel(c.info.key)}
                      disabled={running}
                      size="small"
                    />
                    <Stack sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 800, color: INK, fontSize: 14 }}>
                        {c.info.label}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: '#9AA0A6' }}>
                        max {c.info.max_chars} chars
                      </Typography>
                    </Stack>
                    {(c.status !== 'pending' || running) && statusChip(c.status)}
                  </Stack>

                  <Collapse in={c.status === 'done' && !!c.variant} unmountOnExit>
                    {c.variant && (
                      <Box sx={{ mt: 1.5 }}>
                        <Divider sx={{ mb: 1.5 }} />
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                          <Chip
                            label={c.variant.label || c.info.label}
                            size="small"
                            sx={{ bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, fontWeight: 700 }}
                          />
                          <Chip
                            label={`${c.variant.char_count} chars`}
                            size="small"
                            sx={{ bgcolor: '#F1F2F4', color: '#6B7280' }}
                          />
                        </Stack>
                        <Box
                          sx={{
                            p: 1.25,
                            bgcolor: '#FAFAFA',
                            borderRadius: '10px',
                            fontSize: 13,
                            color: INK,
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.55,
                            maxHeight: 160,
                            overflowY: 'auto',
                          }}
                        >
                          {previewText(c.variant.body, 280)}
                        </Box>
                        <Box sx={{ mt: 1.25 }}>
                          {c.saved ? (
                            <Chip
                              icon={<CheckCircle />}
                              label="Saved as draft"
                              size="small"
                              sx={{ bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, fontWeight: 700 }}
                            />
                          ) : (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => saveVariant(c)}
                              sx={{
                                borderRadius: '12px',
                                textTransform: 'none',
                                fontWeight: 700,
                                color: BRAND.tealDeep,
                                borderColor: '#BFEBDC',
                                '&:hover': { borderColor: BRAND.teal, bgcolor: BRAND.tealSoft },
                              }}
                            >
                              Save as draft
                            </Button>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Collapse>

                  {c.status === 'error' && c.error && (
                    <Typography sx={{ mt: 1, fontSize: 12.5, color: BRAND.pink }}>{c.error}</Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Tooltip title={hasUnsaved ? 'Save all generated variants as drafts' : 'Nothing to save'}>
          <span>
            <Button
              variant="outlined"
              disabled={!hasUnsaved || savingAll || running}
              startIcon={savingAll ? <CircularProgress size={15} /> : <PlaylistAddCheck />}
              onClick={handleSaveAll}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700 }}
            >
              Save All
            </Button>
          </span>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={running} sx={{ textTransform: 'none', color: '#6B7280' }}>
          Close
        </Button>
        <Button
          variant="contained"
          disabled={running || loading || selectedChannels.length === 0 || !item}
          startIcon={running ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <Send />}
          onClick={handleFanOut}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 700,
            bgcolor: BRAND.amberDeep,
            '&:hover': { bgcolor: BRAND.amber },
          }}
        >
          {running ? 'Fanning out…' : `Fan Out (${selectedChannels.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
