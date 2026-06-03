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
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/lib/auth';
import { Brand, type Brand as BrandT } from '@/lib/api';

function Swatch({ color, label }: { color: string | null; label: string }) {
  if (!color) return null;
  const hex = color.startsWith('#') ? color : `#${color}`;
  return (
    <Stack alignItems="center" spacing={0.5}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          bgcolor: hex,
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" fontWeight={700}>
        {hex.toUpperCase()}
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

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Brand.get()
      .then((b) => {
        setBrand(b);
        if (b?.website) setWebsite(b.website);
        else if (activeWorkspace.website) setWebsite(activeWorkspace.website);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build brand');
    } finally {
      setBuilding(false);
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

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Brand Brain
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Scrape a website to learn its colors, logo, voice and audience. Everything you create
            is grounded in this brand identity.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Website"
              placeholder="https://yourbrand.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={build}
              disabled={building}
              sx={{ minWidth: 160 }}
            >
              {building ? <CircularProgress size={22} /> : brand ? 'Rebuild' : 'Build Brand'}
            </Button>
          </Stack>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {brand && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  IDENTITY
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mb: 3, flexWrap: 'wrap' }}>
                  <Swatch color={brand.primary_color} label="Primary" />
                  <Swatch color={brand.accent_color} label="Accent" />
                </Stack>
                {palette.length > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      PALETTE
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2, mt: 0.5, flexWrap: 'wrap' }}>
                      {palette.map((c) => (
                        <Box
                          key={c}
                          title={`#${c}`}
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 1,
                            bgcolor: `#${c}`,
                            border: '1px solid rgba(0,0,0,0.1)',
                          }}
                        />
                      ))}
                    </Stack>
                  </>
                )}
                {brand.logo_url && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      LOGO
                    </Typography>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={brand.logo_url}
                      alt="logo"
                      style={{ maxHeight: 48, maxWidth: 200, marginTop: 6 }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                {brand.value_prop && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      VALUE PROPOSITION
                    </Typography>
                    <Typography>{brand.value_prop}</Typography>
                  </Box>
                )}
                {brand.mission && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      MISSION
                    </Typography>
                    <Typography>{brand.mission}</Typography>
                  </Box>
                )}
                {brand.pillars && brand.pillars.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      CONTENT PILLARS
                    </Typography>
                    <Stack spacing={1}>
                      {brand.pillars.map((p, i) => {
                        const obj = (p && typeof p === 'object' ? p : {}) as {
                          name?: string;
                          description?: string;
                        };
                        const name = typeof p === 'string' ? p : obj.name || JSON.stringify(p);
                        return (
                          <Box key={i}>
                            <Chip label={name} color="primary" variant="outlined" />
                            {obj.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {obj.description}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                )}
                {brand.keywords && brand.keywords.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      KEYWORDS
                    </Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {brand.keywords.map((k, i) => (
                        <Chip
                          key={i}
                          size="small"
                          label={typeof k === 'string' ? k : JSON.stringify(k)}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
}
