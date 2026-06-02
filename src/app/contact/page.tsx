'use client';

import React, { useRef, useState } from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import Link from 'next/link';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Layout } from '@/components/Layout';
import { PageHero, Reveal, SectionHeading, GradientText, FaqAccordion } from '@/components/cinematic';
import ContactForm from '@/components/Contact/ContactForm';
import { AIMarketerExperience } from '@/components/Contact/AIMarketer';
import { companyInfo, faqInfo } from '@/data/websiteInfo';

const promises = [
  'A senior strategist on the call — not a salesperson',
  'A clear read on your current growth gaps',
  'A concrete plan for your LinkedIn pipeline',
  'No obligation, no pressure',
];

export default function ContactPage() {
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  const handlePreferTyping = () => {
    setShowForm(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <Layout>
      <PageHero
        eyebrow="TALK TO OUR AI MARKETER"
        title={
          <>
            Let’s make your growth
            <br /> <GradientText>our problem.</GradientText>
          </>
        }
        subtitle="Speak with our AI Marketer right now. Tell it where you’re stuck — it’ll understand your business, research your company live, and map how the partnership turns LinkedIn into high-ticket pipeline."
      />

      {/* AI Marketer experience */}
      <Box sx={{ background: '#0a0a0f', color: '#fff', pt: { xs: 6, md: 9 }, pb: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Reveal>
            <AIMarketerExperience onPreferTyping={handlePreferTyping} />
          </Reveal>
        </Container>
      </Box>

      {/* Contact info + (optional) form */}
      <Box sx={{ background: '#0a0a0f', color: '#fff', pb: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: showForm ? '0.9fr 1.1fr' : '1fr' }, gap: { xs: 5, md: 6 }, alignItems: 'flex-start' }}>
            {/* Info side */}
            <Box>
              <Reveal>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
                  What happens next
                </Typography>
              </Reveal>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
                {promises.map((p, i) => (
                  <Reveal key={p} delay={i * 0.06}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <CheckCircleIcon sx={{ color: '#14bb87', fontSize: 22, mt: '1px' }} />
                      <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>{p}</Typography>
                    </Box>
                  </Reveal>
                ))}
              </Box>

              <Reveal delay={0.1}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <ContactRow icon={<EmailIcon />} color="#ffaf06" label="Email us" lines={[companyInfo.contact.email]} href={`mailto:${companyInfo.contact.email}`} />
                  <ContactRow icon={<PhoneIcon />} color="#14bb87" label="Call us" lines={companyInfo.contact.phone} />
                  <ContactRow icon={<LocationOnIcon />} color="#0A66C2" label="Offices" lines={companyInfo.contact.address} />
                  <ContactRow icon={<LinkedInIcon />} color="#0A66C2" label="Connect" lines={['Trayarunya Ventures on LinkedIn']} href={companyInfo.contact.socialMedia.linkedin} />
                </Box>
              </Reveal>
            </Box>

            {/* Form side (revealed on demand) */}
            {showForm && (
              <Box ref={formRef}>
                <Reveal direction="left">
                  <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 2 }}>
                    Prefer to type? Send us a message
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 0.5, md: 1 },
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <ContactForm />
                  </Paper>
                </Reveal>
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* FAQ */}
      <Box sx={{ background: 'linear-gradient(180deg,#0a0a0f,#07090d)', color: '#fff', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <SectionHeading dark eyebrow="QUESTIONS" title="Before you book" />
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
      <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', color, background: `${color}1f`, border: `1px solid ${color}40` }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.3 }}>{label}</Typography>
        {lines.map((l) => (
          <Typography key={l} sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.5 }}>
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
