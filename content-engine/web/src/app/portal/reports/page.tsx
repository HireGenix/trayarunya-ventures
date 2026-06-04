'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  Typography,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNewOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import PortalShell from '@/components/PortalShell';
import { Portal, type PortalReport } from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';

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
    return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={800} color={INK}>Reports</Typography>
        <Typography variant="body2" color={SUBTLE}>
          Shareable performance reports prepared for you.
        </Typography>
      </Box>

      {reports.length === 0 ? (
        <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
              <AssessmentIcon sx={{ color: SUBTLE, fontSize: 40 }} />
              <Typography variant="body2" color={SUBTLE}>
                No reports have been published yet.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {reports.map((r) => (
            <Grid size={{ xs: 12, md: 6 }} key={r.id}>
              <Card variant="outlined" sx={{ borderColor: BORDER, borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: '#F3EEFF', color: '#7C3AED' }}>
                      <AssessmentIcon />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={800} color={INK} noWrap>
                        {r.title}
                      </Typography>
                      <Typography variant="caption" color={SUBTLE}>
                        {(r.date_from || r.date_to)
                          ? `${fmtDate(r.date_from)} – ${fmtDate(r.date_to)}`
                          : `Created ${fmtDate(r.created_at)}`}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                        <Chip
                          size="small"
                          icon={<VisibilityIcon />}
                          label={`${r.views} views`}
                          sx={{ fontWeight: 600 }}
                        />
                        <Button
                          component={Link}
                          href={`/reports/${r.token}`}
                          target="_blank"
                          size="small"
                          variant="contained"
                          endIcon={<OpenInNewIcon />}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, ml: 'auto' }}
                        >
                          Open
                        </Button>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}

export default function PortalReportsPage() {
  return (
    <PortalShell>
      <ReportsBody />
    </PortalShell>
  );
}
