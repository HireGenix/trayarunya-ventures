'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import { Layout } from '@/components/Layout';
import { PageHero, Reveal, SectionHeading, GradientText, FaqAccordion, SURFACE, TEXT } from '@/components/cinematic';
import { AIMarketerExperience } from '@/components/Contact/AIMarketer';
import { companyInfo, faqInfo, stats, testimonials } from '@/data/websiteInfo';

const promises = [
  'A senior strategist on the call — not a salesperson',
  'A clear read on your current growth gaps',
  'A concrete plan for your LinkedIn pipeline',
  'No obligation, no pressure',
];

export default function ContactPage() {
  return (
    <Layout>
      <PageHero
        eyebrow="TALK TO OUR AI SALES PARTNER"
        title={
          <>
            Let’s make your growth
            <br /> <GradientText>our problem.</GradientText>
          </>
        }
        subtitle="Speak with our AI Sales Partner right now. Tell it where you’re stuck — it’ll understand your business, research your company live, capture your details, and map how the partnership turns LinkedIn into high-ticket pipeline."
      />

      {/* AI Marketer experience */}
      <Box sx={{ background: SURFACE.sky, color: TEXT.heading, pt: { xs: 6, md: 9 }, pb: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          {/* Urgency + reassurance bar */}
          <Reveal>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { xs: 1.5, md: 3 },
                mb: 4,
                px: 2.5,
                py: 1.5,
                borderRadius: 99,
                width: 'fit-content',
                mx: 'auto',
                background: '#ffffff',
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
              }}
            >
              {[
                { dot: '#14bb87', text: 'AI Partner online now', pulse: true },
                { dot: '#ffaf06', text: 'Replies within 4 hours' },
                { dot: '#0A66C2', text: 'No signup to start' },
              ].map((b) => (
                <Box key={b.text} sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
                  <Box
                    component={motion.span}
                    animate={b.pulse ? { scale: [1, 1.35, 1], opacity: [1, 0.5, 1] } : {}}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    sx={{ width: 9, height: 9, borderRadius: '50%', background: b.dot }}
                  />
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: TEXT.body }}>
                    {b.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Reveal>

          <Reveal>
            <AIMarketerExperience />
          </Reveal>

          {/* Social proof under the experience */}
          <Reveal delay={0.05}>
            <Box
              sx={{
                mt: 4,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
                gap: { xs: 2.5, md: 3 },
                alignItems: 'stretch',
              }}
            >
              {/* testimonial */}
              <Box
                sx={{
                  p: { xs: 3, md: 3.5 },
                  borderRadius: 4,
                  background: '#ffffff',
                  border: '1px solid rgba(15,23,42,0.08)',
                  boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
                }}
              >
                <Box sx={{ display: 'flex', gap: 0.2, mb: 1.5 }}>
                  {[0, 1, 2, 3, 4].map((s) => (
                    <StarIcon key={s} sx={{ fontSize: 18, color: '#ffaf06' }} />
                  ))}
                </Box>
                <Typography sx={{ color: TEXT.heading, fontSize: '1.02rem', lineHeight: 1.65, fontWeight: 500, mb: 2 }}>
                  “{testimonials[0].quote}”
                </Typography>
                <Typography sx={{ color: TEXT.muted, fontSize: '0.85rem' }}>
                  <Box component="span" sx={{ fontWeight: 700, color: TEXT.body }}>{testimonials[0].name}</Box> · {testimonials[0].position}, {testimonials[0].company}
                </Typography>
              </Box>
              {/* stats */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 1.5,
                }}
              >
                {stats.slice(0, 4).map((st) => (
                  <Box
                    key={st.label}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      textAlign: 'center',
                      background: '#ffffff',
                      border: '1px solid rgba(15,23,42,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: '1.4rem',
                        lineHeight: 1.1,
                        background: 'linear-gradient(90deg,#ffaf06,#14bb87)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {st.prefix || ''}{st.value}{st.suffix || ''}
                    </Typography>
                    <Typography sx={{ color: TEXT.muted, fontSize: '0.72rem', mt: 0.4, lineHeight: 1.3 }}>
                      {st.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Reveal>
        </Container>
      </Box>

      {/* Contact info */}
      <Box sx={{ background: SURFACE.sky, color: TEXT.heading, pb: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box>
            <Reveal>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: TEXT.heading }}>
                What happens next
              </Typography>
            </Reveal>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
              {promises.map((p, i) => (
                <Reveal key={p} delay={i * 0.06}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <CheckCircleIcon sx={{ color: '#14bb87', fontSize: 22, mt: '1px' }} />
                    <Typography sx={{ color: TEXT.body }}>{p}</Typography>
                  </Box>
                </Reveal>
              ))}
            </Box>

            <Reveal delay={0.1}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2.5, md: 4 } }}>
                <ContactRow icon={<EmailIcon />} color="#ffaf06" label="Email us" lines={[companyInfo.contact.email]} href={`mailto:${companyInfo.contact.email}`} />
                <ContactRow icon={<PhoneIcon />} color="#14bb87" label="Call us" lines={companyInfo.contact.phone} />
                <ContactRow icon={<LocationOnIcon />} color="#0A66C2" label="Offices" lines={companyInfo.contact.address} />
                <ContactRow icon={<LinkedInIcon />} color="#0A66C2" label="Connect" lines={['Trayarunya Ventures on LinkedIn']} href={companyInfo.contact.socialMedia.linkedin} />
              </Box>
            </Reveal>
          </Box>
        </Container>
      </Box>

      {/* FAQ */}
      <Box sx={{ background: SURFACE.mint, color: TEXT.heading, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <SectionHeading eyebrow="QUESTIONS" title="Before you book" />
          <FaqAccordion items={faqInfo} />
        </Container>
      </Box>
    </Layout>
  );
}

function ContactRow({
  icon,
  color,
  label,
  lines,
  href,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  lines: string[];
  href?: string;
}) {
  const content = (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', color, background: `${color}14`, border: `1px solid ${color}33` }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.3, color: TEXT.heading }}>{label}</Typography>
        {lines.map((l) => (
          <Typography key={l} sx={{ color: TEXT.muted, fontSize: '0.85rem', lineHeight: 1.5 }}>
            {l}
          </Typography>
        ))}
      </Box>
    </Box>
  );

  if (href) {
    return (
      <Box component={Link} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" sx={{ textDecoration: 'none' }}>
        {content}
      </Box>
    );
  }
  return content;
}
