'use client';

import { Box, Stack, Typography } from '@mui/material';
import { MotionBox, DAY } from '../primitives';
import { DISPLAY } from '../fonts';

/**
 * A clean, light-theme product mockup — the "show, don't tell" dashboard preview
 * a typical SaaS hero uses. Pure CSS/JSX (no screenshot), so it's crisp on every
 * display and reflects the real Revenue Brain cockpit at a glance.
 */
const STAGES = [
  ['Research', 92, DAY.teal],
  ['ICP', 84, DAY.blue],
  ['Strategy', 78, DAY.amber],
  ['Content', 66, DAY.pink],
  ['Campaigns', 58, DAY.violet],
  ['Pipeline', 71, DAY.teal],
] as const;

function Bar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: DAY.sub }}>{label}</Typography>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: DAY.text }}>{value}%</Typography>
      </Stack>
      <Box sx={{ height: 7, borderRadius: 999, bgcolor: 'rgba(13,23,44,0.06)', overflow: 'hidden' }}>
        <MotionBox
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
          sx={{ height: '100%', borderRadius: 999, background: color }}
        />
      </Box>
    </Box>
  );
}

export default function HeroMock() {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 30, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      sx={{ perspective: '1400px', width: '100%' }}
    >
      <Box
        sx={{
          borderRadius: '20px',
          border: `1px solid ${DAY.line}`,
          background: '#FFFFFF',
          boxShadow: '0 40px 80px -32px rgba(12,20,36,0.28), 0 12px 32px -16px rgba(12,20,36,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* window chrome */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${DAY.lineSoft}`, bgcolor: DAY.bg2 }}
        >
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <Box key={c} sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: c }} />
          ))}
          <Box
            sx={{
              ml: 1.5,
              flex: 1,
              maxWidth: 340,
              height: 22,
              borderRadius: 999,
              border: `1px solid ${DAY.line}`,
              bgcolor: '#fff',
              display: 'flex',
              alignItems: 'center',
              px: 1.5,
            }}
          >
            <Typography sx={{ fontSize: 11, color: DAY.faint }}>app.marketiq.ai/revenue-brain</Typography>
          </Box>
        </Stack>

        {/* body */}
        <Box sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: DAY.text }}>
                Revenue Brain
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: DAY.sub }}>Unified funnel · live coverage</Typography>
            </Box>
            <Box
              sx={{
                px: 1.4,
                py: 0.5,
                borderRadius: 999,
                bgcolor: 'rgba(16,180,128,0.12)',
                border: '1px solid rgba(16,180,128,0.25)',
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#0F7B5A' }}>74% · strong</Typography>
            </Box>
          </Stack>

          {/* KPI tiles */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, mb: 2.25 }}>
            {[
              ['Pipeline', '$1.2M', DAY.teal],
              ['Win rate', '34%', DAY.amber],
              ['Hygiene', '88%', DAY.violet],
            ].map(([k, v, c]) => (
              <Box
                key={k}
                sx={{ p: 1.5, borderRadius: '12px', border: `1px solid ${DAY.lineSoft}`, bgcolor: DAY.bg2 }}
              >
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: DAY.faint, textTransform: 'uppercase' }}>
                  {k}
                </Typography>
                <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, color: c as string }}>
                  {v}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* funnel bars */}
          <Stack spacing={1.4}>
            {STAGES.map(([label, value, color], i) => (
              <Bar key={label} label={label} value={value} color={color} delay={0.6 + i * 0.08} />
            ))}
          </Stack>

          {/* CMO directive chip */}
          <Box
            sx={{
              mt: 2.25,
              p: 1.5,
              borderRadius: '12px',
              border: `1px dashed ${DAY.line}`,
              bgcolor: 'rgba(124,92,246,0.05)',
            }}
          >
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: DAY.violet, textTransform: 'uppercase' }}>
              AI CMO directive
            </Typography>
            <Typography sx={{ fontSize: 12, color: DAY.text, mt: 0.25 }}>
              Advance 8 stalled deals in “proposal” — auto-coached, owners notified.
            </Typography>
          </Box>
        </Box>
      </Box>
    </MotionBox>
  );
}
