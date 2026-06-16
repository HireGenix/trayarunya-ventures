'use client';

import { Box, Typography } from '@mui/material';
import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { DISPLAY } from './fonts';

export const MotionBox = motion.create(Box);
export const MotionSpan = motion.create('span');

/* ------------------------------------------------------------------------ */
/* Day design tokens — the bright, airy canvas of the marketing site.        */
/* ------------------------------------------------------------------------ */
export const DAY = {
  bg: '#FFFFFF',
  bg2: '#F5F8FC',
  panel: '#FFFFFF',
  glass: 'rgba(255,255,255,0.72)',
  glassHover: '#FFFFFF',
  line: 'rgba(13,23,44,0.10)',
  lineSoft: 'rgba(13,23,44,0.06)',
  text: '#0C1424',
  sub: 'rgba(28,41,66,0.72)',
  faint: 'rgba(28,41,66,0.45)',
  amber: '#FF9D00',
  teal: '#0EA47A',
  pink: '#F43F5E',
  blue: '#2E7CF6',
  violet: '#8B5CF6',
  gradient: 'linear-gradient(135deg,#FFB52E 0%,#0EA47A 100%)',
  gradientText: 'linear-gradient(100deg,#F59E0B 0%,#FF8A00 32%,#10B380 68%,#0B8E68 100%)',
};

/** Subtle blueprint grid + vignette painted behind light sections. */
export function GridBg({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        backgroundImage: `linear-gradient(rgba(13,23,44,0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(13,23,44,0.055) 1px, transparent 1px)`,
        backgroundSize: '72px 72px',
        maskImage: 'radial-gradient(ellipse 90% 80% at 50% 40%, #000 30%, transparent 78%)',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 40%, #000 30%, transparent 78%)',
      }}
    />
  );
}

/** Soft colored glow blob for ambient section lighting. */
export function Glow({
  color,
  size = 520,
  opacity = 0.16,
  sx,
}: {
  color: string;
  size?: number;
  opacity?: number;
  sx?: object;
}) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}, transparent 66%)`,
        opacity,
        filter: 'blur(36px)',
        pointerEvents: 'none',
        ...sx,
      }}
    />
  );
}

/* ------------------------------------------------------------------------ */
/* Motion primitives                                                         */
/* ------------------------------------------------------------------------ */

/** Mouse-tracking 3D tilt card with a moving glare highlight. */
export function Tilt3D({
  children,
  max = 9,
  glare = true,
}: {
  children: ReactNode;
  max?: number;
  glare?: boolean;
}) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 18 });
  const sry = useSpring(ry, { stiffness: 160, damping: 18 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(35);
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, rgba(255,255,255,0.5), transparent 60%)`;

  return (
    <Box sx={{ perspective: '1300px' }}>
      <MotionBox
        style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' }}
        onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          rx.set(-py * max * 2);
          ry.set(px * max * 2);
          gx.set((px + 0.5) * 100);
          gy.set((py + 0.5) * 100);
        }}
        onMouseLeave={() => {
          rx.set(0);
          ry.set(0);
          gx.set(50);
          gy.set(35);
        }}
        sx={{ position: 'relative', willChange: 'transform' }}
      >
        {children}
        {glare && (
          <MotionBox
            aria-hidden
            style={{ background: glareBg }}
            sx={{ position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none', zIndex: 2 }}
          />
        )}
      </MotionBox>
    </Box>
  );
}

