'use client';

import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const v = value.trim();
    if (!v || disabled) return;
    onSend(v);
    setValue('');
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.2 }}>
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Type a message…"
        variant="filled"
        size="small"
        fullWidth
        autoComplete="off"
        disabled={disabled}
        sx={{
          '& .MuiFilledInput-root': {
            background: 'rgba(15,23,42,0.04)',
            color: '#0f1320',
            borderRadius: 1.5,
            '&:hover, &.Mui-focused': { background: 'rgba(15,23,42,0.06)' },
            '&:before, &:after': { display: 'none' },
          },
          '& input': { color: '#0f1320', fontSize: '0.95rem' },
          '& input::placeholder': { color: 'rgba(15,23,42,0.4)' },
        }}
      />
      <Button
        onClick={submit}
        disabled={!value.trim() || disabled}
        sx={{
          minWidth: 44,
          height: 44,
          borderRadius: 2,
          background: value.trim() && !disabled ? 'linear-gradient(135deg,#ffaf06,#ff7a06)' : 'rgba(15,23,42,0.06)',
          color: value.trim() && !disabled ? '#0a0a0f' : 'rgba(15,23,42,0.3)',
          '&:hover': { background: 'linear-gradient(135deg,#ffbf2a,#ff8a1a)' },
        }}
      >
        <SendIcon sx={{ fontSize: 18 }} />
      </Button>
    </Box>
  );
}
