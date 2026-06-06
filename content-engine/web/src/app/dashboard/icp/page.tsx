'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonSearchIcon from '@mui/icons-material/PersonSearchOutlined';
import SendIcon from '@mui/icons-material/SendRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunchOutlined';
import { useRouter } from 'next/navigation';
import { ICPApi, type ICP, type ICPChatMessage } from '@/lib/api';
import { MarkdownMessage, TypingDots } from '@/components/MarkdownMessage';
import { BRAND } from '@/theme/theme';

const SEGMENT_COLORS: Record<string, string> = {
  B2B: '#2563EB',
  B2C: BRAND.pink,
  D2C: BRAND.amber,
};

const GREETING =
  "Hi! I'm your MarketIQ strategist. Before we research anything, let's nail down exactly who you are and who you sell to. " +
  "To start — what's your company name, and what do you do?";

function listOf(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
  return [];
}

export default function ICPPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ICPChatMessage[]>([
    { role: 'assistant', text: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [icp, setIcp] = useState<Record<string, unknown>>({});
  const [completeness, setCompleteness] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ICPApi.get()
      .then((row: ICP | null) => {
        if (row) {
          setIcp((row.raw as Record<string, unknown>) || (row as unknown as Record<string, unknown>));
          setCompleteness(row.completeness || 0);
          setDone(row.status === 'ready');
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    const next: ICPChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await ICPApi.chat(next, true);
      setMessages((m) => [...m, { role: 'assistant', text: res.message }]);
      setIcp(res.icp || {});
      setCompleteness(res.completeness || 0);
      setDone(res.done);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSending(false);
    }
  }, [input, sending, messages]);

  const segment = (icp.segment as string) || '';
  const fields: { label: string; value: unknown }[] = [
    { label: 'Industry', value: icp.industry },
    { label: 'Company', value: icp.company_name },
    { label: 'Website', value: icp.website },
    { label: 'What they sell', value: icp.value_prop },
    { label: 'Offer', value: icp.offer },
    { label: 'Target customer', value: icp.target_customer },
    { label: 'Brand voice', value: icp.brand_voice },
  ];
  const lists: { label: string; key: string }[] = [
    { label: 'Personas', key: 'personas' },
    { label: 'Pains', key: 'pains' },
    { label: 'Goals', key: 'goals' },
    { label: 'Geographies', key: 'geographies' },
    { label: 'Channels', key: 'channels' },
    { label: 'Keywords', key: 'keywords' },
    { label: 'Competitors', key: 'competitors' },
  ];
  const b2b = (icp.b2b as Record<string, unknown>) || null;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* command bar */}
      <Box sx={{
        position: 'relative', overflow: 'hidden', borderRadius: 4, mb: 2,
        p: { xs: 2, md: 2.5 }, color: '#fff',
        background: 'linear-gradient(135deg, #160E24 0%, #1E1430 50%, #0E1A17 100%)',
        boxShadow: '0 14px 38px rgba(76,29,149,0.26)',
      }}>
        <Box sx={{ position: 'absolute', top: -90, right: -50, width: 230, height: 230, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.42), transparent 65%)' }} />
        <Box sx={{ position: 'absolute', bottom: -110, left: '32%', width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND.teal}26, transparent 65%)` }} />
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, #7C3AED, #A855F7)', color: '#fff' }}>
            <PersonSearchIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 19, md: 22 }, fontWeight: 900, lineHeight: 1.12,
              background: 'linear-gradient(90deg, #C4B5FD, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Ideal Customer Profile
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.62)' }}>
              A quick chat builds the profile that grounds your research, strategy &amp; calendar.
            </Typography>
          </Box>
          {loaded && (
            <Box sx={{ position: 'relative', flexShrink: 0, display: { xs: 'none', sm: 'block' }, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 22, fontWeight: 900, lineHeight: 1,
                color: done ? BRAND.teal : '#fff' }}>{completeness}%</Typography>
              <Typography sx={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
                {done ? 'ready' : 'complete'}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' },
          gap: 2,
          mt: 0,
        }}
      >
        {/* Chat column */}
        <Box
          sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: 3,
            bgcolor: 'background.paper', display: 'flex', flexDirection: 'column',
            height: { xs: 520, md: 640 },
          }}
        >
          <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            <Stack spacing={1.5}>
              {messages.map((m, i) => (
                <Stack
                  key={i}
                  direction="row"
                  justifyContent={m.role === 'user' ? 'flex-end' : 'flex-start'}
                >
                  <Box
                    sx={{
                      maxWidth: '85%',
                      px: 1.75, py: 1.25, borderRadius: 2.5,
                      bgcolor: m.role === 'user' ? '#7C3AED' : 'action.hover',
                      color: m.role === 'user' ? '#fff' : 'text.primary',
                      lineHeight: 1.5,
                    }}
                  >
                    {m.role === 'user' ? (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.text}</Typography>
                    ) : (
                      <MarkdownMessage text={m.text} />
                    )}
                  </Box>
                </Stack>
              ))}
              {sending && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 0.5 }}>
                  <Box sx={{ px: 1.5, py: 1, borderRadius: 2.5, bgcolor: 'action.hover' }}>
                    <TypingDots label="Thinking & researching…" />
                  </Box>
                </Stack>
              )}
            </Stack>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mx: 1.5, mb: 1 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Divider />
          <Box sx={{ p: 1.5 }}>
            <Stack
              direction="row" spacing={0.5} alignItems="flex-end"
              sx={{
                px: 1, py: 0.5, borderRadius: 3,
                border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover',
                transition: 'border-color .15s',
                '&:focus-within': { borderColor: '#7C3AED' },
              }}
            >
              <TextField
                fullWidth
                size="small"
                multiline
                maxRows={4}
                variant="standard"
                placeholder="Type your answer…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={sending}
                InputProps={{ disableUnderline: true, sx: { px: 1, py: 0.75, fontSize: 14.5 } }}
              />
              <Button
                variant="contained"
                onClick={send}
                disabled={sending || !input.trim()}
                sx={{ borderRadius: 2.5, minWidth: 44, height: 38, px: 0, bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } }}
              >
                <SendIcon fontSize="small" />
              </Button>
            </Stack>
          </Box>
        </Box>

        {/* Live ICP panel */}
        <Box
          sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: 3,
            bgcolor: 'background.paper', p: 2,
            height: { xs: 'auto', md: 640 }, overflowY: 'auto',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <AutoAwesomeIcon fontSize="small" sx={{ color: '#7C3AED' }} />
            <Typography variant="subtitle1" fontWeight={700}>
              Profile so far
            </Typography>
            {segment && (
              <Chip
                size="small"
                label={segment}
                sx={{ bgcolor: SEGMENT_COLORS[segment] || '#7C3AED', color: '#fff', fontWeight: 700 }}
              />
            )}
          </Stack>

          <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Completeness
              </Typography>
              <Typography variant="caption" fontWeight={700} sx={{ color: done ? BRAND.teal : 'text.primary' }}>
                {completeness}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={completeness}
              sx={{
                height: 8, borderRadius: 4, bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: done
                    ? `linear-gradient(90deg, ${BRAND.teal}, ${BRAND.tealDeep})`
                    : 'linear-gradient(90deg, #7C3AED, #A855F7)',
                },
              }}
            />
          </Box>

          {!loaded ? (
            <CircularProgress size={20} />
          ) : (
            <Stack spacing={1.25} divider={<Divider flexItem />}>
              {fields
                .filter((f) => f.value)
                .map((f) => (
                  <Box key={f.label}>
                    <Typography variant="caption" color="text.secondary">
                      {f.label}
                    </Typography>
                    <Typography variant="body2">{String(f.value)}</Typography>
                  </Box>
                ))}
              {lists.map((l) => {
                const items = listOf(icp[l.key]);
                if (!items.length) return null;
                return (
                  <Box key={l.key}>
                    <Typography variant="caption" color="text.secondary">
                      {l.label}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                      {items.map((it, i) => (
                        <Chip key={i} size="small" label={it} variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                );
              })}
              {b2b && Object.values(b2b).some(Boolean) && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    B2B alignment (company ↔ personal)
                  </Typography>
                  {Object.entries(b2b).map(([k, v]) =>
                    v ? (
                      <Typography key={k} variant="body2">
                        <b>{k.replace(/_/g, ' ')}:</b> {String(v)}
                      </Typography>
                    ) : null,
                  )}
                </Box>
              )}
              {!Object.keys(icp).length && (
                <Typography variant="body2" color="text.secondary">
                  Answer a few questions and your profile will fill in here automatically.
                </Typography>
              )}
            </Stack>
          )}

          {done && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2.5, border: '1px solid', borderColor: `${BRAND.teal}55`,
              background: `linear-gradient(135deg, ${BRAND.teal}14, ${BRAND.amber}10)` }}>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                ✨ Your ICP is ready
              </Typography>
              <Button
                fullWidth
                variant="contained"
                startIcon={<RocketLaunchIcon />}
                sx={{ bgcolor: BRAND.teal, '&:hover': { bgcolor: BRAND.tealDeep } }}
                onClick={() => router.push('/dashboard/research?from=icp')}
              >
                Start research with this profile
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
