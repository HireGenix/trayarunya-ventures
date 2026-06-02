'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Box, Typography, Button, IconButton, Tooltip, Dialog } from '@mui/material';
import { motion } from 'framer-motion';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChatThread, { type ChatMessage } from './ChatThread';
import ICPPanel, { type ICP } from './ICPPanel';
import ChatInput from './ChatInput';
import QuickReplies, { OPENER_PROMPTS, LIVE_PROMPTS } from './QuickReplies';

const TOOL_LABELS: Record<string, string> = {
  search_company: 'Researching their business',
  scrape_website: 'Reading their website',
  submit_lead: 'Sending to our team',
};

function uid(role: string) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

interface RealtimeChatExperienceProps {
  /** When rendered as a dedicated full-page route, hide the open-in-new-tab control. */
  standalone?: boolean;
}

export default function RealtimeChatExperience({ standalone = false }: RealtimeChatExperienceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [icp, setIcp] = useState<ICP>({});
  const [typing, setTyping] = useState(false);
  const [toolLabel, setToolLabel] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const mergeIcp = useCallback((patch: Partial<ICP>) => {
    setIcp((prev) => {
      const next: ICP = { ...prev };
      (Object.keys(patch) as (keyof ICP)[]).forEach((k) => {
        const v = patch[k];
        if (v === undefined || v === null || v === '') return;
        if (k === 'pain_points' && Array.isArray(v)) {
          const merged = new Set([...(prev.pain_points || []), ...(v as string[])]);
          next.pain_points = Array.from(merged);
        } else {
          (next[k] as unknown) = v;
        }
      });
      return next;
    });
  }, []);

  const send = useCallback(
    async (text: string, images?: string[], links?: string[]) => {
      const clean = text.trim();
      // Fold attached links into the message text so the AI scrapes them.
      const linkLine = links?.length ? `\n\nPlease review: ${links.join(' , ')}` : '';
      const outgoing = (clean + linkLine).trim();
      if ((!outgoing && !images?.length) || busy) return;
      setStarted(true);
      setBusy(true);

      const userMsg: ChatMessage = {
        id: uid('user'),
        role: 'user',
        text: outgoing || '(sent an attachment)',
        images,
      };
      const aiId = uid('assistant');
      const history = [...messagesRef.current, userMsg];
      setMessages([...history, { id: aiId, role: 'assistant', text: '' }]);
      setTyping(true);

      try {
        const res = await fetch('/api/ai-marketer/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, text: m.text, images: m.images })),
          }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || 'The AI is unavailable right now.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let aiText = '';

        const apply = (event: string, data: Record<string, unknown>) => {
          if (event === 'delta') {
            aiText += (data.text as string) || '';
            setTyping(false);
            setMessages((prev) =>
              prev.map((m) => (m.id === aiId ? { ...m, text: aiText } : m))
            );
          } else if (event === 'icp') {
            mergeIcp(data as Partial<ICP>);
          } else if (event === 'tool') {
            if (data.state === 'start') setToolLabel(TOOL_LABELS[data.tool as string] || 'Working');
            else setToolLabel(null);
          } else if (event === 'lead') {
            if (data.submitted) setSubmitted(true);
          } else if (event === 'error') {
            setTyping(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId && !m.text
                  ? { ...m, text: (data.message as string) || 'Something went wrong. Please try again.' }
                  : m
              )
            );
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';
          for (const block of blocks) {
            const lines = block.split('\n');
            const evLine = lines.find((l) => l.startsWith('event:'));
            const dataLine = lines.find((l) => l.startsWith('data:'));
            if (!evLine || !dataLine) continue;
            const event = evLine.slice(6).trim();
            try {
              apply(event, JSON.parse(dataLine.slice(5).trim()));
            } catch {
              /* ignore malformed */
            }
          }
        }

        // If no text ever streamed, show a gentle fallback.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId && !m.text
              ? { ...m, text: 'Sorry, I lost that for a second — could you say it again?' }
              : m
          )
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId && !m.text
              ? { ...m, text: (err as Error).message || 'The AI is unavailable. Please try again.' }
              : m
          )
        );
      } finally {
        setTyping(false);
        setToolLabel(null);
        setBusy(false);
      }
    },
    [busy, mergeIcp]
  );

  const hasIcp = Object.values(icp).some((v) => (Array.isArray(v) ? v.length : Boolean(v)));

  const inner = (
    <Box sx={{ p: { xs: 2.5, md: 3.5 }, maxWidth: fullscreen ? 1280 : 'none', mx: 'auto', width: '100%' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
            gap: { xs: 3, md: 4 },
            alignItems: 'start',
          }}
        >
          {/* Left: chat */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.8,
                    px: 1.4,
                    py: 0.5,
                    borderRadius: 99,
                    border: '1px solid rgba(255,175,6,0.3)',
                    background: 'rgba(255,175,6,0.08)',
                  }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 15, color: '#ffaf06' }} />
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 900, letterSpacing: 1, color: '#b8730a' }}>
                    LIVE AI SALES PARTNER
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    component={motion.span}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    sx={{ width: 8, height: 8, borderRadius: '50%', background: '#14bb87' }}
                  />
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f7a57' }}>
                    Online
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                  <IconButton
                    size="small"
                    onClick={() => setFullscreen((v) => !v)}
                    sx={{ color: '#64748b', '&:hover': { color: '#b8730a', background: 'rgba(255,175,6,0.1)' } }}
                  >
                    {fullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                {!standalone && (
                  <Tooltip title="Open in new tab">
                    <IconButton
                      size="small"
                      onClick={() => window.open('/ai-chat', '_blank', 'noopener')}
                      sx={{ color: '#64748b', '&:hover': { color: '#b8730a', background: 'rgba(255,175,6,0.1)' } }}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                borderRadius: 3,
                p: 2,
                background: '#f1f6ff',
                border: '1px solid rgba(15,23,42,0.06)',
              }}
            >
              <ChatThread messages={messages} typing={typing} toolLabel={toolLabel} />
            </Box>

            {!started ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  onClick={() => send('Hi')}
                  sx={{
                    alignSelf: 'flex-start',
                    px: 3,
                    py: 1.2,
                    borderRadius: 99,
                    fontWeight: 800,
                    textTransform: 'none',
                    color: '#1a1206',
                    background: 'linear-gradient(135deg,#ffaf06,#ff7a06)',
                    boxShadow: '0 6px 20px rgba(255,150,6,0.3)',
                    '&:hover': { background: 'linear-gradient(135deg,#ffbf2a,#ff8a1a)' },
                  }}
                >
                  Start the conversation
                </Button>
                <QuickReplies prompts={OPENER_PROMPTS} label="Or jump straight in:" onSelect={send} />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <QuickReplies prompts={LIVE_PROMPTS} onSelect={send} />
                <ChatInput onSend={send} disabled={busy} />
              </Box>
            )}
          </Box>

          {/* Right: live ICP */}
          <Box sx={{ position: { md: 'sticky' }, top: { md: 24 } }}>
            {hasIcp ? (
              <ICPPanel icp={icp} />
            ) : (
              <Box
                sx={{
                  borderRadius: 3,
                  p: 3,
                  textAlign: 'center',
                  background: '#fbfdff',
                  border: '1px dashed rgba(15,23,42,0.14)',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 30, color: '#ffaf06', mb: 1 }} />
                <Typography sx={{ fontWeight: 800, color: '#0f1320', mb: 0.5 }}>
                  Your live profile builds here
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                  As we chat, our AI researches your business and fills in your Ideal Customer
                  Profile — segment, pains, and an opportunity score — in realtime.
                </Typography>
              </Box>
            )}
            {submitted && (
              <Box
                component={motion.div}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{
                  mt: 2,
                  p: 1.6,
                  borderRadius: 2,
                  textAlign: 'center',
                  background: 'rgba(20,187,135,0.1)',
                  border: '1px solid rgba(20,187,135,0.3)',
                }}
              >
                <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f7a57' }}>
                  ✓ Sent to our team — a strategist will reach out shortly.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
  );

  if (fullscreen) {
    return (
      <Dialog
        fullScreen
        open
        onClose={() => setFullscreen(false)}
        PaperProps={{ sx: { background: 'linear-gradient(180deg,#fbfdff 0%,#f1f6ff 100%)' } }}
      >
        <Box sx={{ overflowY: 'auto', height: '100%' }}>{inner}</Box>
      </Dialog>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        background: '#ffffff',
        border: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '0 10px 40px rgba(15,23,42,0.07)',
      }}
    >
      {inner}
    </Box>
  );
}