/** Gentle perpetual floating animation (for 3D orbs / badges). */
export function Float({
  children,
  duration = 6,
  distance = 14,
  delay = 0,
  rotate = 0,
}: {
  children: ReactNode;
  duration?: number;
  distance?: number;
  delay?: number;
  rotate?: number;
}) {
  return (
    <MotionBox
      animate={{ y: [0, -distance, 0], rotate: rotate ? [0, rotate, 0] : undefined }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {children}
    </MotionBox>
  );
}

/** Decorative 3D-shaded gradient sphere for ambient depth. */
export function Orb({ size, color, sx }: { size: number; color: string; sx?: object }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), ${color} 52%, rgba(12,20,36,0.35) 135%)`,
        boxShadow: `0 ${size / 7}px ${size / 2.4}px -${size / 8}px ${color}66`,
        filter: 'saturate(1.05)',
        ...sx,
      }}
    />
  );
}

/** A 3D-hover lift used across grid cards: perspective tilt + deep shadow. */
export const card3dSx = (shadowColor = 'rgba(12,20,36,0.22)') => ({
  transition: 'transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease, border-color .3s ease, background .3s ease',
  transformStyle: 'preserve-3d' as const,
  '&:hover': {
    transform: 'perspective(900px) translateY(-8px) rotateX(4deg) rotateY(-3deg) scale(1.015)',
    boxShadow: `0 36px 64px -28px ${shadowColor}`,
  },
});

export function Reveal({
  children,
  delay = 0,
  y = 26,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
}) {
  return (
    <MotionBox
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionBox>
  );
}

/** Per-word staggered headline reveal with 3D rise. */
export function SplitWords({
  text,
  delay = 0,
  gradientFrom,
  sx,
}: {
  text: string;
  delay?: number;
  /** Word index from which the gradient text treatment starts (inclusive). */
  gradientFrom?: number;
  sx?: object;
}) {
  const words = text.split(' ');
  return (
    <Box component="span" sx={{ display: 'inline', ...sx }}>
      {words.map((w, i) => (
        <Box
          key={`${w}-${i}`}
          component="span"
          sx={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', pb: '0.12em', mb: '-0.12em' }}
        >
          <MotionSpan
            initial={{ y: '110%', rotateX: -50, opacity: 0 }}
            animate={{ y: '0%', rotateX: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: delay + i * 0.055, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              ...(gradientFrom !== undefined && i >= gradientFrom
                ? ({
                    background: DAY.gradientText,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  } as CSSProperties)
                : {}),
            }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </MotionSpan>
        </Box>
      ))}
    </Box>
  );
}

/** Magnetic hover wrapper — the child is pulled toward the cursor. */
export function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx2 = useSpring(x, { stiffness: 180, damping: 16 });
  const sy2 = useSpring(y, { stiffness: 180, damping: 16 });
  return (
    <MotionBox
      style={{ x: sx2, y: sy2 }}
      onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      sx={{ display: 'inline-block' }}
    >
      {children}
    </MotionBox>
  );
}

/** Animated number that counts up when scrolled into view. Supports "+", "×", "/7" etc. */
export function CountUp({
  value,
  duration = 1.6,
  sx,
}: {
  /** e.g. "30+", "10×", "24/7", "5" */
  value: string;
  duration?: number;
  sx?: object;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduced = useReducedMotion();
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? parseInt(match[1], 10) : 0;
  const suffix = match ? match[2] : value;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setN(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration, reduced]);

  return (
    <Box component="span" ref={ref} sx={sx}>
      {match ? `${n}${suffix}` : value}
    </Box>
  );
}

/** Infinite horizontal marquee with edge fade masks. */
export function Marquee({
  children,
  duration = 30,
  gap = 48,
  reverse = false,
}: {
  children: ReactNode;
  duration?: number;
  gap?: number;
  reverse?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <Box
      sx={{
        overflow: 'hidden',
        width: '100%',
        maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          width: 'max-content',
          gap: `${gap}px`,
          animation: reduced ? 'none' : `marquee-x ${duration}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
          '@keyframes marquee-x': {
            from: { transform: 'translateX(0)' },
            to: { transform: 'translateX(-50%)' },
          },
        }}
      >
        <Box sx={{ display: 'flex', gap: `${gap}px`, alignItems: 'center', pr: `${gap}px` }}>{children}</Box>
        <Box aria-hidden sx={{ display: 'flex', gap: `${gap}px`, alignItems: 'center', pr: `${gap}px` }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

/** White card with a mouse-tracked spotlight + colored border sheen. */
export function SpotlightCard({
  children,
  color = DAY.teal,
  radius = 20,
  sx,
}: {
  children: ReactNode;
  color?: string;
  radius?: number;
  sx?: object;
}) {
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const spot = useMotionTemplate`radial-gradient(380px circle at ${mx}px ${my}px, ${color}14, transparent 65%)`;
  const borderSpot = useMotionTemplate`radial-gradient(240px circle at ${mx}px ${my}px, ${color}aa, transparent 70%)`;

  return (
    <MotionBox
      onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onMouseLeave={() => {
        mx.set(-200);
        my.set(-200);
      }}
      sx={{
        position: 'relative',
        borderRadius: `${radius}px`,
        background: DAY.panel,
        border: `1px solid ${DAY.line}`,
        boxShadow: '0 1px 2px rgba(12,20,36,0.04), 0 16px 40px -28px rgba(12,20,36,0.16)',
        overflow: 'hidden',
        height: '100%',
        transition: 'transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 2px 4px rgba(12,20,36,0.05), 0 28px 56px -28px rgba(12,20,36,0.22)' },
        ...sx,
      }}
    >
      {/* border sheen */}
      <MotionBox
        aria-hidden
        style={{ background: borderSpot }}
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          padding: '1px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none',
        }}
      />
      {/* inner spotlight */}
      <MotionBox aria-hidden style={{ background: spot }} sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <Box sx={{ position: 'relative', height: '100%' }}>{children}</Box>
    </MotionBox>
  );
}

