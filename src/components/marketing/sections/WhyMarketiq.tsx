'use client';

import { Box, Container, Stack, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { why } from '@/lib/marketing';
import { DISPLAY } from '../fonts';
import { DAY, Glow, GridBg, MotionBox, Reveal, SectionHeading } from '../primitives';

export default function WhyMarketiq() {
  return (
    <Box id="why" component="section" sx={{ position: 'relative', py: { xs: 9, md: 14 }, bgcolor: DAY.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.35} />
      <Glow color={DAY.violet} size={560} sx={{ top: '8%', left: '-12%' }} opacity={0.08} />
      <Glow color={DAY.teal} size={520} sx={{ bottom: '-10%', right: '-12%' }} opacity={0.1} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <SectionHeading eyebrow={why.eyebrow} title={why.title} subtitle={why.subtitle} eyebrowColor={DAY.violet} />

        {/* before / after */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
            gap: { xs: 2.5, md: 0 },
            alignItems: 'stretch',
            mb: { xs: 7, md: 9 },
          }}
        >
          {/* before */}
          <Reveal>
            <Box
              sx={{
                height: '100%',
                p: { xs: 3, md: 3.5 },
                borderRadius: '20px',
                border: `1px solid ${DAY.line}`,
                background: '#fff',
                boxShadow: '0 10px 30px -22px rgba(12,20,36,0.18)',
              }}
            >
              <Typography sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.08em', color: DAY.faint, textTransform: 'uppercase', mb: 2 }}>
                {why.before.label}
              </Typography>
              <Stack spacing={1.5}>
                {why.before.points.map((p) => (
                  <Stack key={p} direction="row" spacing={1.25} alignItems="flex-start">
                    <Box sx={{ mt: 0.25, width: 20, height: 20, borderRadius: '50%', bgcolor: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CloseRoundedIcon sx={{ fontSize: 13, color: DAY.pink }} />
                    </Box>
                    <Typography sx={{ fontSize: 14, color: DAY.sub, lineHeight: 1.5 }}>{p}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Reveal>

          {/* arrow divider */}
          <Stack alignItems="center" justifyContent="center" sx={{ px: { md: 3 }, py: { xs: 1, md: 0 } }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: DAY.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 14px 30px -14px rgba(14,164,122,0.5)',
                transform: { xs: 'rotate(90deg)', md: 'none' },
              }}
            >
              <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, color: '#0E1422' }}>→</Typography>
            </Box>
          </Stack>

          {/* after */}
          <Reveal delay={0.1}>
            <Box
              sx={{
                height: '100%',
                p: { xs: 3, md: 3.5 },
                borderRadius: '20px',
                border: `1.5px solid ${DAY.teal}55`,
                background: 'linear-gradient(180deg,#fff, #F3FBF8)',
                boxShadow: '0 24px 60px -28px rgba(14,164,122,0.3)',
              }}
            >
              <Typography sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.08em', color: DAY.teal, textTransform: 'uppercase', mb: 2 }}>
                {why.after.label}
              </Typography>
              <Stack spacing={1.5}>
                {why.after.points.map((p) => (
                  <Stack key={p} direction="row" spacing={1.25} alignItems="flex-start">
                    <Box sx={{ mt: 0.25, width: 20, height: 20, borderRadius: '50%', bgcolor: 'rgba(16,180,128,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckRoundedIcon sx={{ fontSize: 13, color: DAY.teal }} />
                    </Box>
                    <Typography sx={{ fontSize: 14, color: DAY.text, lineHeight: 1.5, fontWeight: 500 }}>{p}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Reveal>
        </Box>

        {/* reasons grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {why.reasons.map((r, i) => (
            <MotionBox
              key={r.k}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              sx={{
                p: 3,
                borderRadius: '18px',
                border: `1px solid ${DAY.line}`,
                background: '#fff',
                transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 24px 50px -30px ${r.color}66`, borderColor: `${r.color}55` },
              }}
            >
              <Box sx={{ width: 38, height: 38, borderRadius: '11px', background: `${r.color}14`, border: `1px solid ${r.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.75 }}>
                <Box sx={{ width: 13, height: 13, borderRadius: '50%', background: r.color, boxShadow: `0 0 10px ${r.color}88` }} />
              </Box>
              <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, color: DAY.text, mb: 0.75 }}>{r.k}</Typography>
              <Typography sx={{ fontSize: 13.5, color: DAY.sub, lineHeight: 1.6 }}>{r.v}</Typography>
            </MotionBox>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
