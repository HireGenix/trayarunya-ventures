'use client';

import { Box, Button, Chip, Container, Stack, Typography } from '@mui/material';
import AppleIcon from '@mui/icons-material/Apple';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { chromeExtension, desktop } from '@/lib/marketing';
import { DISPLAY } from '../fonts';
import { Eyebrow, Float, Glow, Magnetic, MotionBox, DAY, Reveal, Tilt3D } from '../primitives';

function ChromeLogo({ size = 28 }: { size?: number }) {
  return (
    <Box component="svg" viewBox="0 0 256 256" sx={{ width: size, height: size, display: 'block' }} aria-label="Google Chrome">
      <path
        d="M128.003 199.216c39.335 0 71.221-31.888 71.221-71.223s-31.886-71.223-71.221-71.223-71.222 31.888-71.222 71.223 31.887 71.223 71.222 71.223Z"
        fill="#FFFFFF"
      />
      <path
        d="M35.89 92.997c-5.313-9.203-11.558-18.862-18.736-28.977C5.917 83.477 0 105.55 0 128.02c0 22.47 5.914 44.543 17.15 64s27.397 35.616 46.857 46.846c19.46 11.23 41.535 17.14 64.004 17.135 11.781-16.523 19.78-28.437 23.996-35.74 8.099-14.028 18.573-34.112 31.423-60.251v-.015c-5.613 9.735-13.69 17.82-23.42 23.44-19.802 11.441-44.204 11.444-64.009.01-9.73-5.618-17.81-13.7-23.427-23.432C55.12 127.464 42.892 105.125 35.89 92.997Z"
        fill="#229342"
      />
      <path
        d="M128.008 255.996c22.469.004 44.543-5.91 64.001-17.143 19.459-11.233 35.617-27.393 46.85-46.853 11.233-19.46 17.144-41.534 17.141-64.003-.004-22.469-5.924-44.541-17.164-63.997-24.247-2.39-42.143-3.585-53.685-3.585-13.088 0-32.139 1.195-57.152 3.585l-.014.01c11.237-.006 22.276 2.947 32.009 8.562 9.733 5.616 17.815 13.694 23.435 23.424 11.438 19.805 11.437 44.207-.001 64.011l-55.42 95.99Z"
        fill="#FBC116"
      />
      <path
        d="M128.003 178.677c27.984 0 50.669-22.685 50.669-50.67 0-27.986-22.685-50.67-50.669-50.67-27.984 0-50.67 22.686-50.67 50.67 0 27.984 22.686 50.67 50.67 50.67Z"
        fill="#1A73E8"
      />
      <path
        d="M128.003 64.004H238.84c-11.232-19.46-27.389-35.62-46.847-46.857C172.535 5.912 150.462-.002 127.993 0 105.524 0 83.452 5.918 63.996 17.157c-19.457 11.238-35.612 27.4-46.84 46.862l55.419 95.99.015.008c-11.445-19.8-11.452-44.203-.02-64.01 5.616-9.732 13.697-17.814 23.428-23.432 9.73-5.617 20.77-8.575 32.007-8.572l-.002.001Z"
        fill="#E33B2E"
      />
    </Box>
  );
}

const glassCardSx = (color: string) => ({
  p: 2.25,
  borderRadius: '16px',
  border: `1px solid ${DAY.line}`,
  background: DAY.panel,
  boxShadow: '0 1px 2px rgba(12,20,36,0.04), 0 12px 30px -22px rgba(12,20,36,0.14)',
  transition: 'transform .3s cubic-bezier(.22,1,.36,1), border-color .3s ease, box-shadow .3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    borderColor: `${color}55`,
    boxShadow: `0 26px 48px -24px ${color}45`,
  },
});

const mockShellSx = {
  borderRadius: '20px',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, #FFFFFF, #F8FBFE)',
  border: `1px solid ${DAY.line}`,
  boxShadow: '0 40px 90px -40px rgba(12,20,36,0.3)',
};

function MockHeader({ label }: { label: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.4, bgcolor: '#F3F7FB', borderBottom: `1px solid ${DAY.lineSoft}` }}>
      <Stack direction="row" spacing={0.6}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c, opacity: 0.9 }} />
        ))}
      </Stack>
      <Box sx={{ flexGrow: 1 }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: DAY.faint }}>{label}</Typography>
    </Stack>
  );
}