/** Animated conic-gradient border frame (rotating beam). */
export function BeamBorder({
  children,
  colors = ['#FF9D00', '#0EA47A'],
  radius = 24,
  speed = 6,
  borderWidth = 1.5,
  sx,
}: {
  children: ReactNode;
  colors?: string[];
  radius?: number;
  speed?: number;
  borderWidth?: number;
  sx?: object;
}) {
  const reduced = useReducedMotion();
  const stops = colors.join(',');
  return (
    <Box sx={{ position: 'relative', borderRadius: `${radius}px`, ...sx }}>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          overflow: 'hidden',
          zIndex: 0,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '-150%',
            background: `conic-gradient(from 0deg, transparent 0 40%, ${stops}, transparent 60% 100%)`,
            animation: reduced ? 'none' : `beam-spin ${speed}s linear infinite`,
          },
          '@keyframes beam-spin': { to: { transform: 'rotate(360deg)' } },
        }}
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          borderRadius: `${radius - borderWidth}px`,
          m: `${borderWidth}px`,
          background: DAY.panel,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Shiny pill CTA with sweeping highlight. */
export const shineBtnSx = (bg = DAY.gradient): object => ({
  position: 'relative',
  overflow: 'hidden',
  px: 3.6,
  py: 1.4,
  fontWeight: 700,
  fontSize: 15,
  borderRadius: '999px',
  color: '#0E1422',
  background: bg,
  boxShadow: '0 16px 38px -16px rgba(14,164,122,0.45), 0 8px 24px -12px rgba(255,157,0,0.4)',
  transition: 'transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s ease, filter .2s ease',
  '&:hover': {
    background: bg,
    filter: 'brightness(1.05)',
    transform: 'translateY(-2px)',
    boxShadow: '0 24px 52px -18px rgba(14,164,122,0.5), 0 10px 30px -12px rgba(255,157,0,0.45)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-80%',
    width: '50%',
    height: '100%',
    background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)',
    transform: 'skewX(-20deg)',
    animation: 'btn-shine 3.2s ease-in-out infinite',
  },
  '@keyframes btn-shine': {
    '0%': { left: '-80%' },
    '55%': { left: '130%' },
    '100%': { left: '130%' },
  },
});

/** Ghost (outline) pill CTA for light surfaces. */
export const ghostBtnSx: object = {
  px: 3.6,
  py: 1.4,
  fontWeight: 700,
  fontSize: 15,
  borderRadius: '999px',
  color: DAY.text,
  border: `1px solid rgba(13,23,44,0.16)`,
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(8px)',
  transition: 'all .25s ease',
  '&:hover': {
    borderColor: 'rgba(13,23,44,0.32)',
    background: '#FFFFFF',
    transform: 'translateY(-2px)',
    boxShadow: '0 14px 30px -18px rgba(12,20,36,0.25)',
  },
};

/* ------------------------------------------------------------------------ */
/* Typography helpers                                                        */
/* ------------------------------------------------------------------------ */

export function GradientText({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        background: DAY.gradientText,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {children}
    </Box>
  );
}

export function Eyebrow({ children, color = DAY.teal }: { children: ReactNode; color?: string }) {
  return (
    <Typography
      component="div"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        fontWeight: 800,
        fontSize: 11.5,
        letterSpacing: '0.18em',
        color,
        mb: 2,
        textTransform: 'uppercase',
        px: 1.6,
        py: 0.65,
        borderRadius: 999,
        border: `1px solid ${color}33`,
        background: `${color}0d`,
        '&::before': {
          content: '""',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}66`,
          animation: 'eyebrow-pulse 2.4s ease-in-out infinite',
        },
        '@keyframes eyebrow-pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.35 },
        },
      }}
    >
      {children}
    </Typography>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  eyebrowColor,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  eyebrowColor?: string;
}) {
  return (
    <Box
      sx={{
        textAlign: align,
        maxWidth: align === 'center' ? 800 : 660,
        mx: align === 'center' ? 'auto' : 0,
        mb: { xs: 6, md: 8 },
        position: 'relative',
        zIndex: 1,
      }}
    >
      {eyebrow && (
        <Reveal>
          <Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <Typography
          variant="h2"
          sx={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '2.9rem' },
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            color: DAY.text,
          }}
        >
          {title}
        </Typography>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.1}>
          <Typography
            sx={{
              mt: 2.25,
              fontSize: { xs: '1rem', md: '1.13rem' },
              lineHeight: 1.7,
              color: DAY.sub,
              maxWidth: 700,
              mx: align === 'center' ? 'auto' : 0,
            }}
          >
            {subtitle}
          </Typography>
        </Reveal>
      )}
    </Box>
  );
}

/** Shared style for light device/window mock chrome. */
export const mockWindowSx: CSSProperties = {
  borderRadius: 18,
  overflow: 'hidden',
  background: 'linear-gradient(180deg, #FFFFFF, #F8FBFE)',
  border: `1px solid ${DAY.line}`,
  boxShadow: '0 40px 90px -40px rgba(12,20,36,0.3), 0 0 0 1px rgba(255,255,255,0.7) inset',
};
