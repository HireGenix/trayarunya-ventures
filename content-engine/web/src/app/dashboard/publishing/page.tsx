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
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import { useAuth } from '@/lib/auth';
import {
  Social,
  Content,
  Calendar,
  assetUrl,
  type SocialAccount,
  type Schedule,
  type ContentItem,
  type ContentCalendar,
} from '@/lib/api';

const PLATFORM_LABEL: Record<string, string> = {
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  twitter: 'X (Twitter)',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  threads: 'Threads',
  blog: 'Blog',
  newsletter: 'Newsletter',
  quora: 'Quora',
  reddit: 'Reddit',
  medium: 'Medium',
};

interface ClientGroup {
  client: string;
  platforms: Record<string, ContentItem[]>;
}

function buildGroups(
  items: ContentItem[],
  calendars: ContentCalendar[],
  fallbackClient: string,
): ClientGroup[] {
  const calClient = new Map<string, string>();
  for (const c of calendars) calClient.set(c.id, c.client_name || c.title);

  const byClient = new Map<string, ClientGroup>();
  for (const item of items) {
    const calId = (item.meta?.calendar_id as string) || '';
    const client = (calId && calClient.get(calId)) || fallbackClient;
    let group = byClient.get(client);
    if (!group) {
      group = { client, platforms: {} };
      byClient.set(client, group);
    }
    const plat = item.platform || 'other';
    (group.platforms[plat] ||= []).push(item);
  }
  return Array.from(byClient.values());
}

