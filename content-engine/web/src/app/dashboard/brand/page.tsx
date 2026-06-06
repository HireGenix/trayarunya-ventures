'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import RecordVoiceOverRoundedIcon from '@mui/icons-material/RecordVoiceOverRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import ViewColumnRoundedIcon from '@mui/icons-material/ViewColumnRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useAuth } from '@/lib/auth';
import { Brand, API_URL, type Brand as BrandT } from '@/lib/api';
import { BRAND } from '@/theme/theme';

function normHex(c: string): string {
  if (!c) return '#000000';
  return c.startsWith('#') ? c : `#${c}`;
}

function readable(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

// Flatten a loose voice/audience record into displayable label/value pairs.
function recordEntries(rec: Record<string, unknown> | null | undefined): {
  label: string;
  value: string;
}[] {
  if (!rec || typeof rec !== 'object') return [];
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(rec)) {
    if (v == null || v === '') continue;
    let value: string;
    if (Array.isArray(v)) value = v.map((x) => String(x)).join(', ');
    else if (typeof v === 'object') value = Object.values(v as object).map(String).join(', ');
    else value = String(v);
    if (!value) continue;
    out.push({ label: readable(k), value });
  }
  return out;
}

function CopyHex({ hex }: { hex: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy hex'}>
      <IconButton
        size="small"
        onClick={() => {
          navigator.clipboard?.writeText(hex.toUpperCase());
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        sx={{ color: 'text.disabled' }}
      >
        <ContentCopyRoundedIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Tooltip>
  );
}

function BigSwatch({ color, label }: { color: string | null; label: string }) {
  if (!color) return null;
  const hex = (color.startsWith('#') ? color : `#${color}`).toUpperCase();
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 150,
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ height: 76, bgcolor: hex }} />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1.5, py: 1 }}
      >
        <Box>
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.6 }}>
            {label.toUpperCase()}
          </Typography>
          <Typography fontWeight={800} sx={{ fontSize: 14, color: BRAND.ink }}>
            {hex}
          </Typography>
        </Box>
        <CopyHex hex={hex} />
      </Stack>
    </Box>
  );
}

function SectionHeader({
  icon,
  title,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
}) {
  return (
    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 2 }}>
      <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(color, 0.14), color }}>{icon}</Avatar>
      <Typography variant="subtitle1" fontWeight={800} color={BRAND.ink}>
        {title}
      </Typography>
    </Stack>
  );
}

