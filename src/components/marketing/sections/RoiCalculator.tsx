'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Container, Slider, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import Link from 'next/link';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
const API_URL = 'https://api.mymarketiq.online';
import { roiCalc } from '@/lib/marketing';
import { DISPLAY } from '../fonts';
import { DAY, Glow, MotionBox, SectionHeading, shineBtnSx } from '../primitives';

interface ToolOpt { id: string; label: string; monthly_usd: number }
interface Estimate {
  plan_cost_usd: number;
  stack_replaced_usd: number;
  hours_saved_month: number;
  labor_value_usd: number;
  total_value_usd: number;
  net_value_usd: number;
  roi_multiple: number | null;
  payback_days: number | null;
}

/* Bundled catalog + formula — mirrors app/services/roi.py exactly so the
   calculator shows real math even before the API responds (and on static
   render). The API remains the source of truth; this is a resilient fallback. */
const TOOL_CATALOG: ToolOpt[] = [
  { id: 'jasper', label: 'Jasper (AI writing)', monthly_usd: 49 },
  { id: 'copyai', label: 'Copy.ai', monthly_usd: 49 },
  { id: 'adcreative', label: 'AdCreative.ai', monthly_usd: 109 },
  { id: 'hubspot', label: 'HubSpot Marketing', monthly_usd: 800 },
  { id: 'clay', label: 'Clay (enrichment)', monthly_usd: 349 },
  { id: 'apollo', label: 'Apollo.io', monthly_usd: 99 },
  { id: 'buffer', label: 'Buffer / Hootsuite', monthly_usd: 99 },
  { id: 'semrush', label: 'Semrush (SEO)', monthly_usd: 139 },
  { id: 'canva', label: 'Canva Teams', monthly_usd: 30 },
  { id: 'lavender', label: 'Lavender (outreach)', monthly_usd: 49 },
  { id: 'gamma', label: 'Gamma (decks)', monthly_usd: 20 },
  { id: 'freelancer', label: 'Freelance marketer (retainer)', monthly_usd: 2000 },
];
const PLAN_PRICE: Record<string, number> = { free: 0, starter: 299, growth: 999, agency: 2999 };
const HOURLY_USD = 65;
const AUTOMATABLE = 0.6;

