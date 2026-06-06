'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TravelExploreOutlinedIcon from '@mui/icons-material/TravelExploreOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DeckSlide, DeckTheme } from '@/lib/api';
/* Controlled icon vocabulary — keep in sync with deck_designer.ICON_VOCAB. */
const ICONS: Record<string, SvgIconComponent> = {
  brain: PsychologyOutlinedIcon,
  shield: ShieldOutlinedIcon,
  chart: InsightsOutlinedIcon,
  bolt: BoltOutlinedIcon,
  check: CheckCircleOutlineIcon,
  cost: SavingsOutlinedIcon,
  money: PaidOutlinedIcon,
  users: GroupsOutlinedIcon,
  building: ApartmentOutlinedIcon,
  rocket: RocketLaunchOutlinedIcon,
  doc: DescriptionOutlinedIcon,
  search: TravelExploreOutlinedIcon,
  gear: SettingsOutlinedIcon,
  target: TrackChangesOutlinedIcon,
  idea: LightbulbOutlinedIcon,
  globe: PublicOutlinedIcon,
  lock: LockOutlinedIcon,
  clock: ScheduleOutlinedIcon,
  star: AutoAwesomeOutlinedIcon,
  graph: ShowChartOutlinedIcon,
  layers: LayersOutlinedIcon,
  flow: AccountTreeOutlinedIcon,
};

function iconFor(name: unknown): SvgIconComponent {
  return ICONS[String(name || '').toLowerCase()] || CheckCircleOutlineIcon;
}

/* Render a matrix cell value as a ✓ / ✗ / – chip or short text. */
function MatrixCell({ value, color }: { value: string; color: string }) {
  const v = value.trim().toLowerCase();
  const yes = ['yes', 'y', '✓', 'true', 'full'].includes(v);
  const no = ['no', 'n', '✗', 'x', 'false', 'none'].includes(v);
  const partial = ['partial', 'limited', 'basic', 'some'].includes(v);
  if (yes) return <CheckCircleIcon sx={{ fontSize: '2.1cqw', color }} />;
  if (no) return <CancelIcon sx={{ fontSize: '2.1cqw', color: '#D14343' }} />;
  if (partial) return <RemoveCircleOutlineIcon sx={{ fontSize: '2.1cqw', color: '#C98A00' }} />;
  return <Typography sx={{ fontSize: '1.45cqw', color: 'rgba(0,0,0,0.72)', lineHeight: 1.25 }}>{value}</Typography>;
}

/* ------------------------------------------------------------------ */
/* Theme helpers                                                       */
/* ------------------------------------------------------------------ */
type ResolvedTheme = {
  primary: string;
  accent: string;
  ink: string;
  brandName: string;
  logoUrl: string;
  style: string;
};

function resolveTheme(theme?: DeckTheme | null): ResolvedTheme {
  return {
    primary: theme?.primary || '#14BB87',
    accent: theme?.accent || '#0FA874',
    ink: theme?.ink || '#0B1B16',
    brandName: theme?.brand_name || '',
    logoUrl: theme?.logo_url || '',
    style: theme?.style || 'modern',
  };
}

function gradient(t: ResolvedTheme): string {
  if (t.style === 'minimal') return t.ink;
  return `linear-gradient(135deg, ${t.primary} 0%, ${t.accent} 100%)`;
}

