'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import FilterListIcon from '@mui/icons-material/FilterList';
import TodayIcon from '@mui/icons-material/Today';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  CalendarFeed,
  ALL_PLATFORMS,
  type CalendarFeedItem,
} from '@/lib/api';
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

/* ======================== Constants ======================== */

const INK = '#0E1116';
const SUBTLE = '#6B7280';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  scheduled: BRAND.amber,
  published: BRAND.teal,
  failed: BRAND.pink,
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
};

const SOURCE_LABELS: Record<string, string> = {
  content: 'Content',
  social: 'Social',
  email: 'Email',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ======================== Helpers ======================== */

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthGrid(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function weekGrid(cursor: Date): Date[] {
  const d = new Date(cursor);
  d.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day;
  });
}

function feedRange(cursor: Date, view: 'month' | 'week'): { start: string; end: string } {
  if (view === 'week') {
    const days = weekGrid(cursor);
    return { start: ymd(days[0]), end: ymd(days[6]) };
  }
  const days = monthGrid(cursor);
  return { start: ymd(days[0]), end: ymd(days[41]) };
}

function groupByDate(items: CalendarFeedItem[]): Record<string, CalendarFeedItem[]> {
  const m: Record<string, CalendarFeedItem[]> = {};
  for (const it of items) {
    const d = it.scheduled_at?.slice(0, 10) || 'unknown';
    (m[d] ??= []).push(it);
  }
  return m;
}

/* ======================== Sub-components ======================== */

function StatusDot({ status }: { status: string }) {
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: STATUS_COLORS[status] || SUBTLE,
        flexShrink: 0,
      }}
    />
  );
}

