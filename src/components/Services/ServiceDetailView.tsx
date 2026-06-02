'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import Link from 'next/link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Layout } from '@/components/Layout';
import { PageHero, Reveal, GlowButton, ServiceIcon, TiltCard, AuroraBackground } from '@/components/cinematic';
import { ServiceData, services } from '@/data/servicesData';

const ServiceDetailView = ({ service }: { service: ServiceData }) => {
  const others = services.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <Layout>
      <PageHero
        eyebrow={service.flagship ? 'FLAGSHIP SERVICE' : 'SERVICE'}
        accent={service.color}
        title={service.name}
        subtitle={service.tagline}
      >
        <GlowButton component={Link} href="/contact" size="large">
          Make this your engine
        </GlowButton>
      </PageHero>

      {/* Summary + metrics */}
      <Box sx={{ position: 'relative', overflow: 'hidden', background: '#0a0a0f', color: '#fff', py: { xs: 8, md: 12 } }}>
        <AuroraBackground intensity={0.3} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' }, gap: { xs: 5, md: 8 }, alignItems: 'center' }}>
            <Reveal>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  display: 'grid',
                  placeItems: 'center',
                  color: service.color,
                  background: `${service.color}1f`,
                  border: `1px solid ${service.color}44`,
                  mb: 3,
                }}
              >
                <ServiceIcon name={service.icon} sx={{ fontSize: 32 }} />
              </Box>
              <Typography sx={{ fontSize: '1.15rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.8)' }}>
                {service.summary}
              </Typography>
            </Reveal>
            <Reveal delay={0.1}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1.5 }}>
                {service.metrics.map((m) => (
                  <TiltCard key={m.label} max={12} sx={{ borderRadius: 3 }}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: '1.4rem', md: '1.8rem' },
                          color: service.color,
                          lineHeight: 1.1,
                        }}
                      >
                        {m.value}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.74rem', mt: 0.5 }}>
                        {m.label}
                      </Typography>
                    </Box>
                  </TiltCard>
                ))}
              </Box>
            </Reveal>
          </Box>
        </Container>
      </Box>

      {/* Pain vs Outcome */}
      <Box sx={{ background: 'linear-gradient(180deg,#0a0a0f,#07090d)', color: '#fff', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Reveal direction="right">
              <Box sx={{ p: 4, height: '100%', borderRadius: 4, background: 'rgba(217,44,74,0.06)', border: '1px solid rgba(217,44,74,0.2)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, color: '#e35a72' }}>
                  <SentimentDissatisfiedIcon />
                  <Typography sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>THE PAIN</Typography>
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '1.05rem', lineHeight: 1.7 }}>
                  {service.pain}
                </Typography>
              </Box>
            </Reveal>
            <Reveal direction="left">
              <Box sx={{ p: 4, height: '100%', borderRadius: 4, background: 'rgba(20,187,135,0.06)', border: '1px solid rgba(20,187,135,0.25)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, color: '#14bb87' }}>
                  <EmojiEventsIcon />
                  <Typography sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>THE OUTCOME</Typography>
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem', lineHeight: 1.7 }}>
                  {service.outcome}
                </Typography>
              </Box>
            </Reveal>
          </Box>
        </Container>
      </Box>

      {/* What we do + deliverables */}
      <Box sx={{ background: '#07090d', color: '#fff', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 5, md: 8 } }}>
            <Box>
              <Reveal>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
                  What we own for you
                </Typography>
              </Reveal>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {service.whatWeDo.map((item, i) => (
                  <Reveal key={item} delay={i * 0.06}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <CheckCircleIcon sx={{ color: service.color, fontSize: 22, mt: '1px' }} />
                      <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.6 }}>
                        {item}
                      </Typography>
                    </Box>
                  </Reveal>
                ))}
              </Box>
            </Box>
            <Reveal direction="left">
              <Box sx={{ p: 4, borderRadius: 4, background: 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
                  What you get
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                  {service.deliverables.map((d) => (
                    <Box
                      key={d}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.8,
                        borderRadius: 2,
                        background: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: service.color, flexShrink: 0 }} />
                      <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>{d}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Reveal>
          </Box>
        </Container>
      </Box>

      {/* Other services */}
      <Box sx={{ background: '#050507', color: '#fff', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Reveal>
            <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center', mb: 5 }}>
              Explore more of the engine
            </Typography>
          </Reveal>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 3 }}>
            {others.map((s, i) => (
              <Reveal key={s.slug} delay={i * 0.1}>
                <TiltCard max={10} sx={{ height: '100%', borderRadius: 4 }}>
                  <Box
                    component={Link}
                    href={`/services/${s.slug}`}
                    sx={{
                      display: 'block',
                      p: 3,
                      height: '100%',
                      borderRadius: 4,
                      textDecoration: 'none',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      transition: 'border-color 0.3s ease',
                      '&:hover': { borderColor: `${s.color}55` },
                    }}
                  >
                    <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'grid', placeItems: 'center', color: s.color, background: `${s.color}1f`, mb: 2 }}>
                      <ServiceIcon name={s.icon} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>{s.shortName}</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.5, mb: 1.5 }}>
                      {s.tagline}
                    </Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: s.color, fontWeight: 600, fontSize: '0.85rem' }}>
                      Explore <ArrowForwardIcon sx={{ fontSize: 15 }} />
                    </Box>
                  </Box>
                </TiltCard>
              </Reveal>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ background: 'radial-gradient(120% 120% at 50% 100%, #16161c 0%, #08080a 60%)', color: '#fff', py: { xs: 10, md: 14 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Reveal>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.9rem', md: '2.6rem' } }}>
              Ready to make this your engine?
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}>
              Book a strategy call and we’ll map exactly how {service.shortName} drives your high-ticket pipeline.
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

export default ServiceDetailView;
