'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import Link from 'next/link';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { RealtimeChatExperience } from '@/components/Contact/AIMarketer';

export default function AIChatPage() {
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg,#fbfdff 0%,#f1f6ff 100%)', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: { xs: 3, md: 4 } }}>
          <Box
            component={Link}
            href="/"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, textDecoration: 'none', mb: 2 }}
          >
            <AutoAwesomeIcon sx={{ color: '#ffaf06' }} />
            <Typography sx={{ fontWeight: 900, letterSpacing: 0.5, color: '#0f1320' }}>
              Trayarunya Ventures
            </Typography>
          </Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 900, color: '#0f1320', fontSize: { xs: '1.5rem', md: '2rem' } }}
          >
            Chat with our AI Sales Partner
          </Typography>
          <Typography sx={{ color: '#64748b', mt: 1, maxWidth: 560, mx: 'auto' }}>
            Tell us about your business and watch your growth profile build in realtime.
          </Typography>
        </Box>

        <RealtimeChatExperience standalone />
      </Container>
    </Box>
  );
}
