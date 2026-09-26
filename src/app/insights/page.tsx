'use client';

import React from 'react';
import { Box, Container, Typography, Chip } from '@mui/material';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { PageHero, Reveal, SectionHeading, GradientText, GlowButton, TiltCard, SURFACE, TEXT, CARD, LINE } from '@/components/cinematic';

const categories = [
  'AI Marketing',
  'GTM Strategy',
  'SEO & AI Search',
  'Performance Marketing',
  'Social & Content',
  'Automation & CRO',
];

const featured = {
  category: 'AI Marketing',
  readTime: '9 min read',
  title: 'Agentic AI marketing: how MarketiQ AI runs research, content and ads in one closed loop',
  excerpt:
    'Inside the agentic GTM platform we built and run for 50+ global clients — and why it outperforms stitching together a dozen generic AI tools.',
  accent: '#ffaf06',
};

const articles = [
  {
    category: 'SEO & AI Search',
    readTime: '7 min',
    title: 'SEO in the age of AI search: how to get recommended by ChatGPT, Gemini and Perplexity',
    excerpt:
      'Answer & Generative Engine Optimisation explained — and the content, schema and authority signals AI assistants actually trust.',
    color: '#14bb87',
  },
  {
    category: 'GTM Strategy',
    readTime: '8 min',
    title: 'The AI-first go-to-market playbook: from market research to launch in days',
    excerpt:
      'How agentic research and strategy compress weeks of GTM planning into days — without sacrificing depth or accuracy.',
    color: '#ffaf06',
  },
  {
    category: 'Automation & CRO',
    readTime: '6 min',
    title: 'Conversion rate optimisation that compounds: fixing the leaks between click and customer',
    excerpt:
      'Where funnels leak — and the testing and automation that quietly recover revenue you thought was lost.',
    color: '#0A66C2',
  },
  {
    category: 'Performance Marketing',
    readTime: '7 min',
    title: 'Scaling ROAS with AI: creative testing and budget allocation across Google and Meta',
    excerpt:
      'Audience, creative and bidding frameworks that let AI scale spend only where it returns — across every paid channel.',
    color: '#14bb87',
  },
  {
    category: 'Social & Content',
    readTime: '10 min',
    title: 'Content at AI speed: producing 10x more on-brand content without losing quality',
    excerpt:
      'How brand-aware AI studios and human editors work together to ship scroll-stopping content every single day.',
    color: '#ffaf06',
  },
  {
    category: 'AI Marketing',
    readTime: '5 min',
    title: 'Lessons from 50+ global clients: what actually drives growth across industries',
    excerpt:
      'Patterns we’ve seen across SaaS, e-commerce, healthcare, fintech and education — and how to apply them to your brand.',
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
            AI-powered marketing, <GradientText>decoded.</GradientText>
          </>
        }
        subtitle="Field-tested frameworks on AI marketing, GTM strategy, SEO, performance and content — straight from the team behind MarketiQ AI and 50+ global clients."
      />

      {/* Categories + Featured */}
      <Box sx={{ background: SURFACE.white, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Reveal>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, justifyContent: 'center', mb: { xs: 6, md: 8 } }}>
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  sx={{
                    color: TEXT.body,
                    background: 'rgba(15,23,42,0.04)',
                    border: `1px solid ${LINE.soft}`,
                    fontWeight: 600,
                    '&:hover': { borderColor: '#ffaf06', color: TEXT.heading },
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
                background: 'linear-gradient(135deg, #ffaf0614, #14bb870a)',
                border: CARD.border,
                boxShadow: CARD.shadow,
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                <Chip label="FEATURED" size="small" sx={{ background: featured.accent, color: '#0a0a0a', fontWeight: 800, fontSize: '0.65rem' }} />
                <Typography sx={{ color: TEXT.muted, fontSize: '0.8rem', fontWeight: 600 }}>
                  {featured.category} · {featured.readTime}
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', md: '2.4rem' }, lineHeight: 1.15, mb: 2, maxWidth: 820, color: TEXT.heading }}>
                {featured.title}
              </Typography>
              <Typography sx={{ color: TEXT.body, fontSize: '1.05rem', maxWidth: 720, mb: 3 }}>
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
      <Box sx={{ background: SURFACE.cream, pb: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <SectionHeading eyebrow="LATEST" title="More from the growth desk" />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            {articles.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.05}>
                <TiltCard max={9} sx={{ height: '100%', borderRadius: 3 }}>
                  <Box
                    sx={{
                      height: '100%',
                      p: 3.5,
                      borderRadius: 3,
                      background: CARD.bg,
                      border: CARD.border,
                      boxShadow: CARD.shadow,
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'border-color 0.3s',
                      '&:hover': { borderColor: `${a.color}66` },
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
                      <Typography sx={{ color: TEXT.muted, fontSize: '0.75rem', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {a.category} · {a.readTime}
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 1.5, color: TEXT.heading }}>
                      {a.title}
                    </Typography>
                    <Typography sx={{ color: TEXT.body, fontSize: '0.9rem', flexGrow: 1, mb: 2 }}>
                      {a.excerpt}
                    </Typography>
                    <Box component={Link} href="/contact" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.7, color: a.color, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
                      Talk it through <ArrowForwardIcon sx={{ fontSize: 16 }} />
                    </Box>
                  </Box>
                </TiltCard>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Newsletter / CTA */}
      <Box sx={{ background: SURFACE.ctaBold, color: '#fff', py: { xs: 10, md: 14 }, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Reveal>
            <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '1.9rem', md: '2.8rem' }, mb: 2, color: '#fff' }}>
              Want the strategy, not just the article?
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', mb: 4, maxWidth: 600, mx: 'auto' }}>
              Book a strategy call and we’ll apply these frameworks directly to your growth — powered by MarketiQ AI.
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
