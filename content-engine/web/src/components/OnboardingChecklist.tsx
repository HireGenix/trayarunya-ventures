'use client';

import Link from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import { BRAND } from '@/theme/theme';

const INK = '#11151B';
const SUBTLE = '#6B7280';
const LINE = '#EAECEF';

export type OnboardingStep = {
  label: string;
  description: string;
  href: string;
  done: boolean;
};

/**
 * A setup "command center" shown on the dashboard home until the workspace is
 * fully activated. Hides itself once every step is complete.
 */
export default function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const total = steps.length;
  const completed = steps.filter((s) => s.done).length;
  if (total === 0 || completed === total) return null;

  const pct = Math.round((completed / total) * 100);
  const next = steps.find((s) => !s.done);

  return (
    <Box
      sx={{
        mb: 2.5,
        p: { xs: 2, md: 2.5 },
        borderRadius: '24px',
        border: '1px solid',
        borderColor: LINE,
        background: 'linear-gradient(135deg,#FFFFFF 0%,#FAFBFC 100%)',
        boxShadow: '0 12px 30px rgba(14,17,22,0.05)',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2.5}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              sx={{
                px: 1,
                py: 0.35,
                borderRadius: '999px',
                background: BRAND.gradient,
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              GET STARTED
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: SUBTLE }}>
              {completed} of {total} complete
            </Typography>
          </Stack>
          <Typography sx={{ mt: 1, fontSize: { xs: 18, md: 20 }, fontWeight: 800, color: INK }}>
            Activate your marketing engine
          </Typography>
          {next && (
            <Typography sx={{ mt: 0.5, fontSize: 13.5, color: SUBTLE }}>
              Next up: <strong style={{ color: INK }}>{next.label}</strong> — {next.description}
            </Typography>
          )}
        </Box>

        {/* progress ring */}
        <Box sx={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
          <Box
            component="svg"
            viewBox="0 0 36 36"
            sx={{ width: 84, height: 84, transform: 'rotate(-90deg)' }}
          >
            <circle cx="18" cy="18" r="16" fill="none" stroke={LINE} strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke={BRAND.teal}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 100.53} 100.53`}
            />
          </Box>
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: INK }}>{pct}%</Typography>
          </Box>
        </Box>
      </Stack>

      <Stack spacing={1} sx={{ mt: 2 }}>
        {steps.map((s) => (
          <Box
            key={s.href}
            component={Link}
            href={s.href}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.5,
              py: 1.25,
              borderRadius: '14px',
              textDecoration: 'none',
              border: '1px solid',
              borderColor: s.done ? 'transparent' : LINE,
              bgcolor: s.done ? 'rgba(20,187,135,0.06)' : '#fff',
              transition: 'all .15s ease',
              '&:hover': { borderColor: s.done ? 'transparent' : 'rgba(14,17,22,0.18)', bgcolor: s.done ? 'rgba(20,187,135,0.08)' : '#FAFBFC' },
            }}
          >
            {s.done ? (
              <CheckCircleIcon sx={{ color: BRAND.teal, fontSize: 22 }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ color: '#C7CCD3', fontSize: 22 }} />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: s.done ? SUBTLE : INK,
                  textDecoration: s.done ? 'line-through' : 'none',
                }}
              >
                {s.label}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: SUBTLE }} noWrap>
                {s.description}
              </Typography>
            </Box>
            {!s.done && <ArrowForwardIcon sx={{ color: SUBTLE, fontSize: 18 }} />}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