const S = (v: unknown): string => (v == null ? '' : String(v));
const A = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function shortUrl(url: string, limit = 42): string {
  if (!url) return '';
  let s = url;
  try {
    const u = new URL(url);
    s = u.hostname.replace(/^www\./, '') + (u.pathname && u.pathname !== '/' ? u.pathname : '');
  } catch {
    s = url.replace(/^https?:\/\//, '');
  }
  return s.length > limit ? `${s.slice(0, limit - 1)}…` : s;
}

/* ------------------------------------------------------------------ */
/* Single slide renderer — 16:9, brand-themed                          */
/* ------------------------------------------------------------------ */
export function Slide({
  slide,
  theme,
  index,
  total,
  editable = false,
  onPatch,
}: {
  slide: DeckSlide;
  theme?: DeckTheme | null;
  index?: number;
  total?: number;
  /** When true, prominent text fields become click-to-edit on the slide. */
  editable?: boolean;
  /** Receives a dot-path (e.g. "title", "bullets.0.heading") and the new value. */
  onPatch?: (path: string, value: string) => void;
}) {
  const t = resolveTheme(theme);
  const d = slide.data || {};
  const layout = slide.layout;
  const dark = layout === 'cover' || layout === 'section' || layout === 'cta' || layout === 'image';
  const imageUrl = S((d as Record<string, unknown>).image_url);
  const onDark = dark || Boolean(imageUrl);
  const sources = A((d as Record<string, unknown>).sources) as Array<Record<string, unknown>>;

  /* Inline click-to-edit text. Renders a plain Typography in read mode; in edit
     mode it becomes a contentEditable that commits on blur / Enter via onPatch.
     Edits never fire mid-keystroke, so focus and caret are preserved. */
  const et = (
    path: string,
    value: string,
    sx?: Record<string, unknown>,
    component: React.ElementType = 'div',
  ): React.ReactNode => {
    if (!editable || !onPatch) {
      return <Typography component={component} sx={sx}>{value}</Typography>;
    }
    return (
      <Typography
        component={component}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-ce="1"
        onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
        onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            (e.currentTarget as HTMLElement).blur();
          }
        }}
        onBlur={(e: React.FocusEvent<HTMLElement>) => {
          const txt = (e.currentTarget.textContent || '').replace(/\u00a0/g, ' ').trim();
          if (txt !== value) onPatch(path, txt);
        }}
        sx={{
          ...sx,
          cursor: 'text',
          outline: 'none',
          borderRadius: '4px',
          transition: 'box-shadow .12s ease, background-color .12s ease',
          '&:hover': { boxShadow: `inset 0 0 0 1.5px ${t.accent}55` },
          '&:focus': { boxShadow: `inset 0 0 0 1.5px ${t.accent}`, backgroundColor: `${t.accent}14` },
        }}
      >
        {value}
      </Typography>
    );
  };

  const brandMark = t.logoUrl ? (
    <Box
      component="img"
      src={t.logoUrl}
      alt={t.brandName || 'logo'}
      sx={{
        height: '3cqw',
        maxWidth: '22cqw',
        objectFit: 'contain',
        objectPosition: 'left center',
        filter: onDark ? 'brightness(0) invert(1)' : 'none',
        opacity: onDark ? 0.95 : 0.85,
      }}
    />
  ) : (
    <Typography sx={{ fontSize: '1.05cqw', fontWeight: 700, letterSpacing: 0.4 }}>
      {t.brandName}
    </Typography>
  );

  const sourceFootnote = sources.length ? (
    <Typography
      sx={{
        position: 'absolute',
        right: '5%',
        bottom: '8.5%',
        maxWidth: '60%',
        textAlign: 'right',
        fontSize: '0.95cqw',
        color: onDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.4)',
        lineHeight: 1.3,
      }}
    >
      Sources: {sources
        .slice(0, 3)
        .map((s) => shortUrl(S(s.url)))
        .filter(Boolean)
        .join('  ·  ')}
    </Typography>
  ) : null;

  const footer = (t.brandName || t.logoUrl) ? (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{
        position: 'absolute',
        left: '5%',
        right: '5%',
        bottom: '4.5%',
        color: onDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.45)',
      }}
    >
      {brandMark}
      {index != null && total != null && (
        <Typography sx={{ fontSize: '1.05cqw', fontWeight: 600 }}>
          {index + 1} / {total}
        </Typography>
      )}
    </Stack>
  ) : null;

  let body: React.ReactNode = null;

  if (dark) {
    const eyebrow = S(d.eyebrow) || (layout === 'cta' ? "LET'S TALK" : '');
    body = (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: layout === 'image' ? 'flex-end' : 'center',
          px: '7%',
          pb: layout === 'image' ? '8%' : 0,
          color: '#fff',
        }}
      >
        {eyebrow && et('eyebrow', eyebrow, {
          fontSize: '1.6cqw',
          fontWeight: 800,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.92)',
          mb: '1.6cqw',
        })}
        {et('title', S(d.title), {
          fontSize: layout === 'cover' ? '5.4cqw' : '4.6cqw',
          fontWeight: 900,
          lineHeight: 1.04,
          letterSpacing: '-0.02em',
          maxWidth: '92%',
        })}
        {Boolean(d.subtitle || d.body) && et('subtitle', S(d.subtitle || d.body), {
          fontSize: '2.2cqw',
          fontWeight: 400,
          mt: '2.4cqw',
          maxWidth: '82%',
          color: 'rgba(255,255,255,0.92)',
          lineHeight: 1.4,
        })}
        {layout === 'cta' && Boolean(d.cta) && (
          <Box
            sx={{
              mt: '3.4cqw',
              alignSelf: 'flex-start',
              px: '3cqw',
              py: '1.4cqw',
              borderRadius: 999,
              bgcolor: '#fff',
              color: t.primary,
              fontWeight: 800,
              fontSize: '1.9cqw',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            {et('cta', S(d.cta), { display: 'inline' }, 'span')} →
          </Box>
        )}
      </Box>
    );
  } else {
    /* Light content slide: accent rail + title header + layout body */
    const header = (
      <Box sx={{ px: '7%', pt: '6.5%' }}>
        {Boolean(d.title) && et('title', S(d.title), {
          fontSize: '3.4cqw',
          fontWeight: 900,
          color: t.ink,
          lineHeight: 1.08,
          letterSpacing: '-0.015em',
        })}
        {Boolean(d.subtitle) && et('subtitle', S(d.subtitle), {
          fontSize: '1.9cqw', color: 'rgba(0,0,0,0.55)', mt: '1cqw',
        })}
      </Box>
    );

    let inner: React.ReactNode = null;

    /* Auto-fit: shrink type + spacing as a slide gets denser so content always
       fits the 16:9 canvas instead of being clipped. */
    const leftItems = A((d.left as Record<string, unknown> | undefined)?.items);
    const rightItems = A((d.right as Record<string, unknown> | undefined)?.items);
    const rowCount =
      layout === 'agenda' ? A(d.items).length :
      layout === 'bullets' ? A(d.bullets).length :
      layout === 'timeline' ? A(d.steps).length :
      layout === 'process' ? Math.ceil(A(d.steps).length / 3) + 2 :
      layout === 'cards' ? Math.ceil(A(d.cards).length / 3) * 2 + 1 :
      layout === 'comparison_matrix' ? A(d.rows).length + 1 :
      (layout === 'two_column' || layout === 'comparison')
        ? Math.max(leftItems.length, rightItems.length) + 2 :
      0;
    const sideImgActive = (layout === 'agenda' || layout === 'bullets') && Boolean(imageUrl);
    let k = rowCount >= 6 ? 0.74 : rowCount === 5 ? 0.83 : rowCount === 4 ? 0.92 : 1;
    if (sideImgActive) k *= 0.9; // narrower text column when a side photo is shown
    const u = (v: number) => `${(v * k).toFixed(2)}cqw`;

    if (layout === 'agenda') {
      inner = (
        <Stack spacing={u(1.6)} sx={{ px: '7%', mt: u(3) }}>
          {A(d.items).map((it, i) => (
            <Stack key={i} direction="row" spacing="2cqw" alignItems="center">
              <Box
                sx={{
                  width: u(4),
                  height: u(4),
                  borderRadius: 2,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: gradient(t),
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: u(1.8),
                }}
              >
                {i + 1}
              </Box>
              {et(`items.${i}`, S(it), { fontSize: u(2.3), fontWeight: 600, color: t.ink, lineHeight: 1.25 })}
            </Stack>
          ))}
        </Stack>
      );
    } else if (layout === 'bullets') {
      inner = (
        <Stack spacing={u(2)} sx={{ px: '7%', mt: u(3.2) }}>
          {A(d.bullets).map((b, i) => {
            const obj = (b || {}) as Record<string, unknown>;
            return (
              <Stack key={i} direction="row" spacing="1.8cqw" alignItems="flex-start">
                <Box
                  sx={{
                    mt: u(0.6),
                    width: u(1.6),
                    height: u(1.6),
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: gradient(t),
                  }}
                />
                <Box>
                  {et(`bullets.${i}.heading`, S(obj.heading), { fontSize: u(2.2), fontWeight: 800, color: t.ink, lineHeight: 1.2 })}
                  {obj.body ? et(`bullets.${i}.body`, S(obj.body), { fontSize: u(1.75), color: 'rgba(0,0,0,0.6)', mt: '0.4cqw', lineHeight: 1.4 }) : null}
                </Box>
              </Stack>
            );
          })}
        </Stack>
      );
    } else if (layout === 'two_column' || layout === 'comparison') {
      const cols: Array<[string, ResolvedTheme['primary']]> = [
        ['left', t.primary],
        ['right', t.accent],
      ];
      inner = (
        <Stack direction="row" spacing="3%" sx={{ px: '7%', mt: u(2.8) }}>
          {cols.map(([key, color]) => {
            const col = (d[key] || {}) as Record<string, unknown>;
            return (
              <Box
                key={key}
                sx={{
                  flex: 1,
                  borderRadius: '1.4cqw',
                  p: u(2.6),
                  bgcolor: 'rgba(0,0,0,0.025)',
                  borderTop: `0.6cqw solid ${color}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                {et(`${key}.heading`, S(col.heading), { fontSize: u(2.2), fontWeight: 800, color: t.ink, mb: u(1) })}
                {col.body ? et(`${key}.body`, S(col.body), { fontSize: u(1.7), color: 'rgba(0,0,0,0.62)', lineHeight: 1.45, mb: u(1) }) : null}
                <Stack spacing={u(0.9)}>
                  {A(col.items).map((it, i) => (
                    <Stack key={i} direction="row" spacing="1cqw" alignItems="flex-start">
                      <Box sx={{ color, fontWeight: 900, fontSize: u(1.7), lineHeight: 1.3 }}>•</Box>
                      {et(`${key}.items.${i}`, S(it), { fontSize: u(1.7), color: t.ink, lineHeight: 1.35 })}
                    </Stack>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      );
    } else if (layout === 'stats') {
      const stats = A(d.stats);
      inner = (
        <Stack direction="row" spacing="2.5%" sx={{ px: '7%', mt: '4cqw' }}>
          {stats.map((s, i) => {
            const obj = (s || {}) as Record<string, unknown>;
            return (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '1.6cqw',
                  p: '2.6cqw 2cqw',
                  textAlign: 'center',
                  bgcolor: '#fff',
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '0.7cqw',
                    background: gradient(t),
                  }}
                />
                <Typography
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    right: '0.6cqw',
                    bottom: '-1.6cqw',
                    fontSize: '7cqw',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: t.primary,
                    opacity: 0.06,
                  }}
                >
                  {i + 1}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '5.4cqw',
                    fontWeight: 900,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    background: gradient(t),
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {S(obj.value)}
                </Typography>
                <Box
                  sx={{
                    width: '3.4cqw',
                    height: '0.4cqw',
                    borderRadius: 999,
                    mx: 'auto',
                    my: '1.2cqw',
                    background: gradient(t),
                    opacity: 0.8,
                  }}
                />
                {et(`stats.${i}.label`, S(obj.label), { fontSize: '1.55cqw', fontWeight: 600, color: 'rgba(0,0,0,0.62)', lineHeight: 1.35 })}
              </Box>
            );
          })}
        </Stack>
      );
    } else if (layout === 'timeline') {
      const steps = A(d.steps);
      inner = (
        <Stack direction="row" spacing="1.5%" sx={{ px: '7%', mt: u(3.6), alignItems: 'flex-start' }}>
          {steps.map((s, i) => {
            const obj = (s || {}) as Record<string, unknown>;
            return (
              <Box key={i} sx={{ flex: 1, position: 'relative' }}>
                {i < steps.length - 1 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '1.9cqw',
                      left: '50%',
                      right: '-50%',
                      height: '0.4cqw',
                      bgcolor: t.accent,
                      opacity: 0.4,
                    }}
                  />
                )}
                <Box
                  sx={{
                    width: '4cqw',
                    height: '4cqw',
                    borderRadius: '50%',
                    background: gradient(t),
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.9cqw',
                    position: 'relative',
                    zIndex: 1,
                    mb: '1.4cqw',
                  }}
                >
                  {i + 1}
                </Box>
                <Typography sx={{ fontSize: u(1.9), fontWeight: 800, color: t.ink, lineHeight: 1.2 }}>
                  {S(obj.label)}
                </Typography>
                {obj.body ? (
                  <Typography sx={{ fontSize: u(1.5), color: 'rgba(0,0,0,0.6)', mt: '0.6cqw', lineHeight: 1.4 }}>
                    {S(obj.body)}
                  </Typography>
                ) : null}
              </Box>
            );
          })}
        </Stack>
      );
    } else if (layout === 'cards') {
      const cards = A(d.cards);
      const cols = cards.length <= 4 ? 2 : 3;
      inner = (
        <Box
          sx={{
            px: '7%',
            mt: u(2.4),
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: u(2),
          }}
        >
          {cards.map((c, i) => {
            const obj = (c || {}) as Record<string, unknown>;
            const Ico = iconFor(obj.icon);
            return (
              <Box
                key={i}
                sx={{
                  borderRadius: '1.4cqw',
                  p: u(2.2),
                  bgcolor: `${t.primary}0D`,
                  border: `0.12cqw solid ${t.primary}26`,
                }}
              >
                <Box
                  sx={{
                    width: u(4.4),
                    height: u(4.4),
                    borderRadius: '1cqw',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: gradient(t),
                    mb: u(1.2),
                  }}
                >
                  <Ico sx={{ fontSize: u(2.6), color: '#fff' }} />
                </Box>
                <Typography sx={{ fontSize: u(2), fontWeight: 800, color: t.ink, lineHeight: 1.2 }}>
                  {S(obj.heading)}
                </Typography>
                {obj.body ? (
                  <Typography sx={{ fontSize: u(1.55), color: 'rgba(0,0,0,0.62)', mt: u(0.6), lineHeight: 1.4 }}>
                    {S(obj.body)}
                  </Typography>
                ) : null}
              </Box>
            );
          })}
        </Box>
      );
    } else if (layout === 'process') {
      const steps = A(d.steps);
      inner = (
        <Box sx={{ px: '7%', mt: u(2.8), display: 'flex', flexWrap: 'wrap', gap: u(1.4) }}>
          {steps.map((s, i) => {
            const obj = (s || {}) as Record<string, unknown>;
            const Ico = iconFor(obj.icon);
            return (
              <Stack
                key={i}
                direction="row"
                alignItems="center"
                spacing="1cqw"
                sx={{
                  flex: '1 1 30%',
                  minWidth: '26%',
                  position: 'relative',
                  borderRadius: '1cqw',
                  p: u(1.5),
                  bgcolor: `${t.primary}0A`,
                  border: `0.1cqw solid ${t.primary}1F`,
                }}
              >
                <Box
                  sx={{
                    width: u(4),
                    height: u(4),
                    flexShrink: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: gradient(t),
                  }}
                >
                  <Ico sx={{ fontSize: u(2.2), color: '#fff' }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing="0.6cqw" alignItems="baseline">
                    <Typography sx={{ fontSize: u(1.35), fontWeight: 800, color: t.accent }}>
                      {String(i + 1).padStart(2, '0')}
                    </Typography>
                    <Typography sx={{ fontSize: u(1.85), fontWeight: 800, color: t.ink, lineHeight: 1.15 }}>
                      {S(obj.heading)}
                    </Typography>
                  </Stack>
                  {obj.body ? (
                    <Typography sx={{ fontSize: u(1.45), color: 'rgba(0,0,0,0.6)', mt: u(0.3), lineHeight: 1.35 }}>
                      {S(obj.body)}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            );
          })}
        </Box>
      );
    } else if (layout === 'comparison_matrix') {
      const columns = A(d.columns).map(S);
      const rows = A(d.rows);
      const ncols = columns.length;
      inner = (
        <Box sx={{ px: '6%', mt: u(2) }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: `1.4fr repeat(${Math.max(1, ncols - 1)}, 1fr)` }}>
            {columns.map((c, ci) => (
              <Box
                key={`h-${ci}`}
                sx={{
                  px: u(1),
                  py: u(1.1),
                  borderBottom: `0.2cqw solid ${t.primary}`,
                  textAlign: ci === 0 ? 'left' : 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: u(1.5),
                    fontWeight: 800,
                    color: ci === 1 ? t.primary : t.ink,
                    lineHeight: 1.15,
                  }}
                >
                  {c}
                </Typography>
              </Box>
            ))}
            {rows.map((r, ri) => {
              const obj = (r || {}) as Record<string, unknown>;
              const cells = A(obj.cells).map(S);
              const isUs = ri === 0;
              return (
                <Box key={`r-${ri}`} sx={{ display: 'contents' }}>
                  <Box
                    sx={{
                      px: u(1),
                      py: u(0.9),
                      bgcolor: isUs ? `${t.primary}12` : ri % 2 ? 'rgba(0,0,0,0.02)' : 'transparent',
                      borderBottom: '0.06cqw solid rgba(0,0,0,0.07)',
                    }}
                  >
                    <Typography sx={{ fontSize: u(1.45), fontWeight: isUs ? 800 : 600, color: t.ink, lineHeight: 1.2 }}>
                      {S(obj.label)}
                    </Typography>
                  </Box>
                  {Array.from({ length: Math.max(1, ncols - 1) }).map((_, ci) => (
                    <Box
                      key={`c-${ri}-${ci}`}
                      sx={{
                        px: u(0.6),
                        py: u(0.9),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        bgcolor: isUs ? `${t.primary}12` : ri % 2 ? 'rgba(0,0,0,0.02)' : 'transparent',
                        borderBottom: '0.06cqw solid rgba(0,0,0,0.07)',
                      }}
                    >
                      <MatrixCell value={S(cells[ci])} color={t.primary} />
                    </Box>
                  ))}
                </Box>
              );
            })}
          </Box>
        </Box>
      );
    } else if (layout === 'chart') {
      const chartType = S(d.chart_type || 'bar').toLowerCase();
      const seriesData = A(d.series) as Array<Record<string, unknown>>;
      const labels = A(d.labels);

      const chartData = labels.map((label, i) => {
        const point: Record<string, unknown> = { name: S(label) };
        seriesData.forEach((s, si) => {
          const key = S(s.name) || `s${si}`;
          point[key] = A(s.values)[i] ?? 0;
        });
        return point;
      });

      const CHART_COLORS = [
        t.primary,
        t.accent,
        '#6B7280',
        '#3B82F6',
        '#F59E0B',
        '#EF4444',
      ];

      inner = (
        <Box sx={{ px: '7%', mt: u(2), flex: 1, minHeight: 0, height: '38cqw' }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={chartData.map((pt, i) => ({
                    name: pt.name,
                    value: A(seriesData[0]?.values)[i] ?? 0,
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.ink + '22'} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: t.ink }} />
                <YAxis tick={{ fontSize: 12, fill: t.ink }} />
                <Tooltip />
                {seriesData.length > 1 && <Legend />}
                {seriesData.map((s, i) => {
                  const key = S(s.name) || `s${i}`;
                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  );
                })}
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.ink + '22'} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: t.ink }} />
                <YAxis tick={{ fontSize: 12, fill: t.ink }} />
                <Tooltip />
                {seriesData.length > 1 && <Legend />}
                {seriesData.map((s, i) => {
                  const key = S(s.name) || `s${i}`;
                  return (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={0.3}
                    />
                  );
                })}
              </AreaChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.ink + '22'} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: t.ink }} />
                <YAxis tick={{ fontSize: 12, fill: t.ink }} />
                <Tooltip />
                {seriesData.length > 1 && <Legend />}
                {seriesData.map((s, i) => {
                  const key = S(s.name) || `s${i}`;
                  return (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  );
                })}
              </BarChart>
            )}
          </ResponsiveContainer>
        </Box>
      );
    } else if (layout === 'references') {
      const items = A(d.items);
      inner = (
        <Box
          sx={{
            px: '7%',
            mt: '3cqw',
            display: 'grid',
            gridTemplateColumns: items.length > 5 ? '1fr 1fr' : '1fr',
            columnGap: '4%',
            rowGap: '1.6cqw',
          }}
        >
          {items.map((it, i) => {
            const obj = (it || {}) as Record<string, unknown>;
            const url = S(obj.url);
            return (
              <Stack key={i} direction="row" spacing="1.4cqw" alignItems="flex-start">
                <Box
                  sx={{
                    mt: '0.4cqw',
                    minWidth: '2.6cqw',
                    height: '2.6cqw',
                    px: '0.6cqw',
                    borderRadius: 1,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: gradient(t),
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '1.3cqw',
                  }}
                >
                  {i + 1}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '1.7cqw', fontWeight: 700, color: t.ink, lineHeight: 1.25 }}>
                    {S(obj.label) || shortUrl(url, 60)}
                  </Typography>
                  {url ? (
                    <Typography sx={{ fontSize: '1.3cqw', color: t.accent, lineHeight: 1.3, wordBreak: 'break-all' }}>
                      {shortUrl(url, 64)}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            );
          })}
        </Box>
      );
    } else if (layout === 'quote') {
      const onImg = Boolean(imageUrl);
      return (
        <SlideCanvas
          bg="#fff"
          railColor={onImg ? undefined : t.primary}
          bgImage={imageUrl || undefined}
          overlay={onImg ? `linear-gradient(120deg, ${t.ink}F2 0%, ${t.ink}B3 100%)` : undefined}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              px: '10%',
            }}
          >
            <Typography sx={{ fontSize: '9cqw', lineHeight: 0.6, color: t.accent, fontWeight: 900 }}>
              “
            </Typography>
            {et('quote', S(d.quote), {
              fontSize: '3.2cqw',
              fontWeight: 800,
              color: onImg ? '#fff' : t.ink,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            })}
            {Boolean(d.attribution) && (
              <Typography sx={{ fontSize: '1.9cqw', fontWeight: 700, color: onImg ? 'rgba(255,255,255,0.92)' : t.accent, mt: '2.4cqw' }}>
                — {et('attribution', S(d.attribution), { display: 'inline' }, 'span')}
              </Typography>
            )}
          </Box>
          {footer}
        </SlideCanvas>
      );
    }

    const calloutText = S((d as Record<string, unknown>).callout);
    const calloutBox = calloutText ? (
      <Stack
        direction="row"
        spacing="1.2cqw"
        alignItems="flex-start"
        sx={{
          mx: '7%',
          mt: u(2),
          px: u(1.8),
          py: u(1.3),
          borderRadius: '1cqw',
          bgcolor: `${t.accent}1A`,
          border: `0.1cqw solid ${t.accent}40`,
        }}
      >
        <LightbulbOutlinedIcon sx={{ fontSize: u(2.1), color: t.accent, mt: '0.1cqw', flexShrink: 0 }} />
        <Typography sx={{ fontSize: u(1.55), fontWeight: 600, color: t.ink, lineHeight: 1.4 }}>
          {calloutText}
        </Typography>
      </Stack>
    ) : null;

    body = (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pb: '7%',
        }}
      >
        {header}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {inner}
          {calloutBox}
        </Box>
      </Box>
    );

    const sideImg = (layout === 'agenda' || layout === 'bullets') && Boolean(imageUrl);

    return (
      <SlideCanvas
        bg={`linear-gradient(135deg, #ffffff 0%, ${t.primary}0A 100%)`}
        railColor={t.primary}
        decor={t}
      >
        {sideImg ? (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex' }}>
            <Box sx={{ flex: '0 0 62%', position: 'relative', minWidth: 0 }}>{body}</Box>
            <Box
              sx={{
                flex: '0 0 38%',
                position: 'relative',
                m: '3cqw 3cqw 6cqw 0',
                borderRadius: '1.8cqw',
                overflow: 'hidden',
                backgroundImage: `url("${imageUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 16px 40px rgba(0,0,0,0.16)',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(160deg, ${t.primary}1A 0%, transparent 40%, ${t.ink}26 100%)`,
                }}
              />
            </Box>
          </Box>
        ) : (
          body
        )}
        {sourceFootnote}
        {footer}
      </SlideCanvas>
    );
  }

  return (
    <SlideCanvas
      bg={gradient(t)}
      accentBar={t.accent}
      bgImage={imageUrl || undefined}
      overlay={
        imageUrl
          ? (layout === 'image'
              ? `linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.10) 45%, ${t.ink}E6 100%)`
              : `linear-gradient(115deg, ${t.primary}F2 0%, ${t.accent}CC 55%, rgba(0,0,0,0.45) 100%)`)
          : undefined
      }
    >
      {body}
      {sourceFootnote}
      {footer}
    </SlideCanvas>
  );
}

/* 16:9 container that scales text via container query units (cqw). */
function SlideCanvas({
  children,
  bg,
  railColor,
  accentBar,
  bgImage,
  overlay,
  decor,
}: {
  children: React.ReactNode;
  bg: string;
  railColor?: string;
  accentBar?: string;
  bgImage?: string;
  overlay?: string;
  decor?: ResolvedTheme;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        background: bg,
        borderRadius: 3,
        overflow: 'hidden',
        containerType: 'inline-size',
        boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
      }}
    >
      {decor && (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: '-18cqw',
              right: '-12cqw',
              width: '46cqw',
              height: '46cqw',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${decor.primary}1F 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: '-16cqw',
              left: '-10cqw',
              width: '34cqw',
              height: '34cqw',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${decor.accent}1A 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
        </>
      )}
      {bgImage && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${bgImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      {bgImage && (
        <Box sx={{ position: 'absolute', inset: 0, background: overlay || 'rgba(0,0,0,0.35)' }} />
      )}
      {railColor && (
        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '0.9cqw', bgcolor: railColor }} />
      )}
      {accentBar && (
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '1cqw', bgcolor: accentBar }} />
      )}
      {children}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Full-screen present mode                                            */
/* ------------------------------------------------------------------ */
export function PresentMode({
  slides,
  theme,
  startIndex = 0,
  onClose,
}: {
  slides: DeckSlide[];
  theme?: DeckTheme | null;
  startIndex?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);
  const total = slides.length;

  const go = useCallback(
    (delta: number) => setI((prev) => Math.max(0, Math.min(total - 1, prev + delta))),
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  if (!total) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        bgcolor: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 1, md: 4 },
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,0.7)' }}
      >
        <CloseIcon />
      </IconButton>

      <IconButton
        onClick={() => go(-1)}
        disabled={i === 0}
        sx={{ position: 'absolute', left: 12, color: 'rgba(255,255,255,0.6)', '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)' } }}
      >
        <ChevronLeftIcon sx={{ fontSize: 44 }} />
      </IconButton>

      <Box sx={{ width: '100%', maxWidth: '1500px' }}>
        <Slide slide={slides[i]} theme={theme} index={i} total={total} />
      </Box>

      <IconButton
        onClick={() => go(1)}
        disabled={i === total - 1}
        sx={{ position: 'absolute', right: 12, color: 'rgba(255,255,255,0.6)', '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)' } }}
      >
        <ChevronRightIcon sx={{ fontSize: 44 }} />
      </IconButton>

      <Typography
        sx={{ position: 'absolute', bottom: 16, color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 600 }}
      >
        {i + 1} / {total} · ← → to navigate · Esc to exit
      </Typography>
    </Box>
  );
}

export function PresenterView({
  slides,
  theme,
  startIndex = 0,
  onClose,
}: {
  slides: DeckSlide[];
  theme?: DeckTheme | null;
  startIndex?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);
  const [elapsed, setElapsed] = useState(0);
  const total = slides.length;

  const go = useCallback(
    (delta: number) => setI((prev) => Math.max(0, Math.min(total - 1, prev + delta))),
    [total],
  );

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!total) return null;

  const currentSlide = slides[i];
  const nextSlide = i < total - 1 ? slides[i + 1] : null;
  const notes = currentSlide?.speaker_notes || '';

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        bgcolor: '#111',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
          Presenter View
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography sx={{ color: '#14BB87', fontWeight: 800, fontSize: 20, fontFamily: 'monospace' }}>
            {formatTime(elapsed)}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 600 }}>
            {i + 1} / {total}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', p: 2, gap: 2 }}>
        {/* Left: Current slide */}
        <Box sx={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: 960 }}>
              <Slide slide={currentSlide} theme={theme} index={i} total={total} />
            </Box>
          </Box>

          {/* Navigation buttons */}
          <Stack direction="row" justifyContent="center" spacing={2}>
            <IconButton
              onClick={() => go(-1)}
              disabled={i === 0}
              sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)' } }}
            >
              <ChevronLeftIcon sx={{ fontSize: 32 }} />
            </IconButton>
            <IconButton
              onClick={() => go(1)}
              disabled={i === total - 1}
              sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)' } }}
            >
              <ChevronRightIcon sx={{ fontSize: 32 }} />
            </IconButton>
          </Stack>
        </Box>

        {/* Right: Next slide preview + Notes */}
        <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          {/* Next slide preview */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
              Next slide
            </Typography>
            {nextSlide ? (
              <Box sx={{ opacity: 0.7, borderRadius: 1, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Slide slide={nextSlide} theme={theme} index={i + 1} total={total} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, borderRadius: 1, border: '1px dashed rgba(255,255,255,0.15)' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>End of deck</Typography>
              </Box>
            )}
          </Box>

          {/* Speaker notes */}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
              Speaker notes
            </Typography>
            {notes ? (
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {notes}
              </Typography>
            ) : (
              <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontStyle: 'italic' }}>
                No notes for this slide.
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
