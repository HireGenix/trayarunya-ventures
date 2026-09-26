'use client';

import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import { motion } from 'framer-motion';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface GlowButtonProps extends ButtonProps {
  glow?: boolean;
  withArrow?: boolean;
}

const MotionButton = motion(Button);

/**
 * Primary cinematic CTA button — glossy 3D spectrum pill with a layered glow.
 */
const GlowButton = ({
  children,
  glow = true,
  withArrow = true,
  sx,
  endIcon,
  ...rest
}: GlowButtonProps) => (
  <MotionButton
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.97 }}
    endIcon={endIcon ?? (withArrow ? <ArrowForwardIcon /> : undefined)}
    sx={{
      position: 'relative',
      py: 1.6,
      px: 4,
      borderRadius: '50px',
      fontWeight: 700,
      fontSize: '1rem',
      color: '#fff',
      textShadow: '0 1px 2px rgba(40,10,80,0.35)',
      background: 'linear-gradient(100deg, #ff8a00 0%, #ff4d8d 45%, #7c5cff 100%)',
      backgroundSize: '160% 100%',
      backgroundPosition: '0% 50%',
      transition: 'background-position 0.5s ease, box-shadow 0.3s ease',
      boxShadow: glow
        ? '0 4px 0 rgba(91,61,245,0.55), 0 14px 32px rgba(255,77,141,0.35), inset 0 1px 0 rgba(255,255,255,0.45)'
        : 'none',
      overflow: 'hidden',
      '&:hover': {
        backgroundPosition: '100% 50%',
        boxShadow: glow
          ? '0 6px 0 rgba(91,61,245,0.55), 0 20px 44px rgba(124,92,255,0.4), inset 0 1px 0 rgba(255,255,255,0.45)'
          : 'none',
      },
      ...sx,
    }}
    {...rest}
  >
    {children}
  </MotionButton>
);

export default GlowButton;
