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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';
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
import { useConfirm } from '@/components/ConfirmDialog';

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
  const confirm = useConfirm();
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

  const [scheduleItem, setScheduleItem] = useState<ContentItem | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduling, setScheduling] = useState(false);

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

  const removeAccount = async (acc: SocialAccount) => {
    const ok = await confirm({
      title: 'Disconnect account?',
      message: (
        <>
          Disconnect <b>{PLATFORM_LABEL[acc.platform] || acc.platform}</b>
          {acc.display_name ? (
            <>
              {' '}
              (<b>{acc.display_name}</b>)
            </>
          ) : null}
          ? Scheduled posts to this account will stop publishing.
        </>
      ),
      confirmText: 'Disconnect',
    });
    if (!ok) return;
    await Social.removeAccount(acc.id);
    refresh();
  };

  const removeSchedule = async (s: Schedule) => {
    const ok = await confirm({
      title: 'Delete post?',
      message: 'Remove this scheduled / published post entry from the queue? This cannot be undone.',
    });
    if (!ok) return;
    const prev = schedules;
    setSchedules((cur) => cur.filter((x) => x.id !== s.id));
    try {
      await Social.removeSchedule(s.id);
    } catch {
      setSchedules(prev);
    }
  };

  const removeContent = async (item: ContentItem) => {
    const ok = await confirm({
      title: 'Delete post?',
      message: (
        <>
          Delete <b>{item.title || item.body.slice(0, 40) || 'this post'}</b> permanently? The
          generated copy and assets will be removed. This cannot be undone.
        </>
      ),
    });
    if (!ok) return;
    const prev = content;
    setContent((cur) => cur.filter((x) => x.id !== item.id));
    try {
      await Content.remove(item.id);
    } catch {
      setContent(prev);
      setError('Could not delete the post. Please try again.');
    }
  };

  const openSchedule = (item: ContentItem) => {
    const d = (item.meta?.scheduled_date as string) || '';
    const base = d ? new Date(d + 'T09:00:00') : new Date(Date.now() + 60 * 60 * 1000);
    const tzOffset = base.getTimezoneOffset() * 60000;
    setScheduleAt(new Date(base.getTime() - tzOffset).toISOString().slice(0, 16));
    setScheduleItem(item);
  };

  const confirmSchedule = async () => {
    if (!scheduleItem) return;
    const account = accountFor(scheduleItem.platform || '');
    if (!account || !scheduleAt) return;
    setScheduling(true);
    setError('');
    try {
      await Social.schedule({
        content_item_id: scheduleItem.id,
        social_account_id: account.id,
        scheduled_at: new Date(scheduleAt).toISOString(),
      });
      setScheduleItem(null);
      setMsg('Post scheduled — it will publish automatically at the chosen time.');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not schedule the post');
    } finally {
      setScheduling(false);
    }
  };

  const approveItem = async (item: ContentItem) => {
    try {
      const updated = await Content.approve(item.id);
      setContent((cur) => cur.map((x) => (x.id === item.id ? { ...x, status: updated.status } : x)));
      setMsg('Post approved — ready to publish.');
    } catch {
      setError('Could not approve the post. Please try again.');
    }
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
            <Button size="small" color="inherit" onClick={() => setManualOpen(true)}>
              Advanced: paste token
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
                  <Tooltip title="Disconnect">
                    <IconButton onClick={() => removeAccount(a)} aria-label="remove" size="small">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Card>
            ))}
          </Stack>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            CONNECT A NETWORK
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {supported.map((p) => {
              const ready = !!providers[p];
              return (
                <Tooltip
                  key={p}
                  title={
                    ready
                      ? `Sign in securely with ${PLATFORM_LABEL[p] || p} — no tokens to copy`
                      : `One-time setup needed: add the ${PLATFORM_LABEL[p] || p} app credentials in the server .env to enable one-click sign-in`
                  }
                >
                  <span>
                    <Button
                      variant={ready ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => connect(p)}
                      disabled={!ready}
                      startIcon={<SendIcon sx={{ transform: 'rotate(-45deg)' }} />}
                    >
                      {ready ? `Sign in with ${PLATFORM_LABEL[p] || p}` : `${PLATFORM_LABEL[p] || p} (setup)`}
                    </Button>
                  </span>
                </Tooltip>
              );
            })}
          </Stack>
          {supported.some((p) => !providers[p]) && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>One-click sign-in is built in</strong> — you don&apos;t paste tokens. A network
              shows <em>(setup)</em> until its developer app is registered once. Each platform
              (LinkedIn, X, Meta/Instagram, Google/YouTube) requires its own OAuth app with posting
              permissions — that&apos;s a platform requirement every tool (Buffer, Hootsuite…) follows.
              Add the <code>CLIENT_ID</code>/<code>CLIENT_SECRET</code> to the API <code>.env</code>{' '}
              (see <code>OAUTH_SETUP.md</code>) and the button turns into one-click{' '}
              &quot;Sign in with…&quot;. &quot;Paste token&quot; stays as an advanced fallback only.
            </Alert>
          )}
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
                                    <Stack
                                      direction="row"
                                      justifyContent="space-between"
                                      alignItems="center"
                                      sx={{ mb: 0.5 }}
                                    >
                                      <Typography variant="body2" fontWeight={700} noWrap>
                                        {item.title || item.body.slice(0, 40)}
                                      </Typography>
                                      {(() => {
                                        const d = (item.meta?.scheduled_date as string) || '';
                                        return d ? (
                                          <Chip
                                            size="small"
                                            label={new Date(d + 'T00:00:00').toLocaleDateString(
                                              undefined,
                                              { month: 'short', day: 'numeric' },
                                            )}
                                            variant="outlined"
                                          />
                                        ) : null;
                                      })()}
                                    </Stack>
                                    {(() => {
                                      const v = (item.variants ||
                                        {}) as Record<string, unknown>;
                                      const caption =
                                        (v.caption as string) || item.body || '';
                                      const tags = Array.isArray(v.hashtags)
                                        ? (v.hashtags as string[])
                                        : [];
                                      return (
                                        <>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                              display: '-webkit-box',
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: 'vertical',
                                              overflow: 'hidden',
                                              mb: 0.5,
                                              minHeight: 32,
                                            }}
                                          >
                                            {caption}
                                          </Typography>
                                          {tags.length > 0 && (
                                            <Stack
                                              direction="row"
                                              sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}
                                            >
                                              {tags.slice(0, 4).map((t) => (
                                                <Chip
                                                  key={t}
                                                  size="small"
                                                  label={t}
                                                  sx={{ height: 20, fontSize: 11 }}
                                                />
                                              ))}
                                            </Stack>
                                          )}
                                        </>
                                      );
                                    })()}
                                    <Stack
                                      direction="row"
                                      justifyContent="space-between"
                                      alignItems="center"
                                    >
                                      <Chip size="small" label={item.status} variant="outlined" />
                                      <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Tooltip title="Delete post">
                                          <IconButton
                                            size="small"
                                            aria-label="delete post"
                                            onClick={() => removeContent(item)}
                                          >
                                            <DeleteOutlineIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                        {(() => {
                                          const approved = ['approved', 'scheduled', 'published'].includes(
                                            item.status,
                                          );
                                          if (!approved) {
                                            return (
                                              <Tooltip title="Approve this post before it can be published">
                                                <Button
                                                  size="small"
                                                  variant="outlined"
                                                  color="success"
                                                  startIcon={<CheckCircleOutlineIcon />}
                                                  onClick={() => approveItem(item)}
                                                >
                                                  Approve
                                                </Button>
                                              </Tooltip>
                                            );
                                          }
                                          return (
                                            <Tooltip
                                              title={
                                                account ? 'Publish now' : 'Connect an account first'
                                              }
                                            >
                                              <span>
                                                <Stack direction="row" spacing={0.5}>
                                                  <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<ScheduleIcon />}
                                                    disabled={!account}
                                                    onClick={() => openSchedule(item)}
                                                  >
                                                    Schedule
                                                  </Button>
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
                                                </Stack>
                                              </span>
                                            </Tooltip>
                                          );
                                        })()}
                                      </Stack>
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
                  <Tooltip title="Delete post">
                    <IconButton
                      size="small"
                      onClick={() => removeSchedule(s)}
                      aria-label="delete post"
                      sx={{ color: 'text.disabled' }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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

      <Dialog
        open={scheduleItem !== null}
        onClose={() => setScheduleItem(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Schedule post</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {scheduleItem?.title || scheduleItem?.body?.slice(0, 60)}
            </Typography>
            <TextField
              label="Publish at"
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Alert severity="info">
              The post will publish automatically at this time to{' '}
              {PLATFORM_LABEL[scheduleItem?.platform || ''] || scheduleItem?.platform}.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleItem(null)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={confirmSchedule}
            variant="contained"
            disabled={!scheduleAt || scheduling}
            startIcon={scheduling ? <CircularProgress size={14} color="inherit" /> : <ScheduleIcon />}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
