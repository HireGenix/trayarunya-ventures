'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Drawer,
  FormControlLabel,
  IconButton,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import BoltIcon from '@mui/icons-material/Bolt';
import LayersIcon from '@mui/icons-material/Layers';
import TuneIcon from '@mui/icons-material/Tune';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TodayIcon from '@mui/icons-material/Today';
import {
  Calendar,
  ALL_PLATFORMS,
  AI_MODELS,
  IMAGE_MODELS,
  IMAGE_STYLES,
  assetUrl,
  type ContentCalendar,
  type CalendarEntry,
} from '@/lib/api';
import { useAIModels } from '@/lib/useAIModels';
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

/* ============================ helpers ============================ */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISO(): string {
  return ymd(new Date());
}

/** Build the 6-week grid (42 cells) for the month containing `cursor`. */
function monthGrid(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back up to Sunday
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const FORMAT_COLOR: Record<string, string> = {
  carousel: '#7C3AED',
  pdf: '#DB2777',
  article: '#2563EB',
  newsletter: '#0891B2',
  static: '#F59E0B',
  single: '#F59E0B',
  text: '#64748B',
  video_script: '#16A34A',
};

function entryColor(e: CalendarEntry): string {
  return FORMAT_COLOR[(e.format || '').toLowerCase()] || '#64748B';
}

function groupByDate(entries: CalendarEntry[]): Map<string, CalendarEntry[]> {
  const map = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.date) || [];
    arr.push(e);
    map.set(e.date, arr);
  }
  return map;
}

/** Tiny SVG progress ring (generated / total). */
function ProgressRing({
  value,
  total,
  size = 30,
  stroke = 3.5,
  color = BRAND.teal,
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? value / total : 0;
  const done = pct >= 1;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? BRAND.tealDeep : color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .4s ease' }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.3,
          fontWeight: 800,
          color: done ? BRAND.tealDeep : 'text.secondary',
        }}
      >
        {done ? '✓' : `${value}`}
      </Box>
    </Box>
  );
}

interface CalStats {
  total: number;
  generated: number;
  platforms: number;
  days: number;
}

function calStats(cal: ContentCalendar | null): CalStats {
  if (!cal) return { total: 0, generated: 0, platforms: 0, days: 0 };
  const entries = cal.entries || [];
  const platforms = new Set(entries.map((e) => e.platform));
  const days = new Set(entries.map((e) => e.date));
  return {
    total: entries.length,
    generated: entries.filter((e) => e.status === 'generated').length,
    platforms: platforms.size,
    days: days.size,
  };
}

/* ============================ create dialog ============================ */

