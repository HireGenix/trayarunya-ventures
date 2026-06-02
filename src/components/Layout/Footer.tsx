'use client';

import React from 'react';
import { Box, Container, Typography, IconButton, Divider, Button } from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { services } from '@/data/servicesData';
import { companyInfo } from '@/data/websiteInfo';
import BrandLogo from '@/components/cinematic/BrandLogo';

const companyLinks = [
  { name: 'How We Work', href: '/how-we-work' },
  { name: 'About', href: '/about' },
  { name: 'Insights', href: '/insights' },
  { name: 'Contact', href: '/contact' },
];

const legalLinks = [
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Terms of Service', href: '/terms' },
  { name: 'Cookie Policy', href: '/cookies' },
  { name: 'Compliance', href: '/compliance' },
];

const linkSx = {
  color: 'rgba(255,255,255,0.6)',
  textDecoration: 'none',
  fontSize: '0.9rem',
  transition: 'color 0.2s ease',
  '&:hover': { color: '#ffaf06' },
};

export default function Footer() {
  return (
    <Box component="footer" sx={{ background: '#060608', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      {/* CTA band */}
      <Box
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(120deg, rgba(255,175,6,0.08), rgba(20,187,135,0.08))',
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 3,
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                Ready to build your growth engine?
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.65)', maxWidth: 520 }}>
                Let’s turn your LinkedIn into a predictable high-ticket pipeline — together, as partners.
              </Typography>
            </Box>
            <Button
              component={Link}
              href="/contact"
              endIcon={<ArrowForwardIcon />}
              sx={{
                px: 3.5,
                py: 1.5,
                borderRadius: '50px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: '#0a0a0a',
                background: 'linear-gradient(95deg, #ffaf06, #14bb87)',
                '&:hover': { background: 'linear-gradient(95deg, #ffc046, #4dcca3)' },
              }}
            >
              Book a Strategy Call
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr 1fr', md: '1.6fr 1fr 1fr 1fr' },
            gap: 5,
          }}
        >
          {/* Brand */}
          <Box>
            <BrandLogo variant="light" size={40} />
            <Typography sx={{ mt: 2, color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', maxWidth: 320 }}>
              {companyInfo.promise}
            </Typography>
            <IconButton
              component="a"
              href={companyInfo.contact.socialMedia.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              sx={{
                mt: 2,
                color: '#fff',
                background: 'rgba(255,255,255,0.06)',
                '&:hover': { background: '#0A66C2' },
              }}
            >
              <LinkedInIcon />
            </IconButton>
          </Box>

          {/* Services */}
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 2, fontSize: '0.95rem' }}>Services</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {services.map((s) => (
                <Box key={s.slug} component={Link} href={`/services/${s.slug}`} sx={linkSx}>
                  {s.shortName}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Company */}
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 2, fontSize: '0.95rem' }}>Company</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {companyLinks.map((l) => (
                <Box key={l.href} component={Link} href={l.href} sx={linkSx}>
                  {l.name}
                </Box>
              ))}
            </Box>
            <Typography sx={{ fontWeight: 700, mt: 3, mb: 2, fontSize: '0.95rem' }}>Legal</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {legalLinks.map((l) => (
                <Box key={l.href} component={Link} href={l.href} sx={linkSx}>
                  {l.name}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Contact */}
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 2, fontSize: '0.95rem' }}>Get in touch</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                component="a"
                href={`mailto:${companyInfo.contact.email}`}
                sx={{ ...linkSx, display: 'flex', gap: 1.2, alignItems: 'flex-start' }}
              >
                <EmailIcon fontSize="small" sx={{ color: '#ffaf06', mt: '2px' }} />
                {companyInfo.contact.email}
              </Box>
              {companyInfo.contact.phone.map((p) => (
                <Box key={p} sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                  <PhoneIcon fontSize="small" sx={{ color: '#14bb87', mt: '2px' }} />
                  {p}
                </Box>
              ))}
              {companyInfo.contact.address.map((a) => (
                <Box key={a} sx={{ display: 'flex', gap: 1.2, alignItems: 'flex-start', color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <LocationIcon fontSize="small" sx={{ color: '#ffaf06', mt: '2px' }} />
                  {a}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 4 }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
            © {new Date().getFullYear()} {companyInfo.name}. All rights reserved.
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
            B2B growth partners · LinkedIn-led high-ticket pipeline
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
