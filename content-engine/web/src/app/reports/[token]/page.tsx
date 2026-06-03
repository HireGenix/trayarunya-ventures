'use client';

import { use, useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import { Reports, type PublicReport } from '@/lib/api';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

function platformColor(p: string) {
  const map: Record<string, string> = {
    linkedin: '#0A66C2',
    instagram: '#E1306C',
    twitter: '#1DA1F2',
    x: '#000',
    facebook: '#1877F2',
    tiktok: '#010101',
    youtube: '#FF0000',
    pinterest: '#E60023',
    reddit: '#FF4500',
  };
  return map[p.toLowerCase()] || '#666';
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}
function KpiCard({ label, value, icon, accent }: KpiCardProps) {
  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 2.5,
        background: '#fff',
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.07)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        '@media print': { boxShadow: 'none', border: '1px solid #ddd' },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2.5,
          bgcolor: accent,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Box sx={{ color: '#fff', display: 'flex' }}>{icon}</Box>
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, color: '#111' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [report, setReport] = useState<PublicReport | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Reports.getPublic(token)
      .then(setReport)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(160deg,#F0FAF6 0%,#EAF0EC 100%)',
        }}
      >
        <Stack alignItems="center" gap={2}>
          <CircularProgress sx={{ color: '#14BB87' }} />
          <Typography color="text.secondary">Loading report…</Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(160deg,#F0FAF6 0%,#EAF0EC 100%)',
        }}
      >
        <Stack alignItems="center" gap={1.5}>
          <Typography variant="h5" fontWeight={800} color="#333">
            Report not found
          </Typography>
          <Typography color="text.secondary">
            This link may have expired or the report was deleted.
          </Typography>
        </Stack>
      </Box>
    );
  }

  const d = report.data;
  const t = d.totals || {};
  const posts = d.posts || [];

  return (
    <>
      {/* Print-only CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 16mm; }
        }
      `}</style>

      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg,#F0FAF6 0%,#EAF0EC 100%)',
          py: { xs: 3, md: 6 },
          px: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ maxWidth: 860, mx: 'auto' }}>

          {/* ── Header card ── */}
          <Box
            sx={{
              borderRadius: { xs: 3, md: 4 },
              background: 'linear-gradient(135deg,#0E1116 0%,#1a2438 100%)',
              color: '#fff',
              p: { xs: 3, md: 5 },
              mb: 3,
              position: 'relative',
              overflow: 'hidden',
              '@media print': { borderRadius: 2 },
            }}
          >
            {/* decorative blobs */}
            <Box
              sx={{
                position: 'absolute', top: -40, right: -40,
                width: 200, height: 200, borderRadius: '50%',
                background: 'radial-gradient(circle,rgba(20,187,135,0.25) 0%,transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute', bottom: -60, left: '30%',
                width: 280, height: 280, borderRadius: '50%',
                background: 'radial-gradient(circle,rgba(20,187,135,0.12) 0%,transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 3 }}>
              <Box
                sx={{
                  width: 34, height: 34, borderRadius: '11px',
                  display: 'grid', placeItems: 'center',
                  background: 'linear-gradient(135deg,#14BB87 0%,#0d8f66 100%)',
                  boxShadow: '0 4px 12px rgba(20,187,135,0.4)',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                {report.workspace_name}
              </Typography>
            </Stack>

            <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1.15, mb: 1 }}>
              {report.title}
            </Typography>

            {report.client_name && (
              <Typography sx={{ color: 'rgba(255,255,255,0.65)', mb: 0.5, fontSize: 15 }}>
                Prepared for: <strong style={{ color: '#fff' }}>{report.client_name}</strong>
              </Typography>
            )}

            <Stack direction="row" gap={2} sx={{ mt: 2 }} flexWrap="wrap">
              {report.date_from && (
                <Chip
                  label={`${report.date_from} → ${report.date_to}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600, fontSize: 11 }}
                />
              )}
              <Chip
                label={`${fmt(report.views)} view${report.views !== 1 ? 's' : ''}`}
                size="small"
                sx={{ bgcolor: 'rgba(20,187,135,0.25)', color: '#14BB87', fontWeight: 700, fontSize: 11 }}
              />
              <Chip
                label={`Generated ${new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}
              />
            </Stack>

            {/* Print button */}
            <Box
              className="no-print"
              onClick={() => window.print()}
              sx={{
                position: 'absolute', top: { xs: 16, md: 28 }, right: { xs: 16, md: 28 },
                display: 'flex', alignItems: 'center', gap: 0.75,
                bgcolor: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 2, px: 2, py: 0.9,
                cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#fff',
                transition: 'background .15s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
              }}
            >
              <PrintIcon sx={{ fontSize: 15 }} />
              Save as PDF
            </Box>
          </Box>

          {/* ── KPI grid ── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Impressions', value: fmt(t.impressions || 0), icon: <VisibilityIcon sx={{ fontSize: 20 }} />, accent: '#2563EB' },
              { label: 'Engagements', value: fmt(t.engagements || 0), icon: <FavoriteIcon sx={{ fontSize: 20 }} />, accent: '#14BB87' },
              { label: 'Clicks', value: fmt(t.clicks || 0), icon: <TouchAppIcon sx={{ fontSize: 20 }} />, accent: '#F59E0B' },
              { label: 'CTR', value: `${d.ctr ?? 0}%`, icon: <TrendingUpIcon sx={{ fontSize: 20 }} />, accent: '#7C3AED' },
              { label: 'Conversions', value: fmt(t.conversions || 0), icon: <SyncAltIcon sx={{ fontSize: 20 }} />, accent: '#D92C4A' },
              { label: 'Published posts', value: fmt(d.published_count || 0), icon: <ShareIcon sx={{ fontSize: 20 }} />, accent: '#0E7490' },
            ].map((c) => (
              <Grid key={c.label} size={{ xs: 6, sm: 4 }}>
                <KpiCard {...c} />
              </Grid>
            ))}
          </Grid>

          {/* ── By source ── */}
          {Object.keys(d.by_source || {}).length > 0 && (
            <Box
              sx={{
                borderRadius: 3, background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)', mb: 3, overflow: 'hidden',
                '@media print': { boxShadow: 'none', border: '1px solid #ddd' },
              }}
            >
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography fontWeight={800} fontSize={15}>Performance by channel</Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Channel</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Impressions</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Engagements</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Clicks</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Conversions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(d.by_source).map(([src, m]) => (
                    <TableRow key={src} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 8, height: 8, borderRadius: '50%',
                              bgcolor: platformColor(src), flexShrink: 0,
                            }}
                          />
                          <Typography sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                            {src}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{fmt(m.impressions || 0)}</TableCell>
                      <TableCell align="right">{fmt(m.engagements || 0)}</TableCell>
                      <TableCell align="right">{fmt(m.clicks || 0)}</TableCell>
                      <TableCell align="right">{fmt(m.conversions || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* ── Daily trend ── */}
          {(d.series || []).length > 0 && (
            <Box
              sx={{
                borderRadius: 3, background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)', mb: 3, overflow: 'hidden',
                '@media print': { boxShadow: 'none', border: '1px solid #ddd' },
              }}
            >
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography fontWeight={800} fontSize={15}>Daily trend</Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Impressions</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Engagements</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Clicks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.series.map((s) => (
                    <TableRow key={s.date} hover>
                      <TableCell>{s.date}</TableCell>
                      <TableCell align="right">{fmt(s.impressions)}</TableCell>
                      <TableCell align="right">{fmt(s.engagements)}</TableCell>
                      <TableCell align="right">{fmt(s.clicks)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* ── Posts ── */}
          {posts.length > 0 && (
            <Box
              sx={{
                borderRadius: 3, background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)', mb: 3, overflow: 'hidden',
                '@media print': { boxShadow: 'none', border: '1px solid #ddd' },
              }}
            >
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography fontWeight={800} fontSize={15}>Published posts</Typography>
              </Box>
              <Stack divider={<Divider />}>
                {posts.map((p) => (
                  <Box key={p.schedule_id} sx={{ px: 3, py: 2 }}>
                    <Stack direction="row" alignItems="flex-start" gap={2}>
                      {/* Platform dot */}
                      <Box
                        sx={{
                          mt: 0.3, width: 10, height: 10, borderRadius: '50%',
                          bgcolor: platformColor(p.platform), flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                          <Typography fontWeight={700} fontSize={13.5} noWrap>
                            {p.title || 'Untitled post'}
                          </Typography>
                          <Chip
                            label={p.platform}
                            size="small"
                            sx={{
                              bgcolor: platformColor(p.platform) + '18',
                              color: platformColor(p.platform),
                              fontWeight: 700,
                              fontSize: 10.5,
                              height: 18,
                              textTransform: 'capitalize',
                            }}
                          />
                          {p.simulated && (
                            <Chip
                              label="estimated"
                              size="small"
                              sx={{ fontSize: 10, height: 18, bgcolor: '#FFF7ED', color: '#D97706' }}
                            />
                          )}
                        </Stack>
                        <Stack direction="row" gap={2.5} sx={{ mt: 0.75 }} flexWrap="wrap">
                          {[
                            { label: 'impressions', val: p.impressions },
                            { label: 'engagements', val: p.engagements },
                            { label: 'likes', val: p.likes },
                            { label: 'comments', val: p.comments },
                            { label: 'shares', val: p.shares },
                          ].map((m) => (
                            <Box key={m.label}>
                              <Typography sx={{ fontSize: 11, color: '#888', fontWeight: 600 }}>
                                {m.label}
                              </Typography>
                              <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#111' }}>
                                {fmt(m.val)}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                      {p.published_at && (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ flexShrink: 0, pt: 0.3 }}
                        >
                          {new Date(p.published_at).toLocaleDateString()}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* ── Footer ── */}
          <Box sx={{ textAlign: 'center', py: 3, '@media print': { mt: 4 } }}>
            <Typography sx={{ fontSize: 12, color: '#888' }}>
              Report generated by{' '}
              <strong style={{ color: '#14BB87' }}>Trayarunya Ventures</strong> · Your Marketing
              Partner
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  );
}
