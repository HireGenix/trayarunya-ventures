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
 * Primary cinematic CTA button with animated gold→green glow.
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
      color: '#0a0a0a',
      background: 'linear-gradient(95deg, #ffaf06 0%, #ffc73c 45%, #14bb87 130%)',
      boxShadow: glow
        ? '0 10px 30px rgba(255,175,6,0.35), 0 6px 20px rgba(20,187,135,0.25)'
        : 'none',
      overflow: 'hidden',
      '&:hover': {
        background: 'linear-gradient(95deg, #ffc73c 0%, #ffaf06 45%, #14bb87 130%)',
        boxShadow: glow
          ? '0 16px 40px rgba(255,175,6,0.45), 0 10px 28px rgba(20,187,135,0.3)'
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
