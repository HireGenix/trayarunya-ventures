'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/ScienceOutlined';
import InsightsIcon from '@mui/icons-material/InsightsOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import SendIcon from '@mui/icons-material/SendOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import TravelExploreIcon from '@mui/icons-material/TravelExploreOutlined';
import PaletteIcon from '@mui/icons-material/PaletteOutlined';
import BarChartIcon from '@mui/icons-material/BarChartOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CallMadeIcon from '@mui/icons-material/CallMade';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import TrendingUpIcon from '@mui/icons-material/TrendingUpRounded';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import { useAuth } from '@/lib/auth';
import {
  Research,
  Strategies,
  Content,
  Calendar,
  type ResearchJob,
  type Strategy,
  type ContentItem,
  type ContentCalendar,
  type CalendarEntry,
} from '@/lib/api';
import { BRAND } from '@/theme/theme';
import OnboardingChecklist from '@/components/OnboardingChecklist';

/* ----------------------------- helpers ----------------------------- */

const INK = BRAND.ink;
const CARD_RADIUS = '22px';
const CARD_SHADOW = '0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)';

function softCap(n: number, step = 50): number {
  return Math.max(step, Math.ceil((n + 1) / step) * step);
}

function dayBuckets(items: { created_at: string }[], windowDays: number) {
  const days: { date: Date; label: string; count: number }[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      date: d,
      label: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
      count: 0,
    });
  }
  for (const it of items) {
    const t = new Date(it.created_at);
    t.setHours(0, 0, 0, 0);
    const slot = days.find((d) => d.date.getTime() === t.getTime());
    if (slot) slot.count += 1;
  }
  return days;
}

/* ------------------------- small components ------------------------- */

function Ring({ pct, color, size = 18, stroke = 3 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return (
    <Box component="svg" width={size} height={size} sx={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(14,17,22,0.10)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Box>
  );
}

function UsagePills({ pct, color, total = 9, onDark }: { pct: number; color: string; total?: number; onDark?: boolean }) {
  const filled = Math.round(Math.min(1, Math.max(0, pct)) * total);
  return (
    <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            height: 38,
            borderRadius: '7px',
            bgcolor: i < filled ? color : 'transparent',
            border: i < filled
              ? 'none'
              : `1.5px dashed ${onDark ? 'rgba(14,17,22,0.28)' : 'rgba(14,17,22,0.16)'}`,
            transition: 'background-color .2s ease',
          }}
        />
      ))}
    </Stack>
  );
}

function MetricCard({
  icon,
  label,
  value,
  cap,
  unit,
  pct,
  color,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  cap: number;
  unit: string;
  pct: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Box
      sx={{
        borderRadius: CARD_RADIUS,
        p: 2.5,
        bgcolor: highlight ? BRAND.amber : '#fff',
        border: '1px solid',
        borderColor: highlight ? BRAND.amber : 'rgba(14,17,22,0.07)',
        boxShadow: highlight ? '0 10px 30px rgba(255,175,6,0.30)' : CARD_SHADOW,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '11px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: highlight ? 'rgba(14,17,22,0.10)' : 'rgba(14,17,22,0.05)',
            color: INK,
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1, color: INK }}>{label}</Typography>
        <IconButton size="small" sx={{ color: highlight ? 'rgba(14,17,22,0.45)' : 'text.disabled' }}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" alignItems="flex-end" spacing={1.25} sx={{ mt: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 40, lineHeight: 1, letterSpacing: '-0.02em', color: INK }}>
          {value}
        </Typography>
        <Typography sx={{ color: highlight ? 'rgba(14,17,22,0.62)' : 'text.secondary', fontSize: 14, pb: 0.5 }}>
          / {cap} {unit}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{
            px: 1,
            py: 0.4,
            borderRadius: '999px',
            bgcolor: highlight ? 'rgba(255,255,255,0.55)' : 'rgba(14,17,22,0.05)',
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 12, color: INK }}>{Math.round(pct * 100)}%</Typography>
          <Ring pct={pct} color={highlight ? INK : color} />
        </Stack>
      </Stack>

      <UsagePills pct={pct} color={highlight ? INK : color} onDark={highlight} />
    </Box>
  );
}