function localEstimate(team: number, hours: number, plan: string, selected: string[], catalog: ToolOpt[]): Estimate {
  const byId = Object.fromEntries(catalog.map((t) => [t.id, t.monthly_usd]));
  const stack = selected.reduce((sum, id) => sum + (byId[id] ?? 0), 0);
  const hoursSaved = Math.round(hours * 4.33 * AUTOMATABLE * Math.max(1, team) * 10) / 10;
  const labor = Math.round(hoursSaved * HOURLY_USD);
  const planCost = PLAN_PRICE[plan] ?? PLAN_PRICE.growth;
  const total = stack + labor;
  const net = total - planCost;
  return {
    plan_cost_usd: planCost,
    stack_replaced_usd: stack,
    hours_saved_month: hoursSaved,
    labor_value_usd: labor,
    total_value_usd: total,
    net_value_usd: net,
    roi_multiple: planCost ? Math.round((total / planCost) * 10) / 10 : null,
    payback_days: net > 0 && planCost ? Math.max(1, Math.round(planCost / (total / 30))) : null,
  };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('request failed');
  return res.json();
}
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`);
  if (!res.ok) throw new Error('request failed');
  return res.json();
}

const PLANS = [
  { id: 'starter', label: 'Starter' },
  { id: 'growth', label: 'Growth' },
  { id: 'agency', label: 'Agency' },
];

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function RoiCalculator() {
  const [tools, setTools] = useState<ToolOpt[]>(TOOL_CATALOG);
  const [selected, setSelected] = useState<string[]>(roiCalc.defaultTools);
  const [team, setTeam] = useState(5);
  const [hours, setHours] = useState(12);
  const [plan, setPlan] = useState('growth');
  // Always start with real local math so nothing ever renders as $0/blank.
  const [result, setResult] = useState<Estimate | null>(() =>
    localEstimate(5, 12, 'growth', roiCalc.defaultTools, TOOL_CATALOG),
  );

  useEffect(() => {
    getJson<{ tools: ToolOpt[] }>('/roi/tools')
      .then((d) => d.tools?.length && setTools(d.tools))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Optimistic local result immediately, then reconcile with the API.
    setResult(localEstimate(team, hours, plan, selected, tools));
    postJson<Estimate>('/roi/estimate', { team_size: team, tools: selected, hours_per_week: hours, plan, currency: 'usd' })
      .then((r) => !cancelled && setResult(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [team, hours, plan, selected, tools]);

  const toggleTool = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]));

  const headlineRoi = useMemo(() => (result?.roi_multiple != null ? `${result.roi_multiple}×` : '—'), [result]);

  return (
    <Box id="roi" component="section" sx={{ position: 'relative', py: { xs: 9, md: 14 }, bgcolor: DAY.bg2, overflow: 'hidden', borderTop: `1px solid ${DAY.lineSoft}` }}>
      <Glow color={DAY.amber} size={560} sx={{ top: '-12%', right: '6%' }} opacity={0.1} />
      <Glow color={DAY.teal} size={520} sx={{ bottom: '-16%', left: '4%' }} opacity={0.1} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <SectionHeading eyebrow={roiCalc.eyebrow} title={roiCalc.title} subtitle={roiCalc.subtitle} eyebrowColor={DAY.amber} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: 3, alignItems: 'stretch' }}>
          {/* ---- Inputs ---- */}
          <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '22px', border: `1px solid ${DAY.line}`, background: '#fff', boxShadow: '0 10px 30px -22px rgba(12,20,36,0.18)' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: DAY.faint, letterSpacing: '0.08em', textTransform: 'uppercase', mb: 1.5 }}>
              Tools you’d replace
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3.5 }}>
              {tools.map((t) => {
                const on = selected.includes(t.id);
                return (
                  <Chip
                    key={t.id}
                    label={`${t.label} · $${t.monthly_usd}`}
                    onClick={() => toggleTool(t.id)}
                    sx={{
                      fontWeight: 600,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      color: on ? '#0E1422' : DAY.sub,
                      background: on ? DAY.gradient : '#fff',
                      border: `1px solid ${on ? 'transparent' : DAY.line}`,
                      '&:hover': { background: on ? DAY.gradient : DAY.bg2 },
                    }}
                  />
                );
              })}
            </Stack>

            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: DAY.text }}>Team size</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: DAY.teal }}>{team}</Typography>
            </Stack>
            <Slider value={team} min={1} max={50} onChange={(_, v) => setTeam(v as number)} sx={{ color: DAY.teal, mb: 2.5 }} />

            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: DAY.text }}>GTM hours / person / week</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: DAY.teal }}>{hours}h</Typography>
            </Stack>
            <Slider value={hours} min={1} max={40} onChange={(_, v) => setHours(v as number)} sx={{ color: DAY.amber, mb: 3 }} />

            <Typography sx={{ fontSize: 13, fontWeight: 700, color: DAY.text, mb: 1 }}>Plan</Typography>
            <ToggleButtonGroup
              exclusive
              value={plan}
              onChange={(_, v) => v && setPlan(v)}
              sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 700, borderColor: DAY.line, color: DAY.sub, px: 2.5 }, '& .Mui-selected': { color: '#0E1422 !important', background: `${DAY.gradient} !important` } }}
            >
              {PLANS.map((p) => (
                <ToggleButton key={p.id} value={p.id}>{p.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* ---- Result ---- */}
          <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: '22px', border: `1.5px solid ${DAY.teal}44`, background: 'linear-gradient(180deg,#fff,#F3FBF8)', boxShadow: '0 28px 70px -34px rgba(14,164,122,0.35)', display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: DAY.teal, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Your estimated return
            </Typography>
            <MotionBox key={headlineRoi} initial={{ scale: 0.9, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
              <Typography sx={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: { xs: '3rem', md: '3.6rem' }, lineHeight: 1, background: DAY.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', my: 1 }}>
                {headlineRoi}
              </Typography>
            </MotionBox>
            <Typography sx={{ fontSize: 13, color: DAY.sub, mb: 2.5 }}>
              return on a {usd(result?.plan_cost_usd ?? 0)}/mo plan
              {result?.payback_days != null && result.payback_days > 0 ? ` · pays for itself in ~${result.payback_days} days` : ''}
            </Typography>

            <Stack spacing={1.25} sx={{ flex: 1 }}>
              {[
                ['Stack replaced', usd(result?.stack_replaced_usd ?? 0) + '/mo'],
                ['Hours saved', `${result?.hours_saved_month ?? 0}/mo`],
                ['Labor value recovered', usd(result?.labor_value_usd ?? 0) + '/mo'],
                ['Total monthly value', usd(result?.total_value_usd ?? 0)],
              ].map(([k, v], i, arr) => (
                <Stack key={k} direction="row" justifyContent="space-between" alignItems="center" sx={{ pb: 1.25, borderBottom: i < arr.length - 1 ? `1px solid ${DAY.lineSoft}` : 'none' }}>
                  <Typography sx={{ fontSize: 13.5, color: DAY.sub }}>{k}</Typography>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: DAY.text, fontVariantNumeric: 'tabular-nums' }}>{v}</Typography>
                </Stack>
              ))}
            </Stack>

            <Box sx={{ mt: 2.5, p: 1.75, borderRadius: '12px', bgcolor: 'rgba(16,180,128,0.1)', border: `1px solid ${DAY.teal}33` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: DAY.teal }}>
                Net {usd(result?.net_value_usd ?? 0)} created every month
              </Typography>
            </Box>

            <Button component={Link} href="https://mymarketiq.online" fullWidth sx={{ ...shineBtnSx(), mt: 2.5 }} endIcon={<ArrowForwardRoundedIcon />}>
              Start free
            </Button>
            <Typography sx={{ mt: 1.5, fontSize: 11, color: DAY.faint, textAlign: 'center' }}>
              Real math from our pricing engine. Assumes ~60% of GTM execution is automatable. No sign-up to calculate.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