/* ---- Day cell for month grid ---- */
function DayCell({
  date,
  items,
  isToday,
  isCurrentMonth,
  isGap,
  onClick,
  onDrop,
}: {
  date: Date;
  items: CalendarFeedItem[];
  isToday: boolean;
  isCurrentMonth: boolean;
  isGap: boolean;
  onClick: () => void;
  onDrop: (item: CalendarFeedItem) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data?.id) onDrop(data as CalendarFeedItem);
    } catch { /* ignore bad drag data */ }
  };

  return (
    <Box
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        minHeight: 90,
        p: 0.5,
        border: '1px solid',
        borderColor: dragOver ? BRAND.amber : 'divider',
        bgcolor: dragOver ? BRAND.amberSoft : isToday ? '#FFFFF0' : 'background.paper',
        borderRadius: 1.5,
        cursor: 'pointer',
        opacity: isCurrentMonth ? 1 : 0.4,
        transition: 'border-color 0.15s, background 0.15s',
        '&:hover': { borderColor: BRAND.teal, bgcolor: BRAND.tealSoft },
        position: 'relative',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ px: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: isToday ? 800 : 600,
            color: isToday ? BRAND.tealDeep : isCurrentMonth ? INK : SUBTLE,
            fontSize: 12,
          }}
        >
          {date.getDate()}
        </Typography>
        {isGap && (
          <WarningAmberIcon sx={{ fontSize: 12, color: BRAND.amber, ml: 'auto' }} />
        )}
      </Stack>
      <Stack spacing={0.25} sx={{ mt: 0.25, px: 0.25 }}>
        {items.slice(0, 3).map((it) => (
          <Box
            key={it.id}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/plain', JSON.stringify(it));
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.5,
              py: 0.2,
              borderRadius: 0.75,
              bgcolor: `${STATUS_COLORS[it.status] || SUBTLE}18`,
              borderLeft: `3px solid ${STATUS_COLORS[it.status] || SUBTLE}`,
              cursor: 'grab',
              overflow: 'hidden',
              '&:active': { cursor: 'grabbing' },
            }}
          >
            <StatusDot status={it.status} />
            <Typography
              variant="caption"
              noWrap
              sx={{ fontSize: 10, fontWeight: 600, color: INK, lineHeight: 1.2 }}
            >
              {it.title}
            </Typography>
          </Box>
        ))}
        {items.length > 3 && (
          <Typography variant="caption" sx={{ fontSize: 9, color: SUBTLE, pl: 0.5 }}>
            +{items.length - 3} more
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

/* ---- Week view row ---- */
function WeekDayColumn({
  date,
  items,
  isToday,
  isGap,
  onClick,
  onDrop,
}: {
  date: Date;
  items: CalendarFeedItem[];
  isToday: boolean;
  isGap: boolean;
  onClick: () => void;
  onDrop: (item: CalendarFeedItem) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data?.id) onDrop(data as CalendarFeedItem);
    } catch { /* ignore */ }
  };

  return (
    <Box
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        flex: 1,
        minHeight: 220,
        p: 1,
        border: '1px solid',
        borderColor: dragOver ? BRAND.amber : 'divider',
        bgcolor: dragOver ? BRAND.amberSoft : isToday ? '#FFFFF0' : 'background.paper',
        borderRadius: 1.5,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: BRAND.teal },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: isToday ? 800 : 600, color: isToday ? BRAND.tealDeep : INK, fontSize: 13 }}>
          {WEEKDAYS[date.getDay()]} {date.getDate()}
        </Typography>
        {isGap && <WarningAmberIcon sx={{ fontSize: 13, color: BRAND.amber }} />}
      </Stack>
      <Stack spacing={0.5}>
        {items.map((it) => (
          <Box
            key={it.id}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/plain', JSON.stringify(it));
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: `${STATUS_COLORS[it.status] || SUBTLE}18`,
              borderLeft: `3px solid ${STATUS_COLORS[it.status] || SUBTLE}`,
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' },
            }}
          >
            <StatusDot status={it.status} />
            <Stack sx={{ overflow: 'hidden', flex: 1 }}>
              <Typography variant="caption" noWrap sx={{ fontWeight: 600, color: INK, fontSize: 11 }}>
                {it.title}
              </Typography>
              <Typography variant="caption" noWrap sx={{ fontSize: 10, color: SUBTLE }}>
                {it.channel} / {SOURCE_LABELS[it.source_type] || it.source_type}
              </Typography>
            </Stack>
          </Box>
        ))}
        {items.length === 0 && (
          <Typography variant="caption" sx={{ color: SUBTLE, fontStyle: 'italic', fontSize: 11 }}>
            No items
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

/* ---- Day Detail Drawer ---- */
function DayDetailDrawer({
  date,
  items,
  onClose,
  onQuickAdd,
  quickAddLoading,
}: {
  date: string | null;
  items: CalendarFeedItem[];
  onClose: () => void;
  onQuickAdd: (title: string, platform: string, contentType: string) => void;
  quickAddLoading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('linkedin');
  const [contentType, setContentType] = useState('social_post');

  const handleAdd = () => {
    if (!title.trim()) return;
    onQuickAdd(title.trim(), platform, contentType);
    setTitle('');
  };

  if (!date) return null;

  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <PremiumDialog open maxWidth="sm" onClose={onClose}>
      <DialogHero
        icon={<CalendarMonthIcon />}
        title={label}
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''} scheduled`}
        onClose={onClose}
      />
      <DialogBody>
        {items.length === 0 && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            No scheduled content for this day. Use Quick Add below to create one.
          </Alert>
        )}

        <Stack spacing={1} sx={{ mb: 3 }}>
          {items.map((it) => (
            <Box
              key={it.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: `${STATUS_COLORS[it.status] || SUBTLE}08`,
              }}
            >
              <StatusDot status={it.status} />
              <Stack sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: INK }}>
                  {it.title}
                </Typography>
                <Typography variant="caption" sx={{ color: SUBTLE }}>
                  {it.channel} / {SOURCE_LABELS[it.source_type] || it.source_type}
                  {it.scheduled_at && ` / ${new Date(it.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                </Typography>
              </Stack>
              <Chip
                label={STATUS_LABELS[it.status] || it.status}
                size="small"
                sx={{
                  bgcolor: `${STATUS_COLORS[it.status] || SUBTLE}20`,
                  color: STATUS_COLORS[it.status] || SUBTLE,
                  fontWeight: 700,
                  fontSize: 10,
                  height: 22,
                }}
              />
            </Box>
          ))}
        </Stack>

        <SectionLabel>Quick Add</SectionLabel>
        <FieldGrid>
          <FullSpan>
            <TextField
              size="small"
              fullWidth
              placeholder="Content title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </FullSpan>
          <Select size="small" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {ALL_PLATFORMS.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </Select>
          <Select size="small" value={contentType} onChange={(e) => setContentType(e.target.value)}>
            {['social_post', 'thread', 'blog', 'newsletter', 'lead_magnet', 'ad_copy'].map((t) => (
              <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>
            ))}
          </Select>
        </FieldGrid>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose} sx={ghostPillSx}>Close</Button>
        <Button
          onClick={handleAdd}
          disabled={!title.trim() || quickAddLoading}
          startIcon={quickAddLoading ? <CircularProgress size={14} /> : <AddIcon />}
          sx={inkPillSx}
        >
          Add Item
        </Button>
      </DialogFooter>
    </PremiumDialog>
  );
}