function DumbbellChart({
  contentDays,
  researchDays,
}: {
  contentDays: { label: string; count: number }[];
  researchDays: { label: string; count: number }[];
}) {
  const H = 220;
  const max = Math.max(1, ...contentDays.map((d) => d.count), ...researchDays.map((d) => d.count));

  let peak = 0;
  contentDays.forEach((d, i) => {
    if (d.count > contentDays[peak].count) peak = i;
  });

  const yLabels = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];

  return (
    <Box sx={{ display: 'flex', mt: 1 }}>
      {/* Y axis */}
      <Box
        sx={{
          width: 26,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pr: 1,
          flexShrink: 0,
        }}
      >
        {yLabels.map((v) => (
          <Typography key={v} sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1, textAlign: 'right' }}>
            {v.toFixed(1)}
          </Typography>
        ))}
      </Box>

      {/* Plot */}
      <Box sx={{ position: 'relative', flex: 1 }}>
        {/* gridlines */}
        <Box sx={{ position: 'absolute', inset: 0, height: H, zIndex: 0 }}>
          {yLabels.map((g) => (
            <Box
              key={g}
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${(1 - g) * 100}%`,
                borderTop: '1px dashed rgba(14,17,22,0.06)',
              }}
            />
          ))}
        </Box>

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: H,
          }}
        >
          {contentDays.map((d, i) => {
            const cFrac = d.count / max;
            const rFrac = (researchDays[i]?.count || 0) / max;
            const contentY = cFrac * H;
            const researchY = rFrac * H;
            const topY = Math.max(contentY, researchY);
            const botY = Math.min(contentY, researchY);
            const contentOnTop = contentY >= researchY;
            const highlighted = i === peak && max > 0;
            return (
              <Stack key={d.label + i} alignItems="center" sx={{ flex: 1 }}>
                <Box sx={{ position: 'relative', width: '100%', height: H, display: 'grid', placeItems: 'end center' }}>
                  {/* highlight capsule */}
                  {highlighted && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 34,
                        height: H,
                        borderRadius: '999px',
                        border: '1.5px dashed rgba(14,17,22,0.22)',
                      }}
                    />
                  )}

                  {/* connecting bar */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: botY,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 13,
                      height: Math.max(10, topY - botY),
                      borderRadius: '999px',
                      background: contentOnTop
                        ? `linear-gradient(180deg, ${INK} 0%, ${BRAND.teal} 100%)`
                        : `linear-gradient(180deg, ${BRAND.teal} 0%, ${INK} 100%)`,
                    }}
                  />

                  {/* content node (dark) */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: contentY,
                      left: '50%',
                      transform: 'translate(-50%, 50%)',
                      width: 15,
                      height: 15,
                      borderRadius: '50%',
                      bgcolor: INK,
                      border: '2.5px solid #fff',
                      boxShadow: '0 1px 4px rgba(14,17,22,0.22)',
                    }}
                  />
                  {/* research node (teal) */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: researchY,
                      left: '50%',
                      transform: 'translate(-50%, 50%)',
                      width: 15,
                      height: 15,
                      borderRadius: '50%',
                      bgcolor: BRAND.teal,
                      border: '2.5px solid #fff',
                      boxShadow: '0 1px 4px rgba(14,17,22,0.22)',
                    }}
                  />

                  {/* percent pills on the peak day */}
                  {highlighted && (
                    <>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: contentY + 4,
                          left: 'calc(50% + 14px)',
                          px: 0.85,
                          py: 0.15,
                          borderRadius: '999px',
                          bgcolor: INK,
                          color: '#fff',
                          fontSize: 10.5,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {Math.round(cFrac * 100)}%
                      </Box>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: researchY - 18,
                          left: 'calc(50% + 14px)',
                          px: 0.85,
                          py: 0.15,
                          borderRadius: '999px',
                          bgcolor: BRAND.teal,
                          color: '#fff',
                          fontSize: 10.5,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {Math.round(rFrac * 100)}%
                      </Box>
                    </>
                  )}
                </Box>
                <Typography sx={{ mt: 1.25, fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {d.label}
                </Typography>
              </Stack>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function ResourceCard({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        textDecoration: 'none',
        display: 'block',
        borderRadius: '16px',
        p: 2,
        bgcolor: '#fff',
        border: '1px solid rgba(14,17,22,0.07)',
        transition: 'transform .16s ease, box-shadow .16s ease, border-color .16s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: CARD_SHADOW,
          borderColor: 'rgba(20,187,135,0.4)',
        },
        '&:hover .res-arrow': { color: BRAND.teal, transform: 'translate(2px,-2px)' },
      }}
    >
      <Stack direction="row" alignItems="flex-start">
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '10px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(14,17,22,0.05)',
            color: INK,
            mb: 1.25,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1 }} />
        <CallMadeIcon
          className="res-arrow"
          sx={{ fontSize: 18, color: 'text.disabled', transition: 'all .16s ease' }}
        />
      </Stack>
      <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: INK }}>{title}</Typography>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{subtitle}</Typography>
    </Box>
  );
}

function SquareTile({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        textDecoration: 'none',
        flex: 1,
        borderRadius: '18px',
        p: 2,
        minHeight: 104,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.25,
        bgcolor: '#fff',
        border: '1px solid rgba(14,17,22,0.07)',
        transition: 'transform .16s ease, box-shadow .16s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: CARD_SHADOW },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'rgba(14,17,22,0.05)',
          color: INK,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 14, color: INK }}>{label}</Typography>
    </Box>
  );
}

/* ------------------------------- page ------------------------------- */

const TABS = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Research', href: '/dashboard/research' },
  { label: 'Strategy', href: '/dashboard/strategy' },
  { label: 'Calendar', href: '/dashboard/calendar' },
  { label: 'Studio', href: '/dashboard/studio' },
  { label: 'Publishing', href: '/dashboard/publishing' },
  { label: 'Analytics', href: '/dashboard/analytics' },
];

export default function OverviewPage() {
  const { activeWorkspace } = useAuth();
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [calendars, setCalendars] = useState<ContentCalendar[]>([]);
  const [windowDays, setWindowDays] = useState(7);

  useEffect(() => {
    if (!activeWorkspace) return;
    Research.list().then(setJobs).catch(() => setJobs([]));
    Strategies.list().then(setStrategies).catch(() => setStrategies([]));
    Content.list().then(setContent).catch(() => setContent([]));
    Calendar.list().then(setCalendars).catch(() => setCalendars([]));
  }, [activeWorkspace]);

  const succeeded = jobs.filter((j) => j.status === 'succeeded').length;
  const plannedEntries = useMemo(
    () => calendars.reduce((acc, c) => acc + c.entries.length, 0),
    [calendars],
  );
  const generatedEntries = useMemo(
    () => calendars.reduce((acc, c) => acc + c.entries.filter((e) => e.status === 'generated').length, 0),
    [calendars],
  );

  // Upcoming planned (un-generated) calendar entries, soonest first.
  const upNext = useMemo(() => {
    const rows: { calId: string; entry: CalendarEntry }[] = [];
    calendars.forEach((c) => {
      c.entries.forEach((e) => {
        if (e.status !== 'generated') rows.push({ calId: c.id, entry: e });
      });
    });
    rows.sort((a, b) => a.entry.date.localeCompare(b.entry.date));
    return rows.slice(0, 4);
  }, [calendars]);
  const pendingTotal = plannedEntries - generatedEntries;

  const contentCap = softCap(content.length);
  const contentPct = content.length / contentCap;
  const calendarPct = plannedEntries ? generatedEntries / plannedEntries : 0;

  const contentDays = useMemo(() => dayBuckets(content, windowDays), [content, windowDays]);
  const researchDays = useMemo(() => dayBuckets(jobs, windowDays), [jobs, windowDays]);

  return (
    <Box>
      <OnboardingChecklist
        steps={[
          {
            label: 'Run your first research',
            description: 'Let AI map your market, audience and competitors.',
            href: '/dashboard/research',
            done: jobs.length > 0,
          },
          {
            label: 'Build a strategy',
            description: 'Turn research into content pillars and a posting plan.',
            href: '/dashboard/strategy',
            done: strategies.length > 0,
          },
          {
            label: 'Create content',
            description: 'Generate on-brand posts and creatives in the studio.',
            href: '/dashboard/studio',
            done: content.length > 0,
          },
          {
            label: 'Plan your calendar',
            description: 'Schedule a steady drumbeat of posts to publish.',
            href: '/dashboard/calendar',
            done: plannedEntries > 0,
          },
        ]}
      />
      {/* header */}
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
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.12,
              fontSize: { xs: 30, md: 40 },
              maxWidth: 620,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              columnGap: 1,
              rowGap: 0.5,
            }}
          >
            <span>Plan, create</span>
            <Box
              component="span"
              sx={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'inline-grid',
                placeItems: 'center',
                border: '1.5px solid rgba(14,17,22,0.12)',
                color: 'text.secondary',
              }}
            >
              <SettingsIcon sx={{ fontSize: 19 }} />
            </Box>
            <span>&amp; publish</span>
            <Box
              component="span"
              sx={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'inline-grid',
                placeItems: 'center',
                background: BRAND.gradient,
                color: '#fff',
                boxShadow: '0 6px 16px rgba(255,175,6,0.35)',
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 19 }} />
            </Box>
            <Box
              component="span"
              sx={{
                background: BRAND.gradientText,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              on autopilot
            </Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {activeWorkspace?.name || 'Workspace'} — research, strategise, generate and ship in one loop.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Tooltip title="Brand settings">
            <IconButton
              component={Link}
              href="/dashboard/brand"
              sx={{
                width: 44,
                height: 44,
                bgcolor: '#fff',
                border: '1px solid rgba(14,17,22,0.08)',
                color: INK,
                '&:hover': { bgcolor: '#fff' },
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Button
            component={Link}
            href="/dashboard/studio"
            startIcon={<AutoAwesomeIcon />}
            sx={{
              px: 2.5,
              py: 1.25,
              borderRadius: '999px',
              fontWeight: 700,
              color: '#fff',
              background: INK,
              boxShadow: '0 8px 20px rgba(14,17,22,0.25)',
              '&:hover': { background: '#1B2330' },
            }}
          >
            Create content
          </Button>
        </Stack>
      </Stack>

      {/* tabs */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, overflowX: 'auto', pb: 0.5, px: 0.5 }}>
        {TABS.map((t, i) => (
          <Button
            key={t.href}
            component={Link}
            href={t.href}
            disableRipple
            sx={{
              flexShrink: 0,
              px: 2.25,
              py: 0.85,
              borderRadius: '999px',
              fontWeight: 600,
              fontSize: 13.5,
              textTransform: 'none',
              color: i === 0 ? '#fff' : 'text.secondary',
              bgcolor: i === 0 ? INK : 'transparent',
              border: 'none',
              '&:hover': {
                bgcolor: i === 0 ? '#1B2330' : 'rgba(14,17,22,0.05)',
                color: i === 0 ? '#fff' : INK,
              },
            }}
          >
            {t.label}
          </Button>
        ))}
      </Stack>

      {/* main layout */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 340px' },
          alignItems: 'start',
        }}
      >
        {/* left region */}
        <Stack spacing={2.5}>
          {/* metric + promo row */}
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1.05fr' },
            }}
          >
            <MetricCard
              icon={<AutoAwesomeIcon fontSize="small" />}
              label="Content created"
              value={content.length}
              cap={contentCap}
              unit="pieces"
              pct={contentPct}
              color={INK}
            />
            <MetricCard
              icon={<CalendarMonthIcon fontSize="small" />}
              label="Calendar shipped"
              value={generatedEntries}
              cap={plannedEntries || 0}
              unit="planned"
              pct={calendarPct}
              color={BRAND.teal}
              highlight
            />

            {/* promo card */}
            <Box
              sx={{
                borderRadius: CARD_RADIUS,
                p: 2.75,
                position: 'relative',
                overflow: 'hidden',
                color: '#fff',
                background: 'linear-gradient(150deg,#11151C 0%,#1C2535 100%)',
                boxShadow: CARD_SHADOW,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  background: BRAND.gradient,
                  opacity: 0.35,
                  filter: 'blur(8px)',
                }}
              />
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, zIndex: 1 }}>
                <TrendingUpIcon sx={{ color: BRAND.amber }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)' }}>
                  AUTOPILOT
                </Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800, fontSize: 21, lineHeight: 1.2, zIndex: 1, mb: 2 }}>
                Take your content to the next level
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button
                component={Link}
                href="/dashboard/strategy"
                endIcon={<PlayArrowIcon />}
                sx={{
                  alignSelf: 'flex-start',
                  px: 2.5,
                  py: 1,
                  borderRadius: '999px',
                  fontWeight: 700,
                  textTransform: 'none',
                  color: INK,
                  bgcolor: '#fff',
                  zIndex: 1,
                  '&:hover': { bgcolor: BRAND.amberSoft },
                }}
              >
                Generate a plan
              </Button>
            </Box>
          </Box>

          {/* statistics */}
          <Box
            sx={{
              borderRadius: CARD_RADIUS,
              p: 2.75,
              bgcolor: '#fff',
              border: '1px solid rgba(14,17,22,0.07)',
              boxShadow: CARD_SHADOW,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '11px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(14,17,22,0.05)',
                  color: INK,
                }}
              >
                <BarChartIcon fontSize="small" />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Activity</Typography>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ ml: 1.5 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: INK }} />
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Content</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: BRAND.teal }} />
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Research</Typography>
              </Stack>
              <Box sx={{ flex: 1 }} />
              <Select
                size="small"
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value))}
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: '999px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(14,17,22,0.12)' },
                  '& .MuiSelect-select': { py: 0.6, pl: 1.75 },
                }}
              >
                <MenuItem value={7}>Last 7 days</MenuItem>
                <MenuItem value={14}>Last 14 days</MenuItem>
                <MenuItem value={30}>Last 30 days</MenuItem>
              </Select>
            </Stack>
            <DumbbellChart contentDays={contentDays} researchDays={researchDays} />
          </Box>
        </Stack>

        {/* right rail */}
        <Stack spacing={2}>
          {/* Next up — calendar quick-action */}
          <Box
            sx={{
              borderRadius: CARD_RADIUS,
              bgcolor: '#fff',
              border: '1px solid rgba(14,17,22,0.07)',
              boxShadow: CARD_SHADOW,
              overflow: 'hidden',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 2.25, pt: 2, pb: 1.5 }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '11px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(14,17,22,0.05)',
                  color: INK,
                }}
              >
                <CalendarMonthIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>Next up</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {pendingTotal > 0 ? `${pendingTotal} planned to generate` : 'All planned posts generated'}
                </Typography>
              </Box>
              {pendingTotal > 0 && (
                <Box sx={{ px: 1, py: 0.2, borderRadius: '999px', bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontSize: 12, fontWeight: 800 }}>
                  {pendingTotal}
                </Box>
              )}
            </Stack>

            {upNext.length === 0 ? (
              <Box sx={{ px: 2.25, pb: 2.25, color: 'text.secondary' }}>
                <Typography sx={{ fontSize: 13 }}>
                  {plannedEntries === 0
                    ? 'No content calendar yet — plan your month to generate on autopilot.'
                    : 'Everything planned has been generated. Nice work!'}
                </Typography>
                <Button
                  component={Link}
                  href={plannedEntries === 0 ? '/dashboard/calendar' : '/dashboard/studio'}
                  endIcon={<CallMadeIcon sx={{ fontSize: 15 }} />}
                  sx={{ mt: 1.25, textTransform: 'none', fontWeight: 700, fontSize: 13, px: 0, color: BRAND.tealDeep, '&:hover': { bgcolor: 'transparent' } }}
                >
                  {plannedEntries === 0 ? 'Open Content Calendar' : 'Open Content Studio'}
                </Button>
              </Box>
            ) : (
              <Stack sx={{ px: 1.25, pb: 1.5 }} spacing={0.5}>
                {upNext.map(({ calId, entry }) => {
                  const d = new Date(entry.date + 'T00:00:00');
                  return (
                    <Box
                      key={entry.id}
                      component={Link}
                      href={`/dashboard/studio?mode=calendar&cal=${calId}&date=${entry.date}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        px: 1,
                        py: 1,
                        borderRadius: '14px',
                        textDecoration: 'none',
                        transition: 'background .15s ease',
                        '&:hover': { bgcolor: 'rgba(14,17,22,0.04)' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          flexShrink: 0,
                          borderRadius: '12px',
                          bgcolor: '#F4F6F8',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}
                      >
                        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                          {d.toLocaleDateString(undefined, { month: 'short' })}
                        </Typography>
                        <Typography sx={{ fontSize: 16, fontWeight: 800, color: INK }}>{d.getDate()}</Typography>
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.title}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', textTransform: 'capitalize' }}>
                          {entry.platform} · {(entry.format || entry.content_type).replace(/_/g, ' ')}
                        </Typography>
                      </Box>
                      <AutoAwesomeIcon sx={{ fontSize: 17, color: BRAND.amberDeep, flexShrink: 0 }} />
                    </Box>
                  );
                })}
                <Button
                  component={Link}
                  href="/dashboard/studio?mode=calendar"
                  fullWidth
                  sx={{ mt: 0.5, textTransform: 'none', fontWeight: 800, fontSize: 13, py: 0.9, borderRadius: '12px', color: '#fff', background: BRAND.gradient, boxShadow: '0 6px 16px rgba(255,175,6,0.28)', '&:hover': { background: `linear-gradient(135deg,${BRAND.amberDeep},${BRAND.tealDeep})` } }}
                >
                  Generate from calendar
                </Button>
              </Stack>
            )}
          </Box>

          <Stack direction="row" spacing={2}>
            <SquareTile icon={<PaletteIcon fontSize="small" />} label="Brand Brain" href="/dashboard/brand" />
            <SquareTile icon={<BarChartIcon fontSize="small" />} label="Analytics" href="/dashboard/analytics" />
          </Stack>

          <ResourceCard
            icon={<TravelExploreIcon fontSize="small" />}
            title="Insights"
            subtitle={`${jobs.length} research ${jobs.length === 1 ? 'job' : 'jobs'} · ${succeeded} done`}
            href="/dashboard/insights"
          />
          <ResourceCard
            icon={<InsightsIcon fontSize="small" />}
            title="Strategy"
            subtitle={`${strategies.length} ${strategies.length === 1 ? 'strategy' : 'strategies'} ready to use`}
            href="/dashboard/strategy"
          />
          <ResourceCard
            icon={<CalendarMonthIcon fontSize="small" />}
            title="Content Calendar"
            subtitle={`${plannedEntries} planned · ${generatedEntries} generated`}
            href="/dashboard/calendar"
          />
          <ResourceCard
            icon={<SendIcon fontSize="small" />}
            title="Publishing"
            subtitle="Review captions & ship to every channel"
            href="/dashboard/publishing"
          />
          <ResourceCard
            icon={<ScienceIcon fontSize="small" />}
            title="Research"
            subtitle="Map demand, keywords & competitors"
            href="/dashboard/research"
          />
        </Stack>
      </Box>
    </Box>
  );
}
