'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import MicIcon from '@mui/icons-material/Mic';
import CallEndIcon from '@mui/icons-material/CallEnd';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import {
  AzureRealtimeMarketer,
  type LeadFields,
  type RealtimeStatus,
} from '@/lib/realtime/azureRealtime';
import VoiceOrb from './VoiceOrb';
import LiveTranscript, { type TranscriptLine } from './LiveTranscript';
import LeadPanel from './LeadPanel';
import ConfirmInput from './ConfirmInput';

interface Props {
  onPreferTyping: () => void;
}

export default function AIMarketerExperience({ onPreferTyping }: Props) {
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiLevel, setAiLevel] = useState(0);
  const [userLevel, setUserLevel] = useState(0);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [lead, setLead] = useState<LeadFields>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmField, setConfirmField] = useState<'company' | 'name' | 'email' | null>(null);

  const clientRef = useRef<AzureRealtimeMarketer | null>(null);
  const activeAssistantId = useRef<string | null>(null);
  const activeUserId = useRef<string | null>(null);

  const upsertLine = useCallback(
    (role: 'user' | 'assistant', text: string, done: boolean) => {
      const ref = role === 'assistant' ? activeAssistantId : activeUserId;
      setLines((prev) => {
        const next = [...prev];
        if (ref.current) {
          const idx = next.findIndex((l) => l.id === ref.current);
          if (idx >= 0) next[idx] = { ...next[idx], text };
        } else {
          const id = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          ref.current = id;
          next.push({ id, role, text });
        }
        return next;
      });
      if (done) ref.current = null;
    },
    []
  );

  const start = useCallback(async () => {
    setErrorReason(null);
    setErrorMsg(null);
    setLines([]);
    setLead({});
    setSubmitted(false);
    setConfirmField(null);

    const client = new AzureRealtimeMarketer({
      onStatus: (s, detail) => {
        setStatus(s);
        if (s === 'error' && detail) setErrorReason(detail);
      },
      onAiLevel: setAiLevel,
      onUserLevel: setUserLevel,
      onTranscript: upsertLine,
      onLeadUpdate: (fields) =>
        setLead((prev) => {
          const merged = { ...prev };
          (Object.keys(fields) as (keyof LeadFields)[]).forEach((k) => {
            if (fields[k]) (merged[k] as unknown) = fields[k];
          });
          return merged;
        }),
      onLeadSubmitted: () => setSubmitted(true),
      onError: (m) => setErrorMsg(m),
      onConfirmPrompt: (field) => setConfirmField(field),
    });
    clientRef.current = client;
    await client.start();
  }, [upsertLine]);

  const stop = useCallback(() => {
    clientRef.current?.stop('ended');
    clientRef.current = null;
    setAiLevel(0);
    setUserLevel(0);
    setConfirmField(null);
  }, []);

  const handleConfirmSubmit = useCallback((text: string) => {
    clientRef.current?.sendUserText(text);
    setConfirmField(null);
  }, []);

  const orbState: 'idle' | 'connecting' | 'live' =
    status === 'live' ? 'live' : status === 'connecting' || status === 'requesting-mic' ? 'connecting' : 'idle';

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'requesting-mic':
        return 'Allow your microphone to begin…';
      case 'connecting':
        return 'Connecting you to the AI Marketer…';
      case 'live':
        return 'Live — just start talking';
      case 'ended':
        return 'Call ended. Thanks for chatting!';
      default:
        return 'Talk to our AI Marketer about your growth';
    }
  }, [status]);

  const notConfigured = errorReason === 'not_configured';
  const micDenied = errorReason === 'mic_denied';

  return (
    <Box
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Box sx={{ p: { xs: 3, md: 4 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 4, md: 5 }, alignItems: 'center' }}>
          {/* Left: orb + controls */}
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, mb: 2, borderRadius: 99, border: '1px solid rgba(255,175,6,0.3)', background: 'rgba(255,175,6,0.08)' }}>
              <GraphicEqIcon sx={{ fontSize: 16, color: '#ffaf06' }} />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: 1, color: '#ffaf06' }}>
                LIVE AI MARKETER
              </Typography>
            </Box>

            <VoiceOrb aiLevel={aiLevel} userLevel={userLevel} state={orbState} />

            <Typography sx={{ mt: 2, mb: 3, color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', minHeight: 24 }}>
              {statusLabel}
            </Typography>

            {/* Controls */}
            <AnimatePresence mode="wait">
              {status === 'idle' || status === 'ended' ? (
                <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button
                    onClick={start}
                    startIcon={<MicIcon />}
                    sx={primaryBtnSx}
                  >
                    {status === 'ended' ? 'Talk again' : 'Start talking'}
                  </Button>
                </motion.div>
              ) : status === 'live' ? (
                <motion.div key="stop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button onClick={stop} startIcon={<CallEndIcon />} sx={endBtnSx}>
                    End call
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <CircularProgress size={28} sx={{ color: '#ffaf06' }} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error / fallback messaging */}
            <AnimatePresence>
              {(notConfigured || micDenied || (errorMsg && status === 'error')) && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Typography sx={{ mt: 2, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                    {notConfigured
                      ? 'The voice marketer isn’t available right now — no problem, you can type to us instead.'
                      : micDenied
                        ? 'We couldn’t access your microphone. You can enable it and retry, or just type to us.'
                        : errorMsg}
                  </Typography>
                </motion.div>
              )}
            </AnimatePresence>

            <Box sx={{ mt: 3 }}>
              <Button onClick={onPreferTyping} startIcon={<KeyboardIcon />} sx={textBtnSx}>
                Prefer to type? Use the form
              </Button>
            </Box>
          </Box>

          {/* Right: transcript + confirm input + lead panel */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box
              sx={{
                borderRadius: 3,
                p: 2,
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {lines.length === 0 ? (
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center', py: 4 }}>
                  Your conversation will appear here in realtime.
                </Typography>
              ) : (
                <LiveTranscript lines={lines} />
              )}
            </Box>

            {/* Inline confirm input — appears when AI asks for company/name/email */}
            <AnimatePresence>
              {confirmField && status === 'live' && (
                <ConfirmInput
                  field={confirmField}
                  onSubmit={handleConfirmSubmit}
                  onDismiss={() => setConfirmField(null)}
                />
              )}
            </AnimatePresence>

            <LeadPanel fields={lead} submitted={submitted} onChange={setLead} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const primaryBtnSx = {
  px: 4,
  py: 1.4,
  borderRadius: 99,
  fontWeight: 800,
  color: '#0a0a0f',
  background: 'linear-gradient(90deg,#ffaf06,#ff7a06)',
  textTransform: 'none' as const,
  fontSize: '1rem',
  boxShadow: '0 10px 30px rgba(255,175,6,0.35)',
  '&:hover': { background: 'linear-gradient(90deg,#ffbf2a,#ff8a1a)' },
};

const endBtnSx = {
  px: 4,
  py: 1.4,
  borderRadius: 99,
  fontWeight: 800,
  color: '#fff',
  background: 'rgba(255,59,48,0.85)',
  textTransform: 'none' as const,
  fontSize: '1rem',
  '&:hover': { background: 'rgba(255,59,48,1)' },
};

const textBtnSx = {
  color: 'rgba(255,255,255,0.6)',
  textTransform: 'none' as const,
  fontSize: '0.85rem',
  '&:hover': { color: '#fff', background: 'transparent' },
};
