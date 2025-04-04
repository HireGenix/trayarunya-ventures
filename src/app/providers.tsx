'use client';

import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { StyledEngineProvider } from '@mui/material/styles';
import theme from '@/theme';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create a state to track if we're on the client side
  const [isMounted, setIsMounted] = useState(false);
  
  // Set isMounted to true when component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {isMounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