export default function PublishingPage() {
  const { activeWorkspace } = useAuth();
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [calendars, setCalendars] = useState<ContentCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [publishing, setPublishing] = useState<string | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [mPlatform, setMPlatform] = useState('linkedin');
  const [mToken, setMToken] = useState('');
  const [mName, setMName] = useState('');

  const refresh = () => {
    Promise.all([
      Social.providers().catch(() => ({})),
      Social.accounts().catch(() => []),
      Social.schedules().catch(() => []),
      Content.list().catch(() => []),
      Calendar.list().catch(() => []),
    ]).then(([p, a, s, c, cal]) => {
      setProviders(p as Record<string, boolean>);
      setAccounts(a as SocialAccount[]);
      setSchedules(s as Schedule[]);
      setContent(c as ContentItem[]);
      setCalendars(cal as ContentCalendar[]);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  const accountFor = (platform: string): SocialAccount | undefined =>
    accounts.find(
      (a) => a.is_active && (a.platform === platform || (platform === 'x' && a.platform === 'twitter')),
    );

  const groups = useMemo(
    () => buildGroups(content, calendars, activeWorkspace?.name || 'Quick create'),
    [content, calendars, activeWorkspace],
  );

  const connect = async (platform: string) => {
    setError('');
    try {
      const { authorization_url } = await Social.connect(platform);
      const popup = window.open(authorization_url, 'oauth', 'width=620,height=720');
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer);
          refresh();
        }
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start OAuth');
    }
  };

  const connectManual = async () => {
    setError('');
    try {
      await Social.connectManual({
        platform: mPlatform,
        access_token: mToken.trim(),
        display_name: mName.trim() || undefined,
      });
      setManualOpen(false);
      setMToken('');
      setMName('');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Manual connect failed');
    }
  };

  const removeAccount = async (id: string) => {
    await Social.removeAccount(id);
    refresh();
  };

  const publishItem = async (item: ContentItem) => {
    const account = accountFor(item.platform || '');
    if (!account) return;
    setPublishing(item.id);
    setError('');
    setMsg('');
    try {
      const s = await Social.publishNow({
        content_item_id: item.id,
        social_account_id: account.id,
      });
      if (s.status === 'published')
        setMsg(`Published to ${PLATFORM_LABEL[item.platform || ''] || item.platform}.`);
      else setError(s.error || `Status: ${s.status}`);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  const supported = Object.keys(providers).length
    ? Object.keys(providers)
    : ['linkedin', 'x', 'facebook', 'youtube'];

  return (
    <Stack spacing={3}>
      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {msg && (
        <Alert severity="success" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}

      {/* Connected accounts */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={800}>
              Connected accounts
            </Typography>
            <Button size="small" onClick={() => setManualOpen(true)}>
              Paste token
            </Button>
          </Stack>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            {accounts.length === 0 && (
              <Typography color="text.secondary">No accounts connected yet.</Typography>
            )}
            {accounts.map((a) => (
              <Card key={a.id} variant="outlined" sx={{ minWidth: 200 }}>
                <Stack direction="row" alignItems="center" sx={{ p: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={600}>
                      {PLATFORM_LABEL[a.platform] || a.platform}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.display_name || a.external_id || 'connected'}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={a.is_active ? 'active' : 'inactive'}
                    color={a.is_active ? 'success' : 'default'}
                    sx={{ mr: 1 }}
                  />
                  <IconButton onClick={() => removeAccount(a.id)} aria-label="remove" size="small">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Card>
            ))}
          </Stack>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            CONNECT A NETWORK
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {supported.map((p) => (
              <Button
                key={p}
                variant="outlined"
                size="small"
                onClick={() => connect(p)}
                disabled={!providers[p]}
                title={providers[p] ? '' : 'OAuth app not configured on server'}
              >
                {PLATFORM_LABEL[p] || p}
              </Button>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Ready posts grouped by client -> platform */}
      <Box>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
          Ready to publish
        </Typography>
        {groups.length === 0 ? (
          <Alert severity="info">
            No generated posts yet. Generate content in <strong>Content Studio</strong> to see
            ready-to-publish posts grouped by client and platform here.
          </Alert>
        ) : (
          <Stack spacing={3}>
            {groups.map((group) => (
              <Card key={group.client}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                    {group.client}
                  </Typography>
                  <Stack spacing={2.5}>
                    {Object.entries(group.platforms).map(([platform, items]) => {
                      const account = accountFor(platform);
                      return (
                        <Box key={platform}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <Chip
                              size="small"
                              label={PLATFORM_LABEL[platform] || platform}
                              color="primary"
                            />
                            <Typography variant="caption" color="text.secondary">
                              {items.length} post{items.length > 1 ? 's' : ''}
                            </Typography>
                            {!account && (
                              <Chip
                                size="small"
                                variant="outlined"
                                color="warning"
                                label="no connected account"
                              />
                            )}
                          </Stack>
                          <Grid container spacing={2}>
                            {items.map((item) => (
                              <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card variant="outlined" sx={{ height: '100%' }}>
                                  {item.image_url ? (
                                    <Box
                                      component="img"
                                      src={assetUrl(item.image_url)}
                                      alt={item.title || 'post'}
                                      sx={{
                                        width: '100%',
                                        display: 'block',
                                        aspectRatio: '1 / 1',
                                        objectFit: 'cover',
                                      }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        height: 120,
                                        display: 'grid',
                                        placeItems: 'center',
                                        bgcolor: 'action.hover',
                                        color: 'text.disabled',
                                      }}
                                    >
                                      <ImageIcon />
                                    </Box>
                                  )}
                                  <CardContent sx={{ p: 1.5 }}>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                      {item.title || item.body.slice(0, 40)}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        mb: 1,
                                        minHeight: 32,
                                      }}
                                    >
                                      {item.body}
                                    </Typography>
                                    <Stack
                                      direction="row"
                                      justifyContent="space-between"
                                      alignItems="center"
                                    >
                                      <Chip size="small" label={item.status} variant="outlined" />
                                      <Tooltip
                                        title={account ? 'Publish now' : 'Connect an account first'}
                                      >
                                        <span>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            startIcon={
                                              publishing === item.id ? (
                                                <CircularProgress size={14} color="inherit" />
                                              ) : (
                                                <SendIcon />
                                              )
                                            }
                                            disabled={!account || publishing !== null}
                                            onClick={() => publishItem(item)}
                                          >
                                            Publish
                                          </Button>
                                        </span>
                                      </Tooltip>
                                    </Stack>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Recent / scheduled */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Recent / scheduled posts
          </Typography>
          {schedules.length === 0 ? (
            <Typography color="text.secondary">Nothing scheduled or published yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {schedules.map((s) => (
                <Stack key={s.id} direction="row" spacing={2} alignItems="center" sx={{ py: 0.5 }}>
                  <Chip
                    size="small"
                    label={s.status}
                    color={
                      s.status === 'published'
                        ? 'success'
                        : s.status === 'failed'
                          ? 'error'
                          : 'default'
                    }
                  />
                  <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                    {s.external_post_id ? `Post ${s.external_post_id}` : s.error || 'Pending'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(s.scheduled_at).toLocaleString()}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Connect with access token</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              select
              label="Platform"
              value={mPlatform}
              onChange={(e) => setMPlatform(e.target.value)}
              fullWidth
            >
              {supported.map((p) => (
                <MenuItem key={p} value={p}>
                  {PLATFORM_LABEL[p] || p}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Display name (optional)"
              value={mName}
              onChange={(e) => setMName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Access token"
              value={mToken}
              onChange={(e) => setMToken(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={connectManual} variant="contained" disabled={!mToken.trim()}>
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
