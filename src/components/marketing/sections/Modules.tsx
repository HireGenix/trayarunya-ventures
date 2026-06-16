'use client';

import { Box, Container, Stack, Typography } from '@mui/material';
import { modules } from '@/lib/marketing';
import { DISPLAY } from '../fonts';
import { Glow, GridBg, MotionBox, DAY, SectionHeading, SpotlightCard } from '../primitives';

export default function Modules() {
  return (
    <Box component="section" sx={{ position: 'relative', py: { xs: 10, md: 15 }, bgcolor: DAY.bg, overflow: 'hidden' }}>
      <GridBg opacity={0.3} />
      <Glow color={DAY.blue} size={640} sx={{ top: '-10%', right: '-12%' }} opacity={0.09} />
      <Glow color={DAY.pink} size={560} sx={{ bottom: '-12%', left: '-10%' }} opacity={0.08} />

      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <SectionHeading eyebrow={modules.eyebrow} title={modules.title} subtitle={modules.subtitle} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {modules.groups.map((g, gi) => (
            <MotionBox
              key={g.name}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: gi * 0.07, ease: [0.22, 1, 0.36, 1] }}
              sx={{ height: '100%' }}
            >
              <SpotlightCard color={g.color}>
                <Box sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2.25 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: g.color,
                        boxShadow: `0 0 12px ${g.color}`,
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: DISPLAY,
                        fontWeight: 700,
                        fontSize: 13,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: DAY.text,
                      }}
                    >
                      {g.name}
                    </Typography>
                    <Box sx={{ flexGrow: 1, height: '1px', background: `linear-gradient(90deg, ${g.color}33, transparent)` }} />
                  </Stack>
                  <Stack spacing={1.6}>
                    {g.items.map(([name, desc]) => (
                      <Box
                        key={name}
                        sx={{
                          position: 'relative',
                          pl: 1.75,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: 5,
                            bottom: 5,
                            width: 2,
                            borderRadius: 2,
                            background: `${g.color}44`,
                            transition: 'background .25s ease, box-shadow .25s ease',
                          },
                          '&:hover::before': { background: g.color, boxShadow: `0 0 8px ${g.color}` },
                          '&:hover .mod-name': { color: g.color },
                        }}
                      >
                        <Typography className="mod-name" sx={{ fontWeight: 700, fontSize: 14.5, color: DAY.text, transition: 'color .25s ease' }}>
                          {name}
                        </Typography>
                        <Typography sx={{ fontSize: 12.8, color: DAY.sub, lineHeight: 1.5 }}>{desc}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </SpotlightCard>
            </MotionBox>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
