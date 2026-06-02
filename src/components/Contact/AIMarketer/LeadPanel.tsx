'use client';

import React from 'react';
import { Box, Typography, TextField, Chip } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { LeadFields } from '@/lib/realtime/azureRealtime';

interface LeadPanelProps {
  fields: LeadFields;
  submitted: boolean;
  onChange: (fields: LeadFields) => void;
}

const TEXT_FIELDS: { key: keyof LeadFields; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'country', label: 'Country' },
  { key: 'industry', label: 'Industry' },
];

const SEGMENTS: Array<NonNullable<LeadFields['segment']>> = ['B2B', 'B2C', 'D2C'];

export default function LeadPanel({ fields, submitted, onChange }: LeadPanelProps) {
  const hasAny = Object.values(fields).some((v) => v);

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: { xs: 2.5, md: 3 },
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
          Your details
        </Typography>
        <AnimatePresence>
          {submitted && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <Chip
                icon={<CheckCircleIcon sx={{ color: '#14bb87 !important' }} />}
                label="Sent"
                size="small"
                sx={{
                  color: '#14bb87',
                  background: 'rgba(20,187,135,0.12)',
                  border: '1px solid rgba(20,187,135,0.3)',
                  fontWeight: 700,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {!hasAny && (
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', mb: 1 }}>
          As you chat, your details will appear here automatically — you can edit anything.
        </Typography>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        {TEXT_FIELDS.map((f) => (
          <FieldBox key={f.key} active={Boolean(fields[f.key])}>
            <TextField
              label={f.label}
              value={(fields[f.key] as string) || ''}
              onChange={(e) => onChange({ ...fields, [f.key]: e.target.value })}
              variant="filled"
              size="small"
              fullWidth
              disabled={submitted}
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.55)' } }}
              sx={inputSx}
            />
          </FieldBox>
        ))}
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', mb: 1, fontWeight: 600 }}>
          Go-to-market segment
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {SEGMENTS.map((s) => {
            const selected = fields.segment === s;
            return (
              <Chip
                key={s}
                label={s}
                onClick={submitted ? undefined : () => onChange({ ...fields, segment: s })}
                sx={{
                  fontWeight: 700,
                  cursor: submitted ? 'default' : 'pointer',
                  color: selected ? '#0a0a0f' : 'rgba(255,255,255,0.8)',
                  background: selected ? '#ffaf06' : 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  '&:hover': { background: selected ? '#ffaf06' : 'rgba(255,255,255,0.12)' },
                }}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function FieldBox({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      animate={
        active
          ? { boxShadow: '0 0 0 1px rgba(20,187,135,0.5)' }
          : { boxShadow: '0 0 0 0px rgba(20,187,135,0)' }
      }
      transition={{ duration: 0.4 }}
      style={{ borderRadius: 8 }}
    >
      {children}
    </motion.div>
  );
}

const inputSx = {
  '& .MuiFilledInput-root': {
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    borderRadius: 1.5,
    '&:hover': { background: 'rgba(255,255,255,0.08)' },
    '&.Mui-focused': { background: 'rgba(255,255,255,0.08)' },
    '&:before, &:after': { display: 'none' },
  },
  '& input': { color: '#fff' },
};
