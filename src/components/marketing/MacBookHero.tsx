'use client';

/**
 * MacBookHero — a real, scroll-reactive MacBook Pro mockup.
 *
 * The lid starts folded (rotateX -98deg) so visitors first see only a closed
 * laptop. As they scroll into the hero, the lid opens via framer-motion's
 * useScroll/useTransform, revealing the MarketIQ dashboard screenshot inside
 * the screen. Pure CSS 3D — no canvas, no GPU thrashing — so it stays sharp on
 * every display and respects prefers-reduced-motion.
 */

import { useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';

import { DAY } from './primitives';

export default function MacBookHero({
  src = '/dashboard-assets/shot-1.png',
  alt = 'MarketIQ dashboard',
  caption = 'app.mymarketiq.online · Live',
}: {
  src?: string;
  alt?: string;
  caption?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Track the user's scroll over this section. Start when the section's TOP
  // hits the bottom of the viewport, end when it's three-quarters past the top
  // — gives us a comfortable "scroll-and-it-opens" window without surprising
  // the visitor on first paint.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end center'],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 18, mass: 0.4 });

  // -98° = closed (you see the underside / aluminium lid)
  //  0°  = wide open (screen fully visible)
  // We start at -85° so even before the user scrolls, the lid is slightly ajar
  // — that way the dashboard catches the corner of the eye and invites scroll.
  const rotateX = useTransform(smooth, [0, 0.45, 1], reduced ? [0, 0, 0] : [-85, -10, 0]);
  const screenShadow = useTransform(smooth, [0, 1], reduced ? [0.4, 0.4] : [0, 0.6]);
  const reflection = useTransform(smooth, [0, 1], reduced ? [0.05, 0.05] : [0.18, 0.04]);

  return (
    <Box
      ref={ref}
      sx={{
        position: 'relative',
        width: '100%',
        // give the section enough scroll runway for the open animation to
        // unfold gracefully (≈ one viewport height of progress).
        py: { xs: 4, md: 6 },
        perspective: { xs: '1400px', md: '2000px' },
        perspectiveOrigin: '50% 50%',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1180,
          mx: 'auto',
          position: 'relative',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Soft ambient glow under the laptop */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: '8%',
            right: '8%',
            bottom: -30,
            height: 60,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(12,20,36,0.32) 0%, transparent 65%)',
            filter: 'blur(18px)',
            zIndex: 0,
          }}
        />

        {/* === LID === folds open on scroll ============================== */}
        <motion.div
          style={{
            // Hinge at the bottom edge so the lid pivots like a real laptop
            transformOrigin: '50% 100%',
            transformStyle: 'preserve-3d',
            rotateX,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              // Lid bezel — dark anodised
              p: { xs: '10px 10px 14px', md: '14px 14px 18px' },
              borderRadius: { xs: '14px 14px 6px 6px', md: '20px 20px 8px 8px' },
              background: 'linear-gradient(180deg, #1c1f24 0%, #0e1116 100%)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.08), 0 22px 50px -28px rgba(12,20,36,0.55)',
              position: 'relative',
            }}
          >
            {/* Camera notch */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                width: { xs: 50, md: 80 },
                height: { xs: 4, md: 6 },
                borderRadius: 999,
                bgcolor: '#0a0c10',
                zIndex: 4,
              }}
            />

            {/* Screen — the actual display */}
            <Box
              sx={{
                position: 'relative',
                aspectRatio: '16 / 10',
                borderRadius: { xs: '6px', md: '8px' },
                overflow: 'hidden',
                background: '#fff',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
              }}
            >
              {/* The dashboard image fills the screen */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                loading="eager"
                draggable={false}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />

              {/* Subtle screen reflection that fades as the lid opens */}
              <motion.div
                aria-hidden
                style={{ opacity: reflection, position: 'absolute', inset: 0, pointerEvents: 'none' }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.05) 30%, transparent 60%)',
                  }}
                />
              </motion.div>

              {/* "Live" pill in the bottom-right corner */}
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                sx={{
                  position: 'absolute',
                  bottom: { xs: 8, md: 14 },
                  right: { xs: 8, md: 14 },
                  px: 1, py: 0.4,
                  borderRadius: 999,
                  bgcolor: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(6px)',
                  border: `1px solid ${DAY.lineSoft}`,
                  boxShadow: '0 6px 18px -8px rgba(12,20,36,0.18)',
                }}
              >
                <Box
                  sx={{
                    width: 7, height: 7, borderRadius: '50%',
                    bgcolor: DAY.teal,
                    boxShadow: `0 0 0 4px ${DAY.teal}22`,
                    animation: 'mac-live 1.6s ease-in-out infinite',
                    '@keyframes mac-live': {
                      '0%,100%': { boxShadow: `0 0 0 0 ${DAY.teal}55` },
                      '50%': { boxShadow: `0 0 0 5px ${DAY.teal}00` },
                    },
                  }}
                />
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: DAY.text, letterSpacing: '0.02em' }}>
                  {caption}
                </Typography>
              </Stack>
            </Box>

            {/* Apple-style logo dot below screen on the lid back */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                bottom: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 9,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.18)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              MarketIQ
            </Box>
          </Box>
        </motion.div>

        {/* === BASE === the keyboard deck ================================ */}
        <Box
          sx={{
            position: 'relative',
            mx: 'auto',
            // Slightly wider than the lid for the classic MacBook silhouette
            width: '102%',
            maxWidth: '102%',
            transform: 'translateX(-1%)',
            mt: '-2px',
            zIndex: 3,
          }}
        >
          {/* Hinge / display foot */}
          <Box
            sx={{
              height: { xs: 6, md: 8 },
              background: 'linear-gradient(180deg, #2a2e34, #14161a)',
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          />
          {/* Deck */}
          <Box
            sx={{
              position: 'relative',
              height: { xs: 18, md: 26 },
              background: 'linear-gradient(180deg, #d8dadd 0%, #b3b6bb 50%, #8b8e94 100%)',
              borderBottomLeftRadius: { xs: '14px', md: '20px' },
              borderBottomRightRadius: { xs: '14px', md: '20px' },
              boxShadow: '0 30px 60px -34px rgba(12,20,36,0.45), inset 0 1px 0 rgba(255,255,255,0.55)',
            }}
          >
            {/* Trackpad slot */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '60%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '20%', md: '22%' },
                height: { xs: 3, md: 5 },
                borderRadius: 2,
                background: 'linear-gradient(180deg, #98a0a6 0%, #c5c9cf 100%)',
                opacity: 0.55,
              }}
            />
            {/* Front lip */}
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                left: '4%', right: '4%', bottom: 0,
                height: { xs: 3, md: 4 },
                borderBottomLeftRadius: { xs: '14px', md: '20px' },
                borderBottomRightRadius: { xs: '14px', md: '20px' },
                background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.18))',
              }}
            />
          </Box>
        </Box>

        {/* Cast shadow under the laptop, intensifies as lid opens */}
        <motion.div
          aria-hidden
          style={{ opacity: screenShadow, position: 'absolute', left: '12%', right: '12%', bottom: -36, zIndex: 0 }}
        >
          <Box
            sx={{
              height: 36,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(12,20,36,0.45) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />
        </motion.div>
      </Box>
    </Box>
  );
}
