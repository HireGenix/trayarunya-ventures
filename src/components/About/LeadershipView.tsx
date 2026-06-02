'use client';

import React from 'react';
import { Box, Container, Typography, Avatar, IconButton } from '@mui/material';
import Link from 'next/link';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';
import { Layout } from '@/components/Layout';
import { PageHero, Reveal, SectionHeading, GradientText, GlowButton, TiltCard, SURFACE, TEXT, CARD } from '@/components/cinematic';
import { companyInfo } from '@/data/websiteInfo';

const leadership = [
  {
    name: 'Growth Strategy',
    role: 'Founder & Growth Lead',
    bio: 'Leads partner strategy and the LinkedIn-led growth engine — turning founder visions into predictable high-ticket pipeline.',
    color: '#ffaf06',
  },
  {
    name: 'Demand & Performance',
    role: 'Head of Demand Generation',
    bio: 'Owns multi-channel demand and paid media, tying every dollar of spend to qualified pipeline and closed revenue.',
    color: '#14bb87',
  },
  {
    name: 'Content & Brand',
    role: 'Head of Content & Personal Branding',
    bio: 'Builds founder authority and story-driven content that warms buyers and pulls in inbound at scale.',
    color: '#0A66C2',
  },
  {
    name: 'Client Partnership',
    role: 'Head of Partnerships',
    bio: 'Ensures every partner is treated as in-house — accountable to outcomes, transparent in reporting, relentless on results.',
    color: '#8E44AD',
  },
];

const LeadershipView = () => {
  return (
    <Layout>
      <PageHero
        eyebrow="LEADERSHIP"
        title={
          <>
            The operators who own
            <br /> your <GradientText>growth</GradientText>
          </>
        }
        subtitle="Senior marketers and growth strategists — not junior account managers. The people who treat your pipeline like their own."
      />

      <Box sx={{ background: SURFACE.white, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 3 }}>
            {leadership.map((p, i) => (
              <Reveal key={p.role} delay={(i % 2) * 0.1}>
                <TiltCard max={7} sx={{ height: '100%', borderRadius: 4 }}>
                  <Box
                    sx={{ display: 'flex', gap: 3, p: { xs: 3, md: 4 }, height: '100%', borderRadius: 4, background: CARD.bg, border: CARD.border, boxShadow: CARD.shadow }}
                  >
                  <Avatar
                    sx={{
                      width: 72,
                      height: 72,
                      flexShrink: 0,
                      fontWeight: 800,
                      fontSize: '1.5rem',
                      color: '#0a0a0a',
                      background: `linear-gradient(135deg, ${p.color}, #14bb87)`,
                    }}
                  >
                    {p.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: TEXT.heading }}>{p.name}</Typography>
                    <Typography sx={{ color: p.color, fontWeight: 600, fontSize: '0.85rem', mb: 1.2 }}>
                      {p.role}
                    </Typography>
                    <Typography sx={{ color: TEXT.body, fontSize: '0.92rem', lineHeight: 1.6, mb: 1.5 }}>
                      {p.bio}
                    </Typography>
                    <Box>
                      <IconButton
                        component="a"
                        href={companyInfo.contact.socialMedia.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        sx={{ color: TEXT.muted, '&:hover': { color: '#0A66C2' } }}
                        aria-label="LinkedIn"
                      >
                        <LinkedInIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        component="a"
                        href={`mailto:${companyInfo.contact.email}`}
                        size="small"
                        sx={{ color: TEXT.muted, '&:hover': { color: '#ffaf06' } }}
                        aria-label="Email"
                      >
                        <EmailIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  </Box>
                </TiltCard>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      <Box sx={{ background: SURFACE.ctaBold, color: '#fff', py: { xs: 10, md: 14 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Reveal>
            <SectionHeading title="Ready to add us to your team?" align="center" sx={{ '& *': { color: '#fff !important' } }} />
            <GlowButton component={Link} href="/contact" size="large">
              Book a Strategy Call
            </GlowButton>
          </Reveal>
        </Container>
      </Box>
    </Layout>
  );
};

export default LeadershipView;
