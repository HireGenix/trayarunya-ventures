'use client';

import React, { useRef, useState } from 'react';
import { Box, Typography, Button, TextField, CircularProgress } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CodeIcon from '@mui/icons-material/Code';
import ReplayIcon from '@mui/icons-material/Replay';
import PublicIcon from '@mui/icons-material/Public';
import TuneIcon from '@mui/icons-material/Tune';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InsightsIcon from '@mui/icons-material/Insights';

import { DASH } from '@/components/dashboard/tokens';
import { PillTabs, FeatureCard, GlassCard, DashSectionHeading } from '@/components/dashboard/primitives';
import { capabilities, type CapIcon } from '@/components/dashboard/capabilitiesData';

const ICONS: Record<CapIcon, React.ReactNode> = {
  loyalty: <FavoriteBorderIcon />,
  offer: <TrendingUpIcon />,
  campaign: <CampaignIcon />,
  personalize: <PersonOutlineIcon />,
  suppress: <RemoveCircleOutlineIcon />,
  conversionApi: <CodeIcon />,
  remarket: <ReplayIcon />,
  reach: <PublicIcon />,
  holdout: <TuneIcon />,
  omniExperiment: <ScienceOutlinedIcon />,
  aiDecision: <AutoAwesomeIcon />,
  campaignData: <InsightsIcon />,
};

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

/**
 * Agentic GTM strategist. Streams a recommendation for the active track,
 * grounded in the agency's real pipeline stats (server reads Postgres).
 */
function StrategistPanel({ track, trackLabel }: { track: string; trackLabel: string }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    if (streaming) return;
    setStreaming(true);
    setAnswer('');
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/admin/capabilities/advisor', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ track, question: question.trim() }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const detail = await res.json().catch(() => ({}));
        setError(detail?.message || 'The strategist is unavailable. Configure an AI provider to enable it.');
        setStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';
        for (const block of blocks) {
          const ev = block.split('\n').find((l) => l.startsWith('event:'))?.slice(6).trim();
          const dataLine = block.split('\n').find((l) => l.startsWith('data:'))?.slice(5).trim();
          if (!dataLine) continue;
          try {
            const data = JSON.parse(dataLine);
            if (ev === 'delta' && data.text) setAnswer((prev) => prev + data.text);
            else if (ev === 'error') setError(data.message || 'Stream error');
          } catch {
            /* ignore parse errors */
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError('Network error. Please try again.');
    } finally {
      setStreaming(false);
    }
  };

  return (
    <GlassCard sx={{ p: { xs: 2.5, md: 3.5 }, mt: { xs: 4, md: 6 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: DASH.pillActive,
            color: DASH.neon,
            '& svg': { fontSize: 22 },
          }}
        >
          <AutoAwesomeIcon />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: DASH.ink }}>AI CMO · {trackLabel}</Typography>
          <Typography sx={{ fontSize: 13, color: DASH.muted }}>
            Grounded in your live pipeline data — recommends the highest-leverage play and how to measure it.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: answer || error ? 2.5 : 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={`Ask the strategist about ${trackLabel.toLowerCase()}…`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') run();
          }}
          sx={{ flex: 1, minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
        />
        <Button
          onClick={run}
          disabled={streaming}
          variant="contained"
          startIcon={streaming ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
          sx={{
            borderRadius: 999,
            px: 3,
            bgcolor: DASH.pillActive,
            color: '#fff',
            border: `2px solid ${DASH.neon}`,
            boxShadow: `0 0 0 4px ${DASH.neonGlow}`,
            '&:hover': { bgcolor: '#000' },
          }}
        >
          {streaming ? 'Thinking…' : 'Generate play'}
        </Button>
      </Box>

      {error && (
        <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: '#ffe1e1', color: '#b01e38', fontSize: 13.5, fontWeight: 600 }}>
          {error}
        </Box>
      )}

      {answer && (
        <Box
          sx={{
            mt: 1,
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            bgcolor: '#f7f9f8',
            border: `1px solid ${DASH.line}`,
            fontSize: 14.5,
            lineHeight: 1.7,
            color: DASH.body,
            '& h1,& h2,& h3': { color: DASH.ink, fontWeight: 800, fontSize: 16, mt: 2, mb: 1 },
            '& ul,& ol': { pl: 3, m: 0 },
            '& li': { mb: 0.5 },
            '& strong': { color: DASH.ink },
            '& code': { bgcolor: '#eef0ef', px: 0.6, py: 0.2, borderRadius: 1, fontSize: 13 },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
        </Box>
      )}
    </GlassCard>
  );
}

export default function CapabilitiesPage() {
  const [tab, setTab] = useState(capabilities[0].key);
  const active = capabilities.find((t) => t.key === tab) ?? capabilities[0];

  const counts = capabilities
    .flatMap((t) => t.cards)
    .reduce(
      (acc, c) => {
        acc[c.status] += 1;
        return acc;
      },
      { live: 0, partial: 0, soon: 0 } as Record<string, number>,
    );

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
      {/* Heading */}
      <DashSectionHeading
        eyebrow="Marketing OS"
        title="Everything you can run from one cockpit"
        subtitle="Lifecycle, paid and experimentation — mapped to MarketiQ's live modules. Switch a track to see what ships today and what's on the roadmap."
      />

      {/* Coverage legend */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', mb: 4 }}>
        {[
          { label: `${counts.live} Live`, color: '#16a06a', bg: '#d8f6e6' },
          { label: `${counts.partial} Partial`, color: '#e8853a', bg: '#ffe7d0' },
          { label: `${counts.soon} On roadmap`, color: '#6d5cf0', bg: '#ece9ff' },
        ].map((s) => (
          <Box
            key={s.label}
            sx={{ px: 1.5, py: 0.6, borderRadius: 999, fontSize: 13, fontWeight: 800, color: s.color, bgcolor: s.bg }}
          >
            {s.label}
          </Box>
        ))}
      </Box>

      {/* Pill tabs */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 4, md: 6 } }}>
        <PillTabs tabs={capabilities.map((t) => ({ key: t.key, label: t.label }))} value={tab} onChange={setTab} />
      </Box>

      {/* Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
              gap: { xs: 2.5, md: 3 },
            }}
          >
            {active.cards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                style={{ height: '100%' }}
              >
                <GlassCard hover sx={{ p: { xs: 2.5, md: 3 }, height: '100%' }}>
                  <FeatureCard
                    tone={card.tone}
                    icon={ICONS[card.icon]}
                    title={card.title}
                    body={card.body}
                    status={card.status}
                  />
                  <Typography sx={{ mt: 2, fontSize: 12, fontWeight: 700, color: DASH.faint, letterSpacing: 0.3 }}>
                    {card.module}
                  </Typography>
                </GlassCard>
              </motion.div>
            ))}
          </Box>
        </motion.div>
      </AnimatePresence>

      {/* Agentic strategist grounded in real pipeline data */}
      <StrategistPanel track={active.key} trackLabel={active.label} />
    </Box>
  );
}
