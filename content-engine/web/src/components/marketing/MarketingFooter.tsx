'use client';

import Link from 'next/link';
import { Box, Container, Stack, Typography } from '@mui/material';
import { Logo } from './Logo';

const COLS = [
  {
    heading: 'Platform',
    links: [
      ['How it works', '#how'],
      ['Features', '#features'],
      ['AI Decks', '#decks'],
      ['Pricing', '#pricing'],
    ],
  },
  {
    heading: 'Product',
    links: [
      ['Desktop app', '#desktop'],
      ['Log in', '/login'],
      ['Start free', '/signup'],
      ['FAQ', '#faq'],
    ],
  },
  {
    heading: 'Company',
    links: [
      ['Trayarunya Ventures', 'https://trayarunyaventures.com'],
      ['LinkedIn', 'https://www.linkedin.com/company/trayarunya-ventures'],
      ['Contact', 'mailto:info@trayarunyaventures.com'],
    ],
  },
];

export default function MarketingFooter() {
  return (
    <Box component="footer" sx={{ bgcolor: '#0B0F14', color: 'rgba(255,255,255,0.72)', pt: { xs: 7, md: 9 }, pb: 5 }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.6fr repeat(3, 1fr)' },
            gap: { xs: 5, md: 4 },
          }}
        >
          <Box>
            <Logo size={24} light href={null} />
            <Typography sx={{ mt: 2.5, maxWidth: 320, fontSize: 14.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.6)' }}>
              The agentic marketing operating system — research, strategy, creation, publishing
              and learning in one closed loop. Built in-house by Trayarunya Ventures.
            </Typography>
          </Box>

          {COLS.map((col) => (
            <Box key={col.heading}>
              <Typography sx={{ fontWeight: 700, color: '#fff', mb: 1.75, fontSize: 14 }}>
                {col.heading}
              </Typography>
              <Stack spacing={1.1}>
                {col.links.map(([label, href]) => {
                  const external = href.startsWith('http') || href.startsWith('mailto');
                  return (
                    <Box
                      key={label}
                      component={external ? 'a' : Link}
                      href={href}
                      {...(external ? { target: '_blank', rel: 'noopener' } : {})}
                      sx={{
                        fontSize: 14,
                        color: 'rgba(255,255,255,0.62)',
                        textDecoration: 'none',
                        '&:hover': { color: '#fff' },
                      }}
                    >
                      {label}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            mt: { xs: 5, md: 7 },
            pt: 3,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            © {new Date().getFullYear()} MarketiQ AI · A Trayarunya Ventures platform. All rights reserved.
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            The agentic marketing operating system
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
