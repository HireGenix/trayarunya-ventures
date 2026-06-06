'use client';

/**
 * SERP-optimized long-form editor with live scoring + inline AI commands.
 *
 * Opens as a full-width PremiumDialog from the Studio page. Includes:
 * - Draft text editor (contentEditable)
 * - Live right-rail score panel (overall ring, term checklist, readability, word count)
 * - Inline AI command buttons (Rewrite, Expand, Shorten, Improve SEO, Continue)
 * - Brand voice consistency chip
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ShortTextIcon from '@mui/icons-material/ShortText';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  SectionLabel,
  DialogFooter,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';
import {
  ContentOptimize,
  type SerpResearch,
  type ContentScoreResult,
  type TermScore,
  type VoiceScoreResult,
} from '@/lib/api';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const TEAL = BRAND.teal;
const AMBER = BRAND.amber;
const PINK = BRAND.pink;

// ── Score ring ──────────────────────────────────────────────────────────────
function ScoreRing({ value, size = 80, label }: { value: number; size?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 70 ? TEAL : pct >= 40 ? AMBER : PINK;
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={size}
          thickness={4}
          sx={{ color: 'rgba(14,17,22,0.06)', position: 'absolute', top: 0, left: 0 }}
        />
        <CircularProgress
          variant="determinate"
          value={pct}
          size={size}
          thickness={4}
          sx={{ color, position: 'absolute', top: 0, left: 0 }}
        />
        <Box sx={{
          position: 'absolute', top: 0, left: 0, width: size, height: size,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography sx={{ fontWeight: 800, fontSize: size * 0.3, color: INK }}>{pct}</Typography>
        </Box>
      </Box>
      {label && <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 700, color: SUBTLE, textAlign: 'center' }}>{label}</Typography>}
    </Box>
  );
}

// ── Term checklist item ─────────────────────────────────────────────────────
function TermRow({ ts }: { ts: TermScore }) {
  const icon = ts.hit
    ? ts.over
      ? <WarningAmberIcon sx={{ fontSize: 15, color: AMBER }} />
      : <CheckCircleIcon sx={{ fontSize: 15, color: TEAL }} />
    : <CancelIcon sx={{ fontSize: 15, color: PINK }} />;
  return (
    <Stack direction="row" alignItems="center" gap={0.75} sx={{ py: 0.3 }}>
      {icon}
      <Typography sx={{ fontSize: 12.5, color: INK, flex: 1, fontWeight: ts.hit ? 400 : 600 }}>{ts.term}</Typography>
      <Typography sx={{ fontSize: 11, color: SUBTLE, minWidth: 40, textAlign: 'right' }}>
        {ts.actual_count}/{ts.target_count}
      </Typography>
    </Stack>
  );
}

// ── AI command buttons ──────────────────────────────────────────────────────
const AI_COMMANDS = [
  { cmd: 'rewrite', label: 'Rewrite', icon: <AutoFixHighIcon sx={{ fontSize: 16 }} /> },
  { cmd: 'expand', label: 'Expand', icon: <UnfoldMoreIcon sx={{ fontSize: 16 }} /> },
  { cmd: 'shorten', label: 'Shorten', icon: <UnfoldLessIcon sx={{ fontSize: 16 }} /> },
  { cmd: 'improve_seo', label: 'Improve SEO', icon: <TrendingUpIcon sx={{ fontSize: 16 }} /> },
  { cmd: 'continue', label: 'Continue', icon: <PlayArrowIcon sx={{ fontSize: 16 }} /> },
];

// ── Main component ──────────────────────────────────────────────────────────
interface SerpEditorProps {
  open: boolean;
  onClose: () => void;
  initialText?: string;
  initialKeyword?: string;
  provider?: string;
  onSave?: (text: string) => void;
}

export default function SerpEditor({ open, onClose, initialText = '', initialKeyword = '', provider, onSave }: SerpEditorProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [text, setText] = useState(initialText);
  const [research, setResearch] = useState<SerpResearch | null>(null);
  const [score, setScore] = useState<ContentScoreResult | null>(null);
  const [voiceScore, setVoiceScore] = useState<VoiceScoreResult | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setText(initialText);
      setKeyword(initialKeyword);
      setResearch(null);
      setScore(null);
      setVoiceScore(null);
    }
  }, [open, initialText, initialKeyword]);

  // Auto-score on text change (debounced)
  useEffect(() => {
    if (!research || !text || text.length < 30) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setScoreLoading(true);
      ContentOptimize.score(text, keyword)
        .then(setScore)
        .catch(() => {})
        .finally(() => setScoreLoading(false));
      ContentOptimize.brandVoiceScore(text)
        .then(setVoiceScore)
        .catch(() => {});
    }, 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text, research, keyword]);

  const runResearch = useCallback(async () => {
    if (!keyword.trim()) return;
    setResearchLoading(true);
    try {
      const r = await ContentOptimize.serpResearch(keyword.trim());
      setResearch(r);
      // Auto-score current text
      if (text.length > 30) {
        const s = await ContentOptimize.score(text, keyword.trim());
        setScore(s);
      }
    } catch { /* */ }
    setResearchLoading(false);
  }, [keyword, text]);

  const runAICommand = useCallback(async (cmd: string) => {
    if (!text.trim()) return;
    setAiLoading(cmd);
    try {
      const terms = research?.target_terms.map(t => t.term) || [];
      const res = await ContentOptimize.inlineAI({
        text,
        command: cmd,
        keyword: keyword || undefined,
        target_terms: terms.length ? terms : undefined,
        provider,
      });
      if (cmd === 'continue') {
        setText(prev => prev + '\n\n' + res.result);
      } else {
        setText(res.result);
      }
    } catch { /* */ }
    setAiLoading(null);
  }, [text, keyword, research, provider]);

  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

  return (
    <PremiumDialog open={open} onClose={onClose} maxWidth="xl" accent={BRAND.gradient}>
      <DialogHero
        icon={<SearchIcon />}
        title="SERP-Optimized Editor"
        subtitle="Write content grounded in real competitor analysis"
        onClose={onClose}
        tint={TEAL}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody sx={{ p: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 0 }}>
        {/* Left: editor */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: { md: '1px solid rgba(14,17,22,0.08)' } }}>
          {/* Keyword bar */}
          <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(14,17,22,0.06)' }}>
            <TextField
              size="small"
              placeholder="Target keyword..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runResearch()}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
            <Button
              onClick={runResearch}
              disabled={researchLoading || !keyword.trim()}
              startIcon={researchLoading ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
              sx={inkPillSx}
              size="small"
            >
              {researchLoading ? 'Analyzing...' : 'Research'}
            </Button>
          </Stack>

          {/* AI command toolbar */}
          <Stack direction="row" gap={0.5} sx={{ px: 2.5, py: 1, borderBottom: '1px solid rgba(14,17,22,0.06)', flexWrap: 'wrap' }}>
            {AI_COMMANDS.map(c => (
              <Tooltip key={c.cmd} title={c.label}>
                <span>
                  <Button
                    size="small"
                    onClick={() => runAICommand(c.cmd)}
                    disabled={!!aiLoading || !text.trim()}
                    startIcon={aiLoading === c.cmd ? <CircularProgress size={12} color="inherit" /> : c.icon}
                    sx={{
                      borderRadius: '999px', textTransform: 'none', fontWeight: 700, fontSize: 12,
                      px: 1.5, py: 0.5, color: SUBTLE, border: '1px solid rgba(14,17,22,0.1)',
                      '&:hover': { background: BRAND.tealSoft, borderColor: TEAL, color: TEAL },
                    }}
                  >
                    {c.label}
                  </Button>
                </span>
              </Tooltip>
            ))}
            {voiceScore && (
              <Tooltip title={voiceScore.deviations.length ? voiceScore.deviations.join('; ') : 'On-brand'}>
                <Chip
                  size="small"
                  label={`Brand voice: ${voiceScore.score}%`}
                  sx={{
                    ml: 'auto',
                    fontWeight: 700,
                    fontSize: 11.5,
                    background: voiceScore.score >= 70 ? BRAND.tealSoft : voiceScore.score >= 40 ? BRAND.amberSoft : BRAND.pinkSoft,
                    color: voiceScore.score >= 70 ? TEAL : voiceScore.score >= 40 ? AMBER : PINK,
                    border: 'none',
                  }}
                />
              </Tooltip>
            )}
          </Stack>

          {/* Text editor */}
          <TextField
            multiline
            minRows={18}
            maxRows={30}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Start writing your content here..."
            fullWidth
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 0, border: 'none',
                '& fieldset': { border: 'none' },
                fontFamily: '"Inter", sans-serif',
                fontSize: 14.5,
                lineHeight: 1.8,
                px: 2.5, py: 2,
              },
            }}
          />
        </Box>

        {/* Right rail: scores */}
        <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0, overflowY: 'auto', px: 2, py: 2, background: 'rgba(14,17,22,0.015)' }}>
          {!research && !researchLoading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <SearchIcon sx={{ fontSize: 36, color: 'rgba(14,17,22,0.12)', mb: 1 }} />
              <Typography sx={{ fontSize: 13, color: SUBTLE }}>Enter a target keyword and click Research to begin SERP analysis</Typography>
            </Box>
          )}

          {researchLoading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={32} sx={{ color: TEAL }} />
              <Typography sx={{ mt: 1, fontSize: 13, color: SUBTLE }}>Analyzing competitors...</Typography>
            </Box>
          )}

          {research && !researchLoading && (
            <Stack spacing={2}>
              {/* Overall score */}
              {score && (
                <Box sx={{ textAlign: 'center', pt: 1 }}>
                  <ScoreRing value={score.overall} size={90} label="Content Score" />
                  {scoreLoading && <LinearProgress sx={{ mt: 1, borderRadius: 2 }} />}
                </Box>
              )}

              {research.low_confidence && (
                <Chip size="small" icon={<WarningAmberIcon />} label="Low confidence — limited SERP data" sx={{ fontWeight: 600, fontSize: 11 }} color="warning" />
              )}

              {/* Word count */}
              <Box>
                <SectionLabel>Word Count</SectionLabel>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: 13, color: INK, fontWeight: 700 }}>{wordCount}</Typography>
                  <Typography sx={{ fontSize: 12, color: SUBTLE }}>target: {research.recommended_word_count}</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (wordCount / research.recommended_word_count) * 100)}
                  sx={{ mt: 0.5, borderRadius: 4, height: 6, background: 'rgba(14,17,22,0.06)', '& .MuiLinearProgress-bar': { background: wordCount >= research.recommended_word_count * 0.8 ? TEAL : AMBER, borderRadius: 4 } }}
                />
              </Box>

              {/* Readability */}
              {score && (
                <Box>
                  <SectionLabel>Readability</SectionLabel>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: INK }}>{score.readability}</Typography>
                  <Typography sx={{ fontSize: 11, color: SUBTLE }}>Flesch reading ease (60-70 ideal)</Typography>
                </Box>
              )}

              {/* Term checklist */}
              {score && score.term_scores.length > 0 && (
                <Box>
                  <SectionLabel>Term Coverage ({Math.round(score.term_coverage)}%)</SectionLabel>
                  <Box sx={{ maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
                    {score.term_scores.slice(0, 25).map(ts => <TermRow key={ts.term} ts={ts} />)}
                  </Box>
                </Box>
              )}

              {/* Gaps */}
              {score && score.gaps.length > 0 && (
                <Box>
                  <SectionLabel>Missing Terms</SectionLabel>
                  <Stack direction="row" gap={0.5} flexWrap="wrap">
                    {score.gaps.map(g => (
                      <Chip key={g} label={g} size="small" sx={{ fontSize: 11, fontWeight: 600, background: BRAND.pinkSoft, color: PINK }} />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Suggested headings */}
              {research.headings.length > 0 && (
                <Box>
                  <SectionLabel>Competitor Headings</SectionLabel>
                  {research.headings.slice(0, 8).map((h, i) => (
                    <Typography key={i} sx={{ fontSize: 12, color: SUBTLE, py: 0.2 }}>- {h}</Typography>
                  ))}
                </Box>
              )}

              {/* Questions */}
              {research.questions.length > 0 && (
                <Box>
                  <SectionLabel>People Also Ask</SectionLabel>
                  {research.questions.slice(0, 6).map((q, i) => (
                    <Typography key={i} sx={{ fontSize: 12, color: SUBTLE, py: 0.2 }}>- {q}</Typography>
                  ))}
                </Box>
              )}

              <Typography sx={{ fontSize: 11, color: SUBTLE, textAlign: 'center', pt: 1 }}>
                {research.competitors_analyzed} competitors analyzed
              </Typography>
            </Stack>
          )}
        </Box>
      </DialogBody>

      <DialogFooter>
        <Button sx={ghostPillSx} onClick={onClose}>Cancel</Button>
        <Button
          sx={inkPillSx}
          onClick={() => { onSave?.(text); onClose(); }}
          disabled={!text.trim()}
        >
          Save draft
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}
