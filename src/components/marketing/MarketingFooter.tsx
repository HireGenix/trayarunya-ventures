'use client';

import Link from 'next/link';
import { Box, Container, Stack, Typography } from '@mui/material';
import { Logo } from './Logo';
import { DISPLAY } from './fonts';
import { DAY } from './primitives';
import { ProductHuntBadge } from './ProductHunt';

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
      ['Log in', 'https://marketiqgpt.com'],
      ['Start free', 'https://marketiqgpt.com'],
      ['FAQ', '#faq'],
    ],
  },
  {
    heading: 'Resources',
    links: [
      ['Documentation', '/docs'],
      ['Support', '/support'],
      ['Security', '/security'],
      ['GDPR compliance', '/gdpr'],
      ['Data handling', '/data-handling'],
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
    <Box
      component="footer"
      sx={{
        position: 'relative',
        bgcolor: DAY.bg2,
        color: DAY.sub,
        pt: { xs: 7, md: 9 },
        pb: 5,
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${DAY.amber}66, ${DAY.teal}66, transparent)`,
        },
      }}
    >
      {/* giant watermark wordmark */}
      <Typography
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -40,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: { xs: '5rem', md: '11rem' },
          letterSpacing: '-0.04em',
          whiteSpace: 'nowrap',
          color: 'rgba(13,23,44,0.035)',
          pointerEvents: 'none',
          userSelect: 'none',
          lineHeight: 1,
        }}
      >
        MarketiQ AI
      </Typography>
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.6fr repeat(4, 1fr)' },
            gap: { xs: 5, md: 4 },
          }}
        >
          <Box>
            <Logo size={24} href={null} />
            <Typography sx={{ mt: 2.5, maxWidth: 320, fontSize: 14.5, lineHeight: 1.7, color: DAY.sub }}>
              An Autonomous Go-To-Market Operating System powered by 31 AI agents and 19
              autonomous optimization loops — continuously researching, strategizing,
              creating, publishing, optimizing and learning across Enterprise (B2B) and
              Consumer (B2C/D2C) go-to-market. Built in-house by Trayarunya Ventures.
            </Typography>
            <Box sx={{ mt: 2.5 }}>
              <ProductHuntBadge width={220} />
            </Box>
          </Box>

          {COLS.map((col) => (
            <Box key={col.heading}>
              <Typography sx={{ fontWeight: 700, color: DAY.text, mb: 1.75, fontSize: 14 }}>
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
                        color: 'rgba(28,41,66,0.66)',
                        textDecoration: 'none',
                        '&:hover': { color: DAY.text },
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
            borderTop: '1px solid rgba(13,23,44,0.08)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: 13, color: 'rgba(28,41,66,0.55)' }}>
            © {new Date().getFullYear()} MarketiQ AI · A Trayarunya Ventures platform. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={2.5} alignItems="center" flexWrap="wrap" useFlexGap>
            {[
              ['Docs', '/docs'],
              ['Support', '/support'],
              ['Security', '/security'],
              ['GDPR', '/gdpr'],
              ['Data handling', '/data-handling'],
              ['Privacy', '/privacy'],
              ['Terms', '/terms'],
            ].map(([label, href]) => (
              <Box
                key={label}
                component={Link}
                href={href}
                sx={{
                  fontSize: 13,
                  color: 'rgba(28,41,66,0.55)',
                  textDecoration: 'none',
                  '&:hover': { color: DAY.text },
                }}
              >
                {label}
              </Box>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
