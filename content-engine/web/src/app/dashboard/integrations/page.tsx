'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
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
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

const STATUS_META: Record<IntegrationStatus, { label: string; color: string; soft: string }> = {
  connected: { label: 'Connected', color: BRAND.teal, soft: '#E4F8F0' },
  error: { label: 'Error', color: BRAND.pink, soft: '#FDE8EC' },
  expired: { label: 'Expired', color: BRAND.amber, soft: '#FFF6E0' },
  disconnected: { label: 'Disconnected', color: SUBTLE, soft: '#F3F4F6' },
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
      setDialogEntry(null);
      setTokenValue('');
      setDisplayName('');
      refetch();
    } catch {
      setToast({ msg: `Failed to connect ${entry.label}`, severity: 'error' });
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleConnectClick = (entry: IntegrationCatalogEntry) => {
    if (entry.manual_connect) {
      setDialogEntry(entry);
      setTokenValue('');
      setDisplayName('');
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
      <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, bgcolor: '#fff' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 8 }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
            <HubIcon sx={{ fontSize: 36, color: BRAND.teal }} />
          </Box>
          <Typography fontWeight={900} variant="h6" sx={{ color: INK }}>No workspace selected</Typography>
          <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={380}>
            Choose or create a workspace to connect your CRM, analytics and ecommerce tools.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const stats: { label: string; value: number; color: string; icon: React.ReactNode }[] = [
    { label: 'Total', value: health?.total ?? 0, color: INK, icon: <ExtensionIcon /> },
    { label: 'Connected', value: health?.connected ?? 0, color: BRAND.teal, icon: <CheckCircleIcon /> },
    { label: 'Errors', value: health?.error ?? 0, color: BRAND.pink, icon: <ErrorOutlineIcon /> },
    { label: 'Expired', value: health?.expired ?? 0, color: BRAND.amber, icon: <WarningAmberIcon /> },
  ];

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box>
        <Typography variant="h4" fontWeight={950} sx={{ color: INK, letterSpacing: -0.6 }}>
          Integrations
        </Typography>
        <Typography sx={{ mt: 0.6, color: SUBTLE, maxWidth: 640 }}>
          Connect your CRM, analytics &amp; ecommerce so revenue and pipeline flow into your marketing intelligence.
        </Typography>
      </Box>

      {/* Health summary strip */}
      <Grid container spacing={2}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, md: 3 }}>
            <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff', boxShadow: '0 10px 30px rgba(17,21,27,0.05)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography sx={{ fontSize: 30, fontWeight: 950, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                    <Typography sx={{ mt: 0.6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: SUBTLE }}>
                      {s.label}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', color: s.color, background: `${s.color}14` }}>
                    {s.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          {/* Catalog */}
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ color: INK, mb: 1.5 }}>
              Catalog
            </Typography>
            {grouped.length === 0 ? (
              <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, bgcolor: CANVAS }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 6 }}>
                  <ExtensionIcon sx={{ fontSize: 32, color: SUBTLE }} />
                  <Typography fontWeight={800} sx={{ color: INK }}>No providers available</Typography>
                  <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={360}>
                    There are no integration providers to connect yet. Check back soon.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={3}>
                {grouped.map(([category, entries]) => (
                  <Box key={category}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: SUBTLE, mb: 1 }}>
                      {titleCase(category)}
                    </Typography>
                    <Grid container spacing={2}>
                      {entries.map((entry) => {
                        const unavailable = entry.oauth && !entry.configured && !entry.manual_connect;
                        return (
                          <Grid key={entry.provider} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card sx={{
                              height: '100%', borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff',
                              transition: 'transform .15s, box-shadow .15s',
                              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 18px 40px rgba(17,21,27,0.08)' },
                            }}>
                              <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Box sx={{ width: 44, height: 44, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center', color: BRAND.teal, background: `${BRAND.teal}12` }}>
                                    <ExtensionIcon />
                                  </Box>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography fontWeight={900} noWrap sx={{ color: INK }}>{entry.label}</Typography>
                                    <Chip label={titleCase(entry.category)} size="small"
                                      sx={{ mt: 0.4, height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: CANVAS, color: SUBTLE, border: `1px solid ${BORDER}` }} />
                                  </Box>
                                </Stack>
                                <Box sx={{ flex: 1 }} />
                                <Box sx={{ mt: 2 }}>
                                  {unavailable ? (
                                    <Tooltip title="This provider is not configured on the server yet.">
                                      <span>
                                        <Button fullWidth disabled variant="outlined" sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800 }}>
                                          Not configured
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  ) : (
                                    <Button
                                      fullWidth
                                      variant="contained"
                                      startIcon={connectingProvider === entry.provider ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}
                                      disabled={connectingProvider === entry.provider}
                                      onClick={() => handleConnectClick(entry)}
                                      sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 900, color: '#11151B', background: `linear-gradient(135deg, ${BRAND.amber} 0%, ${BRAND.teal} 100%)` }}
                                    >
                                      {connectingProvider === entry.provider ? 'Connecting…' : 'Connect'}
                                    </Button>
                                  )}
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          {/* Connected */}
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ color: INK, mb: 1.5 }}>
              Connected
            </Typography>
            {integrations.length === 0 ? (
              <Card sx={{ borderRadius: 4, border: `1px dashed ${BORDER}`, bgcolor: CANVAS }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 6 }}>
                  <Box sx={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${BRAND.teal}14` }}>
                    <LinkIcon sx={{ fontSize: 30, color: BRAND.teal }} />
                  </Box>
                  <Typography fontWeight={900} sx={{ color: INK }}>Nothing connected yet</Typography>
                  <Typography variant="body2" sx={{ color: SUBTLE }} textAlign="center" maxWidth={380}>
                    Connect a provider from the catalog above to start flowing revenue and pipeline data into your dashboards.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
                <Stack divider={<Divider />}>
                  {integrations.map((item) => {
                    const meta = STATUS_META[item.status];
                    const name = item.display_name ?? titleCase(item.provider);
                    return (
                      <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} spacing={2}
                        alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ p: 2.5 }}>
                        <Box sx={{ width: 46, height: 46, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center', color: meta.color, background: meta.soft }}>
                          <ExtensionIcon />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography fontWeight={900} noWrap sx={{ color: INK }}>{name}</Typography>
                            <Chip label={meta.label} size="small"
                              sx={{ height: 22, fontSize: 11, fontWeight: 800, color: meta.color, bgcolor: meta.soft, border: `1px solid ${meta.color}33` }} />
                            <Chip label={titleCase(item.category)} size="small"
                              sx={{ height: 22, fontSize: 10.5, fontWeight: 800, bgcolor: CANVAS, color: SUBTLE, border: `1px solid ${BORDER}` }} />
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
                            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, color: BRAND.tealDeep }}
                          >
                            Sync
                          </Button>
                          <Tooltip title="Disconnect">
                            <span>
                              <IconButton size="small" disabled={busyId === item.id} onClick={() => handleDisconnect(item)} sx={{ borderRadius: 2, color: BRAND.pink }}>
                                <LinkOffIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              </Card>
            )}
          </Box>
        </>
      )}

      {/* Manual connect dialog */}
      <Dialog open={!!dialogEntry} onClose={() => setDialogEntry(null)} fullWidth maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 950, color: INK }}>
          Connect {dialogEntry?.label}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
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
              autoFocus
              required
              type="password"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogEntry(null)} color="inherit" disabled={connectingProvider !== null}>
            Cancel
          </Button>
          <Button
            onClick={handleManualSubmit}
            variant="contained"
            disabled={connectingProvider !== null || !tokenValue.trim()}
            startIcon={connectingProvider !== null ? <CircularProgress size={14} color="inherit" /> : <LinkIcon />}
            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 900, color: '#11151B', background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})` }}
          >
            {connectingProvider !== null ? 'Connecting…' : 'Connect'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
