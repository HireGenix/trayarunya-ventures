'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';

/**
 * Global floating call-to-action. Appears after the user scrolls a bit, on
 * every page except the contact page (where the AI Sales Partner already lives).
 * Pulses gently to draw the eye and routes to the contact experience.
 */
export default function FloatingCTA() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hidden = pathname?.startsWith('/contact');

  return (
    <AnimatePresence>
      {show && !hidden && (
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          sx={{
            position: 'fixed',
            bottom: { xs: 18, md: 28 },
            right: { xs: 16, md: 28 },
            zIndex: 1300,
          }}
        >
          <Box
            component={Link}
            href="/contact"
            sx={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.2,
              pl: 2,
              pr: 2.6,
              py: 1.5,
              borderRadius: 99,
              textDecoration: 'none',
              color: '#0a0a0f',
              fontWeight: 800,
              fontSize: '0.95rem',
              background: 'linear-gradient(95deg,#ffaf06 0%,#ffc73c 45%,#14bb87 130%)',
              boxShadow: '0 14px 40px rgba(255,175,6,0.4), 0 8px 24px rgba(20,187,135,0.28)',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 20px 52px rgba(255,175,6,0.5), 0 12px 30px rgba(20,187,135,0.34)',
              },
            }}
          >
            {/* pulsing ring */}
            <Box
              component={motion.span}
              animate={{ scale: [1, 1.5, 1], opacity: [0.55, 0, 0.55] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              sx={{
                position: 'absolute',
                left: 14,
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.6)',
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                position: 'relative',
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(0,0,0,0.12)',
              }}
            >
              <GraphicEqIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ lineHeight: 1.1 }}>
              <Typography component="span" sx={{ display: 'block', fontWeight: 800, fontSize: '0.95rem' }}>
                Talk to our AI Partner
              </Typography>
              <Typography component="span" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600, fontSize: '0.72rem', opacity: 0.75 }}>
                Free 2-min growth read · no signup
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </AnimatePresence>
  );
}
