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

function IgStat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
      <Box component="span" sx={{ fontWeight: 800, fontSize: 16, color: '#0E1116' }}>{value}</Box>{' '}
      <Box component="span" sx={{ fontSize: 13.5, color: '#6B7280' }}>{label}</Box>
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

      {/* result — Instagram-style profile */}
      {profile && (
        <Box sx={{ bgcolor: '#fff' }}>
          {/* ── IG profile header ── */}
          <Box sx={{ px: { xs: 2, sm: 3 }, pt: 3, pb: 2.5 }}>
            <Stack direction="row" spacing={{ xs: 2, sm: 3.5 }} alignItems="flex-start">
              {/* gradient-ring avatar */}
              <Box
                sx={{
                  flexShrink: 0,
                  p: '3px',
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #F58529, #FEDA77 25%, #DD2A7B 55%, #8134AF 80%, #515BD4)',
                }}
              >
                <Box sx={{ p: '3px', borderRadius: '50%', bgcolor: '#fff' }}>
                  <Avatar
                    src={profile.profile_pic_url || undefined}
                    alt={profile.username || ''}
                    sx={{ width: { xs: 76, sm: 96 }, height: { xs: 76, sm: 96 } }}
                  />
                </Box>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0, pt: { sm: 0.5 } }}>
                {/* username row */}
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 500, color: '#0E1116', lineHeight: 1.1 }} noWrap>
                    {profile.username}
                  </Typography>
                  {profile.is_verified && <VerifiedIcon sx={{ fontSize: 19, color: '#3897F0' }} />}
                  {profile.private && (
                    <Tooltip title="Private account">
                      <LockRoundedIcon sx={{ fontSize: 15, color: '#9AA4B2' }} />
                    </Tooltip>
                  )}
                  {profile.is_business && (
                    <Chip size="small" label="Business" sx={{ height: 19, fontSize: 10, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4F46E5' }} />
                  )}
                </Stack>

                {/* inline stats — IG style */}
                <Stack direction="row" spacing={{ xs: 2, sm: 4 }} sx={{ mb: 1.25 }}>
                  <IgStat value={formatNum(profile.posts)} label="posts" />
                  <IgStat value={formatNum(profile.followers)} label="followers" />
                  <IgStat value={formatNum(profile.following)} label="following" />
                </Stack>

                {/* name + category + link (desktop) */}
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {profile.full_name && (
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>
                      {profile.full_name}
                    </Typography>
                  )}
                  {profile.category && (
                    <Typography sx={{ fontSize: 13, color: '#6B7280' }}>{profile.category}</Typography>
                  )}
                  {profile.biography && (
                    <Typography sx={{ fontSize: 13.5, color: '#262626', whiteSpace: 'pre-line', mt: 0.25, lineHeight: 1.5 }}>
                      {profile.biography}
                    </Typography>
                  )}
                  {profile.external_url && (
                    <Box
                      component="a"
                      href={profile.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, mt: 0.5, fontSize: 13.5, fontWeight: 700, color: '#00376B', textDecoration: 'none' }}
                    >
                      {(() => { try { return new URL(profile.external_url).hostname.replace('www.', ''); } catch { return profile.external_url; } })()}
                      <LaunchRoundedIcon sx={{ fontSize: 13 }} />
                    </Box>
                  )}
                </Box>
              </Box>
            </Stack>

            {/* name + bio (mobile, below) */}
            <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 1.5 }}>
              {profile.full_name && (
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{profile.full_name}</Typography>
              )}
              {profile.category && (
                <Typography sx={{ fontSize: 13, color: '#6B7280' }}>{profile.category}</Typography>
              )}
              {profile.biography && (
                <Typography sx={{ fontSize: 13.5, color: '#262626', whiteSpace: 'pre-line', mt: 0.25, lineHeight: 1.5 }}>
                  {profile.biography}
                </Typography>
              )}
              {profile.external_url && (
                <Box
                  component="a"
                  href={profile.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, mt: 0.5, fontSize: 13.5, fontWeight: 700, color: '#00376B', textDecoration: 'none' }}
                >
                  {(() => { try { return new URL(profile.external_url).hostname.replace('www.', ''); } catch { return profile.external_url; } })()}
                  <LaunchRoundedIcon sx={{ fontSize: 13 }} />
                </Box>
              )}
            </Box>

            {/* engagement quick-read pill */}
            {profile.engagement_rate != null && (
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  size="small"
                  icon={<BoltRoundedIcon sx={{ fontSize: 14, color: `${erVerdict(profile.engagement_rate).color} !important` }} />}
                  label={`${profile.engagement_rate}% engagement · ${erVerdict(profile.engagement_rate).label}`}
                  sx={{
                    height: 26, fontSize: 12, fontWeight: 700,
                    bgcolor: `${erVerdict(profile.engagement_rate).color}14`,
                    color: erVerdict(profile.engagement_rate).color,
                    border: `1px solid ${erVerdict(profile.engagement_rate).color}33`,
                  }}
                />
                {profile.content_insights?.posts_per_week != null && (
                  <Chip
                    size="small"
                    label={`${profile.content_insights.posts_per_week} posts/week`}
                    sx={{ height: 26, fontSize: 12, fontWeight: 600, bgcolor: '#F2F4F7', color: '#374151' }}
                  />
                )}
                {profile.content_insights?.last_post_days != null && (
                  <Chip
                    size="small"
                    label={profile.content_insights.last_post_days <= 0 ? 'Posted today' : `Last post ${profile.content_insights.last_post_days}d ago`}
                    sx={{ height: 26, fontSize: 12, fontWeight: 600, bgcolor: '#F2F4F7', color: '#374151' }}
                  />
                )}
              </Stack>
            )}
          </Box>

          {/* ── posts grid (IG style) ── */}
          {profile.recent_posts.length > 0 && (
            <Box sx={{ borderTop: '1px solid #EFEFEF' }}>
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.8} sx={{ py: 1.25 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', gap: '1.5px', width: 13, height: 13 }}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Box key={i} sx={{ bgcolor: '#262626', borderRadius: '0.5px' }} />
                  ))}
                </Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', color: '#262626' }}>POSTS</Typography>
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: { xs: '2px', sm: '4px' },
                  pb: 0.5,
                }}
              >
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
                        aspectRatio: '1 / 1',
                        overflow: 'hidden',
                        bgcolor: '#F2F4F7',
                        display: 'block',
                        textDecoration: 'none',
                        cursor: p.permalink ? 'pointer' : 'default',
                        '&:hover .ig-overlay': { opacity: 1 },
                        '&:hover img': { transform: 'scale(1.04)' },
                      }}
                    >
                      {p.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.thumbnail}
                          alt=""
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .35s ease' }}
                        />
                      ) : (
                        <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#C4CAD3' }}>
                          <InstagramIcon sx={{ fontSize: 26 }} />
                        </Box>
                      )}

                      {/* top badge */}
                      {isTop && (
                        <Box sx={{ position: 'absolute', top: 6, left: 6, zIndex: 2, px: 0.7, py: 0.2, borderRadius: 1, bgcolor: BRAND.teal, fontSize: 9, fontWeight: 800, color: '#062019', letterSpacing: '0.04em' }}>
                          TOP
                        </Box>
                      )}
                      {/* reel/video indicator */}
                      {p.is_video && (
                        <PlayArrowRoundedIcon sx={{ position: 'absolute', top: 6, right: 6, fontSize: 19, color: '#fff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }} />
                      )}

                      {/* hover overlay with engagement */}
                      <Box
                        className="ig-overlay"
                        sx={{
                          position: 'absolute', inset: 0, opacity: 0, transition: 'opacity .2s ease',
                          background: 'rgba(0,0,0,0.42)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2.5,
                        }}
                      >
                        <Stack direction="row" spacing={0.6} alignItems="center">
                          <FavoriteRoundedIcon sx={{ fontSize: 17, color: '#fff' }} />
                          <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{formatNum(p.likes)}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.6} alignItems="center">
                          <ChatBubbleRoundedIcon sx={{ fontSize: 15, color: '#fff' }} />
                          <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{formatNum(p.comments)}</Typography>
                        </Stack>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* ── performance audit (dark insight band) ── */}
          {(profile.engagement_rate != null || profile.content_insights) && (
            <Box
              sx={{
                m: { xs: 1.5, sm: 2 }, p: 2.5, borderRadius: 3, color: '#fff', position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, #11151B 0%, #1B2330 60%, #0E1A18 100%)',
              }}
            >
              <Box sx={{ position: 'absolute', top: -70, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(221,42,123,0.32), transparent 65%)' }} />
              <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative' }}>
                <EngagementRing er={profile.engagement_rate} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', mb: 0.4 }}>
                    Performance audit
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>
                    {erVerdict(profile.engagement_rate).label} engagement for an account this size
                  </Typography>
                </Box>
              </Stack>
              {profile.content_insights && <ContentInsightsPanel ci={profile.content_insights} />}
            </Box>
          )}

          {onBuildStrategy && (profile.followers != null || profile.content_insights) && (
            <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 2.5 }}>
              <Button
                fullWidth
                onClick={() => onBuildStrategy(profile)}
                startIcon={<AutoAwesomeRoundedIcon />}
                sx={{
                  py: 1.15,
                  fontWeight: 800,
                  color: '#062019',
                  background: BRAND.gradient,
                  '&:hover': { background: BRAND.gradient, filter: 'brightness(1.05)' },
                }}
              >
                Build a strategy from this profile
              </Button>
            </Box>
          )}

          {profile.note && (
            <Typography sx={{ px: { xs: 2, sm: 3 }, pb: 2, fontSize: 11.5, color: '#9AA4B2', fontStyle: 'italic' }}>
              {profile.note}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
