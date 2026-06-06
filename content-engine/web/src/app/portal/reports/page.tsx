'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNewOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import PortalShell from '@/components/PortalShell';
import { Portal, type PortalReport } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

const cardSx = {
  bgcolor: '#fff',
  border: `1px solid ${LINE}`,
  borderRadius: CARD_RADIUS,
  boxShadow: CARD_SHADOW,
  p: 2.5,
} as const;

const inkPill = {
  background: INK,
  backgroundImage: 'none',
  borderRadius: '999px',
  fontWeight: 700,
  textTransform: 'none',
  color: '#fff',
  boxShadow: 'none',
  '&:hover': { background: '#1B2330' },
} as const;

function fmtDate(s: string | null): string {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return s;
  }
}

function ReportsBody() {
  const [reports, setReports] = useState<PortalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setReports(await Portal.reports());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>;
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        spacing={2}
        sx={{ mb: 2.5, px: 0.5 }}
      >
        <Box>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12, fontSize: { xs: 26, md: 34 }, color: INK }}
          >
            Performance{' '}
            <Box
              component="span"
              sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              Reports
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            Shareable performance reports prepared for you.
          </Typography>
        </Box>
      </Stack>

      {reports.length === 0 ? (
        <Box sx={cardSx}>
          <Stack spacing={1.25} alignItems="center" sx={{ py: 4 }}>
            <Box
              sx={{
                width: 48, height: 48, borderRadius: '14px',
                display: 'grid', placeItems: 'center',
                bgcolor: 'rgba(14,17,22,0.05)', color: INK,
              }}
            >
              <AssessmentIcon />
            </Box>
            <Typography variant="body2" color="text.secondary">
              No reports have been published yet.
            </Typography>
          </Stack>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {reports.map((r) => (
            <Grid size={{ xs: 12, md: 6 }} key={r.id}>
              <Box
                sx={{
                  ...cardSx,
                  height: '100%',
                  transition: 'transform .16s ease, box-shadow .16s ease, border-color .16s ease',
                  '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(14,17,22,0.12)' },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ width: 34, height: 34, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(14,17,22,0.05)', color: INK }}>
                    <AssessmentIcon fontSize="small" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 16, color: INK }} noWrap>
                      {r.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(r.date_from || r.date_to)
                        ? `${fmtDate(r.date_from)} – ${fmtDate(r.date_to)}`
                        : `Created ${fmtDate(r.created_at)}`}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.75 }}>
                      <Chip
                        size="small"
                        icon={<VisibilityIcon />}
                        label={`${r.views} views`}
                        sx={{ fontWeight: 700, fontSize: 12, bgcolor: 'rgba(14,17,22,0.05)', color: SUBTLE, '& .MuiChip-icon': { color: SUBTLE } }}
                      />
                      <Button
                        component={Link}
                        href={`/reports/${r.token}`}
                        target="_blank"
                        size="small"
                        variant="contained"
                        endIcon={<OpenInNewIcon />}
                        sx={{ ...inkPill, ml: 'auto', px: 2 }}
                      >
                        Open
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default function PortalReportsPage() {
  return (
    <PortalShell>
      <ReportsBody />
    </PortalShell>
  );
}