function StatRow({ rows }: { rows: [string, string, string][] }) {
  return (
    <Stack spacing={1}>
      {rows.map(([k, v, c], i) => (
        <MotionBox
          key={k}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
          sx={{
            px: 1.75,
            py: 1.15,
            borderRadius: '10px',
            bgcolor: '#F3F7FB',
            border: `1px solid ${DAY.lineSoft}`,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c, mr: 1.25, boxShadow: `0 0 8px ${c}66` }} />
          <Typography sx={{ fontSize: 12.5, color: 'rgba(20,30,50,0.78)', flexGrow: 1 }}>{k}</Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: DAY.text }}>{v}</Typography>
        </MotionBox>
      ))}
    </Stack>
  );
}

function ExtensionMock() {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box sx={mockShellSx}>
        <MockHeader label="linkedin.com · MarketiQ Ai" />
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ borderRadius: '14px', p: 2.25, bgcolor: 'rgba(14,164,122,0.08)', border: '1px solid rgba(14,164,122,0.3)', mb: 1.75 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#0B8E68', mb: 0.75 }}>
              AI COACH · PROFILE ANALYSED
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: DAY.text, mb: 0.5 }}>Anika · VP Growth @ Finlay</Typography>
            <Typography sx={{ fontSize: 12.5, color: DAY.sub, lineHeight: 1.55 }}>
              Warm lead · engage first, then connect. Draft note ready — 214/280 characters.
            </Typography>
          </Box>
          <StatRow
            rows={[
              ['Profile audit score', '92 / 100', DAY.teal],
              ['Connect note', '✓ within 280 chars', DAY.amber],
              ['Pipeline sync', 'Engaged → logged', DAY.blue],
            ]}
          />
        </Box>
      </Box>
      <Box sx={{ position: 'absolute', top: -18, right: -14, display: { xs: 'none', sm: 'block' } }}>
        <Float duration={5} distance={10}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: '#fff', boxShadow: '0 18px 44px -12px rgba(26,115,232,0.6)' }}>
            <ChromeLogo size={34} />
          </Box>
        </Float>
      </Box>
    </Box>
  );
}

function DesktopMock() {
  return (
    <Box sx={mockShellSx}>
      <MockHeader label="LinkedIn Copilot · macOS" />
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ borderRadius: '14px', p: 2.25, bgcolor: 'rgba(46,124,246,0.08)', border: '1px solid rgba(46,124,246,0.35)', mb: 1.75 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#1D6AE5', mb: 0.75 }}>
            NEXT BEST ACTION
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: DAY.text, mb: 0.5 }}>
            Comment on Priya&apos;s post about RevOps
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: DAY.sub, lineHeight: 1.55 }}>
            High intent · warm lead · draft ready. You make the click — at a human pace.
          </Typography>
        </Box>
        <StatRow
          rows={[
            ['Profile strength', '92 / 100', DAY.teal],
            ['Leads in pipeline', '34 active', DAY.amber],
            ['Daily actions', '6 / 10 safe cap', DAY.blue],
          ]}
        />
      </Box>
    </Box>
  );
}

