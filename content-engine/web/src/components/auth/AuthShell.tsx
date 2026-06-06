'use client';

import { Box, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Logo } from '@/components/marketing/Logo';
import { BRAND } from '@/theme/theme';
import { stats } from '@/lib/marketing';

const FEATURES: { title: string; desc: string; color: string }[] = [
  { title: 'Deep Research', desc: 'Agents crawl your site and the live web to map real demand.', color: BRAND.teal },
  { title: 'Master Strategy', desc: 'Positioning, funnel and a dated content calendar in minutes.', color: BRAND.amber },
  { title: 'Creation Studio', desc: 'On-brand posts, carousels and decks written in your voice.', color: BRAND.pink },
  { title: 'Publish & Advertise', desc: 'Native scheduling plus agentic ads across every channel.', color: '#6366F1' },
  { title: 'Learn & Compound', desc: 'Real performance feeds back so every cycle gets sharper.', color: '#A855F7' },
];

/** A creative split-view auth layout: a branded feature panel on the left and
 *  the form (passed as children) on the right — together inside one big card. */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, md: 4 },
        background: `radial-gradient(1200px 600px at 0% 0%, ${BRAND.amberSoft} 0%, transparent 55%), radial-gradient(1000px 600px at 100% 100%, ${BRAND.tealSoft} 0%, transparent 55%), #F7F8FA`,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1060,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
          bgcolor: '#fff',
          borderRadius: 5,
          overflow: 'hidden',
          border: '1px solid #ECEEF1',
          boxShadow: '0 50px 120px -60px rgba(14,23,38,0.55)',
        }}
      >
        {/* Left — branded feature panel */}
        <Box
          sx={{
            position: 'relative',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            p: 5,
            color: '#fff',
            bgcolor: BRAND.ink,
            overflow: 'hidden',
          }}
        >
          {/* glows */}
          <Box sx={{ position: 'absolute', top: -120, left: -120, width: 320, height: 320, borderRadius: '50%', background: BRAND.gradient, filter: 'blur(90px)', opacity: 0.35 }} />
          <Box sx={{ position: 'absolute', bottom: -140, right: -100, width: 300, height: 300, borderRadius: '50%', background: BRAND.gradientWarm, filter: 'blur(90px)', opacity: 0.3 }} />

          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Logo size={28} href="/" light />

            <Typography sx={{ mt: 5, fontWeight: 800, fontSize: '1.9rem', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Your entire marketing team,{' '}
              <Box component="span" sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                on autopilot.
              </Box>
            </Typography>
            <Typography sx={{ mt: 1.5, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              One closed loop — research → strategy → creation → publishing → learning — across 30+ connected modules.
            </Typography>

            <Stack spacing={1.75} sx={{ mt: 4 }}>
              {FEATURES.map((f) => (
                <Stack key={f.title} direction="row" spacing={1.5} alignItems="flex-start">
                  <CheckCircleRoundedIcon sx={{ fontSize: 20, color: f.color, mt: '1px', flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{f.title}</Typography>
                    <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{f.desc}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>

            <Box sx={{ flexGrow: 1 }} />

            <Stack direction="row" spacing={3} sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              {stats.slice(0, 3).map((s) => (
                <Box key={s.label}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    {s.value}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>{s.label}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>

        {/* Right — form */}
        <Box sx={{ p: { xs: 3.5, md: 5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 3 }}>
            <Logo size={26} href="/" />
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: BRAND.amberDeep }}>
            {eyebrow}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.7rem', mt: 0.5, letterSpacing: '-0.02em' }}>
            {title}
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 1, mb: 3, fontSize: 14.5 }}>
            {subtitle}
          </Typography>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