export default function BrandPage() {
  const { activeWorkspace } = useAuth();
  const [brand, setBrand] = useState<BrandT | null>(null);
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');
  const [primary, setPrimary] = useState('#ffaf06');
  const [accent, setAccent] = useState('#14bb87');
  const [savingColors, setSavingColors] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Brand.get()
      .then((b) => {
        setBrand(b);
        if (b?.website) setWebsite(b.website);
        else if (activeWorkspace.website) setWebsite(activeWorkspace.website);
        if (b?.primary_color) setPrimary(normHex(b.primary_color));
        if (b?.accent_color) setAccent(normHex(b.accent_color));
      })
      .catch(() => setBrand(null))
      .finally(() => setLoading(false));
  }, [activeWorkspace]);

  const build = async () => {
    if (!website.trim()) return;
    setBuilding(true);
    setError('');
    try {
      const b = await Brand.build({ website: website.trim() });
      setBrand(b);
      if (b?.primary_color) setPrimary(normHex(b.primary_color));
      if (b?.accent_color) setAccent(normHex(b.accent_color));
      setMsg('Brand brain refreshed from your website.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build brand');
    } finally {
      setBuilding(false);
    }
  };

  const saveColors = async () => {
    setSavingColors(true);
    setError('');
    setMsg('');
    try {
      const b = await Brand.update({ primary_color: primary, accent_color: accent });
      setBrand(b);
      setMsg('Brand colors saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save colors');
    } finally {
      setSavingColors(false);
    }
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    setMsg('');
    try {
      const b = await Brand.uploadLogo(file);
      setBrand(b);
      setMsg('Logo uploaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  const palette = (brand?.profile?.palette as string[] | undefined) || [];
  const logoSrc = brand?.logo_url
    ? brand.logo_url.startsWith('http')
      ? brand.logo_url
      : `${API_URL}${brand.logo_url}`
    : null;
  const voice = recordEntries(brand?.voice);
  const audience = recordEntries(brand?.audience);
  const hasIdentity = !!(brand?.primary_color || brand?.accent_color || palette.length || logoSrc);

  const completeness = brand
    ? [
        !!(brand.primary_color || brand.accent_color),
        !!logoSrc,
        !!brand.value_prop,
        !!brand.mission,
        !!(brand.pillars && brand.pillars.length),
        !!(brand.keywords && brand.keywords.length),
        voice.length > 0,
        audience.length > 0,
      ].filter(Boolean).length
    : 0;
  const completenessPct = Math.round((completeness / 8) * 100);

  return (
    <Stack spacing={3}>
      {/* Hero */}
      <Card
        sx={{
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(120deg, ${alpha(BRAND.amber, 0.18)} 0%, ${alpha(
            BRAND.teal,
            0.16,
          )} 100%)`,
          border: `1px solid ${alpha(BRAND.amberDeep, 0.18)}`,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  display: 'grid',
                  placeItems: 'center',
                  background: BRAND.gradient,
                  color: '#fff',
                  flexShrink: 0,
                  boxShadow: `0 8px 22px ${alpha(BRAND.amberDeep, 0.3)}`,
                }}
              >
                <PsychologyRoundedIcon sx={{ fontSize: 30 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} color={BRAND.ink}>
                  Brand Brain
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
                  The single source of truth for {activeWorkspace?.name || 'your brand'} — colors,
                  logo, voice and audience that every generated asset is grounded in.
                </Typography>
                {brand?.website && (
                  <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.6 }}>
                    <LanguageRoundedIcon sx={{ fontSize: 15, color: BRAND.tealDeep }} />
                    <Typography
                      component="a"
                      href={brand.website}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ fontSize: 13, fontWeight: 600, color: BRAND.tealDeep, textDecoration: 'none' }}
                    >
                      {brand.website.replace(/^https?:\/\//, '')}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Stack>

            {brand && (
              <Stack alignItems="center" sx={{ minWidth: 130 }}>
                <Box sx={{ position: 'relative', width: 78, height: 78 }}>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={78}
                    thickness={4}
                    sx={{ color: alpha(BRAND.ink, 0.08), position: 'absolute' }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={completenessPct}
                    size={78}
                    thickness={4}
                    sx={{ color: BRAND.tealDeep }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Typography fontWeight={800} sx={{ fontSize: 18, color: BRAND.ink }}>
                      {completenessPct}%
                    </Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mt: 0.5 }}>
                  Profile complete
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Build / rebuild row */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ mt: 3 }}
            alignItems="stretch"
          >
            <TextField
              label="Website to learn from"
              placeholder="https://yourbrand.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              fullWidth
              size="small"
              sx={{ bgcolor: '#fff', borderRadius: 1 }}
              InputProps={{
                startAdornment: <LanguageRoundedIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 20 }} />,
              }}
            />
            <Button
              variant="contained"
              onClick={build}
              disabled={building || !website.trim()}
              startIcon={
                building ? (
                  <CircularProgress size={18} color="inherit" />
                ) : brand ? (
                  <RefreshRoundedIcon />
                ) : (
                  <AutoAwesomeRoundedIcon />
                )
              }
              sx={{ minWidth: 180, whiteSpace: 'nowrap' }}
            >
              {building ? 'Analysing…' : brand ? 'Rebuild brain' : 'Build brand brain'}
            </Button>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {msg && (
            <Alert severity="success" sx={{ mt: 2 }} onClose={() => setMsg('')}>
              {msg}
            </Alert>
          )}
        </CardContent>
      </Card>

      {!brand && (
        <Card sx={{ borderRadius: 3, borderStyle: 'dashed', borderWidth: 2, borderColor: alpha(BRAND.amberDeep, 0.3) }} variant="outlined">
          <CardContent sx={{ p: 5, textAlign: 'center' }}>
            <Avatar sx={{ width: 60, height: 60, bgcolor: alpha(BRAND.amber, 0.16), color: BRAND.amberDeep, mx: 'auto', mb: 2 }}>
              <AutoAwesomeRoundedIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              No brand brain yet
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 440, mx: 'auto' }}>
              Paste your website above and hit <strong>Build brand brain</strong>. We&apos;ll scrape
              your colors, logo, voice and audience so every post, carousel and PDF looks on-brand.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Identity + Edit */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<PaletteRoundedIcon sx={{ fontSize: 18 }} />} title="Visual identity" color={BRAND.amberDeep} />
              {hasIdentity ? (
                <>
                  <Stack direction="row" spacing={1.5}>
                    <BigSwatch color={brand?.primary_color || primary} label="Primary" />
                    <BigSwatch color={brand?.accent_color || accent} label="Accent" />
                  </Stack>
                  {palette.length > 0 && (
                    <Box sx={{ mt: 2.5 }}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.6, mb: 1 }}>
                        EXTRACTED PALETTE
                      </Typography>
                      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {palette.map((c) => (
                          <Tooltip key={c} title={`#${c.replace(/^#/, '').toUpperCase()}`}>
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: 1.5,
                                bgcolor: c.startsWith('#') ? c : `#${c}`,
                                border: '1px solid',
                                borderColor: 'divider',
                                cursor: 'pointer',
                              }}
                            />
                          </Tooltip>
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {logoSrc && (
                    <Box sx={{ mt: 2.5 }}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.6, mb: 1 }}>
                        LOGO
                      </Typography>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: alpha(BRAND.ink, 0.02),
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoSrc} alt="brand logo" style={{ maxHeight: 56, maxWidth: '100%' }} />
                      </Box>
                    </Box>
                  )}
                </>
              ) : (
                <Typography color="text.secondary">
                  Build the brand brain to extract colors and a logo automatically.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />} title="Edit identity" color={BRAND.teal} />
              <Typography color="text.secondary" sx={{ mb: 2.5, fontSize: 13.5 }}>
                Override auto-detected colors and upload your own logo. Applied to every generated
                graphic, PDF and carousel.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.6, mb: 0.8 }}>
                    PRIMARY
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      component="input"
                      type="color"
                      value={primary}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrimary(e.target.value)}
                      aria-label="Primary color"
                      sx={{ width: 44, height: 40, border: 'none', background: 'none', cursor: 'pointer', p: 0 }}
                    />
                    <TextField size="small" value={primary} onChange={(e) => setPrimary(e.target.value)} fullWidth />
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.6, mb: 0.8 }}>
                    ACCENT
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      component="input"
                      type="color"
                      value={accent}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccent(e.target.value)}
                      aria-label="Accent color"
                      sx={{ width: 44, height: 40, border: 'none', background: 'none', cursor: 'pointer', p: 0 }}
                    />
                    <TextField size="small" value={accent} onChange={(e) => setAccent(e.target.value)} fullWidth />
                  </Stack>
                </Grid>
              </Grid>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
                <Button
                  variant="contained"
                  onClick={saveColors}
                  disabled={savingColors}
                  startIcon={savingColors ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
                  fullWidth
                >
                  Save colors
                </Button>
                <Button
                  variant="outlined"
                  component="label"
                  disabled={uploadingLogo}
                  startIcon={uploadingLogo ? <CircularProgress size={16} /> : <UploadRoundedIcon />}
                  fullWidth
                >
                  Upload logo
                  <input hidden type="file" accept="image/*" onChange={onLogo} />
                </Button>
              </Stack>
              {logoSrc && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.6, mb: 0.8 }}>
                    CURRENT LOGO
                  </Typography>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoSrc} alt="logo" style={{ maxHeight: 44, maxWidth: 200 }} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Strategy: value prop + mission */}
      {brand && (brand.value_prop || brand.mission) && (
        <Grid container spacing={3}>
          {brand.value_prop && (
            <Grid size={{ xs: 12, md: brand.mission ? 6 : 12 }}>
              <Card sx={{ height: '100%', borderRadius: 3, borderLeft: `4px solid ${BRAND.amber}` }}>
                <CardContent sx={{ p: 3 }}>
                  <SectionHeader icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />} title="Value proposition" color={BRAND.amberDeep} />
                  <Typography sx={{ fontSize: 15, lineHeight: 1.7, color: BRAND.ink }}>
                    {brand.value_prop}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {brand.mission && (
            <Grid size={{ xs: 12, md: brand.value_prop ? 6 : 12 }}>
              <Card sx={{ height: '100%', borderRadius: 3, borderLeft: `4px solid ${BRAND.teal}` }}>
                <CardContent sx={{ p: 3 }}>
                  <SectionHeader icon={<FlagRoundedIcon sx={{ fontSize: 18 }} />} title="Mission" color={BRAND.tealDeep} />
                  <Typography sx={{ fontSize: 15, lineHeight: 1.7, color: BRAND.ink }}>
                    {brand.mission}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Content pillars */}
      {brand?.pillars && brand.pillars.length > 0 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader icon={<ViewColumnRoundedIcon sx={{ fontSize: 18 }} />} title="Content pillars" color={BRAND.pink} />
            <Grid container spacing={2}>
              {brand.pillars.map((p, i) => {
                const obj = (p && typeof p === 'object' ? p : {}) as {
                  name?: string;
                  description?: string;
                };
                const name = typeof p === 'string' ? p : obj.name || JSON.stringify(p);
                const accentColor = [BRAND.amberDeep, BRAND.tealDeep, BRAND.pink, '#0A66C2'][i % 4];
                return (
                  <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box
                      sx={{
                        height: '100%',
                        p: 2,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: alpha(accentColor, 0.04),
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Box
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: 1.5,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: alpha(accentColor, 0.16),
                            color: accentColor,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {i + 1}
                        </Box>
                        <Typography fontWeight={800} sx={{ fontSize: 14, color: BRAND.ink }}>
                          {name}
                        </Typography>
                      </Stack>
                      {obj.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          {obj.description}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Voice + Audience */}
      {brand && (voice.length > 0 || audience.length > 0) && (
        <Grid container spacing={3}>
          {voice.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <SectionHeader icon={<RecordVoiceOverRoundedIcon sx={{ fontSize: 18 }} />} title="Brand voice" color={BRAND.amberDeep} />
                  <Stack spacing={1.5} divider={<Divider flexItem />}>
                    {voice.map((e, i) => (
                      <Box key={i}>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.6 }}>
                          {e.label.toUpperCase()}
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: BRAND.ink, mt: 0.3 }}>{e.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}
          {audience.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%', borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <SectionHeader icon={<GroupsRoundedIcon sx={{ fontSize: 18 }} />} title="Target audience" color={BRAND.tealDeep} />
                  <Stack spacing={1.5} divider={<Divider flexItem />}>
                    {audience.map((e, i) => (
                      <Box key={i}>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.6 }}>
                          {e.label.toUpperCase()}
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: BRAND.ink, mt: 0.3 }}>{e.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Keywords */}
      {brand?.keywords && brand.keywords.length > 0 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader icon={<SellRoundedIcon sx={{ fontSize: 18 }} />} title="Keywords" color={BRAND.teal} />
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.8 }}>
              {brand.keywords.map((k, i) => (
                <Chip
                  key={i}
                  label={typeof k === 'string' ? k : JSON.stringify(k)}
                  sx={{
                    fontWeight: 600,
                    bgcolor: alpha(BRAND.teal, 0.1),
                    color: BRAND.tealDeep,
                    '&:hover': { bgcolor: alpha(BRAND.teal, 0.18) },
                  }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
