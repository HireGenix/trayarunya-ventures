'use client';

import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { SPECTRUM } from './surfaces';

interface GradientTextProps extends BoxProps {
  children: React.ReactNode;
  gradient?: string;
}

/**
 * Inline creative spectrum gradient text used for emphasis words in headlines.
 */
const GradientText = ({
  children,
  gradient = SPECTRUM,
  sx,
  ...rest
}: GradientTextProps) => (
  <Box
    component="span"
    sx={{
      backgroundImage: gradient,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      display: 'inline',
      ...sx,
    }}
    {...rest}
  >
    {children}
  </Box>
);

export default GradientText;
