'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import HubIcon from '@mui/icons-material/HubOutlined';
import SyncIcon from '@mui/icons-material/SyncOutlined';
import LinkIcon from '@mui/icons-material/LinkOutlined';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import LinkOffIcon from '@mui/icons-material/LinkOffOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import ExtensionIcon from '@mui/icons-material/ExtensionOutlined';
import { useAuth } from '@/lib/auth';
import {
  Integrations,
  type Integration,
  type IntegrationCatalogEntry,
  type IntegrationHealth,
  type IntegrationStatus,
  type IntegrationOAuthStart,
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const LINE = 'rgba(14,17,22,0.07)';
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';
const CHIP_BG = 'rgba(14,17,22,0.05)';

const STATUS_META: Record<IntegrationStatus, { label: string; bg: string; fg: string }> = {
  connected: { label: 'Connected', bg: BRAND.tealSoft, fg: BRAND.tealDeep },
  error: { label: 'Error', bg: BRAND.pinkSoft, fg: BRAND.pink },
  expired: { label: 'Expired', bg: BRAND.amberSoft, fg: BRAND.amberDeep },
  disconnected: { label: 'Disconnected', bg: CHIP_BG, fg: SUBTLE },
};

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Never';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function IntegrationsPage() {
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [catalog, setCatalog] = useState<IntegrationCatalogEntry[]>([]);
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const [dialogEntry, setDialogEntry] = useState<IntegrationCatalogEntry | null>(null);
  const [tokenValue, setTokenValue] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [shopDomain, setShopDomain] = useState('');

  const load = () => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([Integrations.list(), Integrations.catalog(), Integrations.health()])
      .then(([list, cat, h]) => {
        setIntegrations(list);
        setCatalog(cat);
        setHealth(h);
      })
      .catch(() => {
        setIntegrations([]);
        setCatalog([]);
        setHealth(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeWorkspace]);

  const refetch = () => {
    Promise.all([Integrations.list(), Integrations.health()])
      .then(([list, h]) => {
        setIntegrations(list);
        setHealth(h);
      })
      .catch(() => null);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, IntegrationCatalogEntry[]>();
    for (const entry of catalog) {
      const arr = map.get(entry.category) ?? [];
      arr.push(entry);
      map.set(entry.category, arr);
    }
    return Array.from(map.entries());
  }, [catalog]);

  const closeDialog = () => {
    setDialogEntry(null);
    setTokenValue('');
    setDisplayName('');
    setShopDomain('');
  };

  const doConnect = async (
    entry: IntegrationCatalogEntry,
    extra?: { api_key?: string; access_token?: string; display_name?: string },
  ) => {
    setConnectingProvider(entry.provider);
    try {
      await Integrations.connect({
        provider: entry.provider,
        category: entry.category,
        ...extra,
      });
      setToast({ msg: `${entry.label} connected`, severity: 'success' });
      closeDialog();
      refetch();
    } catch {
      setToast({ msg: `Failed to connect ${entry.label}`, severity: 'error' });
    } finally {
      setConnectingProvider(null);
    }
  };

  // Real OAuth: ask the API for the provider authorization URL, open it in a
  // popup, and refetch once the popup signals completion (or closes).
  const startOAuth = async (entry: IntegrationCatalogEntry) => {
    setConnectingProvider(entry.provider);
    try {
      const config: Record<string, unknown> = {};
      if (entry.provider === 'shopify') {
        if (!shopDomain.trim()) {
          setToast({ msg: 'Enter your Shopify store domain first.', severity: 'error' });
          setConnectingProvider(null);
          return;
        }
        config.shop_domain = shopDomain.trim();
      }
      const res = (await Integrations.connect({
        provider: entry.provider,
        category: entry.category,
        config,
      })) as Integration | IntegrationOAuthStart;

      if (!('authorization_url' in res)) {
        // Already connected (no OAuth needed) — treat as success.
        setToast({ msg: `${entry.label} connected`, severity: 'success' });
        closeDialog();
        refetch();
        return;
      }

      const popup = window.open(
        res.authorization_url,
        'integrations-oauth',
        'width=620,height=760,menubar=no,toolbar=no',
      );
      if (!popup) {
        setToast({ msg: 'Popup blocked — allow popups and retry.', severity: 'error' });
        return;
      }
      closeDialog();

      const finish = (ok: boolean) => {
        window.removeEventListener('message', onMessage);
        window.clearInterval(timer);
        if (ok) {
          setToast({ msg: `${entry.label} connected`, severity: 'success' });
        }
        refetch();
      };
      const onMessage = (ev: MessageEvent) => {
        if (ev.data && ev.data.source === 'integrations-oauth') {
          finish(Boolean(ev.data.ok));
        }
      };
      window.addEventListener('message', onMessage);
      const timer = window.setInterval(() => {
        if (popup.closed) finish(false);
      }, 800);
    } catch {
      setToast({ msg: `Failed to start ${entry.label} connection`, severity: 'error' });
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleConnectClick = (entry: IntegrationCatalogEntry) => {
    if (entry.manual_connect || entry.oauth) {
      setDialogEntry(entry);
      setTokenValue('');
      setDisplayName('');
      setShopDomain('');
      return;
    }
    void doConnect(entry);
  };

  const handleManualSubmit = () => {
    if (!dialogEntry || !tokenValue.trim()) return;
    const key = tokenValue.trim();
    const extra =
      dialogEntry.oauth
        ? { access_token: key, display_name: displayName.trim() || undefined }
        : { api_key: key, display_name: displayName.trim() || undefined };
    void doConnect(dialogEntry, extra);
  };

  const handleSync = async (item: Integration) => {
    setBusyId(item.id);
    try {
      const updated = await Integrations.sync(item.id);
      setIntegrations((prev) => prev.map((x) => (x.id === item.id ? updated : x)));
      setToast({ msg: `${updated.display_name ?? updated.provider} synced`, severity: 'success' });
      refetch();
    } catch {
      setToast({ msg: 'Sync failed', severity: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async (item: Integration) => {
    const name = item.display_name ?? titleCase(item.provider);
    const ok = await confirm({
      title: 'Disconnect integration?',
      message: `"${name}" will be disconnected and will stop syncing data into your workspace.`,
      confirmText: 'Disconnect',
      danger: true,
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      await Integrations.disconnect(item.id);
      setIntegrations((prev) => prev.filter((x) => x.id !== item.id));
      setToast({ msg: `${name} disconnected`, severity: 'success' });
      refetch();
    } catch {
      setToast({ msg: 'Failed to disconnect', severity: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  if (!activeWorkspace) {
    return (
      <Box
        sx={{
          bgcolor: '#fff',
          border: `1px dashed ${LINE}`,
          borderRadius: CARD_RADIUS,
          boxShadow: CARD_SHADOW,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          py: 8,
          px: 3,
        }}
      >
        <Box sx={{ width: 56, height: 56, borderRadius: '16px', display: 'grid', placeItems: 'center', bgcolor: CHIP_BG, color: INK }}>
          <HubIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK }}>No workspace selected</Typography>
        <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={380}>
          Choose or create a workspace to connect your CRM, analytics and ecommerce tools.
        </Typography>
      </Box>
    );
  }

  const stats: { label: string; value: number; bg: string; fg: string; icon: React.ReactNode }[] = [
    { label: 'Total', value: health?.total ?? 0, bg: CHIP_BG, fg: INK, icon: <ExtensionIcon sx={{ fontSize: 18 }} /> },
    { label: 'Connected', value: health?.connected ?? 0, bg: BRAND.tealSoft, fg: BRAND.tealDeep, icon: <CheckCircleIcon sx={{ fontSize: 18 }} /> },
    { label: 'Errors', value: health?.error ?? 0, bg: BRAND.pinkSoft, fg: BRAND.pink, icon: <ErrorOutlineIcon sx={{ fontSize: 18 }} /> },
    { label: 'Expired', value: health?.expired ?? 0, bg: BRAND.amberSoft, fg: BRAND.amberDeep, icon: <WarningAmberIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box>
      {/* Header */}
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
            sx={{ fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12, fontSize: { xs: 28, md: 38 }, color: INK }}
          >
            Integrations
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 640 }}>
            Connect your CRM, analytics &amp; ecommerce so revenue and pipeline{' '}
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 700,
              }}
            >
              flow
            </Box>{' '}
            into your marketing intelligence.
          </Typography>
        </Box>
        <Button
          startIcon={<SyncIcon />}
          onClick={refetch}
          sx={{
            px: 2.5,
            py: 1.25,
            borderRadius: '999px',
            fontWeight: 700,
            textTransform: 'none',
            color: '#fff',
            background: INK,
            backgroundImage: 'none',
            boxShadow: '0 8px 20px rgba(14,17,22,0.25)',
            '&:hover': { background: '#1B2330' },
          }}
        >
          Refresh
        </Button>
      </Stack>

      {/* Health summary strip */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          mb: 2.5,
        }}
      >
        {stats.map((s) => (
          <Box
            key={s.label}
            sx={{
              bgcolor: '#fff',
              border: `1px solid ${LINE}`,
              borderRadius: '18px',
              boxShadow: CARD_SHADOW,
              p: 2.5,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography sx={{ fontSize: 32, fontWeight: 800, color: INK, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {s.value}
                </Typography>
                <Typography sx={{ mt: 0.75, fontSize: 12, fontWeight: 700, color: SUBTLE }}>{s.label}</Typography>
              </Box>
              <Box sx={{ width: 40, height: 40, borderRadius: '11px', display: 'grid', placeItems: 'center', color: s.fg, bgcolor: s.bg }}>
                {s.icon}
              </Box>
            </Stack>
          </Box>
        ))}
      </Box>

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
          <CircularProgress size={28} sx={{ color: INK }} />
        </Box>
      ) : (
        <Stack spacing={3.5}>
          {/* Catalog */}
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK, letterSpacing: '-0.01em', mb: 1.5 }}>
              Catalog
            </Typography>
            {grouped.length === 0 ? (
              <Box
                sx={{
                  bgcolor: '#fff',
                  border: `1px dashed ${LINE}`,
                  borderRadius: CARD_RADIUS,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  py: 6,
                  px: 3,
                }}
              >
                <Box sx={{ width: 44, height: 44, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: CHIP_BG, color: INK }}>
                  <ExtensionIcon sx={{ fontSize: 22 }} />
                </Box>
                <Typography sx={{ fontWeight: 700, color: INK }}>No providers available</Typography>
                <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={360}>
                  There are no integration providers to connect yet. Check back soon.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={3}>
                {grouped.map(([category, entries]) => (
                  <Box key={category}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: SUBTLE, mb: 1.25 }}>
                      {titleCase(category)}
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                      }}
                    >
                      {entries.map((entry) => {
                        const unavailable = entry.oauth && !entry.configured && !entry.manual_connect;
                        return (
                          <Box
                            key={entry.provider}
                            sx={{
                              height: '100%',
                              bgcolor: '#fff',
                              border: `1px solid ${LINE}`,
                              borderRadius: '18px',
                              boxShadow: CARD_SHADOW,
                              p: 2.5,
                              display: 'flex',
                              flexDirection: 'column',
                              transition: 'transform .15s, border-color .15s',
                              '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(20,187,135,0.4)' },
                            }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box sx={{ width: 40, height: 40, borderRadius: '11px', flexShrink: 0, display: 'grid', placeItems: 'center', color: INK, bgcolor: CHIP_BG }}>
                                <ExtensionIcon sx={{ fontSize: 20 }} />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, color: INK }} noWrap>
                                  {entry.label}
                                </Typography>
                                <Typography sx={{ mt: 0.25, fontSize: 12, fontWeight: 600, color: SUBTLE }}>
                                  {titleCase(entry.category)}
                                </Typography>
                              </Box>
                            </Stack>
                            <Box sx={{ flex: 1 }} />
                            <Box sx={{ mt: 2 }}>
                              {unavailable ? (
                                <Tooltip title="This provider is not configured on the server yet.">
                                  <span>
                                    <Button
                                      fullWidth
                                      disabled
                                      sx={{
                                        borderRadius: '999px',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        py: 1,
                                        color: SUBTLE,
                                        bgcolor: CHIP_BG,
                                      }}
                                    >
                                      Not configured
                                    </Button>
                                  </span>
                                </Tooltip>
                              ) : (
                                <Button
                                  fullWidth
                                  startIcon={connectingProvider === entry.provider ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}
                                  disabled={connectingProvider === entry.provider}
                                  onClick={() => handleConnectClick(entry)}
                                  sx={{
                                    borderRadius: '999px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    py: 1,
                                    color: '#fff',
                                    background: INK,
                                    backgroundImage: 'none',
                                    boxShadow: '0 8px 20px rgba(14,17,22,0.2)',
                                    '&:hover': { background: '#1B2330' },
                                    '&.Mui-disabled': { color: 'rgba(255,255,255,0.7)', background: INK },
                                  }}
                                >
                                  {connectingProvider === entry.provider ? 'Connecting…' : 'Connect'}
                                </Button>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          {/* Connected */}
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: INK, letterSpacing: '-0.01em', mb: 1.5 }}>
              Connected
            </Typography>
            {integrations.length === 0 ? (
              <Box
                sx={{
                  bgcolor: '#fff',
                  border: `1px dashed ${LINE}`,
                  borderRadius: CARD_RADIUS,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 6,
                  px: 3,
                }}
              >
                <Box sx={{ width: 48, height: 48, borderRadius: '14px', display: 'grid', placeItems: 'center', bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }}>
                  <LinkIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography sx={{ fontWeight: 700, color: INK }}>Nothing connected yet</Typography>
                <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={380}>
                  Connect a provider from the catalog above to start flowing revenue and pipeline data into your dashboards.
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  bgcolor: '#fff',
                  border: `1px solid ${LINE}`,
                  borderRadius: CARD_RADIUS,
                  boxShadow: CARD_SHADOW,
                  overflow: 'hidden',
                }}
              >
                <Stack divider={<Divider sx={{ borderColor: LINE }} />}>
                  {integrations.map((item) => {
                    const meta = STATUS_META[item.status];
                    const name = item.display_name ?? titleCase(item.provider);
                    return (
                      <Stack
                        key={item.id}
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        sx={{ p: 2.5 }}
                      >
                        <Box sx={{ width: 40, height: 40, borderRadius: '11px', flexShrink: 0, display: 'grid', placeItems: 'center', color: INK, bgcolor: CHIP_BG }}>
                          <ExtensionIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography sx={{ fontWeight: 700, color: INK }} noWrap>
                              {name}
                            </Typography>
                            <Chip
                              label={meta.label}
                              size="small"
                              sx={{ height: 22, fontSize: 12, fontWeight: 700, color: meta.fg, bgcolor: meta.bg, border: 'none' }}
                            />
                            <Chip
                              label={titleCase(item.category)}
                              size="small"
                              sx={{ height: 22, fontSize: 12, fontWeight: 700, bgcolor: CHIP_BG, color: SUBTLE, border: 'none' }}
                            />
                          </Stack>
                          <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" sx={{ mt: 0.6 }}>
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              <SyncIcon sx={{ fontSize: 14, color: SUBTLE }} />
                              <Typography variant="caption" sx={{ color: SUBTLE }}>
                                Last sync {relativeTime(item.last_sync_at)}
                              </Typography>
                            </Stack>
                            {item.last_error && (
                              <Tooltip title={item.last_error}>
                                <Stack direction="row" alignItems="center" gap={0.4} sx={{ cursor: 'help' }}>
                                  <ErrorOutlineIcon sx={{ fontSize: 14, color: BRAND.pink }} />
                                  <Typography variant="caption" sx={{ color: BRAND.pink, fontWeight: 700 }}>
                                    Last error
                                  </Typography>
                                </Stack>
                              </Tooltip>
                            )}
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                          <Button
                            size="small"
                            startIcon={busyId === item.id ? <CircularProgress size={13} color="inherit" /> : <SyncIcon />}
                            disabled={busyId === item.id}
                            onClick={() => handleSync(item)}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '999px', px: 1.75, color: BRAND.tealDeep, '&:hover': { bgcolor: BRAND.tealSoft } }}
                          >
                            Sync
                          </Button>
                          <Tooltip title="Disconnect">
                            <span>
                              <IconButton size="small" disabled={busyId === item.id} onClick={() => handleDisconnect(item)} sx={{ borderRadius: '10px', color: BRAND.pink, '&:hover': { bgcolor: BRAND.pinkSoft } }}>
                                <LinkOffIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Box>
        </Stack>
      )}

      {/* Manual connect dialog */}
      <PremiumDialog open={!!dialogEntry} onClose={closeDialog} maxWidth="xs">
        <DialogHero
          icon={<LinkRoundedIcon />}
          title={`Connect ${dialogEntry?.label ?? ''}`.trim()}
          subtitle="Securely link this provider — credentials are stored in your workspace."
          onClose={closeDialog}
        />
        <DialogBody>
          <Stack spacing={2.5}>
            {dialogEntry?.oauth && dialogEntry?.configured && (
              <Box>
                <SectionLabel>Quick connect</SectionLabel>
                <Stack spacing={2}>
                  {dialogEntry.provider === 'shopify' && (
                    <TextField
                      label="Shopify store domain"
                      placeholder="my-store.myshopify.com"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      fullWidth
                      helperText="Required to start the secure OAuth connection."
                    />
                  )}
                  <Button
                    onClick={() => dialogEntry && void startOAuth(dialogEntry)}
                    fullWidth
                    disabled={connectingProvider !== null}
                    startIcon={connectingProvider !== null ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}
                    sx={{
                      borderRadius: '999px',
                      textTransform: 'none',
                      fontWeight: 700,
                      py: 1.1,
                      color: '#fff',
                      background: INK,
                      backgroundImage: 'none',
                      boxShadow: '0 8px 20px rgba(14,17,22,0.2)',
                      '&:hover': { background: '#1B2330' },
                    }}
                  >
                    Connect with {dialogEntry.label} (OAuth)
                  </Button>
                  <Divider sx={{ '&::before, &::after': { borderColor: LINE } }}>
                    <Typography variant="caption" sx={{ color: SUBTLE }}>
                      or paste a token manually
                    </Typography>
                  </Divider>
                </Stack>
              </Box>
            )}
            <Box>
              <SectionLabel>Credentials</SectionLabel>
              <Stack spacing={2}>
                <Typography variant="body2" sx={{ color: SUBTLE }}>
                  Enter your credentials to connect this provider. They are stored securely in your workspace.
                </Typography>
                <TextField
                  label="Display name (optional)"
                  placeholder={dialogEntry?.label}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={dialogEntry?.token_label ?? 'API key'}
                  value={tokenValue}
                  onChange={(e) => setTokenValue(e.target.value)}
                  fullWidth
                  required
                  type="password"
                />
              </Stack>
            </Box>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={closeDialog} disabled={connectingProvider !== null} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button
            onClick={handleManualSubmit}
            disabled={connectingProvider !== null || !tokenValue.trim()}
            startIcon={connectingProvider !== null ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}
            sx={inkPillSx}
          >
            {connectingProvider !== null ? 'Connecting…' : 'Connect'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%', borderRadius: '14px' }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
