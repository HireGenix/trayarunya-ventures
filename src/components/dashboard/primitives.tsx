'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion } from 'framer-motion';
import { DASH, PASTEL, CARD, type PastelKey } from './tokens';

export const MotionBox = motion.create(Box);

/* ------------------------------------------------------------------ */
/* PillTabs — segmented control, black active pill + neon-green ring.  */
/* ------------------------------------------------------------------ */
export interface PillTab {
  key: string;
  label: string;
}

export function PillTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: PillTab[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <Box
      role="tablist"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        p: 0.625,
        borderRadius: 999,
        bgcolor: '#eef0ef',
        border: `1px solid ${DASH.line}`,
      }}
    >
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <Box
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            component={motion.div}
            whileTap={{ scale: 0.97 }}
            sx={{
              position: 'relative',
              cursor: 'pointer',
              px: { xs: 2, md: 3 },
              py: 1.1,
              borderRadius: 999,
              fontSize: { xs: 13.5, md: 15 },
              fontWeight: 700,
              whiteSpace: 'nowrap',
              color: active ? '#fff' : DASH.ink,
              bgcolor: active ? DASH.pillActive : 'transparent',
              border: active ? `2px solid ${DASH.neon}` : '2px solid transparent',
              boxShadow: active ? `0 0 0 4px ${DASH.neonGlow}, 0 8px 20px -8px rgba(0,0,0,0.4)` : 'none',
              transition: 'color .2s ease, background .2s ease, box-shadow .25s ease',
              '&:hover': { color: active ? '#fff' : '#000' },
            }}
          >
            {t.label}
          </Box>
        );
      })}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* IconBadge — circular pastel badge holding a line icon.             */
/* ------------------------------------------------------------------ */
export function IconBadge({
  tone = 'lavender',
  size = 56,
  children,
}: {
  tone?: PastelKey;
  size?: number;
  children: React.ReactNode;
}) {
  const p = PASTEL[tone];
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: p.bg,
        color: p.fg,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        '& svg': { fontSize: size * 0.45 },
      }}
    >
      {children}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* LearnMore — "Learn more ›" with a circular arrow chip.             */
/* ------------------------------------------------------------------ */
export function LearnMore({ label = 'Learn more', onClick }: { label?: string; onClick?: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover .lm-arrow': { bgcolor: DASH.ink, color: '#fff', transform: 'translateX(2px)' },
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: DASH.ink }}>{label}</Typography>
      <Box
        className="lm-arrow"
        sx={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: '#eef0ef',
          color: DASH.ink,
          transition: 'all .2s ease',
          '& svg': { fontSize: 15 },
        }}
      >
        <ArrowForwardIcon />
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* FeatureCard — pastel icon + heading + body + Learn more.           */
/* ------------------------------------------------------------------ */
export function FeatureCard({
  tone,
  icon,
  title,
  body,
  status,
  onLearnMore,
}: {
  tone: PastelKey;
  icon: React.ReactNode;
  title: string;
  body: string;
  status?: 'live' | 'partial' | 'soon';
  onLearnMore?: () => void;
}) {
  const statusMeta =
    status === 'partial'
      ? { label: 'Partial', color: '#e8853a', bg: '#ffe7d0' }
      : status === 'soon'
        ? { label: 'Coming soon', color: '#6d5cf0', bg: '#ece9ff' }
        : { label: 'Live', color: '#16a06a', bg: '#d8f6e6' };
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconBadge tone={tone}>{icon}</IconBadge>
        {status && (
          <Box
            sx={{
              px: 1.1,
              py: 0.4,
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.3,
              color: statusMeta.color,
              bgcolor: statusMeta.bg,
            }}
          >
            {statusMeta.label}
          </Box>
        )}
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: 19, md: 21 }, lineHeight: 1.2, color: DASH.ink }}>
        {title}
      </Typography>
      <Typography sx={{ color: DASH.body, fontSize: 14.5, lineHeight: 1.65, flex: 1 }}>{body}</Typography>
      <LearnMore onClick={onLearnMore} />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* GlassCard — rounded white panel with soft shadow.                  */
/* ------------------------------------------------------------------ */
export function GlassCard({
  children,
  hover = false,
  sx,
  ...rest
}: Omit<React.ComponentProps<typeof Box>, 'sx'> & { hover?: boolean; sx?: SxProps<Theme> }) {
  return (
    <Box
      sx={[
        {
          borderRadius: `${CARD.radius}px`,
          bgcolor: CARD.bg,
          border: CARD.border,
          boxShadow: CARD.shadow,
          transition: 'box-shadow .25s ease, transform .25s ease',
        },
        hover && { '&:hover': { boxShadow: CARD.shadowHover, transform: 'translateY(-4px)' } },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {children}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* DashSectionHeading — eyebrow + title + subtitle, centered.         */
/* ------------------------------------------------------------------ */
export function DashSectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  align?: 'center' | 'left';
}) {
  return (
    <Box sx={{ textAlign: align, maxWidth: align === 'center' ? 760 : 'none', mx: align === 'center' ? 'auto' : 0, mb: { xs: 4, md: 5 } }}>
      {eyebrow && (
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 800,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: DASH.neon,
            mb: 1.25,
          }}
        >
          {eyebrow}
        </Typography>
      )}
      <Typography sx={{ fontWeight: 800, fontSize: { xs: 26, md: 34 }, lineHeight: 1.15, color: DASH.ink, letterSpacing: '-0.02em' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ mt: 1.5, fontSize: { xs: 15, md: 16.5 }, lineHeight: 1.6, color: DASH.muted }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* SoftHero — soft gradient page header band.                         */
/* ------------------------------------------------------------------ */
export function SoftHero({
  eyebrow,
  title,
  subtitle,
  gradient,
  right,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  gradient: string;
  right?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: `${CARD.radius}px`,
        background: gradient,
        border: CARD.border,
        p: { xs: 3, md: 4.5 },
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ maxWidth: 640 }}>
        {eyebrow && (
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: DASH.ink, opacity: 0.55, mb: 1 }}>
            {eyebrow}
          </Typography>
        )}
        <Typography sx={{ fontWeight: 800, fontSize: { xs: 26, md: 36 }, lineHeight: 1.12, color: DASH.ink, letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ mt: 1.5, fontSize: { xs: 15, md: 16.5 }, lineHeight: 1.6, color: 'rgba(15,19,32,0.66)' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {right && <Box>{right}</Box>}
    </Box>
  );
}
