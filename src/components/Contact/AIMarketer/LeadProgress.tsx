'use client';

import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import CheckIcon from '@mui/icons-material/Check';
import type { LeadFields } from '@/lib/realtime/azureRealtime';

const STEPS: { key: keyof LeadFields; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'country', label: 'Country' },
];

export default function LeadProgress({ fields }: { fields: LeadFields }) {
  const { pct, done } = useMemo(() => {
    const filled = STEPS.filter((s) => Boolean((fields[s.key] as string)?.trim?.()));
    return { pct: Math.round((filled.length / STEPS.length) * 100), done: filled.length };
  }, [fields]);

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 2,
        background: '#ffffff',
        border: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '0 2px 10px rgba(15,23,42,0.04)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: 0.6, color: '#475569' }}>
          YOUR PROFILE
        </Typography>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: pct === 100 ? '#14bb87' : '#ffaf06' }}>
          {pct}%
        </Typography>
      </Box>

      <Box sx={{ height: 7, borderRadius: 99, background: 'rgba(15,23,42,0.06)', overflow: 'hidden', mb: 1.6 }}>
        <Box
          component={motion.div}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 160, damping: 24 }}
          sx={{
            height: '100%',
            borderRadius: 99,
            background: pct === 100 ? 'linear-gradient(90deg,#14bb87,#0fa874)' : 'linear-gradient(90deg,#ffaf06,#ff7a06)',
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
        {STEPS.map((s) => {
          const filled = Boolean((fields[s.key] as string)?.trim?.());
          return (
            <Box
              key={s.key}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.4,
                borderRadius: 99,
                fontSize: '0.72rem',
                fontWeight: 700,
                color: filled ? '#0f7a57' : '#94a3b8',
                background: filled ? 'rgba(20,187,135,0.12)' : 'rgba(15,23,42,0.04)',
                border: `1px solid ${filled ? 'rgba(20,187,135,0.3)' : 'rgba(15,23,42,0.08)'}`,
                transition: 'all .25s ease',
              }}
            >
              {filled ? (
                <CheckIcon sx={{ fontSize: 13 }} />
              ) : (
                <Box sx={{ width: 8, height: 8, borderRadius: 99, border: '1.5px solid #cbd5e1' }} />
              )}
              {s.label}
            </Box>
          );
        })}
      </Box>

      {pct === 100 && (
        <Typography sx={{ mt: 1.2, fontSize: '0.74rem', fontWeight: 700, color: '#14bb87' }}>
          All set — your strategist has everything they need 🎉
        </Typography>
      )}
      {done > 0 && pct < 100 && (
        <Typography sx={{ mt: 1.2, fontSize: '0.74rem', color: '#64748b' }}>
          {done} of {STEPS.length} captured — keep going.
        </Typography>
      )}
    </Box>
  );
}
