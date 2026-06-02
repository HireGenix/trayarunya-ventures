'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import { motion } from 'framer-motion';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';

const FIELD_LABELS: Record<string, string> = {
  company: 'company name',
  name: 'your name',
  email: 'email address',
};

interface ConfirmInputProps {
  field: 'company' | 'name' | 'email' | null;
  onSubmit: (text: string) => void;
  onDismiss: () => void;
}

export default function ConfirmInput({ field, onSubmit, onDismiss }: ConfirmInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (field) {
      setValue('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [field]);

  if (!field) return null;

  const handleSubmit = () => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
    setValue('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
    >
      <Box
        sx={{
          mt: 1.5,
          p: 2,
          borderRadius: 3,
          background: 'rgba(255,175,6,0.07)',
          border: '1px solid rgba(255,175,6,0.35)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <EditIcon sx={{ fontSize: 16, color: '#ffaf06' }} />
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffaf06', letterSpacing: 0.3 }}>
            Type your {FIELD_LABELS[field] || field} for accuracy
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.2 }}>
          <TextField
            inputRef={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') onDismiss();
            }}
            placeholder={`Enter ${FIELD_LABELS[field] || field}…`}
            variant="filled"
            size="small"
            fullWidth
            autoComplete="off"
            InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.55)' } }}
            sx={{
              '& .MuiFilledInput-root': {
                background: 'rgba(255,255,255,0.07)',
                color: '#fff',
                borderRadius: 1.5,
                '&:hover, &.Mui-focused': { background: 'rgba(255,255,255,0.1)' },
                '&:before, &:after': { display: 'none' },
              },
              '& input': { color: '#fff', fontSize: '0.95rem' },
              '& input::placeholder': { color: 'rgba(255,255,255,0.4)' },
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={!value.trim()}
            sx={{
              minWidth: 44,
              height: 44,
              borderRadius: 2,
              background: value.trim() ? 'linear-gradient(135deg,#ffaf06,#ff7a06)' : 'rgba(255,255,255,0.06)',
              color: value.trim() ? '#0a0a0f' : 'rgba(255,255,255,0.3)',
              '&:hover': { background: 'linear-gradient(135deg,#ffbf2a,#ff8a1a)' },
            }}
          >
            <SendIcon sx={{ fontSize: 18 }} />
          </Button>
        </Box>
        <Typography
          onClick={onDismiss}
          sx={{ mt: 1, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', '&:hover': { color: 'rgba(255,255,255,0.6)' } }}
        >
          dismiss
        </Typography>
      </Box>
    </motion.div>
  );
}
