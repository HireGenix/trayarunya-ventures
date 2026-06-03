'use client';

import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VerifiedIcon from '@mui/icons-material/Verified';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import { Research, type SocialProfile } from '@/lib/api';
import { BRAND } from '@/theme/theme';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
  return n.toLocaleString();
}

function erColor(er: number | null): string {
  if (er === null) return '#9AA4B2';
  if (er >= 3) return BRAND.tealDeep;
  if (er >= 1) return BRAND.teal;
  if (er >= 0.5) return BRAND.amberDeep;
  return BRAND.pink;
}

export default function ProfileBenchmark({ onBuildStrategy }: { onBuildStrategy?: (p: SocialProfile) => void }) {
  const [primary, setPrimary] = useState('');
  const [competitors, setCompetitors] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SocialProfile[] | null>(null);

  const setComp = (i: number, v: string) =>
    setCompetitors((prev) => prev.map((c, idx) => (idx === i ? v : c)));
  const addComp = () => setCompetitors((prev) => (prev.length >= 5 ? prev : [...prev, '']));
  const removeComp = (i: number) => setCompetitors((prev) => prev.filter((_, idx) => idx !== i));

  const run = async () => {
    const urls = [primary, ...competitors].map((u) => u.trim()).filter(Boolean);
    if (urls.length < 2) {
      setError('Add your profile plus at least one competitor.');
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      setResults(await Research.socialBenchmark(urls));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Benchmark failed');
    } finally {
      setLoading(false);
    }
  };

  const found = (results || []).filter((r) => r.found);
  const maxFollowers = Math.max(1, ...found.map((r) => r.followers || 0));
  const totalFollowers = found.reduce((s, r) => s + (r.followers || 0), 0) || 1;
  const erRanked = [...found].sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0));
  const erLeader = erRanked[0];

  return (
    <Box
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 10px 30px rgba(14,17,22,0.08)',
      }}
    >
      {/* input header */}
      <Box sx={{ p: 2.5, background: 'linear-gradient(135deg, rgba(20,187,135,0.08), rgba(255,175,6,0.07))' }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              background: BRAND.gradient,
              color: '#062019',
            }}
          >
            <CompareArrowsRoundedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ lineHeight: 1.1 }}>Competitor Benchmark</Typography>
            <Typography variant="caption" color="text.secondary">
              Stack your profile against rivals — followers, engagement &amp; share of voice
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={1}>
          <TextField
            size="small"
            fullWidth
            label="Your profile"
            placeholder="@yourbrand"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
          />
          {competitors.map((c, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                fullWidth
                label={`Competitor ${i + 1}`}
                placeholder="@competitor"
                value={c}
                onChange={(e) => setComp(i, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && run()}
              />
              {competitors.length > 1 && (
                <IconButton size="small" onClick={() => removeComp(i)} aria-label="remove competitor">
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          ))}
          <Stack direction="row" spacing={1} justifyContent="space-between">
            <Button
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={addComp}
              disabled={competitors.length >= 5}
              sx={{ color: BRAND.tealDeep }}
            >
              Add competitor
            </Button>
            <Button
              variant="contained"
              onClick={run}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={15} color="inherit" /> : null}
              sx={{ px: 2.5 }}
            >
              {loading ? 'Comparing…' : 'Compare'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ borderRadius: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* results */}
      {found.length > 0 && (
        <Box sx={{ p: 2.5, background: 'linear-gradient(135deg, #11151B 0%, #1B2330 60%, #0E1A18 100%)' }}>
          {erLeader && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <EmojiEventsRoundedIcon sx={{ color: BRAND.amber, fontSize: 18 }} />
              <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>
                <b style={{ color: '#fff' }}>@{erLeader.username}</b> leads on engagement
                {erLeader.engagement_rate != null ? ` (${erLeader.engagement_rate}%)` : ''}
              </Typography>
            </Stack>
          )}

          <Stack spacing={1.2}>
            {found.map((r) => {
              const erc = erColor(r.engagement_rate);
              const sov = Math.round(((r.followers || 0) / totalFollowers) * 100);
              return (
                <Box
                  key={r.query || r.username}
                  sx={{
                    p: 1.4,
                    borderRadius: 2.5,
                    background: r.is_primary ? 'rgba(20,187,135,0.12)' : 'rgba(255,255,255,0.05)',
                    border: r.is_primary ? `1px solid ${BRAND.teal}55` : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Stack direction="row" spacing={1.4} alignItems="center">
                    <Avatar src={r.profile_pic_url || undefined} sx={{ width: 40, height: 40 }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }} noWrap>
                          {r.full_name || r.username}
                        </Typography>
                        {r.is_verified && <VerifiedIcon sx={{ fontSize: 14, color: '#3897F0' }} />}
                        {r.is_primary && (
                          <Chip label="YOU" size="small" sx={{ height: 16, fontSize: 8.5, fontWeight: 800, bgcolor: BRAND.teal, color: '#062019' }} />
                        )}
                      </Stack>
                      {/* follower bar */}
                      <Box sx={{ mt: 0.6, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <Box sx={{ width: `${((r.followers || 0) / maxFollowers) * 100}%`, height: '100%', background: BRAND.gradient }} />
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'center', width: 62 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{fmt(r.followers)}</Typography>
                      <Typography sx={{ fontSize: 8.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>followers</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', width: 52 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 800, color: erc, lineHeight: 1 }}>
                        {r.engagement_rate != null ? `${r.engagement_rate}%` : '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 8.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>eng.</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', width: 46 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{sov}%</Typography>
                      <Typography sx={{ fontSize: 8.5, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>SoV</Typography>
                    </Box>
                  </Stack>
                  {r.content_insights?.best_format_label && (
                    <Stack direction="row" spacing={0.8} sx={{ mt: 0.8, pl: 6.4, flexWrap: 'wrap' }}>
                      {r.content_insights.posts_per_week != null && (
                        <Chip size="small" label={`${r.content_insights.posts_per_week} posts/wk`} sx={{ height: 18, fontSize: 9.5, bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }} />
                      )}
                      <Chip size="small" label={`Wins with ${r.content_insights.best_format_label}`} sx={{ height: 18, fontSize: 9.5, bgcolor: 'rgba(20,187,135,0.15)', color: BRAND.teal }} />
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>

          {onBuildStrategy && (
            <Button
              fullWidth
              onClick={() => onBuildStrategy(found.find((r) => r.is_primary) || found[0])}
              sx={{ mt: 2, py: 1, fontWeight: 800, color: '#062019', background: BRAND.gradient, '&:hover': { background: BRAND.gradient, filter: 'brightness(1.05)' } }}
            >
              Turn this gap analysis into a strategy
            </Button>
          )}

          {(results || []).some((r) => !r.found) && (
            <Typography sx={{ mt: 1.5, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
              Couldn&apos;t read: {(results || []).filter((r) => !r.found).map((r) => `@${r.username || r.query}`).join(', ')}.
              Private profiles &amp; non-Instagram platforms return limited data.
            </Typography>
          )}
        </Box>
      )}

      {results && found.length === 0 && (
        <Box sx={{ p: 2.5 }}>
          <Typography color="text.secondary">No profiles could be read. Check the handles and try again.</Typography>
        </Box>
      )}
    </Box>
  );
}
