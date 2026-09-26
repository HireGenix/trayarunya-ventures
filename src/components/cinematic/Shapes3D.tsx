'use client';

import React, { useEffect } from 'react';
import { Box, BoxProps } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, type MotionValue } from 'framer-motion';

/**
 * Pure-CSS 3D primitives (no WebGL / extra deps). Rendered with
 * `transform-style: preserve-3d` so they are cheap, SSR-safe and crisp at
 * any resolution. Used to give the site its playful 3D creative-agency look.
 */

const spin = keyframes`
  from { transform: rotateX(-24deg) rotateY(0deg); }
  to   { transform: rotateX(-24deg) rotateY(360deg); }
`;
const tumble = keyframes`
  from { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
  to   { transform: rotateX(360deg) rotateY(360deg) rotateZ(180deg); }
`;
const gyro = keyframes`
  from { transform: rotateX(68deg) rotateZ(0deg); }
  to   { transform: rotateX(68deg) rotateZ(360deg); }
`;
const bob = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0); }
  50%      { transform: translate3d(0, -18px, 0); }
`;

type ShapeBase = { size?: number; duration?: number; sx?: BoxProps['sx'] };

/** Rotating glassy cube with gradient faces. */
export function Cube3D({
  size = 90,
  duration = 16,
  colors = ['#ffaf06', '#ff4d8d', '#7c5cff', '#14bb87', '#0A66C2', '#ffc046'],
  sx,
}: ShapeBase & { colors?: string[] }) {
  const half = size / 2;
  const faces = [
    `rotateY(0deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ];
  return (
    <Box sx={{ width: size, height: size, perspective: size * 8, ...sx }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          animation: `${spin} ${duration}s linear infinite`,
        }}
      >
        {faces.map((t, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              inset: 0,
              transform: t,
              borderRadius: `${Math.round(size * 0.14)}px`,
              background: `linear-gradient(135deg, ${colors[i % colors.length]}ee, ${colors[(i + 2) % colors.length]}bb)`,
              border: '1px solid rgba(255,255,255,0.55)',
              boxShadow: 'inset 0 0 24px rgba(255,255,255,0.35)',
              backfaceVisibility: 'visible',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

/** Wireframe gyroscope / torus made of stacked rotated rings. */
export function Ring3D({
  size = 140,
  duration = 14,
  color = '#7c5cff',
  rings = 6,
  sx,
}: ShapeBase & { color?: string; rings?: number }) {
  return (
    <Box sx={{ width: size, height: size, perspective: size * 6, ...sx }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          animation: `${gyro} ${duration}s linear infinite`,
        }}
      >
        {Array.from({ length: rings }).map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `3px solid ${color}`,
              opacity: 0.35 + (i / rings) * 0.55,
              transform: `rotateY(${(180 / rings) * i}deg)`,
              boxShadow: `0 0 18px ${color}55`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

/** Glossy shaded sphere that gently bobs. */
export function Sphere3D({
  size = 80,
  duration = 6,
  from = '#ffe08a',
  via = '#ffaf06',
  to = '#c25400',
  sx,
}: ShapeBase & { from?: string; via?: string; to?: string }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 32% 28%, #ffffff 0%, ${from} 14%, ${via} 52%, ${to} 100%)`,
        boxShadow: `0 ${size * 0.35}px ${size * 0.5}px -${size * 0.2}px ${to}66, inset -${size * 0.08}px -${size * 0.1}px ${size * 0.2}px rgba(0,0,0,0.18)`,
        animation: `${bob} ${duration}s ease-in-out infinite`,
        ...sx,
      }}
    />
  );
}

/** Tumbling glossy capsule / pill. */
export function Pill3D({
  size = 110,
  duration = 18,
  gradient = 'linear-gradient(135deg,#ff4d8d 0%,#7c5cff 100%)',
  sx,
}: ShapeBase & { gradient?: string }) {
  return (
    <Box sx={{ width: size, height: size, perspective: size * 6, display: 'grid', placeItems: 'center', ...sx }}>
      <Box
        sx={{
          width: size * 0.38,
          height: size,
          borderRadius: size,
          background: gradient,
          boxShadow: 'inset -8px -10px 22px rgba(0,0,0,0.18), inset 8px 10px 22px rgba(255,255,255,0.45)',
          transformStyle: 'preserve-3d',
          animation: `${tumble} ${duration}s linear infinite`,
        }}
      />
    </Box>
  );
}

type ShapeKind = 'cube' | 'ring' | 'sphere' | 'pill';

interface Placement {
  kind: ShapeKind;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size: number;
  depth: number;
  props?: Record<string, unknown>;
  hideOnMobile?: boolean;
}

const PRESETS: Record<'hero' | 'page' | 'cta', Placement[]> = {
  hero: [
    { kind: 'cube', top: '14%', left: '3%', size: 70, depth: 40, hideOnMobile: true },
    { kind: 'ring', bottom: '12%', left: '40%', size: 150, depth: 25, props: { color: '#ff4d8d' }, hideOnMobile: true },
    { kind: 'sphere', top: '10%', right: '6%', size: 64, depth: 60 },
    { kind: 'pill', bottom: '18%', right: '2%', size: 120, depth: 35, hideOnMobile: true },
    { kind: 'sphere', bottom: '8%', left: '6%', size: 42, depth: 50, props: { from: '#b9ffe4', via: '#14bb87', to: '#07614a' } },
  ],
  page: [
    { kind: 'cube', top: '26%', left: '6%', size: 60, depth: 40, hideOnMobile: true },
    { kind: 'ring', top: '18%', right: '6%', size: 120, depth: 30, props: { color: '#7c5cff' } },
    { kind: 'sphere', bottom: '14%', right: '14%', size: 48, depth: 55, props: { from: '#ffc2d8', via: '#ff4d8d', to: '#9b1650' }, hideOnMobile: true },
    { kind: 'pill', bottom: '10%', left: '12%', size: 90, depth: 25, props: { gradient: 'linear-gradient(135deg,#ffaf06,#14bb87)' }, hideOnMobile: true },
  ],
  cta: [
    { kind: 'cube', top: '12%', left: '8%', size: 76, depth: 40, props: { colors: ['#ffffff', '#ffe08a', '#ffffff', '#b9ffe4', '#ffffff', '#ffd1e3'] }, hideOnMobile: true },
    { kind: 'ring', bottom: '10%', right: '8%', size: 150, depth: 30, props: { color: '#ffffff' } },
    { kind: 'sphere', top: '16%', right: '16%', size: 54, depth: 60, props: { from: '#ffffff', via: '#ffd1e3', to: '#ff4d8d' }, hideOnMobile: true },
    { kind: 'pill', bottom: '14%', left: '14%', size: 96, depth: 25, props: { gradient: 'linear-gradient(135deg,#ffffff,#ffe08a)' }, hideOnMobile: true },
  ],
};

function renderShape(p: Placement) {
  const common = { size: p.size, ...(p.props || {}) };
  switch (p.kind) {
    case 'cube':
      return <Cube3D {...common} />;
    case 'ring':
      return <Ring3D {...common} />;
    case 'pill':
      return <Pill3D {...common} />;
    default:
      return <Sphere3D {...common} />;
  }
}

function ParallaxLayer({
  p,
  mx,
  my,
}: {
  p: Placement;
  mx: MotionValue<number>;
  my: MotionValue<number>;
}) {
  const x = useTransform(mx, [-0.5, 0.5], [-p.depth, p.depth]);
  const y = useTransform(my, [-0.5, 0.5], [-p.depth * 0.7, p.depth * 0.7]);
  return (
    <Box
      component={motion.div}
      style={{ x, y }}
      sx={{
        position: 'absolute',
        top: p.top,
        left: p.left,
        right: p.right,
        bottom: p.bottom,
        display: p.hideOnMobile ? { xs: 'none', md: 'block' } : 'block',
        filter: 'drop-shadow(0 18px 30px rgba(15,23,42,0.18))',
      }}
    >
      {renderShape(p)}
    </Box>
  );
}

interface Scene3DProps {
  variant?: keyof typeof PRESETS;
  /** Overall opacity of the floating shapes. */
  opacity?: number;
}

/**
 * Decorative floating 3D shapes layer with pointer-driven depth parallax.
 * Absolutely positioned — drop inside any `position: relative` section.
 */
export default function Scene3D({ variant = 'hero', opacity = 1 }: Scene3DProps) {
  const reduce = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      rawX.set(e.clientX / window.innerWidth - 0.5);
      rawY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, rawX, rawY]);

  return (
    <Box
      aria-hidden
      sx={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden', opacity }}
    >
      {PRESETS[variant].map((p, i) => (
        <ParallaxLayer key={i} p={p} mx={mx} my={my} />
      ))}
    </Box>
  );
}
