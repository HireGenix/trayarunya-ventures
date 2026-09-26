'use client';

import React from 'react';
import { Button, ButtonProps } from '@mui/material';
import { motion } from 'framer-motion';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DEPTH } from './surfaces';

interface GlowButtonProps extends ButtonProps {
  glow?: boolean;
  withArrow?: boolean;
}

const MotionButton = motion(Button);

/**
 * Primary CTA — a tactile 3D "clay" button with an extruded base that
 * presses down on tap, plus a creative gold→pink glow.
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
    whileHover={{ y: -3, rotateX: 8 }}
    whileTap={{ y: 4, scale: 0.98 }}
    transformTemplate={(_, generated) => `perspective(600px) ${generated}`}
    endIcon={endIcon ?? (withArrow ? <ArrowForwardIcon /> : undefined)}
    sx={{
      position: 'relative',
      py: 1.6,
      px: 4,
      borderRadius: '50px',
      fontWeight: 700,
      fontSize: '1rem',
      color: '#0a0a0a',
      background: 'linear-gradient(95deg, #ffc73c 0%, #ffaf06 45%, #ff8a3d 100%)',
      boxShadow: glow ? DEPTH.button : '0 6px 0 #b86f00',
      overflow: 'hidden',
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%)',
        pointerEvents: 'none',
      },
      '&:hover': {
        background: 'linear-gradient(95deg, #ffd35c 0%, #ffaf06 45%, #ff4d8d 110%)',
        boxShadow: glow ? DEPTH.buttonHover : '0 8px 0 #b86f00',
      },
      '&:active': { boxShadow: DEPTH.buttonActive },
      ...sx,
    }}
    {...rest}
  >
    {children}
  </MotionButton>
);

export default GlowButton;
