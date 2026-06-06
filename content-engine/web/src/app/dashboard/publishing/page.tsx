'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  alpha,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import AddLinkRoundedIcon from '@mui/icons-material/AddLinkRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PinterestIcon from '@mui/icons-material/Pinterest';
import RedditIcon from '@mui/icons-material/Reddit';
import TwitterIcon from '@mui/icons-material/Twitter';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import { useAuth } from '@/lib/auth';
import {
  Social,
  Content,
  Calendar,
  Analytics,
  assetUrl,
  type SocialAccount,
  type Schedule,
  type ContentItem,
  type ContentCalendar,
  type PostStat,
  type ChannelStatus,
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  FieldGrid,
  FullSpan,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';

interface PlatformMeta {
  label: string;
  color: string;
  Icon: SvgIconComponent;
}

const PLATFORM_META: Record<string, PlatformMeta> = {
  linkedin: { label: 'LinkedIn', color: '#0A66C2', Icon: LinkedInIcon },
  x: { label: 'X (Twitter)', color: '#0F1419', Icon: TwitterIcon },
  twitter: { label: 'X (Twitter)', color: '#0F1419', Icon: TwitterIcon },
  facebook: { label: 'Facebook', color: '#1877F2', Icon: FacebookIcon },
  instagram: { label: 'Instagram', color: '#E4405F', Icon: InstagramIcon },
  youtube: { label: 'YouTube', color: '#FF0000', Icon: YouTubeIcon },
  tiktok: { label: 'TikTok', color: '#111111', Icon: MusicNoteIcon },
  pinterest: { label: 'Pinterest', color: '#E60023', Icon: PinterestIcon },
  threads: { label: 'Threads', color: '#101010', Icon: AlternateEmailRoundedIcon },
  reddit: { label: 'Reddit', color: '#FF4500', Icon: RedditIcon },
  blog: { label: 'Blog', color: '#5A6472', Icon: PublicRoundedIcon },
  newsletter: { label: 'Newsletter', color: '#5A6472', Icon: AlternateEmailRoundedIcon },
  quora: { label: 'Quora', color: '#B92B27', Icon: PublicRoundedIcon },
  medium: { label: 'Medium', color: '#5A6472', Icon: PublicRoundedIcon },
};

const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(PLATFORM_META).map(([k, v]) => [k, v.label]),
);

const platformMeta = (p?: string | null): PlatformMeta =>
  (p && PLATFORM_META[p]) || { label: p || 'Other', color: '#5A6472', Icon: PublicRoundedIcon };

// Networks shown in the connect catalogue. One-click OAuth when configured on the
// server; otherwise a token connect for enum-supported networks; the rest are
// surfaced as "coming soon" so the platform line-up is always visible.
const CONNECT_CATALOG = [
  'instagram',
  'tiktok',
  'pinterest',
  'linkedin',
  'x',
  'facebook',
  'youtube',
  'threads',
  'reddit',
];
const MANUAL_OK = new Set(['linkedin', 'x', 'instagram', 'facebook', 'youtube', 'tiktok']);

function fmtFullDate(date?: string | null): string {
  if (!date) return '';
  return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** A compact calendar tile that makes a post's go-live date unmissable. */
function DateBadge({ date, onClick }: { date?: string | null; onClick?: () => void }) {
  if (!date) {
    return (
      <Stack
        onClick={onClick}
        alignItems="center"
        justifyContent="center"
        spacing={0.3}
        sx={{
          width: 60,
          height: 66,
          borderRadius: 2,
          flexShrink: 0,
          border: '1px dashed',
          borderColor: 'divider',
          color: 'text.disabled',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': onClick ? { borderColor: BRAND.amber, color: BRAND.amberDeep } : undefined,
        }}
      >
        <EventBusyRoundedIcon sx={{ fontSize: 18 }} />
        <Typography sx={{ fontSize: 9, fontWeight: 800, lineHeight: 1, letterSpacing: 0.3 }}>
          SET DATE
        </Typography>
      </Stack>
    );
  }
  const d = new Date(date + 'T00:00:00');
  const wd = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
  const day = d.getDate();
  const mon = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  return (
    <Stack
      alignItems="center"
      justifyContent="flex-start"
      sx={{
        width: 60,
        height: 66,
        borderRadius: 2,
        flexShrink: 0,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#fff',
        boxShadow: '0 1px 3px rgba(14,17,22,0.06)',
      }}
    >
      <Box
        sx={{
          width: '100%',
          textAlign: 'center',
          bgcolor: BRAND.amberDeep,
          color: '#fff',
          fontSize: 9.5,
          fontWeight: 800,
          py: 0.25,
          letterSpacing: 0.5,
        }}
      >
        {mon}
      </Box>
      <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15, color: BRAND.ink }}>
        {day}
      </Typography>
      <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.secondary', lineHeight: 1 }}>
        {wd}
      </Typography>
    </Stack>
  );
}

