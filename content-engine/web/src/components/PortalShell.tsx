'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import FactCheckIcon from '@mui/icons-material/FactCheckOutlined';
import AccountTreeIcon from '@mui/icons-material/AccountTreeOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import { usePortalAuth } from '@/lib/portalAuth';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

const TABS = [
  { href: '/portal/overview', label: 'Overview', icon: <SpaceDashboardIcon fontSize="small" /> },
  { href: '/portal/attribution', label: 'Revenue', icon: <AccountTreeIcon fontSize="small" /> },
  { href: '/portal/reports', label: 'Reports', icon: <AssessmentIcon fontSize="small" /> },
  { href: '/portal/approvals', label: 'Approvals', icon: <FactCheckIcon fontSize="small" /> },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const { session, loading, switchWorkspace, logout } = usePortalAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) router.replace('/portal/login');
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: CANVAS }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: CANVAS }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{ bgcolor: '#fff', color: INK, borderBottom: `1px solid ${BORDER}` }}
      >
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mr: 1 }}>
            <Box
              sx={{
                width: 34, height: 34, borderRadius: 1.5,
                display: 'grid', placeItems: 'center',
                background: BRAND.gradient, color: '#fff', fontWeight: 900, fontSize: 15,
              }}
            >
              T
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} lineHeight={1.1}>
                {session.workspace_name}
              </Typography>
              <Typography variant="caption" color={SUBTLE}>Partner Portal</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ flex: 1, overflowX: 'auto' }}>
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Button
                  key={t.href}
                  component={Link}
                  href={t.href}
                  startIcon={t.icon}
                  size="small"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    color: active ? '#fff' : SUBTLE,
                    bgcolor: active ? BRAND.tealDeep : 'transparent',
                    borderRadius: 2,
                    px: 1.5,
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: active ? BRAND.tealDeep : '#F3F4F6' },
                  }}
                >
                  {t.label}
                </Button>
              );
            })}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {session.workspaces.length > 1 && (
              <TextField
                select
                size="small"
                value={session.workspace_id}
                onChange={(e) => switchWorkspace(e.target.value)}
                sx={{ minWidth: 160, display: { xs: 'none', md: 'block' } }}
              >
                {session.workspaces.map((w) => (
                  <MenuItem key={w.workspace_id} value={w.workspace_id}>
                    {w.workspace_name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Chip
              size="small"
              label={session.role === 'approver' ? 'Approver' : 'Viewer'}
              sx={{ fontWeight: 700, display: { xs: 'none', sm: 'flex' } }}
            />
            <Avatar sx={{ width: 32, height: 32, bgcolor: BRAND.pink, fontSize: 13, fontWeight: 800 }}>
              {initials(session.full_name || session.email)}
            </Avatar>
            <Button
              size="small"
              startIcon={<LogoutIcon />}
              onClick={logout}
              sx={{ textTransform: 'none', fontWeight: 700, color: SUBTLE }}
            >
              Sign out
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {children}
      </Container>

      <Divider sx={{ borderColor: BORDER }} />
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Typography variant="caption" color={SUBTLE}>
          Powered by Trayarunya Ventures — your marketing partner.
        </Typography>
      </Container>
    </Box>
  );
}
