'use client';

import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface ChatThreadProps {
  messages: ChatMessage[];
  typing?: boolean;
  toolLabel?: string | null;
}

function TypingDots() {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, px: 0.5, py: 0.3 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          component={motion.span}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
          sx={{ width: 6, height: 6, borderRadius: '50%', background: '#ffaf06' }}
        />
      ))}
    </Box>
  );
}

export default function ChatThread({ messages, typing, toolLabel }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Track whether the user is pinned to the bottom so we never yank the page/view
  // away while they scroll up to re-read. We only auto-scroll the inner container.
  const pinnedRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pinnedRef.current) return;
    // Scroll ONLY the chat container, never the page (avoids the jump-down bug).
    el.scrollTop = el.scrollHeight;
  }, [messages, typing, toolLabel]);

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.2,
        maxHeight: { xs: 360, md: 440 },
        overflowY: 'auto',
        pr: 0.5,
      }}
    >
      {messages.length === 0 && !typing && (
        <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', py: 5 }}>
          Say hi 👋 and our AI Sales Partner will build your profile in realtime.
        </Typography>
      )}

      <AnimatePresence initial={false}>
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <Box
              key={m.id}
              component={motion.div}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}
            >
              <Box
                sx={{
                  maxWidth: '82%',
                  px: 1.8,
                  py: 1.1,
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser ? 'linear-gradient(135deg,#ffaf06,#ff7a06)' : '#ffffff',
                  color: isUser ? '#1a1206' : '#0f1320',
                  border: isUser ? 'none' : '1px solid rgba(15,23,42,0.08)',
                  boxShadow: isUser ? '0 4px 14px rgba(255,150,6,0.25)' : '0 2px 8px rgba(15,23,42,0.05)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.text || <TypingDots />}
              </Box>
            </Box>
          );
        })}
      </AnimatePresence>

      {toolLabel && (
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.8, pl: 0.5 }}
        >
          <Box
            component={motion.span}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid rgba(255,175,6,0.3)',
              borderTopColor: '#ffaf06',
            }}
          />
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', fontStyle: 'italic' }}>
            {toolLabel}…
          </Typography>
        </Box>
      )}

      {typing && !toolLabel && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Box
            sx={{
              px: 1.4,
              py: 0.6,
              borderRadius: '16px 16px 16px 4px',
              background: '#ffffff',
              border: '1px solid rgba(15,23,42,0.08)',
            }}
          >
            <TypingDots />
          </Box>
        </Box>
      )}
    </Box>
  );
}
