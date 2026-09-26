'use client';

import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { CREATIVE_GRADIENT } from './surfaces';

const shift = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
`;

interface GradientTextProps extends BoxProps {
  children: React.ReactNode;
  gradient?: string;
}

/**
 * Inline animated creative gradient text used for emphasis words in headlines.
 * Pass a custom `gradient` to opt out of the animated signature gradient.
 */
const GradientText = ({
  children,
  gradient,
  sx,
  ...rest
}: GradientTextProps) => (
  <Box
    component="span"
    sx={{
      backgroundImage: gradient ?? CREATIVE_GRADIENT,
      ...(gradient
        ? {}
        : { backgroundSize: '200% 100%', animation: `${shift} 8s ease-in-out infinite` }),
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      display: 'inline',
      // Transparent fill would show inherited 3D text-shadows through the glyphs.
      textShadow: 'none',
      ...sx,
    }}
    {...rest}
  >
    {children}
  </Box>
);

export default GradientText;
