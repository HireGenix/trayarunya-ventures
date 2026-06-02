'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Layout } from '@/components/Layout';
import { PageHero, Reveal, SectionHeading, GlowButton, GradientText, FaqAccordion } from '@/components/cinematic';
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
      <Box sx={{ background: '#0a0a0f', color: '#fff', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <SectionHeading
            dark
            eyebrow="THE MODEL"
            title="Three commitments we make"
            subtitle="This is what “partner, not vendor” actually means in practice."
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 3 }}>
            {manifesto.map((m, i) => (
              <Reveal key={m.key} delay={i * 0.12}>
                <Box sx={{ p: 4, height: '100%', borderRadius: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography sx={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1, mb: 2, background: 'linear-gradient(90deg,#ffaf06,#14bb87)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    0{i + 1}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>{m.title}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>{m.description}</Typography>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Vertical process timeline */}
      <Box sx={{ background: 'linear-gradient(180deg,#0a0a0f,#07090d)', color: '#fff', py: { xs: 8, md: 14 } }}>
        <Container maxWidth="md">
          <SectionHeading
            dark
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
                      border: '4px solid #0a0a0f',
                    }}
                  >
                    {step.number}
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      p: { xs: 3, md: 3.5 },
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Typography sx={{ color: stepColors[i], fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.08em', mb: 0.5 }}>
                      {step.subtitle.toUpperCase()}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>{step.title}</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.68)', lineHeight: 1.7, mb: 2 }}>
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

      <Box sx={{ background: '#07090d', color: '#fff', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <SectionHeading dark eyebrow="QUESTIONS" title="The partnership, answered" />
          <FaqAccordion items={faqInfo} />
        </Container>
      </Box>

      <Box sx={{ background: 'radial-gradient(120% 120% at 50% 100%, #16161c 0%, #08080a 60%)', color: '#fff', py: { xs: 10, md: 14 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Reveal>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.9rem', md: '2.6rem' } }}>
              Let’s make your growth our problem.
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}>
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