function CreateCalendarDialog({
  open,
  provider,
  onClose,
  onCreated,
}: {
  open: boolean;
  provider: string;
  onClose: () => void;
  onCreated: (cal: ContentCalendar) => void;
}) {
  const [client, setClient] = useState('');
  const [goal, setGoal] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([...ALL_PLATFORMS]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const cal = await Calendar.generate({
        client_name: client.trim() || undefined,
        goal: goal.trim() || undefined,
        platforms,
        start_date: todayISO(),
        provider,
      });
      onCreated(cal);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calendar generation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PremiumDialog open={open} onClose={busy ? () => {} : onClose} maxWidth="sm">
      <DialogHero
        icon={<CalendarMonthRoundedIcon />}
        title="New content calendar"
        subtitle="Plan a month of date-aware, multi-platform ideas."
        onClose={busy ? undefined : onClose}
      />
      <DialogBody>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <SectionLabel>Brief</SectionLabel>
        <FieldGrid>
          <FullSpan>
            <TextField
              label="Client / brand name (optional)"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              fullWidth
              size="small"
            />
          </FullSpan>
          <FullSpan>
            <TextField
              label="Primary goal (optional)"
              placeholder="e.g. drive demo signups for the new hiring product"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
          </FullSpan>
        </FieldGrid>

        <SectionLabel sx={{ mt: 2.5 }}>Platforms</SectionLabel>
        <Select
          multiple
          fullWidth
          size="small"
          value={platforms}
          onChange={(e) =>
            setPlatforms(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
          }
          input={<OutlinedInput />}
          renderValue={(sel) => (sel as string[]).join(', ')}
        >
          {ALL_PLATFORMS.map((p) => (
            <MenuItem key={p} value={p}>
              <Checkbox checked={platforms.indexOf(p) > -1} />
              <ListItemText primary={p} />
            </MenuItem>
          ))}
        </Select>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          A full month of date-aware, multi-platform ideas will be planned from today. You then
          generate each piece on its scheduled day.
        </Typography>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose} disabled={busy} sx={ghostPillSx}>Cancel</Button>
        <Button
          onClick={create}
          disabled={busy || platforms.length === 0}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRoundedIcon />}
          sx={inkPillSx}
        >
          {busy ? 'Planning…' : 'Generate calendar'}
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

/* ============================ day drawer ============================ */

function DayDrawer({
  date,
  calendar,
  settings,
  onClose,
  onUpdated,
}: {
  date: string | null;
  calendar: ContentCalendar | null;
  settings: { provider: string; withImage: boolean; imageStyle: string; imageModel: string; emailFormat: string };
  onClose: () => void;
  onUpdated: (cal: ContentCalendar) => void;
}) {
  const router = useRouter();
  const [busyEntry, setBusyEntry] = useState<string | null>(null);
  const [busyDay, setBusyDay] = useState(false);
  const [error, setError] = useState('');
  const [regenTarget, setRegenTarget] = useState<CalendarEntry | null>(null);
  const [regenNote, setRegenNote] = useState('');

  const entries = useMemo(() => {
    if (!date || !calendar) return [];
    return calendar.entries.filter((e) => e.date === date);
  }, [date, calendar]);

  const pending = useMemo(() => entries.filter((e) => e.status !== 'generated'), [entries]);

  const generate = async (entry: CalendarEntry, notes?: string) => {
    if (!calendar) return;
    setBusyEntry(entry.id);
    setError('');
    try {
      const updated = await Calendar.generateEntry(calendar.id, entry.id, {
        provider: settings.provider,
        notes: notes?.trim() || undefined,
        with_image: settings.withImage,
        image_style: settings.imageStyle,
        image_provider: settings.imageModel,
        email_format: entry.content_type === 'newsletter' ? settings.emailFormat : undefined,
      });
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusyEntry(null);
    }
  };

  const openRegen = (entry: CalendarEntry) => {
    setRegenNote('');
    setRegenTarget(entry);
  };

  const confirmRegen = async () => {
    if (!regenTarget) return;
    const target = regenTarget;
    const note = regenNote;
    setRegenTarget(null);
    await generate(target, note);
  };

  const generateAllDay = async () => {
    if (!calendar || !date || pending.length === 0) return;
    setBusyDay(true);
    setError('');
    try {
      const updated = await Calendar.generateDay(calendar.id, {
        date,
        provider: settings.provider,
        with_image: settings.withImage,
        image_style: settings.imageStyle,
        image_provider: settings.imageModel,
        email_format: settings.emailFormat,
      });
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Day generation failed');
    } finally {
      setBusyDay(false);
    }
  };

  const openInStudio = (entry: CalendarEntry) => {
    if (entry.content_item_id) router.push(`/dashboard/studio?item=${entry.content_item_id}`);
  };

  const prettyDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <Drawer anchor="right" open={!!date} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}>
      {/* gradient header */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          px: 3,
          py: 2.5,
          color: '#fff',
          background: 'linear-gradient(125deg, #11151B 0%, #1B2330 60%, #0E1A18 100%)',
        }}
      >
        <Box sx={{ position: 'absolute', top: -60, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.4), transparent 65%)' }} />
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ position: 'relative' }}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.12em' }}>
              Scheduled for
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{prettyDate}</Typography>
            {entries.length > 0 && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {entries.length} {entries.length === 1 ? 'post' : 'posts'} planned
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      <Box sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* one-click: generate the whole day at once */}
        {pending.length > 0 && (
          <Box
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: 'linear-gradient(135deg, rgba(255,175,6,0.08), rgba(20,187,135,0.08))',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Box>
                <Typography fontWeight={800} sx={{ fontSize: 14 }}>
                  Generate the whole day
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {pending.length} pending {pending.length === 1 ? 'post' : 'posts'} across all platforms — created in one go.
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={generateAllDay}
                disabled={busyDay || busyEntry !== null}
                startIcon={busyDay ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                sx={{ flexShrink: 0 }}
              >
                {busyDay ? 'Generating…' : 'Generate all'}
              </Button>
            </Stack>
          </Box>
        )}

        {entries.length === 0 ? (
          <Alert severity="info">Nothing scheduled for this day.</Alert>
        ) : (
          <Stack spacing={2}>
            {entries.map((e) => {
              const busy = busyEntry === e.id;
              const generated = e.status === 'generated';
              return (
                <Card key={e.id} variant="outlined" sx={{ borderLeft: `4px solid ${entryColor(e)}` }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip size="small" label={e.platform} />
                      <Chip size="small" label={e.content_type} variant="outlined" />
                      {e.format && (
                        <Chip
                          size="small"
                          label={e.format}
                          sx={{ bgcolor: entryColor(e), color: '#fff' }}
                        />
                      )}
                      {generated && <Chip size="small" color="success" label="generated" />}
                    </Stack>

                    <Typography fontWeight={700}>{e.title}</Typography>
                    {e.hook && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {e.hook}
                      </Typography>
                    )}
                    {e.notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {e.notes}
                      </Typography>
                    )}

                    {generated && e.image_url && (
                      <Box
                        component="img"
                        src={assetUrl(e.image_url)}
                        alt=""
                        sx={{ mt: 1.5, width: '100%', borderRadius: 1, display: 'block' }}
                      />
                    )}

                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      {generated ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<LaunchIcon />}
                          onClick={() => openInStudio(e)}
                        >
                          Open in Studio
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={busy || busyDay}
                          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
                          onClick={() => generate(e)}
                        >
                          {busy ? 'Generating…' : 'Generate content'}
                        </Button>
                      )}
                      {generated && (
                        <Button
                          size="small"
                          disabled={busy || busyDay}
                          onClick={() => openRegen(e)}
                          startIcon={busy ? <CircularProgress size={14} /> : undefined}
                        >
                          Regenerate
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>

      <PremiumDialog
        open={Boolean(regenTarget)}
        onClose={() => setRegenTarget(null)}
        maxWidth="md"
      >
        <DialogHero
          icon={<AutoAwesomeRoundedIcon />}
          title="Regenerate content"
          subtitle="Tell the AI what to change, or leave blank to simply regenerate."
          onClose={() => setRegenTarget(null)}
        />
        <DialogBody sx={{ p: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, minHeight: { md: 280 } }}>
            {/* ---------------- Instruction column ---------------- */}
            <Box sx={{ px: { xs: 2.5, sm: 3.25 }, py: 3, borderRight: { md: '1px solid rgba(14,17,22,0.08)' } }}>
              <SectionLabel>What to change</SectionLabel>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {regenTarget?.title
                  ? `Refine “${regenTarget.title}”, or leave blank to simply regenerate.`
                  : 'Leave blank to simply regenerate.'}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={3}
                maxRows={8}
                placeholder="e.g. Make the tone more energetic, add a clear CTA, shorten to 2 lines, focus on first-time founders…"
                value={regenNote}
                onChange={(ev) => setRegenNote(ev.target.value)}
              />
            </Box>

            {/* ---------------- Live preview column ---------------- */}
            <Box sx={{ background: 'rgba(14,17,22,0.025)', px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
              <SectionLabel sx={{ mb: 1.5 }}>Current post</SectionLabel>
              {regenTarget && (
                <Box
                  sx={{
                    background: '#fff',
                    borderRadius: '18px',
                    border: '1px solid rgba(14,17,22,0.08)',
                    boxShadow: '0 8px 30px -12px rgba(14,17,22,0.18)',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    <Stack direction="row" spacing={0.75} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip size="small" label={regenTarget.platform} />
                      <Chip size="small" label={regenTarget.content_type} variant="outlined" />
                      {regenTarget.format && <Chip size="small" label={regenTarget.format} sx={{ bgcolor: entryColor(regenTarget), color: '#fff' }} />}
                    </Stack>
                    {regenTarget.title && (
                      <Typography sx={{ fontWeight: 800, fontSize: 14, color: BRAND.ink }}>{regenTarget.title}</Typography>
                    )}
                    {regenTarget.hook && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{regenTarget.hook}</Typography>
                    )}
                    {regenTarget.notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{regenTarget.notes}</Typography>
                    )}
                  </Box>
                  {regenTarget.image_url && (
                    <Box component="img" src={assetUrl(regenTarget.image_url)} alt="" sx={{ width: '100%', display: 'block' }} />
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setRegenTarget(null)} sx={ghostPillSx}>Cancel</Button>
          <Button
            startIcon={<AutoAwesomeRoundedIcon />}
            onClick={confirmRegen}
            sx={inkPillSx}
          >
            Regenerate
          </Button>
        </DialogFooter>
      </PremiumDialog>
    </Drawer>
  );
}

/* ============================ page ============================ */

export default function CalendarPage() {
  const confirm = useConfirm();
  const [calendars, setCalendars] = useState<ContentCalendar[]>([]);
  const [active, setActive] = useState<ContentCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState('');

  // generation settings
  const { models: aiModels } = useAIModels();
  const [provider, setProvider] = useState<string>(AI_MODELS[0].id);
  const [withImage, setWithImage] = useState(true);
  const [imageStyle, setImageStyle] = useState<string>(IMAGE_STYLES[0].id);
  const [imageModel, setImageModel] = useState<string>(IMAGE_MODELS[0].id);
  const [emailFormat, setEmailFormat] = useState<string>('html');

  useEffect(() => {
    Calendar.list()
      .then((cals) => {
        setCalendars(cals);
        if (cals.length > 0) {
          setActive(cals[0]);
          setCursor(new Date(cals[0].start_date + 'T00:00:00'));
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load calendars'))
      .finally(() => setLoading(false));
  }, []);

  const onUpdated = (cal: ContentCalendar) => {
    setActive(cal);
    setCalendars((prev) => prev.map((c) => (c.id === cal.id ? cal : c)));
  };

  const onCreated = (cal: ContentCalendar) => {
    setCalendars((prev) => [cal, ...prev]);
    setActive(cal);
    setCursor(new Date(cal.start_date + 'T00:00:00'));
  };

  const removeCalendar = async (cal: ContentCalendar) => {
    const ok = await confirm({
      title: 'Delete calendar?',
      message: <>Delete <b>“{cal.client_name || cal.title}”</b> and all its planned entries?</>,
    });
    if (!ok) return;
    const prev = calendars;
    setCalendars((cur) => cur.filter((c) => c.id !== cal.id));
    if (active?.id === cal.id) setActive(calendars.find((c) => c.id !== cal.id) || null);
    try {
      await Calendar.remove(cal.id);
    } catch {
      setCalendars(prev);
    }
  };

  const byDate = useMemo(() => groupByDate(active?.entries || []), [active]);
  const stats = useMemo(() => calStats(active), [active]);
  const grid = useMemo(() => monthGrid(cursor), [cursor]);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const thisMonth = cursor.getMonth();
  const todayStr = todayISO();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {/* hero header */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          p: { xs: 2.5, md: 3.5 },
          color: '#fff',
          background: 'linear-gradient(125deg, #11151B 0%, #1B2330 55%, #0E1A18 100%)',
          boxShadow: '0 18px 48px rgba(14,17,22,0.28)',
        }}
      >
        {/* glow accents */}
        <Box sx={{ position: 'absolute', top: -90, right: -40, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,175,6,0.40), transparent 65%)', filter: 'blur(8px)' }} />
        <Box sx={{ position: 'absolute', bottom: -120, left: '30%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,187,135,0.34), transparent 65%)', filter: 'blur(10px)' }} />

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ md: 'flex-end' }}
          spacing={2}
          sx={{ position: 'relative' }}
        >
          <Box>
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  display: 'grid',
                  placeItems: 'center',
                  background: BRAND.gradient,
                  boxShadow: '0 8px 20px rgba(20,187,135,0.4)',
                }}
              >
                <CalendarMonthIcon sx={{ color: '#fff', fontSize: 22 }} />
              </Box>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.14em' }}>
                Content Engine · Planner
              </Typography>
            </Stack>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline-block',
              }}
            >
              Content Calendar
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.5, maxWidth: 560 }}>
              Plan the month at a glance. Click any date to see what goes out and generate it — the
              finished piece opens in Content Studio.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ alignSelf: { xs: 'stretch', md: 'flex-end' }, flexShrink: 0 }}
          >
            New calendar
          </Button>
        </Stack>

        {/* live stat pills */}
        {active && (
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ position: 'relative', mt: 2.5, flexWrap: 'wrap', gap: 1.5 }}
          >
            {[
              { label: 'Planned', value: stats.total, icon: <LayersIcon sx={{ fontSize: 18 }} />, color: BRAND.amber },
              { label: 'Generated', value: `${stats.generated}/${stats.total}`, icon: <BoltIcon sx={{ fontSize: 18 }} />, color: BRAND.teal },
              { label: 'Platforms', value: stats.platforms, icon: <AutoAwesomeIcon sx={{ fontSize: 18 }} />, color: BRAND.pink },
              { label: 'Active days', value: stats.days, icon: <TodayIcon sx={{ fontSize: 18 }} />, color: '#3B82F6' },
            ].map((s) => (
              <Box
                key={s.label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.1,
                  px: 1.6,
                  py: 1,
                  borderRadius: 2.5,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  minWidth: 120,
                }}
              >
                <Box sx={{ width: 30, height: 30, borderRadius: 2, display: 'grid', placeItems: 'center', background: `${s.color}26`, color: s.color }}>
                  {s.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.1, color: '#fff' }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>{s.label}</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {/* calendar selector */}
      {calendars.length > 0 && (
        <Stack direction="row" spacing={1.2} sx={{ flexWrap: 'wrap', gap: 1.2 }}>
          {calendars.map((c) => {
            const isActive = active?.id === c.id;
            const cs = calStats(c);
            return (
              <Box
                key={c.id}
                onClick={() => {
                  setActive(c);
                  setCursor(new Date(c.start_date + 'T00:00:00'));
                }}
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                  pl: 1.4,
                  pr: 1,
                  py: 0.9,
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isActive ? 'transparent' : 'divider',
                  background: isActive ? BRAND.gradient : 'background.paper',
                  color: isActive ? '#fff' : 'text.primary',
                  boxShadow: isActive ? '0 8px 22px rgba(20,187,135,0.28)' : 'none',
                  transition: 'transform .15s ease, box-shadow .15s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: isActive ? '0 12px 28px rgba(20,187,135,0.34)' : 3 },
                }}
              >
                <ProgressRing
                  value={cs.generated}
                  total={cs.total}
                  size={26}
                  stroke={3}
                  color={isActive ? '#fff' : BRAND.teal}
                />
                <Box sx={{ pr: 0.5 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.1 }}>
                    {c.client_name || c.title}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, opacity: isActive ? 0.85 : 0.6 }}>
                    {cs.total} posts · {cs.platforms} platforms
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    removeCalendar(c);
                  }}
                  sx={{
                    color: isActive ? 'rgba(255,255,255,0.8)' : 'text.disabled',
                    '&:hover': { color: isActive ? '#fff' : BRAND.pink, bgcolor: isActive ? 'rgba(255,255,255,0.15)' : BRAND.pinkSoft },
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Box>
            );
          })}
        </Stack>
      )}

      {calendars.length === 0 ? (
        <Alert severity="info">
          No content calendars yet. Click <strong>New calendar</strong> to plan a full month of
          date-aware, multi-platform content.
        </Alert>
      ) : (
        <>
          {/* generation settings */}
          <Card
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              background: 'linear-gradient(135deg, rgba(255,175,6,0.05), rgba(20,187,135,0.05))',
              backdropFilter: 'blur(6px)',
            }}
          >
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Box sx={{ width: 26, height: 26, borderRadius: 1.5, display: 'grid', placeItems: 'center', background: BRAND.gradientWarm, color: '#fff' }}>
                  <TuneIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography variant="overline" color="text.secondary">AI generation defaults</Typography>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
                <TextField select size="small" label="AI model" value={provider} onChange={(e) => setProvider(e.target.value)} sx={{ minWidth: 180 }}>
                  {aiModels.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
                </TextField>
                <FormControlLabel
                  control={<Switch checked={withImage} onChange={(e) => setWithImage(e.target.checked)} />}
                  label="Branded graphics"
                />
                <TextField select size="small" label="Graphic style" value={imageStyle} onChange={(e) => setImageStyle(e.target.value)} disabled={!withImage} sx={{ minWidth: 160 }}>
                  {IMAGE_STYLES.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Image model" value={imageModel} onChange={(e) => setImageModel(e.target.value)} disabled={!withImage} sx={{ minWidth: 160 }}>
                  {IMAGE_MODELS.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Email format" value={emailFormat} onChange={(e) => setEmailFormat(e.target.value)} sx={{ minWidth: 150 }} helperText="for newsletters">
                  <MenuItem value="html">Branded HTML</MenuItem>
                  <MenuItem value="normal">Plain / markdown</MenuItem>
                </TextField>
              </Stack>
            </CardContent>
          </Card>

          {/* month grid */}
          <Card sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{
                    background: BRAND.gradientText,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {monthLabel}
                </Typography>
                <Stack
                  direction="row"
                  alignItems="center"
                  sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}
                >
                  <IconButton size="small" sx={{ borderRadius: 0 }} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
                    <ChevronLeftIcon />
                  </IconButton>
                  <Button size="small" onClick={() => setCursor(new Date())} sx={{ minWidth: 'auto', borderRadius: 0, borderLeft: '1px solid', borderRight: '1px solid', borderColor: 'divider', color: 'text.secondary' }}>
                    Today
                  </Button>
                  <IconButton size="small" sx={{ borderRadius: 0 }} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
                    <ChevronRightIcon />
                  </IconButton>
                </Stack>
              </Stack>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.6, md: 1 } }}>
                {WEEKDAYS.map((w) => (
                  <Typography key={w} variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textAlign: 'center', py: 0.5, letterSpacing: '0.06em' }}>
                    {w.toUpperCase()}
                  </Typography>
                ))}
                {grid.map((d) => {
                  const iso = ymd(d);
                  const inMonth = d.getMonth() === thisMonth;
                  const dayEntries = byDate.get(iso) || [];
                  const isToday = iso === todayStr;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const genCount = dayEntries.filter((e) => e.status === 'generated').length;
                  const hasEntries = dayEntries.length > 0;
                  return (
                    <Box
                      key={iso}
                      onClick={() => hasEntries && setOpenDate(iso)}
                      sx={{
                        position: 'relative',
                        minHeight: { xs: 78, md: 96 },
                        p: 0.9,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: isToday ? 'transparent' : 'divider',
                        background: isToday
                          ? 'linear-gradient(160deg, rgba(255,175,6,0.12), rgba(20,187,135,0.12))'
                          : inMonth
                          ? isWeekend
                            ? 'rgba(14,17,22,0.015)'
                            : 'background.paper'
                          : 'transparent',
                        boxShadow: isToday ? `inset 0 0 0 1.5px ${BRAND.amber}` : 'none',
                        opacity: inMonth ? 1 : 0.4,
                        cursor: hasEntries ? 'pointer' : 'default',
                        transition: 'box-shadow .16s ease, transform .16s ease',
                        '&:hover': hasEntries
                          ? { boxShadow: '0 12px 26px rgba(14,17,22,0.12)', transform: 'translateY(-3px)', borderColor: 'transparent' }
                          : {},
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 12,
                            fontWeight: isToday ? 800 : 600,
                            color: isToday ? '#fff' : 'text.primary',
                            background: isToday ? BRAND.gradient : 'transparent',
                            boxShadow: isToday ? '0 4px 10px rgba(20,187,135,0.4)' : 'none',
                          }}
                        >
                          {d.getDate()}
                        </Box>
                        {hasEntries && (
                          <ProgressRing value={genCount} total={dayEntries.length} size={22} stroke={2.5} />
                        )}
                      </Stack>

                      {hasEntries && (
                        <>
                          {/* compact, uniform indicators — full text lives in the popup */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 'auto' }}>
                            {dayEntries.slice(0, 8).map((e) => {
                              const done = e.status === 'generated';
                              return (
                                <Box
                                  key={e.id}
                                  title={`${e.platform} · ${e.title}`}
                                  sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 0.8,
                                    display: 'grid',
                                    placeItems: 'center',
                                    bgcolor: done ? entryColor(e) : `${entryColor(e)}26`,
                                    border: done ? 'none' : `1.5px solid ${entryColor(e)}`,
                                    color: done ? '#fff' : entryColor(e),
                                    fontSize: 8.5,
                                    fontWeight: 800,
                                    lineHeight: 1,
                                  }}
                                >
                                  {done ? '✓' : (e.platform || '?').charAt(0).toUpperCase()}
                                </Box>
                              );
                            })}
                            {dayEntries.length > 8 && (
                              <Box
                                sx={{
                                  height: 16,
                                  px: 0.5,
                                  borderRadius: 0.8,
                                  display: 'grid',
                                  placeItems: 'center',
                                  bgcolor: 'action.hover',
                                  fontSize: 8.5,
                                  fontWeight: 800,
                                  color: 'text.secondary',
                                }}
                              >
                                +{dayEntries.length - 8}
                              </Box>
                            )}
                          </Box>
                          <Typography
                            sx={{
                              mt: 0.6,
                              fontSize: 10,
                              fontWeight: 700,
                              color: genCount === dayEntries.length ? BRAND.tealDeep : 'text.disabled',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {dayEntries.length} {dayEntries.length === 1 ? 'post' : 'posts'}
                          </Typography>
                        </>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* legend */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries({ carousel: 'Carousel', pdf: 'PDF', article: 'Blog', newsletter: 'Newsletter', static: 'Single', text: 'Text' }).map(([k, label]) => (
                    <Stack
                      key={k}
                      direction="row"
                      spacing={0.6}
                      alignItems="center"
                      sx={{ px: 1, py: 0.4, borderRadius: 5, bgcolor: 'action.hover' }}
                    >
                      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: FORMAT_COLOR[k] }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
                    </Stack>
                  ))}
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                  Tap any day to view & generate all its posts in one click
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}

      <DayDrawer
        date={openDate}
        calendar={active}
        settings={{ provider, withImage, imageStyle, imageModel, emailFormat }}
        onClose={() => setOpenDate(null)}
        onUpdated={onUpdated}
      />

      <CreateCalendarDialog
        open={createOpen}
        provider={provider}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
      />
    </Stack>
  );
}