export default function Apps() {
  return (
    <>
      {/* ------------------------- Chrome extension ------------------------- */}
      <Box
        id="extension"
        component="section"
        sx={{ position: 'relative', py: { xs: 10, md: 14 }, scrollMarginTop: 80, bgcolor: DAY.bg, overflow: 'hidden' }}
      >
        <Glow color="#1A73E8" size={600} sx={{ top: '-12%', right: '-10%' }} opacity={0.1} />
        <Glow color="#E33B2E" size={460} sx={{ bottom: '-14%', left: '-8%' }} opacity={0.08} />
        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' }, gap: { xs: 6, md: 8 }, alignItems: 'center' }}>
            <Box>
              <Reveal>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
                  <ChromeLogo size={30} />
                  <Chip
                    label={chromeExtension.badge}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: 12, color: DAY.text, bgcolor: 'rgba(46,124,246,0.08)', border: '1px solid rgba(46,124,246,0.35)' }}
                  />
                </Stack>
              </Reveal>
              <Reveal delay={0.05}>
                <Typography
                  variant="h3"
                  sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: { xs: '1.65rem', md: '2.15rem' }, lineHeight: 1.16, letterSpacing: '-0.025em', color: DAY.text }}
                >
                  {chromeExtension.title}
                </Typography>
              </Reveal>
              <Reveal delay={0.1}>
                <Typography sx={{ mt: 2, fontSize: '1.03rem', lineHeight: 1.7, color: DAY.sub }}>{chromeExtension.subtitle}</Typography>
              </Reveal>
              <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {chromeExtension.features.map((p, i) => (
                  <MotionBox
                    key={p.title}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ delay: 0.12 + i * 0.07, duration: 0.45 }}
                  >
                    <Box sx={glassCardSx('#1A73E8')}>
                      <Typography sx={{ fontSize: 20, mb: 0.5 }}>{p.icon}</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: DAY.text }}>{p.title}</Typography>
                      <Typography sx={{ fontSize: 12.8, color: DAY.sub, lineHeight: 1.5, mt: 0.5 }}>{p.desc}</Typography>
                    </Box>
                  </MotionBox>
                ))}
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mt: 3.5 }}>
                <Magnetic>
                  <Button
                    component="a"
                    href={chromeExtension.storeUrl}
                    download="marketiq-ai-extension.zip"
                    size="large"
                    startIcon={<ChromeLogo size={20} />}
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{
                      px: 3.4,
                      py: 1.3,
                      fontWeight: 700,
                      borderRadius: '999px',
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      background: 'linear-gradient(135deg,#1A73E8,#0A66C2)',
                      boxShadow: '0 18px 40px -16px rgba(26,115,232,0.7)',
                      '&:hover': { filter: 'brightness(1.08)', background: 'linear-gradient(135deg,#1A73E8,#0A66C2)', transform: 'translateY(-2px)' },
                      transition: 'all .25s ease',
                    }}
                  >
                    {chromeExtension.cta}
                  </Button>
                </Magnetic>
                <Typography sx={{ fontSize: 13, color: DAY.faint }}>{chromeExtension.storeNote}</Typography>
              </Stack>
              <Stack spacing={0.75} sx={{ mt: 2.5 }}>
                {chromeExtension.steps.map((step, i) => (
                  <Stack key={step} direction="row" spacing={1.25} alignItems="center">
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#1D6AE5',
                        bgcolor: 'rgba(46,124,246,0.08)',
                        border: '1px solid rgba(46,124,246,0.35)',
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Typography sx={{ fontSize: 13.5, color: DAY.sub }}>{step}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
            <Reveal delay={0.12} y={34}>
              <Tilt3D max={8}>
                <ExtensionMock />
              </Tilt3D>
            </Reveal>
          </Box>
        </Container>
      </Box>

      {/* ------------------------- macOS desktop app ------------------------- */}
      <Box
        id="desktop"
        component="section"
        sx={{ position: 'relative', py: { xs: 10, md: 14 }, scrollMarginTop: 80, bgcolor: DAY.bg2, overflow: 'hidden' }}
      >
        <Glow color={DAY.blue} size={560} sx={{ top: '-10%', left: '-10%' }} opacity={0.09} />
        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' }, gap: { xs: 6, md: 8 }, alignItems: 'center' }}>
            <Reveal y={34}>
              <Tilt3D max={7}>
                <DesktopMock />
              </Tilt3D>
            </Reveal>
            <Box>
              <Reveal>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
                  <AppleIcon sx={{ fontSize: 22, color: DAY.text }} />
                  <Chip
                    label={desktop.badge}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: 12, color: DAY.text, bgcolor: 'rgba(46,124,246,0.08)', border: '1px solid rgba(46,124,246,0.35)' }}
                  />
                </Stack>
              </Reveal>
              <Reveal delay={0.05}>
                <Typography
                  variant="h3"
                  sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: { xs: '1.65rem', md: '2.15rem' }, lineHeight: 1.16, letterSpacing: '-0.025em', color: DAY.text }}
                >
                  {desktop.title}
                </Typography>
              </Reveal>
              <Reveal delay={0.1}>
                <Typography sx={{ mt: 2, fontSize: '1.03rem', lineHeight: 1.7, color: DAY.sub }}>{desktop.subtitle}</Typography>
              </Reveal>
              <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {desktop.principles.map((p, i) => (
                  <MotionBox
                    key={p.title}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ delay: 0.12 + i * 0.07, duration: 0.45 }}
                  >
                    <Box sx={glassCardSx(DAY.blue)}>
                      <Typography sx={{ fontSize: 20, mb: 0.5 }}>{p.icon}</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: DAY.text }}>{p.title}</Typography>
                      <Typography sx={{ fontSize: 12.8, color: DAY.sub, lineHeight: 1.5, mt: 0.5 }}>{p.desc}</Typography>
                    </Box>
                  </MotionBox>
                ))}
              </Box>
              <Stack direction="row" sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
                {desktop.modules.map((m) => (
                  <Chip
                    key={m}
                    label={m}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: 12,
                      color: DAY.sub,
                      bgcolor: '#FFFFFF',
                      border: `1px solid ${DAY.line}`,
                      '&:hover': { borderColor: DAY.blue, color: DAY.blue },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
