'use client';

import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import VerifiedIcon from '@mui/icons-material/Verified';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import { Research, type SocialProfile, type ContentInsights } from '@/lib/api';
import { BRAND } from '@/theme/theme';

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
  return n.toLocaleString();
}

const FORMAT_COLOR: Record<string, string> = {
  image: BRAND.amber,
  carousel: BRAND.teal,
  reel: BRAND.pink,
};

/** Engagement-rate verdict for a colour + label. */
function erVerdict(er: number | null): { label: string; color: string } {
  if (er === null) return { label: 'N/A', color: '#9AA4B2' };
  if (er >= 3) return { label: 'Excellent', color: BRAND.tealDeep };
  if (er >= 1) return { label: 'Good', color: BRAND.teal };
  if (er >= 0.5) return { label: 'Average', color: BRAND.amberDeep };
  return { label: 'Low', color: BRAND.pink };
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        textAlign: 'center',
        py: 1.2,
        px: 0.5,
        borderRadius: 2.5,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>
        {label}
      </Typography>
    </Box>
  );
}

function EngagementRing({ er }: { er: number | null }) {
  const v = erVerdict(er);
  const size = 86;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Scale: cap the visual ring at 5% ER.
  const pct = er === null ? 0 : Math.min(er / 5, 1);
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={v.color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <Box>
          <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {er === null ? '—' : `${er}%`}
          </Typography>
          <Typography sx={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: v.color, fontWeight: 700 }}>
            {v.label}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <Box sx={{ textAlign: 'center', flex: 1 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </Typography>
    </Box>
  );
}

function ContentInsightsPanel({ ci }: { ci: ContentInsights }) {
  const total = ci.format_mix.reduce((s, f) => s + f.count, 0) || 1;
  return (
    <Box sx={{ position: 'relative', mt: 2 }}>
      <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', mb: 0.8 }}>
        Content strategy read · last {ci.sample_size} posts
      </Typography>

      {/* format mix bar */}
      {ci.format_mix.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', mb: 0.8 }}>
            {ci.format_mix.map((f) => (
              <Box
                key={f.format}
                sx={{ width: `${(f.count / total) * 100}%`, background: FORMAT_COLOR[f.format] || '#888' }}
              />
            ))}
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            {ci.format_mix.map((f) => (
              <Stack key={f.format} direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: FORMAT_COLOR[f.format] || '#888' }} />
                <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)' }}>
                  {f.label} {Math.round((f.count / total) * 100)}%
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      <Stack
        direction="row"
        sx={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2.5, py: 1.1, px: 0.5 }}
      >
        <MiniStat value={ci.posts_per_week != null ? `${ci.posts_per_week}` : '—'} label="posts/wk" />
        <MiniStat value={formatNum(ci.avg_likes)} label="avg likes" />
        <MiniStat value={formatNum(ci.avg_comments)} label="avg comments" />
        <MiniStat value={ci.best_format_label || '—'} label="top format" />
      </Stack>

      {(ci.last_post_days != null || ci.best_format_label) && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.2, flexWrap: 'wrap' }}>
          {ci.last_post_days != null && (
            <Chip
              size="small"
              icon={<BoltRoundedIcon sx={{ fontSize: 13, color: '#fff !important' }} />}
              label={ci.last_post_days <= 0 ? 'Posted today' : `Last post ${ci.last_post_days}d ago`}
              sx={{ height: 22, fontSize: 10.5, bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }}
            />
          )}
          {ci.best_format_label && (
            <Chip
              size="small"
              label={`${ci.best_format_label} drives the most engagement`}
              sx={{ height: 22, fontSize: 10.5, bgcolor: 'rgba(20,187,135,0.18)', color: BRAND.teal, fontWeight: 700 }}
            />
          )}
        </Stack>
      )}
    </Box>
  );
}

