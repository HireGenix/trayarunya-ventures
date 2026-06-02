'use client';

import React from 'react';
import { Box, Typography, TextField, Chip, Button, CircularProgress } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import type { LeadFields } from '@/lib/realtime/azureRealtime';
import { CARD, TEXT, LINE } from '@/components/cinematic';

interface LeadPanelProps {
  fields: LeadFields;
  submitted: boolean;
  submitting?: boolean;
  onChange: (fields: LeadFields) => void;
  onSubmit?: () => void;
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

export default function LeadPanel({ fields, submitted, submitting, onChange, onSubmit }: LeadPanelProps) {
  const hasAny = Object.values(fields).some((v) => v);
  const canSubmit =
    Boolean(fields.name?.trim()) &&
    /\S+@\S+\.\S+/.test(fields.email?.trim() || '') &&
    !submitting &&
    !submitted;

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: { xs: 2.5, md: 3 },
        background: CARD.bg,
        border: CARD.border,
        boxShadow: CARD.shadow,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: TEXT.heading }}>
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
        <Typography sx={{ color: TEXT.muted, fontSize: '0.85rem', mb: 1 }}>
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
              InputLabelProps={{ sx: { color: TEXT.muted } }}
              sx={inputSx}
            />
          </FieldBox>
        ))}
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: '0.75rem', color: TEXT.muted, mb: 1, fontWeight: 600 }}>
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
                  color: selected ? '#0a0a0f' : TEXT.body,
                  background: selected ? '#ffaf06' : 'rgba(15,23,42,0.04)',
                  border: `1px solid ${LINE.soft}`,
                  '&:hover': { background: selected ? '#ffaf06' : 'rgba(15,23,42,0.08)' },
                }}
              />
            );
          })}
        </Box>
      </Box>

      {onSubmit && (
        <Box sx={{ mt: 2.5 }}>
          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
            startIcon={submitting ? <CircularProgress size={16} sx={{ color: '#0a0a0f' }} /> : <SendIcon />}
            fullWidth
            sx={{
              py: 1.2,
              borderRadius: 99,
              fontWeight: 800,
              textTransform: 'none',
              color: '#0a0a0f',
              background: 'linear-gradient(90deg,#ffaf06,#ff7a06)',
              boxShadow: '0 8px 24px rgba(255,175,6,0.3)',
              '&:hover': { background: 'linear-gradient(90deg,#ffbf2a,#ff8a1a)' },
              '&.Mui-disabled': { color: 'rgba(10,10,15,0.5)', background: 'rgba(255,175,6,0.25)' },
            }}
          >
            {submitted ? 'Sent to our team' : submitting ? 'Sending…' : 'Send to our team'}
          </Button>
          {!submitted && (
            <Typography sx={{ fontSize: '0.72rem', color: TEXT.muted, mt: 1, textAlign: 'center' }}>
              The AI sends this automatically — or fill it in and send it yourself.
            </Typography>
          )}
        </Box>
      )}
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
    background: 'rgba(15,23,42,0.04)',
    color: '#0f1320',
    borderRadius: 1.5,
    '&:hover': { background: 'rgba(15,23,42,0.06)' },
    '&.Mui-focused': { background: 'rgba(15,23,42,0.06)' },
    '&:before, &:after': { display: 'none' },
  },
  '& input': { color: '#0f1320' },
  '& label': { color: 'rgba(15,23,42,0.55)' },
};
