'use client';

import React from 'react';
import { Box, BoxProps } from '@mui/material';

interface GradientTextProps extends BoxProps {
  children: React.ReactNode;
  gradient?: string;
}

/**
 * Inline gold→green gradient text used for emphasis words in headlines.
 */
const GradientText = ({
  children,
  gradient = 'linear-gradient(90deg, #ffaf06 0%, #14bb87 100%)',
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
