'use client';

import React from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import { SmoothScroll, CursorGlow, ScrollProgress, FloatingCTA } from '@/components/cinematic';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <SmoothScroll />
      <ScrollProgress />
      <CursorGlow />
      <Header />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
        }}
      >
        {children}
      </Box>
      <Footer />
      <FloatingCTA />
    </Box>
  );
}
