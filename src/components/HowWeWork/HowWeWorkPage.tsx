'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Layout } from '@/components/Layout';
import { PageHero, Reveal, SectionHeading, GlowButton, GradientText, FaqAccordion, TiltCard, SURFACE, TEXT, CARD } from '@/components/cinematic';
import { LinkedInFunnelSection, WhyUsSection } from '@/components/Home';
import { manifesto, processSteps, faqInfo } from '@/data/websiteInfo';

const stepColors = ['#ffaf06', '#14bb87', '#0A66C2', '#8E44AD'];

const HowWeWorkPage = () => {
  return (
    <Layout>
      <PageHero
        eyebrow="HOW WE WORK"
        title={
          <>
            We don’t work for you.
            <br />
            We work <GradientText>as you.</GradientText>
          </>
        }
        subtitle="A look inside the partnership model and the operating system we use to turn your marketing into a predictable, LinkedIn-led growth engine."
      >
        <GlowButton component={Link} href="/contact" size="large">
          Start the partnership
        </GlowButton>
      </PageHero>

      {/* Manifesto pillars */}
      <Box sx={{ background: SURFACE.white, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <SectionHeading
            eyebrow="THE MODEL"
            title="Three commitments we make"
            subtitle="This is what “partner, not vendor” actually means in practice."
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 3 }}>
            {manifesto.map((m, i) => (
              <Reveal key={m.key} delay={i * 0.12}>
                <TiltCard max={9} sx={{ height: '100%', borderRadius: 4 }}>
                  <Box sx={{ p: 4, height: '100%', borderRadius: 4, background: CARD.bg, border: CARD.border, boxShadow: CARD.shadow }}>
                    <Typography sx={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1, mb: 2, background: 'linear-gradient(90deg,#ffaf06,#14bb87)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      0{i + 1}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: TEXT.heading }}>{m.title}</Typography>
                    <Typography sx={{ color: TEXT.body, lineHeight: 1.7 }}>{m.description}</Typography>
                  </Box>
                </TiltCard>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Vertical process timeline */}
      <Box sx={{ background: SURFACE.cream, py: { xs: 8, md: 14 } }}>
        <Container maxWidth="md">
          <SectionHeading
            eyebrow="THE OPERATING SYSTEM"
            title="From your pain to your pipeline"
            subtitle="Four stages we own end-to-end — no hand-offs, no junior account managers."
          />
          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                position: 'absolute',
                left: { xs: 27, md: 35 },
                top: 10,
                bottom: 10,
                width: 2,
                background: 'linear-gradient(180deg, #ffaf06, #14bb87, #0A66C2, #8E44AD)',
                opacity: 0.4,
              }}
            />
            {processSteps.map((step, i) => (
              <Reveal key={step.number} delay={0.05} amount={0.3}>
                <Box sx={{ display: 'flex', gap: { xs: 2.5, md: 4 }, mb: 4, position: 'relative' }}>
                  <Box
                    component={motion.div}
                    whileInView={{ scale: [0.6, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    sx={{
                      flexShrink: 0,
                      width: { xs: 56, md: 72 },
                      height: { xs: 56, md: 72 },
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                      fontSize: { xs: '1.2rem', md: '1.6rem' },
                      color: '#0a0a0a',
                      zIndex: 1,
                      background: `linear-gradient(135deg, ${stepColors[i]}, ${stepColors[(i + 1) % 4]})`,
                      boxShadow: `0 10px 30px ${stepColors[i]}55`,
                      border: '4px solid #ffffff',
                    }}
                  >
                    {step.number}
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      p: { xs: 3, md: 3.5 },
                      borderRadius: 4,
                      background: CARD.bg,
                      border: CARD.border,
                      boxShadow: CARD.shadow,
                    }}
                  >
                    <Typography sx={{ color: stepColors[i], fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.08em', mb: 0.5 }}>
                      {step.subtitle.toUpperCase()}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: TEXT.heading }}>{step.title}</Typography>
                    <Typography sx={{ color: TEXT.body, lineHeight: 1.7, mb: 2 }}>
                      {step.description}
                    </Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, color: stepColors[i], fontWeight: 600, fontSize: '0.88rem' }}>
                      <CheckCircleIcon sx={{ fontSize: 18 }} />
                      {step.deliverable}
                    </Box>
                  </Box>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      <LinkedInFunnelSection />

      <WhyUsSection />

      <Box sx={{ background: SURFACE.mint, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <SectionHeading eyebrow="QUESTIONS" title="The partnership, answered" />
          <FaqAccordion items={faqInfo} />
        </Container>
      </Box>

      <Box sx={{ background: SURFACE.ctaBold, color: '#fff', py: { xs: 10, md: 14 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Reveal>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.9rem', md: '2.6rem' }, color: '#fff' }}>
              Let’s make your growth our problem.
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.85)', mb: 4 }}>
              Book a strategy call and experience what a true marketing partner feels like.
            </Typography>
            <GlowButton component={Link} href="/contact" size="large">
              Book a Strategy Call
            </GlowButton>
          </Reveal>
        </Container>
      </Box>
    </Layout>
  );
};

export default HowWeWorkPage;
