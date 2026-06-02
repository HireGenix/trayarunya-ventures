'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import Link from 'next/link';
import HandshakeIcon from '@mui/icons-material/Handshake';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PublicIcon from '@mui/icons-material/Public';
import { Layout } from '@/components/Layout';
import {
  PageHero,
  Reveal,
  SectionHeading,
  GradientText,
  GlowButton,
  AnimatedCounter,
  TiltCard,
  SURFACE,
  TEXT,
  CARD,
} from '@/components/cinematic';
import { companyInfo, manifesto, stats } from '@/data/websiteInfo';

const values = [
  {
    icon: <HandshakeIcon />,
    title: 'Partnership over transactions',
    description: 'We win only when you win. Your number is our number.',
    color: '#ffaf06',
  },
  {
    icon: <RocketLaunchIcon />,
    title: 'Outcomes over activity',
    description: 'We’re judged on pipeline and revenue — not impressions.',
    color: '#14bb87',
  },
  {
    icon: <VisibilityIcon />,
    title: 'Radical transparency',
    description: 'Clear reporting, honest advice, no vanity metrics.',
    color: '#0A66C2',
  },
  {
    icon: <FavoriteIcon />,
    title: 'Obsessed with your buyers',
    description: 'Everything starts and ends with your ideal customer.',
    color: '#d92c4a',
  },
];

const AboutView = () => {
  return (
    <Layout>
      <PageHero
        eyebrow="ABOUT TRAYARUNYA"
        title={
          <>
            We’re not an agency.
            <br />
            We’re your <GradientText>growth partner.</GradientText>
          </>
        }
        subtitle={companyInfo.promise}
      >
        <GlowButton component={Link} href="/contact" size="large">
          Partner with us
        </GlowButton>
      </PageHero>

      {/* Story */}
      <Box sx={{ background: SURFACE.white, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Reveal>
            <Typography sx={{ color: '#ffaf06', fontWeight: 700, letterSpacing: '0.16em', fontSize: '0.8rem', mb: 2 }}>
              OUR STORY
            </Typography>
          </Reveal>
          <Reveal delay={0.05}>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.6rem' }, lineHeight: 1.2, mb: 3, color: TEXT.heading }}>
              Built because B2B founders deserved a partner, not a vendor.
            </Typography>
          </Reveal>
          <Reveal delay={0.1}>
            <Typography sx={{ color: TEXT.body, fontSize: '1.1rem', lineHeight: 1.8, mb: 2.5 }}>
              {companyInfo.name} was founded in {companyInfo.founded} with a simple frustration: B2B
              companies were paying agencies that ran campaigns but never owned outcomes. Strategy
              decks were delivered, retainers were charged, and pipeline stayed flat.
            </Typography>
          </Reveal>
          <Reveal delay={0.15}>
            <Typography sx={{ color: TEXT.body, fontSize: '1.1rem', lineHeight: 1.8 }}>
              So we built the opposite. A partner that absorbs your pain, builds the strategy as if the
              business were ours, and executes a LinkedIn-led growth engine that turns attention into
              high-ticket deals. Today we operate across the {' '}
              <GradientText sx={{ fontWeight: 700 }}>US and India</GradientText>, partnering with
              founders who want predictable pipeline — not promises.
            </Typography>
          </Reveal>

          <Reveal delay={0.2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 4, color: TEXT.muted }}>
              <PublicIcon sx={{ color: '#14bb87' }} />
              <Typography>{companyInfo.headquarters} · {companyInfo.specialty}</Typography>
            </Box>
          </Reveal>
        </Container>
      </Box>

      {/* Stats */}
      <Box sx={{ background: SURFACE.cream, py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 3 }}>
            {stats.map((s) => (
              <Reveal key={s.label}>
                <Box sx={{ textAlign: 'center' }}>
                  <AnimatedCounter
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    decimals={s.value % 1 !== 0 ? 1 : 0}
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: '2rem', md: '2.8rem' },
                      background: 'linear-gradient(90deg,#ffaf06,#14bb87)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  />
                  <Typography sx={{ color: TEXT.muted, fontSize: '0.85rem', mt: 0.5 }}>
                    {s.label}
                  </Typography>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Manifesto */}
      <Box sx={{ background: SURFACE.mint, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <SectionHeading eyebrow="HOW WE THINK" title="The partner mindset" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 3 }}>
            {manifesto.map((m, i) => (
              <Reveal key={m.key} delay={i * 0.1}>
                <Box sx={{ p: 4, height: '100%', borderRadius: 4, background: CARD.bg, border: CARD.border, boxShadow: CARD.shadow }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, color: '#ffaf06' }}>{m.title}</Typography>
                  <Typography sx={{ color: TEXT.body, lineHeight: 1.7 }}>{m.description}</Typography>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Values */}
      <Box sx={{ background: SURFACE.sky, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <SectionHeading eyebrow="OUR VALUES" title="What we refuse to compromise on" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 3 }}>
            {values.map((v, i) => (
              <Reveal key={v.title} delay={(i % 2) * 0.1}>
                <TiltCard max={8} sx={{ height: '100%', borderRadius: 4 }}>
                  <Box
                    sx={{ display: 'flex', gap: 2.5, p: 3.5, height: '100%', borderRadius: 4, background: CARD.bg, border: CARD.border, boxShadow: CARD.shadow }}
                  >
                    <Box sx={{ flexShrink: 0, width: 54, height: 54, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: v.color, background: `${v.color}14`, border: `1px solid ${v.color}33` }}>
                      {v.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: TEXT.heading }}>{v.title}</Typography>
                      <Typography sx={{ color: TEXT.body, lineHeight: 1.65 }}>{v.description}</Typography>
                    </Box>
                  </Box>
                </TiltCard>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ background: SURFACE.ctaBold, color: '#fff', py: { xs: 10, md: 14 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Reveal>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.9rem', md: '2.6rem' }, color: '#fff' }}>
              Meet the team behind your growth
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.85)', mb: 4 }}>
              Senior operators who treat your pipeline like their own.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <GlowButton component={Link} href="/about/leadership" size="large">
                Meet the leadership
              </GlowButton>
            </Box>
          </Reveal>
        </Container>
      </Box>
    </Layout>
  );
};

export default AboutView;
