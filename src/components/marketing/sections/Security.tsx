'use client';

import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import ShieldRoundedIcon from '@mui/icons-material/ShieldOutlined';
import { security } from '@/lib/marketing';
import { DISPLAY } from '../fonts';
import { DAY, Glow, GridBg, MotionBox, SectionHeading } from '../primitives';

export default function Security() {
  return (
    <Box id="security" component="section" sx={{ position: 'relative', py: { xs: 9, md: 14 }, bgcolor: DAY.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.3} />
      <Glow color={DAY.blue} size={560} sx={{ top: '0%', right: '-12%' }} opacity={0.08} />
      <Glow color={DAY.violet} size={520} sx={{ bottom: '-12%', left: '-12%' }} opacity={0.08} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <SectionHeading eyebrow={security.eyebrow} title={security.title} subtitle={security.subtitle} eyebrowColor={DAY.blue} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2.5, mb: { xs: 4, md: 5 } }}>
          {security.pillars.map((p, i) => (
            <MotionBox
              key={p.k}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              sx={{
                p: 3,
                borderRadius: '18px',
                border: `1px solid ${DAY.line}`,
                background: '#fff',
                transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 24px 50px -30px ${p.color}55`, borderColor: `${p.color}55` },
              }}
            >
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', background: `${p.color}14`, border: `1px solid ${p.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.75 }}>
                <ShieldRoundedIcon sx={{ fontSize: 20, color: p.color }} />
              </Box>
              <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16.5, color: DAY.text, mb: 0.75 }}>{p.k}</Typography>
              <Typography sx={{ fontSize: 13.5, color: DAY.sub, lineHeight: 1.6 }}>{p.v}</Typography>
            </MotionBox>
          ))}
        </Box>

        {/* trust badges */}
        <Stack direction="row" flexWrap="wrap" gap={1.25} justifyContent="center">
          {security.badges.map((b) => (
            <Chip
              key={b}
              label={b}
              sx={{
                fontWeight: 700,
                fontSize: 12.5,
                color: DAY.sub,
                bgcolor: DAY.bg2,
                border: `1px solid ${DAY.line}`,
                px: 0.5,
              }}
            />
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