/** Brand-coloured platform chip with the network's icon. */
function PlatformPill({ platform }: { platform: string }) {
  const m = platformMeta(platform);
  const Icon = m.Icon;
  return (
    <Chip
      size="small"
      icon={<Icon sx={{ fontSize: 15, color: `${m.color} !important` }} />}
      label={m.label}
      sx={{
        height: 24,
        fontWeight: 700,
        fontSize: 11.5,
        bgcolor: alpha(m.color, 0.1),
        color: m.color,
        border: `1px solid ${alpha(m.color, 0.25)}`,
        '& .MuiChip-icon': { ml: 0.6 },
      }}
    />
  );
}

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
  const [postStats, setPostStats] = useState<Record<string, PostStat>>({});
  const [scheduleStatuses, setScheduleStatuses] = useState<
    Record<string, { status: string; permalink: string | null; error: string | null }>
  >({});
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [channelStatuses, setChannelStatuses] = useState<ChannelStatus[]>([]);

  // LinkedIn company-page selection
  const [liOpen, setLiOpen] = useState(false);
  const [liAccount, setLiAccount] = useState<SocialAccount | null>(null);
  const [liPages, setLiPages] = useState<{ urn: string; id: string; name: string }[]>([]);
  const [liSelected, setLiSelected] = useState<string | null>(null);
  const [liLoading, setLiLoading] = useState(false);
  const [liSaving, setLiSaving] = useState(false);
  const [liError, setLiError] = useState('');

  const refresh = () => {
    Promise.all([
      Social.providers().catch(() => ({})),
      Social.accounts().catch(() => []),
      Social.schedules().catch(() => []),
      Content.list().catch(() => []),
      Calendar.list().catch(() => []),
      Analytics.posts(60).catch(() => []),
      Social.channelStatus().catch(() => []),
    ]).then(([p, a, s, c, cal, ps, cs]) => {
      setProviders(p as Record<string, boolean>);
      setAccounts(a as SocialAccount[]);
      setSchedules(s as Schedule[]);
      setContent(c as ContentItem[]);
      setCalendars(cal as ContentCalendar[]);
      const statMap: Record<string, PostStat> = {};
      for (const stat of ps as PostStat[]) statMap[stat.schedule_id] = stat;
      setPostStats(statMap);
      setChannelStatuses(cs as ChannelStatus[]);
      setLoading(false);
    });
  };

  const refreshResults = async () => {
    setRefreshingStats(true);
    setError('');
    try {
      const { refreshed } = await Analytics.refresh(60);
      const ps = await Analytics.posts(60).catch(() => []);
      const statMap: Record<string, PostStat> = {};
      for (const stat of ps as PostStat[]) statMap[stat.schedule_id] = stat;
      setPostStats(statMap);
      setMsg(
        refreshed > 0
          ? `Pulled fresh engagement for ${refreshed} published post${refreshed === 1 ? '' : 's'}.`
          : 'No published posts to refresh yet.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not refresh results');
    } finally {
      setRefreshingStats(false);
    }
  };

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  useEffect(() => {
    if (!schedules.length) return;
    let alive = true;
    const poll = async () => {
      const results: Record<string, { status: string; permalink: string | null; error: string | null }> = {};
      await Promise.allSettled(
        schedules.map(async (s) => {
          try {
            const r = await Social.postStatus(s.id);
            results[s.id] = { status: r.status, permalink: r.permalink, error: r.error };
          } catch {
            /* ignore individual failures */
          }
        }),
      );
      if (alive) setScheduleStatuses(results);
    };
    poll();
    const timer = setInterval(poll, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [schedules]);

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

  const openLinkedinPages = async (acc: SocialAccount) => {
    setLiAccount(acc);
    setLiOpen(true);
    setLiError('');
    setLiPages([]);
    setLiSelected(acc.external_id?.startsWith('urn:li:organization:') ? acc.external_id : null);
    setLiLoading(true);
    try {
      const { pages, selected } = await Social.linkedinPages(acc.id);
      setLiPages(pages);
      setLiSelected(selected);
    } catch (e) {
      setLiError(e instanceof Error ? e.message : 'Could not load your LinkedIn pages');
    } finally {
      setLiLoading(false);
    }
  };

  const chooseLinkedinTarget = async (urn: string | null, name?: string) => {
    if (!liAccount) return;
    setLiSaving(true);
    setLiError('');
    try {
      await Social.setLinkedinTarget(liAccount.id, { urn, name });
      setLiSelected(urn);
      setMsg(urn ? `LinkedIn posts will publish to “${name}”.` : 'LinkedIn posts will publish to your personal profile.');
      setLiOpen(false);
      refresh();
    } catch (e) {
      setLiError(e instanceof Error ? e.message : 'Could not save your selection');
    } finally {
      setLiSaving(false);
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

  const activeAccounts = accounts.filter((a) => a.is_active);
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const contentById = new Map(content.map((c) => [c.id, c]));
  const channelConnected = (platform: string): boolean =>
    channelStatuses.some((cs) => cs.platform === platform && cs.connected);

  // Flatten every ready post into a single date-sorted schedule list so the
  // page reads as "what goes out, and when" instead of nested platform buckets.
  type ScheduleRow = {
    client: string;
    platform: string;
    item: ContentItem;
    account?: SocialAccount;
    date: string;
  };
  const scheduleRows: ScheduleRow[] = groups.flatMap((g) =>
    Object.entries(g.platforms).flatMap(([platform, items]) =>
      items.map((item) => ({
        client: g.client,
        platform,
        item,
        account: accountFor(platform),
        date: (item.meta?.scheduled_date as string) || '',
      })),
    ),
  );
  scheduleRows.sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return (a.item.title || '').localeCompare(b.item.title || '');
  });

  const publishedCount = schedules.filter((s) => s.status === 'published').length;
  const queuedCount = schedules.filter(
    (s) => s.status !== 'published' && s.status !== 'failed',
  ).length;
  const datedCount = scheduleRows.filter((r) => r.date).length;

  const stats: { label: string; value: number; Icon: SvgIconComponent; color: string }[] = [
    { label: 'Ready posts', value: scheduleRows.length, Icon: RocketLaunchRoundedIcon, color: BRAND.amberDeep },
    { label: 'With a date', value: datedCount, Icon: CalendarMonthRoundedIcon, color: BRAND.teal },
    { label: 'Queued', value: queuedCount, Icon: ScheduleIcon, color: '#0A66C2' },
    { label: 'Published', value: publishedCount, Icon: CheckCircleOutlineIcon, color: BRAND.tealDeep },
    { label: 'Connected', value: activeAccounts.length, Icon: AddLinkRoundedIcon, color: BRAND.pink },
  ];

  const openManual = (platform: string) => {
    setMPlatform(platform);
    setManualOpen(true);
  };

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

      {/* Hero header with scheduling stats */}
      <Card
        sx={{
          borderRadius: 3,
          background: `linear-gradient(120deg, ${alpha(BRAND.amber, 0.16)} 0%, ${alpha(
            BRAND.teal,
            0.16,
          )} 100%)`,
          border: `1px solid ${alpha(BRAND.amberDeep, 0.18)}`,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Box>
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    background: BRAND.gradient,
                    color: '#fff',
                  }}
                >
                  <RocketLaunchRoundedIcon />
                </Box>
                <Typography variant="h5" fontWeight={800} color={BRAND.ink}>
                  Publishing
                </Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
                Every approved post, sorted by its go-live date. Connect your networks once, then
                schedule or publish — TikTok, Instagram, Pinterest and more all live here.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {stats.map((s) => {
                const Icon = s.Icon;
                return (
                  <Stack
                    key={s.label}
                    alignItems="center"
                    sx={{
                      px: 2,
                      py: 1.2,
                      minWidth: 92,
                      borderRadius: 2.5,
                      bgcolor: '#fff',
                      border: '1px solid',
                      borderColor: alpha(s.color, 0.25),
                      boxShadow: '0 2px 8px rgba(14,17,22,0.05)',
                    }}
                  >
                    <Icon sx={{ fontSize: 20, color: s.color, mb: 0.3 }} />
                    <Typography fontWeight={800} sx={{ fontSize: 22, lineHeight: 1, color: BRAND.ink }}>
                      {s.value}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', mt: 0.3 }}
                    >
                      {s.label}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Connect a network — full brand catalogue */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="h6" fontWeight={800}>
              Connect your networks
            </Typography>
            <Button
              size="small"
              color="inherit"
              startIcon={<AddLinkRoundedIcon fontSize="small" />}
              onClick={() => setManualOpen(true)}
            >
              Paste a token
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            One-click sign-in turns on once a network&apos;s app credentials are added to the server.
            Until then you can connect with a token, and a few networks are arriving soon.
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 1.5,
            }}
          >
            {CONNECT_CATALOG.map((key) => {
              const meta = platformMeta(key);
              const Icon = meta.Icon;
              const acc = accountFor(key);
              const connected = !!acc;
              const oneClick = !!providers[key];
              const manual = MANUAL_OK.has(key);
              let badge = 'Soon';
              let badgeColor = '#9AA1AC';
              let onClick: (() => void) | undefined;
              if (connected) {
                badge = 'Connected';
                badgeColor = BRAND.tealDeep;
                onClick = () => removeAccount(acc!);
              } else if (oneClick) {
                badge = '1-click';
                badgeColor = meta.color;
                onClick = () => connect(key);
              } else if (manual) {
                badge = 'Token';
                badgeColor = BRAND.amberDeep;
                onClick = () => openManual(key);
              }
              const disabled = !onClick;
              return (
                <Tooltip
                  key={key}
                  title={
                    connected
                      ? `${meta.label} connected${acc?.display_name ? ` · ${acc.display_name}` : ''} — click to disconnect`
                      : oneClick
                        ? `Sign in securely with ${meta.label}`
                        : manual
                          ? `Connect ${meta.label} with an access token`
                          : `${meta.label} support is coming soon`
                  }
                >
                  <Box
                    onClick={onClick}
                    sx={{
                      position: 'relative',
                      p: 1.5,
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: connected ? alpha(BRAND.tealDeep, 0.4) : 'divider',
                      bgcolor: connected ? alpha(BRAND.teal, 0.06) : '#fff',
                      cursor: disabled ? 'default' : 'pointer',
                      opacity: disabled ? 0.6 : 1,
                      transition: 'all .15s',
                      '&:hover': disabled
                        ? undefined
                        : { borderColor: meta.color, boxShadow: `0 4px 14px ${alpha(meta.color, 0.18)}` },
                    }}
                  >
                    <Chip
                      label={badge}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        height: 18,
                        fontSize: 9.5,
                        fontWeight: 800,
                        bgcolor: alpha(badgeColor, 0.14),
                        color: badgeColor,
                      }}
                    />
                    <Stack spacing={0.8} alignItems="flex-start">
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          bgcolor: alpha(meta.color, 0.12),
                          color: meta.color,
                        }}
                      >
                        <Icon sx={{ fontSize: 20 }} />
                      </Avatar>
                      <Typography fontWeight={700} sx={{ fontSize: 13, color: BRAND.ink }}>
                        {meta.label}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
                        {connected
                          ? acc?.display_name || 'Connected'
                          : oneClick
                            ? 'Sign in'
                            : manual
                              ? 'Use a token'
                              : 'Coming soon'}
                      </Typography>
                    </Stack>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* LinkedIn — choose where posts publish (personal profile vs company page) */}
      {accountFor('linkedin') && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: alpha('#0A66C2', 0.12), color: '#0A66C2', width: 38, height: 38 }}>
                  <LinkedInIcon />
                </Avatar>
                <Box>
                  <Typography fontWeight={800} sx={{ fontSize: 14, color: BRAND.ink }}>
                    LinkedIn posting target
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                    {accountFor('linkedin')?.external_id?.startsWith('urn:li:organization:')
                      ? `Posting to company page · ${accountFor('linkedin')?.display_name || 'Selected page'}`
                      : 'Posting to your personal profile'}
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="outlined"
                size="small"
                onClick={() => openLinkedinPages(accountFor('linkedin')!)}
                sx={{ fontWeight: 700, textTransform: 'none', borderColor: alpha('#0A66C2', 0.5), color: '#0A66C2' }}
              >
                Choose company page
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* LinkedIn page picker dialog */}
      <PremiumDialog open={liOpen} onClose={() => setLiOpen(false)} maxWidth="xs">
        <DialogHero
          icon={<BusinessRoundedIcon />}
          title="Where should LinkedIn posts go?"
          subtitle="Publish as yourself or to a company page you administer."
          onClose={() => setLiOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          {liError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {liError}
            </Alert>
          )}
          {liLoading ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={26} />
              <Typography sx={{ mt: 1.5, fontSize: 13, color: 'text.secondary' }}>
                Loading your company pages…
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1}>
              <Box
                onClick={() => !liSaving && chooseLinkedinTarget(null)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: liSelected === null ? '#0A66C2' : 'divider',
                  bgcolor: liSelected === null ? alpha('#0A66C2', 0.06) : '#fff',
                  cursor: liSaving ? 'default' : 'pointer',
                }}
              >
                <Typography fontWeight={700} sx={{ fontSize: 13.5 }}>
                  Personal profile
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  Publish as yourself (default)
                </Typography>
              </Box>
              {liPages.map((pg) => (
                <Box
                  key={pg.urn}
                  onClick={() => !liSaving && chooseLinkedinTarget(pg.urn, pg.name)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: liSelected === pg.urn ? '#0A66C2' : 'divider',
                    bgcolor: liSelected === pg.urn ? alpha('#0A66C2', 0.06) : '#fff',
                    cursor: liSaving ? 'default' : 'pointer',
                  }}
                >
                  <Typography fontWeight={700} sx={{ fontSize: 13.5 }}>
                    {pg.name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Company page</Typography>
                </Box>
              ))}
              {!liLoading && liPages.length === 0 && !liError && (
                <Alert severity="info">
                  No company pages found for this account. You need an Administrator role on a LinkedIn
                  page, and your app must be approved for the Community Management API.
                </Alert>
              )}
            </Stack>
          )}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setLiOpen(false)} disabled={liSaving} sx={ghostPillSx}>
            Close
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Ready to publish — date-forward schedule rows */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="h6" fontWeight={800}>
              Publishing schedule
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {scheduleRows.length} post{scheduleRows.length === 1 ? '' : 's'} ·{' '}
              {datedCount} dated
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Each row shows the exact date a post goes live and the network it targets. No date yet?
            Click <strong>SET DATE</strong> to schedule it.
          </Typography>
          {scheduleRows.length === 0 ? (
            <Alert severity="info">
              No generated posts yet. Generate content in <strong>Content Studio</strong> — approved
              posts with their planned dates will line up here.
            </Alert>
          ) : (
            <Stack spacing={1.25}>
              {scheduleRows.map(({ item, platform, account, date, client }) => {
                const v = (item.variants || {}) as Record<string, unknown>;
                const caption = (v.caption as string) || item.body || '';
                const approved = ['approved', 'scheduled', 'published'].includes(item.status);
                return (
                  <Stack
                    key={`${item.id}-${platform}`}
                    direction="row"
                    spacing={1.75}
                    alignItems="center"
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: '#fff',
                      transition: 'box-shadow .15s',
                      '&:hover': { boxShadow: '0 4px 16px rgba(14,17,22,0.07)' },
                    }}
                  >
                    <DateBadge date={date} onClick={() => openSchedule(item)} />

                    {item.image_url ? (
                      <Box
                        component="img"
                        src={assetUrl(item.image_url)}
                        alt={item.title || 'post'}
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 2,
                          flexShrink: 0,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'action.hover',
                          color: 'text.disabled',
                        }}
                      >
                        <ImageIcon />
                      </Box>
                    )}

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.4 }}>
                        <PlatformPill platform={platform} />
                        <Chip
                          size="small"
                          label={item.status}
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10.5, textTransform: 'capitalize' }}
                        />
                        {!account && (
                          <Chip
                            size="small"
                            color="warning"
                            variant="outlined"
                            label="no account"
                            sx={{ height: 20, fontSize: 10.5 }}
                          />
                        )}
                        {account && !channelConnected(platform) && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label="not connected"
                            sx={{
                              height: 20,
                              fontSize: 10.5,
                              borderColor: alpha(BRAND.pink, 0.5),
                              color: BRAND.pink,
                            }}
                          />
                        )}
                      </Stack>
                      <Typography fontWeight={700} sx={{ fontSize: 14 }} noWrap>
                        {item.title || item.body.slice(0, 50) || 'Untitled post'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {date ? `${fmtFullDate(date)} · ` : ''}
                        {client}
                        {caption ? ` — ${caption}` : ''}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Tooltip title="Delete post">
                        <IconButton
                          size="small"
                          aria-label="delete post"
                          onClick={() => removeContent(item)}
                          sx={{ color: 'text.disabled' }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!approved ? (
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
                      ) : (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title={account && channelConnected(platform) ? 'Pick a date & time' : account ? 'Channel credentials not connected' : 'Connect an account first'}>
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ScheduleIcon />}
                                disabled={!account || !channelConnected(platform)}
                                onClick={() => openSchedule(item)}
                              >
                                Schedule
                              </Button>
                            </span>
                          </Tooltip>
                          <Tooltip title={account && channelConnected(platform) ? 'Publish now' : account ? 'Channel credentials not connected — add a valid token to publish' : 'Connect an account first'}>
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
                                disabled={!account || !channelConnected(platform) || publishing !== null}
                                onClick={() => publishItem(item)}
                              >
                                Publish
                              </Button>
                            </span>
                          </Tooltip>
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Recent / scheduled timeline */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={800}>
              Scheduled &amp; published timeline
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={
                refreshingStats ? <CircularProgress size={14} /> : <AutorenewIcon fontSize="small" />
              }
              onClick={refreshResults}
              disabled={refreshingStats}
            >
              {refreshingStats ? 'Refreshing…' : 'Refresh results'}
            </Button>
          </Stack>
          {schedules.length === 0 ? (
            <Typography color="text.secondary">Nothing scheduled or published yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {[...schedules]
                .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
                .map((s) => {
                  const stat = postStats[s.id];
                  const st = scheduleStatuses[s.id];
                  const acc = accountById.get(s.social_account_id);
                  const item = contentById.get(s.content_item_id);
                  const platform = acc?.platform || item?.platform || 'other';
                  const meta = platformMeta(platform);
                  const PIcon = meta.Icon;
                  const when = new Date(s.scheduled_at);
                  return (
                    <Box
                      key={s.id}
                      sx={{
                        py: 1,
                        px: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            bgcolor: alpha(meta.color, 0.12),
                            color: meta.color,
                          }}
                        >
                          <PIcon sx={{ fontSize: 17 }} />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {item?.title || item?.body?.slice(0, 50) || meta.label + ' post'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {when.toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            · {when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={s.status === 'skipped_not_connected' ? 'not connected' : s.status}
                          sx={{
                            height: 22,
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            bgcolor:
                              s.status === 'published'
                                ? alpha(BRAND.tealDeep, 0.12)
                                : s.status === 'failed'
                                  ? alpha(BRAND.pink, 0.12)
                                  : s.status === 'skipped_not_connected'
                                    ? alpha('#FFAF06', 0.12)
                                    : alpha('#0A66C2', 0.1),
                            color:
                              s.status === 'published'
                                ? BRAND.tealDeep
                                : s.status === 'failed'
                                  ? BRAND.pink
                                  : s.status === 'skipped_not_connected'
                                    ? '#B8860B'
                                    : '#0A66C2',
                          }}
                        />
                        {st?.status && (
                          <Chip
                            size="small"
                            label={st.status}
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              bgcolor:
                                st.status === 'published'
                                  ? alpha(BRAND.teal, 0.12)
                                  : st.status === 'failed'
                                    ? alpha(BRAND.pink, 0.12)
                                    : alpha('#FFAF06', 0.12),
                              color:
                                st.status === 'published'
                                  ? BRAND.tealDeep
                                  : st.status === 'failed'
                                    ? BRAND.pink
                                    : '#B8860B',
                            }}
                          />
                        )}
                        {s.permalink && (
                          <Tooltip title="View on platform">
                            <IconButton
                              size="small"
                              component="a"
                              href={s.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: 'text.secondary' }}
                            >
                              <LinkRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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
                      {st?.status === 'published' && st?.permalink && (
                        <Box sx={{ pl: 5.5, mt: 0.25 }}>
                          <Typography
                            component="a"
                            href={st.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              fontSize: 12,
                              color: BRAND.tealDeep || '#14BB87',
                              fontWeight: 600,
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                          >
                            View post
                          </Typography>
                        </Box>
                      )}
                      {st?.status === 'failed' && st?.error && (
                        <Typography sx={{ fontSize: 12, color: '#D92C4A', mt: 0.25, pl: 5.5 }}>
                          {st.error}
                        </Typography>
                      )}
                      {s.status === 'failed' && s.error && (
                        <Typography variant="caption" color="error" sx={{ pl: 5.5 }}>
                          {s.error}
                        </Typography>
                      )}
                      {s.status === 'skipped_not_connected' && (
                        <Typography variant="caption" sx={{ pl: 5.5, color: '#B8860B' }}>
                          {s.error || 'Channel credentials not connected. Add a valid access token to publish.'}
                        </Typography>
                      )}
                      {s.status === 'published' && stat && (
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          sx={{ pl: 5.5, mt: 0.5, color: 'text.secondary' }}
                        >
                          <Tooltip title="Impressions">
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <VisibilityIcon sx={{ fontSize: 15 }} />
                              <Typography variant="caption">
                                {stat.impressions.toLocaleString()}
                              </Typography>
                            </Stack>
                          </Tooltip>
                          <Tooltip title="Likes">
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <FavoriteBorderIcon sx={{ fontSize: 15 }} />
                              <Typography variant="caption">{stat.likes.toLocaleString()}</Typography>
                            </Stack>
                          </Tooltip>
                          <Tooltip title="Comments">
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <ChatBubbleOutlineIcon sx={{ fontSize: 15 }} />
                              <Typography variant="caption">
                                {stat.comments.toLocaleString()}
                              </Typography>
                            </Stack>
                          </Tooltip>
                          <Tooltip title="Shares">
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <ShareIcon sx={{ fontSize: 15 }} />
                              <Typography variant="caption">
                                {stat.shares.toLocaleString()}
                              </Typography>
                            </Stack>
                          </Tooltip>
                          {stat.simulated && (
                            <Tooltip title="Estimated until the platform exposes live numbers for this post">
                              <Chip
                                size="small"
                                label="estimated"
                                variant="outlined"
                                sx={{ height: 18, fontSize: 10 }}
                              />
                            </Tooltip>
                          )}
                        </Stack>
                      )}
                    </Box>
                  );
                })}
            </Stack>
          )}
        </CardContent>
      </Card>

      <PremiumDialog open={manualOpen} onClose={() => setManualOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<LinkRoundedIcon />}
          title="Connect with access token"
          subtitle="Link a network manually using a personal access token."
          onClose={() => setManualOpen(false)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <SectionLabel>Account</SectionLabel>
          <FieldGrid>
            <TextField
              select
              label="Platform"
              value={mPlatform}
              onChange={(e) => setMPlatform(e.target.value)}
              fullWidth
              size="small"
            >
              {[...MANUAL_OK].map((p) => (
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
              size="small"
            />
            <FullSpan>
              <TextField
                label="Access token"
                value={mToken}
                onChange={(e) => setMToken(e.target.value)}
                fullWidth
                size="small"
                multiline
                minRows={2}
              />
            </FullSpan>
          </FieldGrid>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setManualOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={connectManual} disabled={!mToken.trim()} sx={inkPillSx}>
            Connect
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <PremiumDialog
        open={scheduleItem !== null}
        onClose={() => setScheduleItem(null)}
        maxWidth="md"
      >
        <DialogHero
          icon={<ScheduleRoundedIcon />}
          title="Schedule post"
          subtitle="Pick a go-live time — we publish automatically."
          onClose={() => setScheduleItem(null)}
        />
        <DialogBody sx={{ p: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, minHeight: { md: 300 } }}>
            {/* ---------------- Form column ---------------- */}
            <Box sx={{ px: { xs: 2.5, sm: 3.25 }, py: 3, borderRight: { md: `1px solid ${alpha(BRAND.ink, 0.08)}` } }}>
              <SectionLabel>When to publish</SectionLabel>
              <Stack spacing={2}>
                <TextField
                  label="Publish at"
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <Alert severity="info">
                  The post will publish automatically at this time to{' '}
                  {PLATFORM_LABEL[scheduleItem?.platform || ''] || scheduleItem?.platform}.
                </Alert>
              </Stack>
            </Box>

            {/* ---------------- Live preview column ---------------- */}
            <Box sx={{ background: 'rgba(14,17,22,0.025)', px: { xs: 2.5, sm: 3 }, py: 2.5, display: 'flex', flexDirection: 'column' }}>
              <SectionLabel sx={{ mb: 1.5 }}>Live preview</SectionLabel>
              <Box
                sx={{
                  background: '#fff',
                  borderRadius: '18px',
                  border: `1px solid ${alpha(BRAND.ink, 0.08)}`,
                  boxShadow: '0 8px 30px -12px rgba(14,17,22,0.18)',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(BRAND.ink, 0.08)}` }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <PlatformPill platform={scheduleItem?.platform || ''} />
                    {scheduleAt && (
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {new Date(scheduleAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Typography>
                    )}
                  </Stack>
                </Box>
                {scheduleItem?.image_url ? (
                  <Box
                    component="img"
                    src={assetUrl(scheduleItem.image_url)}
                    alt={scheduleItem.title || 'post'}
                    sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <Box sx={{ height: 120, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'text.disabled' }}>
                    <ImageIcon />
                  </Box>
                )}
                <Box sx={{ p: 2 }}>
                  {scheduleItem?.title && (
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: BRAND.ink, mb: 0.5 }}>
                      {scheduleItem.title}
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: 13, color: BRAND.ink, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {scheduleItem?.body || 'Your post content will appear here.'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setScheduleItem(null)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button
            onClick={confirmSchedule}
            disabled={!scheduleAt || scheduling}
            startIcon={scheduling ? <CircularProgress size={14} color="inherit" /> : <ScheduleRoundedIcon />}
            sx={inkPillSx}
          >
            Schedule
          </Button>
        </DialogFooter>
      </PremiumDialog>
    </Stack>
  );
}
