'use client';

import React from 'react';
import { Box, Container, Typography, Chip } from '@mui/material';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { PageHero, Reveal, SectionHeading, GradientText, GlowButton } from '@/components/cinematic';

const categories = [
  'LinkedIn Growth',
  'Demand Generation',
  'Personal Branding',
  'Sales Funnels',
  'Paid Ads',
  'Founder Strategy',
];

const featured = {
  category: 'LinkedIn Growth',
  readTime: '9 min read',
  title: 'The LinkedIn High-Ticket Engine: how B2B founders book qualified calls on repeat',
  excerpt:
    'The exact operating system we use to turn a founder’s profile, content and outreach into a predictable pipeline of economic buyers — without spammy automation.',
  accent: '#ffaf06',
};

const articles = [
  {
    category: 'Personal Branding',
    readTime: '7 min',
    title: 'Why your founder brand outperforms your company page (and how to scale it)',
    excerpt:
      'People buy from people. Here’s how to build founder-led authority that compounds into trust and inbound demand.',
    color: '#14bb87',
  },
  {
    category: 'Demand Generation',
    readTime: '8 min',
    title: 'Beyond MQLs: building a B2B demand engine that finance actually respects',
    excerpt:
      'Vanity leads vs. real pipeline. A framework for multi-channel demand that maps to revenue, not dashboards.',
    color: '#ffaf06',
  },
  {
    category: 'Sales Funnels',
    readTime: '6 min',
    title: 'The booked-call funnel: removing friction between a click and a calendar invite',
    excerpt:
      'Where high-ticket funnels leak — and the automation that quietly recovers deals you thought were lost.',
    color: '#0A66C2',
  },
  {
    category: 'Paid Ads',
    readTime: '7 min',
    title: 'LinkedIn Ads for high-ticket: how to make a $90 CPC actually pay off',
    excerpt:
      'Targeting, creative and offer structure for expensive clicks that still return outsized ROI in long sales cycles.',
    color: '#14bb87',
  },
  {
    category: 'Founder Strategy',
    readTime: '10 min',
    title: 'The partner model: why we own your pain instead of selling you deliverables',
    excerpt:
      'A look inside how we operate as an in-house growth team and what changes when accountability sits with us.',
    color: '#ffaf06',
  },
  {
    category: 'LinkedIn Growth',
    readTime: '5 min',
    title: 'Social selling without the cringe: outreach that decision-makers reply to',
    excerpt:
      'Scripts, sequencing and signals. How to start real conversations with buyers instead of pitch-slapping inboxes.',
    color: '#0A66C2',
  },
];

const MotionBox = motion(Box);

export default function InsightsPage() {
  return (
    <Layout>
      <PageHero
        eyebrow="INSIGHTS & PLAYBOOKS"
        title={
          <>
            B2B growth, <GradientText>decoded.</GradientText>
          </>
        }
        subtitle="Field-tested frameworks on LinkedIn, demand generation and high-ticket sales — straight from the team that executes them for partners every day."
      />

      {/* Categories + Featured */}
      <Box sx={{ background: '#0a0a0f', color: '#fff', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Reveal>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, justifyContent: 'center', mb: { xs: 6, md: 8 } }}>
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  sx={{
                    color: 'rgba(255,255,255,0.75)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontWeight: 600,
                    '&:hover': { borderColor: '#ffaf06', color: '#fff' },
                  }}
                />
              ))}
            </Box>
          </Reveal>

          {/* Featured */}
          <Reveal>
            <MotionBox
              whileHover={{ y: -4 }}
              sx={{
                position: 'relative',
                p: { xs: 4, md: 6 },
                borderRadius: 4,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(255,175,6,0.08), rgba(20,187,135,0.06))',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                <Chip label="FEATURED" size="small" sx={{ background: featured.accent, color: '#0a0a0a', fontWeight: 800, fontSize: '0.65rem' }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600 }}>
                  {featured.category} · {featured.readTime}
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', md: '2.4rem' }, lineHeight: 1.15, mb: 2, maxWidth: 820 }}>
                {featured.title}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', maxWidth: 720, mb: 3 }}>
                {featured.excerpt}
              </Typography>
              <Box component={Link} href="/contact" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: featured.accent, fontWeight: 700, textDecoration: 'none' }}>
                Get this playbook on a call <ArrowForwardIcon sx={{ fontSize: 18 }} />
              </Box>
            </MotionBox>
          </Reveal>
        </Container>
      </Box>

      {/* Articles grid */}
      <Box sx={{ background: 'linear-gradient(180deg,#0a0a0f,#07090d)', color: '#fff', pb: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <SectionHeading dark eyebrow="LATEST" title="More from the growth desk" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            {articles.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.05}>
                <MotionBox
                  whileHover={{ y: -6 }}
                  sx={{
                    height: '100%',
                    p: 3.5,
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'border-color 0.3s',
                    '&:hover': { borderColor: `${a.color}66` },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
                    <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      {a.category} · {a.readTime}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 1.5 }}>
                    {a.title}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', flexGrow: 1, mb: 2 }}>
                    {a.excerpt}
                  </Typography>
                  <Box component={Link} href="/contact" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7, color: a.color, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
                    Talk it through <ArrowForwardIcon sx={{ fontSize: 16 }} />
                  </Box>
                </MotionBox>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Newsletter / CTA */}
      <Box sx={{ background: '#07090d', color: '#fff', py: { xs: 10, md: 14 }, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Reveal>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.9rem', md: '2.8rem' }, mb: 2 }}>
              Want the strategy, not just the article?
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.1rem', mb: 4, maxWidth: 600, mx: 'auto' }}>
              Book a strategy call and we’ll apply these frameworks directly to your pipeline — as your partner.
            </Typography>
            <GlowButton component={Link} href="/contact">
              Book a Strategy Call
            </GlowButton>
          </Reveal>
        </Container>
      </Box>
    </Layout>
  );
}