/* ======================== Main Page ======================== */

export default function CalendarPage() {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState(new Date());
  const [items, setItems] = useState<CalendarFeedItem[]>([]);
  const [gaps, setGaps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterChannel, setFilterChannel] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Day drawer
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const todayStr = ymd(new Date());

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = feedRange(cursor, view);
      const res = await CalendarFeed.get(start, end, {
        channels: filterChannel || undefined,
        source_types: filterSource || undefined,
        statuses: filterStatus || undefined,
      });
      setItems(res.items);
      setGaps(res.gaps);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load calendar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [cursor, view, filterChannel, filterSource, filterStatus]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const byDate = useMemo(() => groupByDate(items), [items]);
  const gapSet = useMemo(() => new Set(gaps), [gaps]);

  const navigate = (dir: number) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + 7 * dir);
    setCursor(d);
  };

  const handleDrop = async (item: CalendarFeedItem, targetDate: Date) => {
    const newDt = new Date(targetDate);
    // Preserve original time if it exists
    if (item.scheduled_at) {
      const orig = new Date(item.scheduled_at);
      newDt.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds());
    } else {
      newDt.setHours(9, 0, 0); // default to 9 AM
    }

    try {
      await CalendarFeed.reschedule({
        source_type: item.source_type,
        source_id: item.source_id,
        new_scheduled_at: newDt.toISOString(),
      });
      loadFeed();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reschedule failed';
      setError(msg);
    }
  };

  const handleQuickAdd = async (title: string, platform: string, contentType: string) => {
    if (!openDate) return;
    setQuickAddLoading(true);
    try {
      const dt = new Date(openDate + 'T09:00:00');
      await CalendarFeed.quickAdd({
        title,
        scheduled_at: dt.toISOString(),
        platform,
        content_type: contentType,
      });
      await loadFeed();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Quick add failed';
      setError(msg);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const grid = view === 'month' ? monthGrid(cursor) : weekGrid(cursor);

  const headerLabel = view === 'month'
    ? cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : (() => {
      const w = weekGrid(cursor);
      const s = w[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const e = w[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${s} - ${e}`;
    })();

  /* Count stats */
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { draft: 0, scheduled: 0, published: 0, failed: 0 };
    for (const it of items) c[it.status] = (c[it.status] || 0) + 1;
    return c;
  }, [items]);

  return (
    <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <CalendarMonthIcon sx={{ fontSize: 28, color: BRAND.tealDeep }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: INK }}>
            Content Calendar
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, v) => v && setView(v)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.5, textTransform: 'none', fontWeight: 600, fontSize: 12 } }}
          >
            <ToggleButton value="month"><CalendarMonthIcon sx={{ fontSize: 16, mr: 0.5 }} />Month</ToggleButton>
            <ToggleButton value="week"><ViewWeekIcon sx={{ fontSize: 16, mr: 0.5 }} />Week</ToggleButton>
          </ToggleButtonGroup>
          <Button
            size="small"
            onClick={() => setCursor(new Date())}
            startIcon={<TodayIcon />}
            sx={{ ...ghostPillSx, fontSize: 12 }}
          >
            Today
          </Button>
          <Button
            size="small"
            onClick={() => setFilterOpen(!filterOpen)}
            startIcon={<FilterListIcon />}
            sx={{ ...ghostPillSx, fontSize: 12 }}
          >
            Filter
          </Button>
        </Stack>
      </Stack>

      {/* Status bar */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={0.5}>
        {Object.entries(STATUS_LABELS).map(([k, label]) => (
          <Chip
            key={k}
            label={`${label}: ${statusCounts[k] || 0}`}
            size="small"
            sx={{
              bgcolor: `${STATUS_COLORS[k]}18`,
              color: STATUS_COLORS[k],
              fontWeight: 700,
              fontSize: 11,
              border: `1px solid ${STATUS_COLORS[k]}30`,
            }}
          />
        ))}
        {gaps.length > 0 && (
          <Chip
            icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
            label={`${gaps.length} gap day${gaps.length > 1 ? 's' : ''}`}
            size="small"
            sx={{
              bgcolor: BRAND.amberSoft,
              color: BRAND.amberDeep,
              fontWeight: 700,
              fontSize: 11,
              border: `1px solid ${BRAND.amber}40`,
            }}
          />
        )}
      </Stack>

      {/* Filter bar */}
      {filterOpen && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
              <Select
                size="small"
                displayEmpty
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                sx={{ minWidth: 130, fontSize: 12 }}
              >
                <MenuItem value="">All channels</MenuItem>
                {ALL_PLATFORMS.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
                <MenuItem value="email">email</MenuItem>
              </Select>
              <Select
                size="small"
                displayEmpty
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                sx={{ minWidth: 130, fontSize: 12 }}
              >
                <MenuItem value="">All sources</MenuItem>
                <MenuItem value="content">Content</MenuItem>
                <MenuItem value="social">Social</MenuItem>
                <MenuItem value="email">Email</MenuItem>
              </Select>
              <Select
                size="small"
                displayEmpty
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                sx={{ minWidth: 130, fontSize: 12 }}
              >
                <MenuItem value="">All statuses</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
              <Button
                size="small"
                onClick={() => { setFilterChannel(''); setFilterSource(''); setFilterStatus(''); }}
                sx={{ ...ghostPillSx, fontSize: 11 }}
              >
                Clear
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Navigation */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => navigate(-1)} size="small"><ChevronLeftIcon /></IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, color: INK, minWidth: 220, textAlign: 'center' }}>
          {headerLabel}
        </Typography>
        <IconButton onClick={() => navigate(1)} size="small"><ChevronRightIcon /></IconButton>
        {loading && <CircularProgress size={18} sx={{ ml: 1 }} />}
      </Stack>

      {/* Calendar grid */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <CardContent sx={{ p: 1 }}>
          {view === 'month' ? (
            <>
              {/* Weekday headers */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
                {WEEKDAYS.map((d) => (
                  <Typography
                    key={d}
                    variant="caption"
                    align="center"
                    sx={{ fontWeight: 700, color: SUBTLE, fontSize: 11, py: 0.5 }}
                  >
                    {d}
                  </Typography>
                ))}
              </Box>
              {/* Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                {grid.map((d) => {
                  const ds = ymd(d);
                  return (
                    <DayCell
                      key={ds}
                      date={d}
                      items={byDate[ds] || []}
                      isToday={ds === todayStr}
                      isCurrentMonth={d.getMonth() === cursor.getMonth()}
                      isGap={gapSet.has(ds)}
                      onClick={() => setOpenDate(ds)}
                      onDrop={(item) => handleDrop(item, d)}
                    />
                  );
                })}
              </Box>
            </>
          ) : (
            <Stack direction="row" spacing={0.5}>
              {grid.map((d) => {
                const ds = ymd(d);
                return (
                  <WeekDayColumn
                    key={ds}
                    date={d}
                    items={byDate[ds] || []}
                    isToday={ds === todayStr}
                    isGap={gapSet.has(ds)}
                    onClick={() => setOpenDate(ds)}
                    onDrop={(item) => handleDrop(item, d)}
                  />
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
          {Object.entries(STATUS_LABELS).map(([k, label]) => (
            <Stack key={k} direction="row" spacing={0.5} alignItems="center" sx={{ px: 1, py: 0.3, borderRadius: 5, bgcolor: 'action.hover' }}>
              <StatusDot status={k} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: SUBTLE, fontSize: 10 }}>{label}</Typography>
            </Stack>
          ))}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 1, py: 0.3, borderRadius: 5, bgcolor: 'action.hover' }}>
            <WarningAmberIcon sx={{ fontSize: 11, color: BRAND.amber }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: SUBTLE, fontSize: 10 }}>Gap day</Typography>
          </Stack>
        </Stack>
        <Typography variant="caption" sx={{ color: SUBTLE, fontStyle: 'italic', fontSize: 11 }}>
          Drag items between days to reschedule. Tap any day for details and quick-add.
        </Typography>
      </Stack>

      {/* Day detail drawer */}
      <DayDetailDrawer
        date={openDate}
        items={openDate ? (byDate[openDate] || []) : []}
        onClose={() => setOpenDate(null)}
        onQuickAdd={handleQuickAdd}
        quickAddLoading={quickAddLoading}
      />
    </Stack>
  );
}
