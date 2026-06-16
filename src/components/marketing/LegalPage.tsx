'use client';

import { Box, Container, Divider, Typography } from '@mui/material';
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';
import { DISPLAY } from './fonts';
import { Eyebrow, Glow, GradientText, GridBg, DAY, Reveal } from './primitives';

export interface LegalSection {
  title: string;
  /** Trusted, in-repo HTML (no user input) rendered into the section body. */
  content: string;
}

export interface LegalPageProps {
  kicker: string;
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
}

export default function LegalPage({ kicker, title, lastUpdated, intro, sections }: LegalPageProps) {
  return (
    <Box sx={{ bgcolor: DAY.bg, overflowX: 'hidden', minHeight: '100vh' }}>
      <MarketingNav />

      {/* Hero */}
      <Box sx={{ position: 'relative', pt: { xs: 16, md: 20 }, pb: { xs: 6, md: 8 }, borderBottom: `1px solid ${DAY.lineSoft}`, overflow: 'hidden' }}>
        <GridBg opacity={0.35} />
        <Glow color={DAY.teal} size={560} sx={{ top: '-30%', right: '4%' }} opacity={0.1} />
        <Glow color={DAY.amber} size={480} sx={{ top: '-20%', left: '0%' }} opacity={0.09} />
        <Container maxWidth="md" sx={{ position: 'relative' }}>
          <Reveal>
            <Box sx={{ textAlign: 'center' }}>
              <Eyebrow>{kicker}</Eyebrow>
              <Typography
                variant="h1"
                sx={{
                  fontFamily: DISPLAY,
                  fontWeight: 700,
                  fontSize: { xs: '2.25rem', md: '3.25rem' },
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                }}
              >
                <GradientText>{title}</GradientText>
              </Typography>
              <Typography sx={{ mt: 2, fontSize: 15, fontWeight: 600, color: DAY.sub }}>
                Last updated: {lastUpdated}
              </Typography>
              {intro && (
                <Typography
                  sx={{
                    mt: 2.5,
                    fontSize: { xs: '1rem', md: '1.08rem' },
                    lineHeight: 1.7,
                    color: DAY.sub,
                    maxWidth: 680,
                    mx: 'auto',
                  }}
                >
                  {intro}
                </Typography>
              )}
            </Box>
          </Reveal>
        </Container>
      </Box>

      {/* Body */}
      <Box sx={{ py: { xs: 6, md: 9 } }}>
        <Container maxWidth="md">
          <Box
            sx={{
              p: { xs: 3, md: 5.5 },
              borderRadius: '22px',
              border: `1px solid ${DAY.line}`,
              boxShadow: '0 40px 90px -50px rgba(12,20,36,0.25)',
              background: DAY.panel,
            }}
          >
            {sections.map((section, index) => (
              <Box key={section.title} sx={{ mb: index < sections.length - 1 ? 5 : 0 }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: { xs: '1.2rem', md: '1.4rem' },
                    letterSpacing: '-0.02em',
                    color: DAY.text,
                    mb: 2,
                  }}
                >
                  {section.title}
                </Typography>
                <Box
                  dangerouslySetInnerHTML={{ __html: section.content }}
                  sx={{
                    '& p': { mb: 1.75, color: DAY.sub, lineHeight: 1.75, fontSize: 15.5 },
                    '& ul': { pl: 3.2, mb: 1.75 },
                    '& li': { mb: 1, color: DAY.sub, lineHeight: 1.75, fontSize: 15.5 },
                    '& a': { color: DAY.teal, textDecoration: 'none', fontWeight: 600 },
                    '& strong': { color: DAY.text },
                  }}
                />
                {index < sections.length - 1 && <Divider sx={{ mt: 4, borderColor: DAY.lineSoft }} />}
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <MarketingFooter />
    </Box>
  );
}