export default function ProfileAudit({ onBuildStrategy }: { onBuildStrategy?: (p: SocialProfile) => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const res = await Research.socialAudit(url.trim());
      if (!res.found) {
        setError(res.error || 'Profile not found.');
      } else {
        setProfile(res);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        mb: 3,
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 10px 30px rgba(14,17,22,0.08)',
      }}
    >
      {/* input header */}
      <Box sx={{ p: 2.5, background: 'linear-gradient(135deg, rgba(214,44,74,0.06), rgba(255,175,6,0.06))' }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #F58529, #DD2A7B 55%, #8134AF)',
              color: '#fff',
            }}
          >
            <InstagramIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography fontWeight={800} sx={{ lineHeight: 1.1 }}>Profile Audit</Typography>
            <Typography variant="caption" color="text.secondary">
              Live follower &amp; engagement numbers from a public Instagram profile
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            placeholder="instagram.com/nike  ·  @nike"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={run}
            disabled={loading || !url.trim()}
            sx={{ flexShrink: 0, px: 2.5 }}
            startIcon={loading ? <CircularProgress size={15} color="inherit" /> : null}
          >
            {loading ? 'Reading…' : 'Analyze'}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ borderRadius: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* result */}
      {profile && (
        <Box
          sx={{
            p: 2.5,
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #11151B 0%, #1B2330 60%, #0E1A18 100%)',
          }}
        >
          <Box sx={{ position: 'absolute', top: -70, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(221,42,123,0.35), transparent 65%)' }} />

          <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative', mb: 2 }}>
            <Avatar
              src={profile.profile_pic_url || undefined}
              alt={profile.username || ''}
              sx={{ width: 64, height: 64, border: '2px solid rgba(255,255,255,0.25)' }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography fontWeight={800} sx={{ fontSize: 17, lineHeight: 1.2 }} noWrap>
                  {profile.full_name || profile.username}
                </Typography>
                {profile.is_verified && <VerifiedIcon sx={{ fontSize: 18, color: '#3897F0' }} />}
                {profile.private && (
                  <Tooltip title="Private account">
                    <LockRoundedIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }} />
                  </Tooltip>
                )}
              </Stack>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }} noWrap>
                @{profile.username}
                {profile.external_url && (
                  <Box
                    component="a"
                    href={profile.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: BRAND.teal, ml: 1, display: 'inline-flex', alignItems: 'center', gap: 0.3, textDecoration: 'none' }}
                  >
                    site <LaunchRoundedIcon sx={{ fontSize: 12 }} />
                  </Box>
                )}
              </Typography>
              {profile.category && (
                <Chip
                  size="small"
                  label={profile.category}
                  sx={{ mt: 0.5, height: 18, fontSize: 10, bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                />
              )}
            </Box>
          </Stack>

          {/* big numbers + engagement ring */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', mb: profile.biography ? 2 : 0 }}>
            <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
              <StatTile label="Followers" value={formatNum(profile.followers)} />
              <StatTile label="Following" value={formatNum(profile.following)} />
              <StatTile label="Posts" value={formatNum(profile.posts)} />
            </Stack>
            <Box sx={{ textAlign: 'center' }}>
              <EngagementRing er={profile.engagement_rate} />
              <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', mt: 0.3 }}>Engagement</Typography>
            </Box>
          </Stack>

          {profile.biography && (
            <Typography
              sx={{
                position: 'relative',
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.78)',
                whiteSpace: 'pre-line',
                mb: profile.recent_posts.length ? 2 : 0,
              }}
            >
              {profile.biography}
            </Typography>
          )}

          {/* recent posts strip */}
          {profile.recent_posts.length > 0 && (
            <Box sx={{ position: 'relative' }}>
              <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', mb: 0.8 }}>
                Recent posts · avg engagement
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
                {profile.recent_posts.map((p, i) => {
                  const isTop = profile.content_insights?.top_post_index === i;
                  return (
                  <Box
                    key={i}
                    component={p.permalink ? 'a' : 'div'}
                    href={p.permalink || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      position: 'relative',
                      flexShrink: 0,
                      width: 84,
                      height: 84,
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'rgba(255,255,255,0.08)',
                      display: 'block',
                      textDecoration: 'none',
                      border: isTop ? `2px solid ${BRAND.teal}` : '2px solid transparent',
                      boxShadow: isTop ? `0 0 12px ${BRAND.teal}66` : 'none',
                    }}
                  >
                    {isTop && (
                      <Box sx={{ position: 'absolute', top: 3, left: 3, zIndex: 2, px: 0.5, py: 0.1, borderRadius: 1, bgcolor: BRAND.teal, fontSize: 8, fontWeight: 800, color: '#062019', letterSpacing: '0.04em' }}>
                        TOP
                      </Box>
                    )}
                    {p.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {p.is_video && (
                      <PlayArrowRoundedIcon sx={{ position: 'absolute', top: 4, right: 4, fontSize: 16, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                    )}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        px: 0.6,
                        py: 0.4,
                        display: 'flex',
                        gap: 0.8,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                      }}
                    >
                      <Stack direction="row" spacing={0.3} alignItems="center">
                        <FavoriteRoundedIcon sx={{ fontSize: 11, color: '#fff' }} />
                        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>{formatNum(p.likes)}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.3} alignItems="center">
                        <ChatBubbleRoundedIcon sx={{ fontSize: 10, color: '#fff' }} />
                        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>{formatNum(p.comments)}</Typography>
                      </Stack>
                    </Box>
                  </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {profile.content_insights && <ContentInsightsPanel ci={profile.content_insights} />}

          {onBuildStrategy && (profile.followers != null || profile.content_insights) && (
            <Button
              fullWidth
              onClick={() => onBuildStrategy(profile)}
              startIcon={<AutoAwesomeRoundedIcon />}
              sx={{
                position: 'relative',
                mt: 2,
                py: 1.1,
                fontWeight: 800,
                color: '#062019',
                background: BRAND.gradient,
                '&:hover': { background: BRAND.gradient, filter: 'brightness(1.05)' },
              }}
            >
              Build a strategy from this profile
            </Button>
          )}

          {profile.note && (
            <Typography sx={{ position: 'relative', fontSize: 11, color: 'rgba(255,255,255,0.45)', mt: 1.5, fontStyle: 'italic' }}>
              {profile.note}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
