'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  LinearProgress,
  Snackbar,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDownOutlined';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import WhatshotIcon from '@mui/icons-material/WhatshotOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunchOutlined';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import BlockIcon from '@mui/icons-material/BlockOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import {
  CreativeIntel,
  type CreativeSummary,
  type CreativeRecommendation,
  type CreativeAction,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

function titleize(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function fmtMetric(key: string, value: number): string {
  const k = key.toLowerCase();
  if (k.includes('rate') || k.includes('pct') || k.includes('percent') || k.includes('ratio')) {
    return `${(value <= 1 ? value * 100 : value).toFixed(2)}%`;
  }
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(2);
}

function fmtRate(value: number): string {
  return `${(value <= 1 ? value * 100 : value).toFixed(2)}%`;
}

function fmtPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function valueToText(value: string | boolean | null): string {
  if (value === null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value;
}

const ACTION_META: Record<
  CreativeAction,
  { label: string; color: string; soft: string; icon: React.ReactElement }
> = {
  double_down: { label: 'Double down', color: BRAND.tealDeep, soft: `${BRAND.teal}14`, icon: <RocketLaunchIcon sx={{ fontSize: 16 }} /> },
  test: { label: 'Test', color: BRAND.amberDeep, soft: `${BRAND.amber}24`, icon: <ScienceIcon sx={{ fontSize: 16 }} /> },
  stop: { label: 'Stop', color: BRAND.pink, soft: `${BRAND.pink}14`, icon: <BlockIcon sx={{ fontSize: 16 }} /> },
};

const CONFIDENCE_COLOR: Record<CreativeRecommendation['confidence'], string> = {
  high: BRAND.tealDeep,
  medium: BRAND.amberDeep,
  low: SUBTLE,
};

export default function CreativePage() {
  const { activeWorkspace } = useAuth();

  const [summary, setSummary] = useState<CreativeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState<CreativeRecommendation[] | null>(null);
  const [recsLowData, setRecsLowData] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);
  const [enrich, setEnrich] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    CreativeIntel.summary(5)
      .then(setSummary)
      .catch(() => {
        setSummary(null);
        setToast('Failed to load creative intelligence');
      })
      .finally(() => setLoading(false));
  }, [activeWorkspace]);

  const loadRecommendations = async () => {
    setRecsLoading(true);
    try {
      const res = await CreativeIntel.recommendations(enrich);
      setRecs(res.recommendations);
      setRecsLowData(res.low_data);
    } catch {
      setToast('Failed to generate recommendations');
    } finally {
      setRecsLoading(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <Stack spacing={3}>
        <Header />
        <Card sx={{ borderRadius: CARD_RADIUS, border: `1px dashed ${LINE}`, bgcolor: '#fff' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 7 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '18px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(14,17,22,0.05)', color: INK }}>
              <InsightsIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK }}>No workspace selected</Typography>
            <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={400}>
              Select or create a workspace to unlock creative intelligence on your content.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  if (loading) {
    return (
      <Stack spacing={3}>
        <Header />
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 260 }}>
          <CircularProgress size={30} />
        </Box>
      </Stack>
    );
  }

  if (!summary) {
    return (
      <Stack spacing={3}>
        <Header />
        <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, bgcolor: '#fff', boxShadow: CARD_SHADOW }}>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Typography fontWeight={900} color={INK}>Nothing to analyse yet</Typography>
            <Typography variant="body2" sx={{ color: SUBTLE, mt: 0.5 }}>
              We couldn&apos;t load your creative data. Try again shortly.
            </Typography>
          </CardContent>
        </Card>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </Stack>
    );
  }

  const overallEntries = Object.entries(summary.overall ?? {});
  const winningPatterns = [...(summary.winning_patterns ?? [])].sort((a, b) => b.lift_pct - a.lift_pct);
  const fatigueSignals = [...(summary.fatigue_signals ?? [])].sort((a, b) => a.change_pct - b.change_pct);
  const progress = summary.min_posts_for_signal > 0
    ? Math.min(100, Math.round((summary.post_count / summary.min_posts_for_signal) * 100))
    : 100;

  return (
    <Stack spacing={3}>
      <Header />

      {summary.low_data && (
        <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${BRAND.amber}`, bgcolor: BRAND.amberSoft, overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'center' }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center', background: `${BRAND.amberDeep}1A` }}>
                <WhatshotIcon sx={{ fontSize: 28, color: BRAND.amberDeep }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={900} color={INK}>Keep publishing to unlock strong signals</Typography>
                <Typography variant="body2" sx={{ color: '#7A5B00', mt: 0.5 }}>
                  You have <strong>{summary.post_count}</strong> published {summary.post_count === 1 ? 'post' : 'posts'}.
                  We need at least <strong>{summary.min_posts_for_signal}</strong> to detect reliable winning patterns and fatigue.
                  Early signals below are directional only.
                </Typography>
                <Box sx={{ mt: 1.5, maxWidth: 420 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 6,
                      borderRadius: 999,
                      bgcolor: 'rgba(14,17,22,0.06)',
                      '& .MuiLinearProgress-bar': { borderRadius: 999, background: BRAND.amberDeep },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#7A5B00', fontWeight: 800, mt: 0.5, display: 'block' }}>
                    {summary.post_count} / {summary.min_posts_for_signal} posts
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ── Overall metrics strip ── */}
      {overallEntries.length > 0 && (
        <Box>
          <SectionTitle icon={<InsightsIcon sx={{ fontSize: 18 }} />} title="Overall performance" />
          <Grid container spacing={2.5}>
            {overallEntries.map(([key, value]) => (
              <Grid key={key} size={{ xs: 6, sm: 4, md: 3 }}>
                <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, bgcolor: '#fff', boxShadow: CARD_SHADOW, height: '100%' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(14,17,22,0.05)', color: INK, flexShrink: 0 }}>
                        <InsightsIcon sx={{ fontSize: 18 }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 14, color: INK, lineHeight: 1.2 }}>
                        {titleize(key)}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 40, fontWeight: 800, color: INK, mt: 1.5, lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {fmtMetric(key, value)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── Winning patterns ── */}
      <Box>
        <SectionTitle icon={<EmojiEventsIcon sx={{ fontSize: 18, color: BRAND.teal }} />} title="Winning patterns" subtitle="What's outperforming your baseline — double down on these." />
        {winningPatterns.length === 0 ? (
          <EmptyHint text="No winning patterns detected yet. Publish more varied content to surface what works." />
        ) : (
          <Grid container spacing={2}>
            {winningPatterns.map((p, i) => (
              <Grid key={`${p.attribute}-${p.value}-${i}`} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, bgcolor: '#fff', boxShadow: CARD_SHADOW, height: '100%', position: 'relative', overflow: 'hidden', transition: 'transform .18s, box-shadow .18s, border-color .18s', '&:hover': { transform: 'translateY(-2px)', borderColor: `${BRAND.teal}66` } }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: BRAND.teal }} />
                  <CardContent sx={{ p: 2.4, pl: 2.6 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {titleize(p.attribute)}
                        </Typography>
                        <Typography fontWeight={900} color={INK} sx={{ lineHeight: 1.2 }} noWrap>
                          {valueToText(p.value)}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<TrendingUpIcon sx={{ fontSize: 15 }} />}
                        label={fmtPct(p.lift_pct)}
                        size="small"
                        sx={{ fontWeight: 900, bgcolor: `${BRAND.teal}14`, color: BRAND.tealDeep, '& .MuiChip-icon': { color: BRAND.tealDeep } }}
                      />
                    </Stack>
                    <Divider sx={{ my: 1.4, borderColor: LINE }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Stat label="Avg engagement" value={fmtRate(p.avg_engagement_rate)} />
                      <Stat label="Sample" value={`${p.sample_size}`} align="right" />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* ── Creative fatigue ── */}
      <Box>
        <SectionTitle icon={<TrendingDownIcon sx={{ fontSize: 18, color: BRAND.pink }} />} title="Creative fatigue" subtitle="Patterns losing steam — refresh or retire these before they drag you down." />
        {fatigueSignals.length === 0 ? (
          <EmptyHint text="No fatigue detected. Your creative is holding strong." />
        ) : (
          <Grid container spacing={2}>
            {fatigueSignals.map((f, i) => (
              <Grid key={`${f.attribute}-${f.value}-${i}`} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, bgcolor: '#fff', boxShadow: CARD_SHADOW, height: '100%', position: 'relative', overflow: 'hidden', transition: 'transform .18s, box-shadow .18s, border-color .18s', '&:hover': { transform: 'translateY(-2px)', borderColor: `${BRAND.pink}66` } }}>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: BRAND.pink }} />
                  <CardContent sx={{ p: 2.4, pl: 2.6 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {titleize(f.attribute)}
                        </Typography>
                        <Typography fontWeight={900} color={INK} sx={{ lineHeight: 1.2 }} noWrap>
                          {valueToText(f.value)}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<TrendingDownIcon sx={{ fontSize: 15 }} />}
                        label={fmtPct(f.change_pct)}
                        size="small"
                        sx={{ fontWeight: 900, bgcolor: BRAND.pinkSoft, color: BRAND.pink, '& .MuiChip-icon': { color: BRAND.pink } }}
                      />
                    </Stack>
                    <Divider sx={{ my: 1.4, borderColor: LINE }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stat label="Earlier" value={fmtRate(f.earlier_avg_engagement_rate)} />
                      <TrendingDownIcon sx={{ fontSize: 18, color: SUBTLE }} />
                      <Stat label="Recent" value={fmtRate(f.recent_avg_engagement_rate)} align="right" />
                    </Stack>
                    <Typography variant="caption" sx={{ color: SUBTLE, mt: 1, display: 'block' }}>
                      {f.sample_size} {f.sample_size === 1 ? 'post' : 'posts'} analysed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* ── Recommendations ── */}
      <Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
          <SectionTitle icon={<AutoAwesomeIcon sx={{ fontSize: 18, color: BRAND.amberDeep }} />} title="Recommendations" subtitle="Concrete next moves, ranked by impact." noMargin />
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <FormControlLabel
              control={<Switch checked={enrich} onChange={(e) => setEnrich(e.target.checked)} size="small" />}
              label={<Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 13 }}>AI rationale</Typography>}
              sx={{
                m: 0,
                pl: 1.5,
                pr: 1.75,
                py: 0.5,
                borderRadius: '999px',
                border: `1px solid ${LINE}`,
                bgcolor: '#fff',
              }}
            />
            <Button
              variant="contained"
              onClick={loadRecommendations}
              disabled={recsLoading}
              startIcon={recsLoading ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{
                px: 2.5,
                py: 1.1,
                borderRadius: '999px',
                textTransform: 'none',
                fontWeight: 700,
                color: '#fff',
                background: INK,
                backgroundImage: 'none',
                boxShadow: '0 8px 20px rgba(14,17,22,0.25)',
                '&:hover': { background: '#1B2330' },
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.6)' },
              }}
            >
              {recsLoading ? 'Generating…' : recs ? 'Regenerate' : 'Generate recommendations'}
            </Button>
          </Stack>
        </Stack>

        {recs === null ? (
          <Card sx={{ borderRadius: CARD_RADIUS, border: `1px dashed ${LINE}`, bgcolor: 'rgba(14,17,22,0.02)' }}>
            <CardContent sx={{ py: 5, textAlign: 'center' }}>
              <Box sx={{ width: 60, height: 60, borderRadius: '50%', mx: 'auto', display: 'grid', placeItems: 'center', background: `${BRAND.amber}24`, mb: 1.5 }}>
                <AutoAwesomeIcon sx={{ fontSize: 28, color: BRAND.amberDeep }} />
              </Box>
              <Typography fontWeight={900} color={INK}>Ready when you are</Typography>
              <Typography variant="body2" sx={{ color: SUBTLE, mt: 0.5, maxWidth: 420, mx: 'auto' }}>
                Generate prioritised recommendations on what to double down on, test, or stop. Toggle AI rationale for richer reasoning.
              </Typography>
            </CardContent>
          </Card>
        ) : recs.length === 0 ? (
          <EmptyHint text={recsLowData ? 'Not enough data yet for confident recommendations — keep publishing.' : 'No recommendations right now. Your creative mix looks balanced.'} />
        ) : (
          <Stack spacing={1.5}>
            {recsLowData && (
              <Typography variant="caption" sx={{ color: BRAND.amberDeep, fontWeight: 800 }}>
                Low data — treat these as directional.
              </Typography>
            )}
            {recs.map((r, i) => {
              const meta = ACTION_META[r.action];
              return (
                <Card key={`${r.attribute}-${i}`} sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, bgcolor: '#fff', boxShadow: CARD_SHADOW, transition: 'transform .18s, box-shadow .18s, border-color .18s', '&:hover': { transform: 'translateY(-2px)', borderColor: `${meta.color}55` } }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: meta.soft, color: meta.color, flexShrink: 0 }}>
                        {meta.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.75}>
                          <Chip
                            label={meta.label}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: 12, height: 22, bgcolor: meta.soft, color: meta.color }}
                          />
                          <Typography fontWeight={700} color={INK}>
                            {titleize(r.attribute)}: {valueToText(r.value)}
                          </Typography>
                          <Chip
                            label={`${r.confidence} confidence`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 800, fontSize: 11, height: 20, color: CONFIDENCE_COLOR[r.confidence], borderColor: CONFIDENCE_COLOR[r.confidence] }}
                          />
                          {typeof r.lift_pct === 'number' && (
                            <Chip icon={<TrendingUpIcon sx={{ fontSize: 14 }} />} label={fmtPct(r.lift_pct)} size="small" sx={{ fontWeight: 800, fontSize: 11, height: 20, bgcolor: `${BRAND.teal}14`, color: BRAND.tealDeep, '& .MuiChip-icon': { color: BRAND.tealDeep } }} />
                          )}
                          {typeof r.change_pct === 'number' && (
                            <Chip icon={<TrendingDownIcon sx={{ fontSize: 14 }} />} label={fmtPct(r.change_pct)} size="small" sx={{ fontWeight: 800, fontSize: 11, height: 20, bgcolor: BRAND.pinkSoft, color: BRAND.pink, '& .MuiChip-icon': { color: BRAND.pink } }} />
                          )}
                        </Stack>
                        <Typography variant="body2" sx={{ color: SUBTLE, mt: 0.7 }}>
                          {r.rationale}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* ── Top posts ── */}
      {summary.top_posts.length > 0 && (
        <Box>
          <SectionTitle icon={<WhatshotIcon sx={{ fontSize: 18, color: BRAND.amberDeep }} />} title="Top posts" subtitle="Your highest performers in the window." />
          <Card sx={{ borderRadius: CARD_RADIUS, border: `1px solid ${LINE}`, bgcolor: '#fff', boxShadow: CARD_SHADOW }}>
            <CardContent sx={{ p: 0 }}>
              <Stack divider={<Divider sx={{ borderColor: LINE }} />}>
                {summary.top_posts.map((post, i) => (
                  <TopPostRow key={i} index={i} post={post} />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </Stack>
  );
}

function Header() {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ md: 'center' }}
      spacing={2}
      sx={{ mb: 0.5, px: 0.5 }}
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
          Creative{' '}
          <Box
            component="span"
            sx={{
              background: BRAND.gradientText,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Intelligence
          </Box>
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          What&apos;s actually working in your content — winning patterns, creative fatigue, and what to double down on.
        </Typography>
      </Box>
    </Stack>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
  noMargin,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  noMargin?: boolean;
}) {
  return (
    <Box sx={{ mb: noMargin ? 0 : 1.8 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
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
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: INK, letterSpacing: '-0.01em' }}>{title}</Typography>
      </Stack>
      {subtitle && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.6, ml: 5.75 }}>{subtitle}</Typography>
      )}
    </Box>
  );
}

function Stat({ label, value, align }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <Box sx={{ textAlign: align ?? 'left' }}>
      <Typography variant="caption" sx={{ color: SUBTLE, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block' }}>
        {label}
      </Typography>
      <Typography fontWeight={900} color={INK}>{value}</Typography>
    </Box>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Card sx={{ borderRadius: CARD_RADIUS, border: `1px dashed ${LINE}`, bgcolor: 'rgba(14,17,22,0.02)' }}>
      <CardContent sx={{ py: 3.5, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: SUBTLE }}>{text}</Typography>
      </CardContent>
    </Card>
  );
}

function TopPostRow({ index, post }: { index: number; post: Record<string, unknown> }) {
  const title =
    pickString(post, ['title', 'caption', 'text', 'name', 'content']) ?? `Post #${index + 1}`;
  const engagementRaw = pickNumber(post, [
    'engagement_rate',
    'engagementRate',
    'engagement',
    'er',
  ]);
  const reach = pickNumber(post, ['reach', 'impressions', 'views']);

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 2.5, py: 1.8, transition: 'background .15s', '&:hover': { bgcolor: 'rgba(14,17,22,0.02)' } }}>
      <Box sx={{ width: 34, height: 34, borderRadius: '11px', flexShrink: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(14,17,22,0.05)', color: INK }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: INK }}>{index + 1}</Typography>
      </Box>
      <Typography sx={{ flex: 1, minWidth: 0, color: INK, fontWeight: 700 }} noWrap title={title}>
        {title}
      </Typography>
      {typeof reach === 'number' && (
        <Stat label="Reach" value={fmtMetric('reach', reach)} align="right" />
      )}
      {typeof engagementRaw === 'number' && (
        <Chip label={fmtRate(engagementRaw)} size="small" sx={{ fontWeight: 700, fontSize: 12, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep, flexShrink: 0 }} />
      )}
    </Stack>
  );
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

function Toast({ toast, onClose }: { toast: string | null; onClose: () => void }) {
  return (
    <Snackbar open={!!toast} autoHideDuration={4000} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity="error" onClose={onClose} sx={{ width: '100%' }}>{toast}</Alert>
    </Snackbar>
  );
}
