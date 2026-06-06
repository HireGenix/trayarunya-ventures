'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  alpha,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import SegmentRoundedIcon from '@mui/icons-material/SegmentRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  CRO,
  type CROExperiment,
  type CROExperimentDetail,
  type CROAction,
  type CROSettings,
  type CROSegments,
  type CROPrediction,
} from '@/lib/api';
import { BRAND } from '@/theme/theme';

const VERDICT_COLOR: Record<string, string> = {
  significant: BRAND.teal,
  inconclusive: BRAND.amber,
  needs_more_data: '#6B7280',
};

const PRIORITY_COLOR: Record<string, string> = {
  high: BRAND.pink,
  medium: BRAND.amber,
  low: BRAND.teal,
};

function money(n: number): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

/* ------------------------------------------------------------------ */
/* Experiments tab                                                     */
/* ------------------------------------------------------------------ */
export function ExperimentsTab() {
  const [list, setList] = useState<CROExperiment[]>([]);
  const [detail, setDetail] = useState<CROExperimentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await CRO.listExperiments();
      setList(res.experiments);
      setDetail((cur) => {
        if (!cur && res.experiments.length) {
          void CRO.getExperiment(res.experiments[0].id).then(setDetail);
        }
        return cur;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (id: string) => {
    try {
      setDetail(await CRO.getExperiment(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const autoCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await CRO.autoExperiment(false);
      setDetail(d);
      const res = await CRO.listExperiments();
      setList(res.experiments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No leak to auto-fix yet');
    } finally {
      setBusy(false);
    }
  };

  const ship = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      setDetail(await CRO.shipWinner(id));
      const res = await CRO.listExperiments();
      setList(res.experiments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cannot ship yet');
    } finally {
      setBusy(false);
    }
  };

  const start = async (id: string) => {
    setBusy(true);
    try {
      await CRO.startExperiment(id);
      await open(id);
      const res = await CRO.listExperiments();
      setList(res.experiments);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Typography sx={{ fontWeight: 800, fontSize: 17 }}>Full-funnel experiments</Typography>
        <Button
          onClick={() => void autoCreate()}
          disabled={busy}
          startIcon={<AutoAwesomeRoundedIcon />}
          variant="contained"
          sx={{ bgcolor: BRAND.teal, fontWeight: 700, '&:hover': { bgcolor: BRAND.tealDeep } }}
        >
          Auto-design from biggest leak
        </Button>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2 }}>
              {loading ? (
                <Stack alignItems="center" sx={{ py: 3 }}>
                  <CircularProgress size={26} />
                </Stack>
              ) : list.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                  No experiments yet. Auto-design one from your biggest funnel leak.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {list.map((e) => (
                    <Box
                      key={e.id}
                      onClick={() => void open(e.id)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: detail?.id === e.id ? BRAND.teal : 'divider',
                        bgcolor: detail?.id === e.id ? alpha(BRAND.teal, 0.06) : 'transparent',
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Chip
                          label={e.surface}
                          size="small"
                          sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: alpha(BRAND.amber, 0.14), color: BRAND.amberDeep }}
                        />
                        <Chip
                          label={e.status}
                          size="small"
                          sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: alpha('#6B7280', 0.12), color: '#374151' }}
                        />
                      </Stack>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3 }}>{e.name}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {detail ? (
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{detail.name}</Typography>
                    {detail.hypothesis && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {detail.hypothesis}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={detail.evaluation.verdict.replace(/_/g, ' ')}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      textTransform: 'capitalize',
                      bgcolor: alpha(VERDICT_COLOR[detail.evaluation.verdict] || '#6B7280', 0.14),
                      color: VERDICT_COLOR[detail.evaluation.verdict] || '#6B7280',
                    }}
                  />
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                  {detail.status === 'draft' && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void start(detail.id)}
                      disabled={busy}
                      startIcon={<RocketLaunchRoundedIcon />}
                    >
                      Launch
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busy || detail.evaluation.verdict !== 'significant'}
                    onClick={() => void ship(detail.id)}
                    startIcon={<CheckCircleRoundedIcon />}
                    sx={{ bgcolor: BRAND.teal, '&:hover': { bgcolor: BRAND.tealDeep } }}
                  >
                    Ship winner
                  </Button>
                  <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                    {detail.evaluation.total_exposures} exposures · {money(detail.total_revenue)} revenue
                  </Typography>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.5}>
                  {detail.variants.map((v) => {
                    const isWinner = detail.evaluation.winner_key === v.key;
                    const comp = detail.evaluation.comparisons.find((c) => c.key === v.key);
                    const alloc = detail.allocation.find((a) => a.key === v.key);
                    return (
                      <Box
                        key={v.key}
                        sx={{
                          p: 1.75,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: isWinner ? BRAND.teal : 'divider',
                          bgcolor: isWinner ? alpha(BRAND.teal, 0.05) : 'transparent',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{v.label}</Typography>
                            {v.is_control && <Chip label="control" size="small" sx={{ height: 16, fontSize: 9 }} />}
                            {isWinner && (
                              <Chip label="winner" size="small" sx={{ height: 16, fontSize: 9, fontWeight: 800, bgcolor: BRAND.teal, color: '#fff' }} />
                            )}
                          </Stack>
                          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{v.conversion_rate}%</Typography>
                        </Stack>
                        {v.payload && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                            “{v.payload}”
                          </Typography>
                        )}
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(v.conversion_rate * 2, 100)}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha('#6B7280', 0.12),
                            '& .MuiLinearProgress-bar': { bgcolor: isWinner ? BRAND.teal : BRAND.amber },
                          }}
                        />
                        <Stack direction="row" spacing={1.5} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {v.conversions}/{v.exposures} converted
                          </Typography>
                          {comp && comp.rel_lift_pct != null && (
                            <Typography variant="caption" sx={{ color: comp.rel_lift_pct >= 0 ? BRAND.teal : BRAND.pink, fontWeight: 700 }}>
                              {comp.rel_lift_pct >= 0 ? '+' : ''}
                              {comp.rel_lift_pct}% vs control
                              {comp.p_value != null && ` · p=${comp.p_value}`}
                            </Typography>
                          )}
                          {alloc && (
                            <Typography variant="caption" sx={{ color: BRAND.amberDeep, fontWeight: 700 }}>
                              bandit: {alloc.allocation_pct}% traffic
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>

                {detail.evaluation.message && (
                  <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                    {detail.evaluation.message}
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <ScienceRoundedIcon sx={{ fontSize: 40, color: alpha(BRAND.teal, 0.5), mb: 1 }} />
                <Typography sx={{ color: 'text.secondary' }}>
                  Select or auto-design an experiment to see live, significance-tested results.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Segments tab                                                        */
/* ------------------------------------------------------------------ */
const DIMENSIONS = [
  { value: 'device', label: 'Device' },
  { value: 'source', label: 'Traffic source' },
  { value: 'campaign', label: 'Campaign' },
];

export function SegmentsTab() {
  const [dim, setDim] = useState('device');
  const [data, setData] = useState<CROSegments | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await CRO.segments(dim));
    } finally {
      setLoading(false);
    }
  }, [dim]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxCvr = data?.segments.reduce((m, s) => Math.max(m, s.conversion_rate), 0) || 1;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Typography sx={{ fontWeight: 800, fontSize: 17 }}>Conversion by segment</Typography>
        <TextField select size="small" value={dim} onChange={(e) => setDim(e.target.value)} sx={{ minWidth: 170 }}>
          {DIMENSIONS.map((d) => (
            <MenuItem key={d.value} value={d.value}>
              {d.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {data?.insight && (
        <Alert icon={<SegmentRoundedIcon />} severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {data.insight}
        </Alert>
      )}

      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : !data || data.segments.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No segmented conversion data yet for “{dim}”. Send the dimension on your pixel events.
            </Typography>
          ) : (
            <Stack spacing={1.75}>
              {data.segments.map((s) => (
                <Box key={s.segment}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography sx={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{s.segment}</Typography>
                      {s.low_data && <Chip label="low data" size="small" sx={{ height: 16, fontSize: 9 }} />}
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="baseline">
                      <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{s.conversion_rate}%</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {s.conversions}/{s.visitors}
                      </Typography>
                    </Stack>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(s.conversion_rate / maxCvr) * 100}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: alpha('#6B7280', 0.1),
                      '& .MuiLinearProgress-bar': {
                        bgcolor:
                          data.best_segment?.segment === s.segment
                            ? BRAND.teal
                            : data.worst_segment?.segment === s.segment
                              ? BRAND.pink
                              : BRAND.amber,
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* CRO Agent tab                                                       */
/* ------------------------------------------------------------------ */
const AUTONOMY_DESC: Record<string, string> = {
  suggest: 'Logs recommendations only — you act manually.',
  approve: 'Creates experiments as drafts for your sign-off.',
  auto: 'Designs, launches and ships winning experiments autonomously.',
};

export function AgentTab() {
  const [settings, setSettings] = useState<CROSettings | null>(null);
  const [actions, setActions] = useState<CROAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await CRO.agent();
      setSettings(res.settings);
      setActions(res.actions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await CRO.runAgent();
      setMsg(res.message || `Agent ran — ${res.created_count ?? 0} recommendation(s).`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const setAutonomy = async (autonomy: 'suggest' | 'approve' | 'auto') => {
    if (!settings) return;
    setSettings(await CRO.updateSettings({ autonomy }));
  };

  const act = async (id: string, decision: 'approve' | 'dismiss') => {
    setBusy(true);
    try {
      await CRO.actOnAction(id, decision);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 5 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Box>
      {msg && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, color: '#fff', background: `linear-gradient(135deg, ${BRAND.teal} 0%, ${BRAND.tealDeep} 100%)` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                <SmartToyRoundedIcon />
                <Typography sx={{ fontWeight: 800, fontSize: 17 }}>CRO Agent</Typography>
              </Stack>
              <Typography sx={{ fontSize: 13, color: alpha('#fff', 0.9), mb: 2 }}>
                Senses your funnel, diagnoses the biggest-$ leak, designs an experiment and (at higher autonomy) ships
                the winner — all on real data.
              </Typography>

              <Typography variant="caption" sx={{ color: alpha('#fff', 0.85), fontWeight: 700 }}>
                AUTONOMY
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, mb: 1 }}>
                {(['suggest', 'approve', 'auto'] as const).map((a) => (
                  <Chip
                    key={a}
                    label={a}
                    onClick={() => void setAutonomy(a)}
                    size="small"
                    sx={{
                      textTransform: 'capitalize',
                      fontWeight: 700,
                      cursor: 'pointer',
                      bgcolor: settings?.autonomy === a ? '#fff' : alpha('#fff', 0.18),
                      color: settings?.autonomy === a ? BRAND.tealDeep : '#fff',
                    }}
                  />
                ))}
              </Stack>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.85) }}>
                {AUTONOMY_DESC[settings?.autonomy || 'suggest']}
              </Typography>

              <Button
                fullWidth
                onClick={() => void run()}
                disabled={busy}
                startIcon={<AutoAwesomeRoundedIcon />}
                sx={{ mt: 2, bgcolor: '#fff', color: BRAND.tealDeep, fontWeight: 800, '&:hover': { bgcolor: alpha('#fff', 0.9) } }}
              >
                Run agent now
              </Button>
              {settings?.last_run_at && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: alpha('#fff', 0.8) }}>
                  Last run: {new Date(settings.last_run_at).toLocaleString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 1.5 }}>
            Next best actions {actions.length ? `(${actions.length})` : ''}
          </Typography>
          {actions.length === 0 ? (
            <Card sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ color: 'text.secondary' }}>
                  No open recommendations. Run the agent to analyze your funnel.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={1.5}>
              {actions.map((a) => (
                <Card key={a.id} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1, pr: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
                          <Chip
                            label={a.priority}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              bgcolor: alpha(PRIORITY_COLOR[a.priority] || BRAND.amber, 0.14),
                              color: PRIORITY_COLOR[a.priority] || BRAND.amber,
                            }}
                          />
                          <Chip label={a.kind.replace(/_/g, ' ')} size="small" sx={{ height: 18, fontSize: 10 }} />
                          <Chip label={a.status} size="small" sx={{ height: 18, fontSize: 10, bgcolor: alpha('#6B7280', 0.12) }} />
                        </Stack>
                        <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{a.title}</Typography>
                        {a.detail && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            {a.detail}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={2} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                          {a.expected_revenue != null && a.expected_revenue > 0 && (
                            <Typography variant="caption" sx={{ color: BRAND.teal, fontWeight: 800 }}>
                              +{money(a.expected_revenue)} potential
                            </Typography>
                          )}
                          {a.expected_lift_pct != null && (
                            <Typography variant="caption" sx={{ color: BRAND.amberDeep, fontWeight: 700 }}>
                              +{a.expected_lift_pct}% CVR lift
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                      {a.status === 'suggested' && (
                        <Stack spacing={0.75}>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={busy}
                            onClick={() => void act(a.id, 'approve')}
                            startIcon={<CheckCircleRoundedIcon />}
                            sx={{ bgcolor: BRAND.teal, '&:hover': { bgcolor: BRAND.tealDeep } }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            disabled={busy}
                            onClick={() => void act(a.id, 'dismiss')}
                            startIcon={<CloseRoundedIcon />}
                            sx={{ color: 'text.secondary' }}
                          >
                            Dismiss
                          </Button>
                        </Stack>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Predictive lift — pre-publish scorer (Scorecard tab)                */
/* ------------------------------------------------------------------ */
export function PredictWidget() {
  const [text, setText] = useState('');
  const [pred, setPred] = useState<CROPrediction | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      setPred(await CRO.predict({ text }));
    } finally {
      setBusy(false);
    }
  };

  const col = !pred ? BRAND.amber : pred.score >= 66 ? BRAND.teal : pred.score >= 40 ? BRAND.amber : BRAND.pink;

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <AutoAwesomeRoundedIcon sx={{ color: BRAND.teal }} />
          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>Predict lift before you publish</Typography>
        </Stack>
        <TextField
          multiline
          minRows={2}
          fullWidth
          size="small"
          placeholder="Paste a draft caption / CTA / headline…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button
          onClick={() => void run()}
          disabled={busy || !text.trim()}
          variant="contained"
          sx={{ mt: 1.5, bgcolor: BRAND.teal, fontWeight: 700, '&:hover': { bgcolor: BRAND.tealDeep } }}
        >
          Score this draft
        </Button>

        {pred && (
          <Box sx={{ mt: 2 }}>
            {pred.low_data ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {pred.suggestions[0] || 'Not enough post history yet to predict lift.'}
              </Alert>
            ) : (
              <>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress variant="determinate" value={100} size={64} thickness={4} sx={{ color: alpha(col, 0.18), position: 'absolute' }} />
                    <CircularProgress variant="determinate" value={pred.score} size={64} thickness={4} sx={{ color: col }} />
                    <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 18, color: col }}>{pred.score}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                      Predicted {pred.predicted_engagement_rate}% engagement
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      vs {pred.baseline_engagement_rate}% baseline
                      {pred.lift_vs_baseline_pct != null && ` · ${pred.lift_vs_baseline_pct >= 0 ? '+' : ''}${pred.lift_vs_baseline_pct}%`} · from{' '}
                      {pred.history_size} real posts
                    </Typography>
                  </Box>
                </Stack>
                {pred.suggestions.map((s, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.25 }}>
                    • {s}
                  </Typography>
                ))}
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
