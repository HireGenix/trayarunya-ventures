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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuth } from '@/lib/auth';
import {
  Social,
  Content,
  type SocialAccount,
  type Schedule,
  type ContentItem,
} from '@/lib/api';

const PLATFORM_LABEL: Record<string, string> = {
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

export default function PublishingPage() {
  const { activeWorkspace } = useAuth();
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [manualOpen, setManualOpen] = useState(false);
  const [mPlatform, setMPlatform] = useState('linkedin');
  const [mToken, setMToken] = useState('');
  const [mName, setMName] = useState('');

  const [pubContent, setPubContent] = useState('');
  const [pubAccount, setPubAccount] = useState('');

  const refresh = () => {
    Promise.all([
      Social.providers().catch(() => ({})),
      Social.accounts().catch(() => []),
      Social.schedules().catch(() => []),
      Content.list().catch(() => []),
    ]).then(([p, a, s, c]) => {
      setProviders(p);
      setAccounts(a);
      setSchedules(s);
      setContent(c);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

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

  const publishNow = async () => {
    if (!pubContent || !pubAccount) return;
    setError('');
    setMsg('');
    try {
      const s = await Social.publishNow({
        content_item_id: pubContent,
        social_account_id: pubAccount,
      });
      if (s.status === 'published') setMsg('Published successfully.');
      else setError(s.error || `Status: ${s.status}`);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
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
      {error && <Alert severity="error">{error}</Alert>}
      {msg && <Alert severity="success">{msg}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={800}>
                  Connected accounts
                </Typography>
                <Button size="small" onClick={() => setManualOpen(true)}>
                  Paste token
                </Button>
              </Stack>

              <Stack spacing={1.5} sx={{ mb: 3 }}>
                {accounts.length === 0 && (
                  <Typography color="text.secondary">No accounts connected yet.</Typography>
                )}
                {accounts.map((a) => (
                  <Card key={a.id} variant="outlined">
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
                      <IconButton onClick={() => removeAccount(a.id)} aria-label="remove">
                        <DeleteOutlineIcon />
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
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Disabled networks need OAuth credentials in the server env. Use “Paste token” to test
                publishing with a personal access token.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Publish now
              </Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Content"
                  value={pubContent}
                  onChange={(e) => setPubContent(e.target.value)}
                  fullWidth
                >
                  {content.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {(c.title || c.body.slice(0, 40)) + ` · ${c.content_type}`}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Account"
                  value={pubAccount}
                  onChange={(e) => setPubAccount(e.target.value)}
                  fullWidth
                >
                  {accounts.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {PLATFORM_LABEL[a.platform] || a.platform} · {a.display_name || a.id.slice(0, 6)}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  onClick={publishNow}
                  disabled={!pubContent || !pubAccount}
                >
                  Publish
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
                <Stack
                  key={s.id}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ py: 0.5 }}
                >
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
