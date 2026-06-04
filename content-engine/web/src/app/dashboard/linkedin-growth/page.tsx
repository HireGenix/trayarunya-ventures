'use client';

import { useEffect, useMemo, useState } from 'react';
import {
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
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import OpenInNewIcon from '@mui/icons-material/OpenInNewOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAltOutlined';
import SecurityIcon from '@mui/icons-material/SecurityOutlined';
import { useAuth } from '@/lib/auth';
import {
  LinkedInGrowth,
  type LinkedInActionItem,
  type LinkedInAudit,
  type LinkedInGrowthProfile,
} from '@/lib/api';
import { BRAND } from '@/theme/theme';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const BORDER = '#EAECEF';
const CANVAS = '#FAFBFC';

const OBJECTIVES = [
  { id: 'high_ticket_leads', label: 'High-ticket leads' },
  { id: 'founder_authority', label: 'Founder authority' },
  { id: 'partnerships', label: 'Partnerships' },
  { id: 'hiring', label: 'Hiring / employer brand' },
];

const SNAPSHOT_FIELDS = [
  ['headline', 'Headline', 'Current LinkedIn headline'],
  ['banner_notes', 'Banner notes', 'What the banner visually says: promise, proof, CTA'],
  ['about', 'About section', 'Paste/summarize the About section'],
  ['featured', 'Featured section', 'Pinned assets, lead magnets, case studies'],
  ['experience', 'Experience proof', 'Outcomes, quantified wins, positioning'],
  ['proof', 'Proof / testimonials', 'Results, testimonials, screenshots, case studies'],
  ['recent_posts', 'Recent posts', 'Summarize 3-5 recent posts and engagement pattern'],
  ['cta', 'CTA', 'What should buyers do next?'],
  ['vision_notes', 'AI vision / screenshot notes', 'What you observe from screenshots: visual clarity, weak sections, trust gaps'],
] as const;

function scoreColor(score?: number | null) {
  if ((score ?? 0) >= 85) return BRAND.teal;
  if ((score ?? 0) >= 70) return '#2563EB';
  if ((score ?? 0) >= 50) return BRAND.amber;
  return BRAND.pink;
}

function gradeLabel(grade?: string | null) {
  return (grade || 'not audited').replaceAll('_', ' ');
}

export default function LinkedInGrowthPage() {
  const { activeWorkspace } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [profiles, setProfiles] = useState<LinkedInGrowthProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [actions, setActions] = useState<LinkedInActionItem[]>([]);
  const [audit, setAudit] = useState<LinkedInAudit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [accountLabel, setAccountLabel] = useState('Founder / CEO profile');
  const [profileUrl, setProfileUrl] = useState('');
  const [objective, setObjective] = useState('high_ticket_leads');
  const [icpRole, setIcpRole] = useState('B2B founders, CEOs, CMOs');
  const [icpPain, setIcpPain] = useState('Need predictable pipeline without spammy outreach');
  const [offer, setOffer] = useState('generate qualified LinkedIn pipeline and high-ticket sales conversations');
  const [voice, setVoice] = useState('expert, direct, strategic, premium');
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? profiles[0] ?? null,
    [profiles, selectedId],
  );

  const load = () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    LinkedInGrowth.profiles()
      .then((list) => {
        setProfiles(list);
        if (!selectedId && list[0]) setSelectedId(list[0].id);
      })
      .catch(() => setError('Could not load LinkedIn Growth profiles.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeWorkspace]);

  useEffect(() => {
    const id = selected?.id;
    if (!id) {
      setActions([]);
      return;
    }
    LinkedInGrowth.actions(id).then(setActions).catch(() => setActions([]));
  }, [selected?.id, audit?.id]);

  const createProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      const profile = await LinkedInGrowth.createProfile({
        account_label: accountLabel,
        profile_url: profileUrl || null,
        objective,
        icp: { role: icpRole, pain: icpPain },
        offer,
        voice,
      });
      setProfiles((prev) => [profile, ...prev]);
      setSelectedId(profile.id);
    } catch {
      setError('Could not create LinkedIn Growth profile.');
    } finally {
      setSaving(false);
    }
  };

  const openLinkedIn = async () => {
    try {
      const session = await LinkedInGrowth.browserSession(selected?.profile_url || profileUrl || null);
      window.open(session.url, 'linkedin-growth', 'width=1280,height=900,menubar=no,toolbar=yes');
    } catch {
      window.open(selected?.profile_url || 'https://www.linkedin.com/feed/', '_blank');
    }
  };

  const runAudit = async () => {
    if (!selected) return;
    setAuditing(true);
    setError(null);
    try {
      const clean = Object.fromEntries(Object.entries(snapshot).filter(([, v]) => v.trim()));
      const result = await LinkedInGrowth.audit(selected.id, clean);
      setAudit(result);
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === selected.id
            ? {
                ...p,
                latest_score: result.score,
                latest_grade: result.grade,
                latest_audit: {
                  findings: result.findings,
                  recommendations: result.recommendations,
                  drafts: result.drafts,
                  compliance: result.compliance,
                },
                latest_audit_at: result.created_at,
              }
            : p,
        ),
      );
    } catch {
      setError('Audit failed. Add more profile snapshot details and retry.');
    } finally {
      setAuditing(false);
    }
  };

  const markDone = async (item: LinkedInActionItem) => {
    const updated = await LinkedInGrowth.updateAction(item.id, item.status === 'done' ? 'open' : 'done');
    setActions((prev) => prev.map((x) => (x.id === item.id ? updated : x)));
  };

  const latest = audit ?? (selected?.latest_audit ? ({
    score: selected.latest_score ?? 0,
    grade: selected.latest_grade ?? 'not_audited',
    findings: selected.latest_audit.findings ?? {},
    recommendations: selected.latest_audit.recommendations ?? [],
    drafts: selected.latest_audit.drafts ?? {},
    compliance: selected.latest_audit.compliance ?? {},
  } as unknown as LinkedInAudit) : null);
  const score = selected?.latest_score ?? latest?.score ?? 0;

  if (!activeWorkspace) {
    return (
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ fontWeight: 950, color: INK }}>LinkedIn Growth Copilot</Typography>
        <Alert severity="info">Choose or create a workspace to start.</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LinkedInIcon sx={{ color: '#0A66C2', fontSize: 34 }} />
            <Typography variant="h4" sx={{ fontWeight: 950, color: INK }}>
              LinkedIn Growth Copilot
            </Typography>
          </Stack>
          <Typography sx={{ color: SUBTLE, mt: 1, maxWidth: 880 }}>
            Human-in-the-loop AI profile coach: build a policy-safe LinkedIn lead-generation machine with
            profile scoring, vision notes, rewrite drafts and manual action items.
          </Typography>
        </Box>
        <Button onClick={openLinkedIn} variant="contained" startIcon={<OpenInNewIcon />}
          sx={{ borderRadius: 3, color: '#11151B', fontWeight: 900, background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})` }}>
          Open LinkedIn window
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Alert icon={<SecurityIcon />} severity="info" sx={{ borderRadius: 3 }}>
        LinkedIn blocks embedded iframes and policy-breaking automation. This cockpit opens LinkedIn in a separate
        human-controlled window. AI audits, drafts and guides; humans manually approve every edit, post and message.
      </Alert>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="stretch">
        <Card sx={{ flex: 1, borderRadius: 4, border: `1px solid ${BORDER}` }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 950, color: INK }}>1. Objective & account</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField label="Account label" value={accountLabel} onChange={(e) => setAccountLabel(e.target.value)} fullWidth />
              <TextField label="LinkedIn profile URL" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} fullWidth placeholder="https://www.linkedin.com/in/..." />
              <TextField label="Objective" value={objective} onChange={(e) => setObjective(e.target.value)} select fullWidth>
                {OBJECTIVES.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
              </TextField>
              <TextField label="ICP" value={icpRole} onChange={(e) => setIcpRole(e.target.value)} fullWidth />
              <TextField label="ICP pain point" value={icpPain} onChange={(e) => setIcpPain(e.target.value)} fullWidth />
              <TextField label="Offer / desired outcome" value={offer} onChange={(e) => setOffer(e.target.value)} fullWidth />
              <TextField label="Voice" value={voice} onChange={(e) => setVoice(e.target.value)} fullWidth />
              <Button onClick={createProfile} disabled={saving || !accountLabel.trim()} startIcon={saving ? <CircularProgress size={14} /> : <LinkedInIcon />} variant="outlined" sx={{ borderRadius: 3, fontWeight: 900 }}>
                Create / add profile
              </Button>
              {profiles.length > 0 && (
                <TextField label="Selected profile" value={selected?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)} select fullWidth>
                  {profiles.map((p) => <MenuItem key={p.id} value={p.id}>{p.account_label}</MenuItem>)}
                </TextField>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderRadius: 4, border: `1px solid ${BORDER}`, background: CANVAS }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 950, color: INK }}>Profile Lead-Gen Score</Typography>
            {loading ? <LinearProgress sx={{ mt: 3 }} /> : (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Typography variant="h2" sx={{ fontWeight: 950, color: scoreColor(score) }}>{Math.round(score)}</Typography>
                <LinearProgress variant="determinate" value={Math.min(100, score)}
                  sx={{ height: 12, borderRadius: 999, background: '#EEF2F7', '& .MuiLinearProgress-bar': { background: scoreColor(score) } }} />
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label={gradeLabel(selected?.latest_grade ?? latest?.grade)} sx={{ fontWeight: 900, textTransform: 'capitalize' }} />
                  <Chip label="Human-in-loop safe" color="success" variant="outlined" />
                  <Chip label="No auto-DM / auto-connect" color="warning" variant="outlined" />
                </Stack>
                <Typography sx={{ color: SUBTLE }}>
                  Score covers headline, banner, About, Featured, proof, experience, content authority and CTA clarity.
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}` }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 950, color: INK }}>2. Profile snapshot + AI vision notes</Typography>
              <Typography sx={{ color: SUBTLE }}>
                Open LinkedIn, review your profile, then paste visible section text or screenshot observations below.
              </Typography>
            </Box>
            <Button onClick={runAudit} disabled={!selected || auditing} variant="contained" startIcon={auditing ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{ borderRadius: 3, fontWeight: 900, color: '#11151B', background: BRAND.amber }}>
              {auditing ? 'Auditing…' : 'Run AI audit'}
            </Button>
          </Stack>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {SNAPSHOT_FIELDS.map(([key, label, placeholder]) => (
              <TextField key={key} label={label} placeholder={placeholder} value={snapshot[key] ?? ''}
                onChange={(e) => setSnapshot((prev) => ({ ...prev, [key]: e.target.value }))}
                multiline minRows={key === 'about' || key === 'recent_posts' || key === 'vision_notes' ? 4 : 2} fullWidth />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {latest && (
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
          <Card sx={{ flex: 1, borderRadius: 4, border: `1px solid ${BORDER}` }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 950, color: INK }}>AI recommendations</Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {(latest.recommendations || []).map((rec, idx) => (
                  <Box key={idx} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography sx={{ fontWeight: 900, color: INK }}>{String(rec.title ?? 'Improve profile')}</Typography>
                      <Chip size="small" label={String(rec.priority ?? 'medium')} />
                    </Stack>
                    <Typography variant="body2" sx={{ color: SUBTLE, mt: .75 }}>{String(rec.detail ?? '')}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1, borderRadius: 4, border: `1px solid ${BORDER}` }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 950, color: INK }}>Drafts & lead magnets</Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {Array.isArray(latest.drafts?.headline_options) && (
                  <Box>
                    <Typography sx={{ fontWeight: 900 }}>Headline options</Typography>
                    {(latest.drafts.headline_options as string[]).map((h) => (
                      <Typography key={h} variant="body2" sx={{ color: SUBTLE, mt: .75 }}>• {h}</Typography>
                    ))}
                  </Box>
                )}
                {typeof latest.drafts?.about_template === 'string' && (
                  <TextField label="About rewrite template" value={latest.drafts.about_template} multiline minRows={8} fullWidth InputProps={{ readOnly: true }} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}

      <Card sx={{ borderRadius: 4, border: `1px solid ${BORDER}` }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 950, color: INK }}>Manual action queue</Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {actions.length === 0 ? (
              <Typography sx={{ color: SUBTLE }}>Run an audit to generate manual profile optimization tasks.</Typography>
            ) : actions.map((item) => (
              <Box key={item.id} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3, opacity: item.status === 'done' ? .65 : 1 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={item.section} />
                      <Chip size="small" label={item.priority} color={item.priority === 'high' ? 'error' : 'default'} />
                      <Chip size="small" label={item.status} variant="outlined" />
                    </Stack>
                    <Typography sx={{ fontWeight: 900, color: INK, mt: 1 }}>{item.title}</Typography>
                    <Typography variant="body2" sx={{ color: SUBTLE }}>{item.detail}</Typography>
                  </Box>
                  <Button onClick={() => void markDone(item)} startIcon={<TaskAltIcon />} sx={{ borderRadius: 3, fontWeight: 900 }}>
                    {item.status === 'done' ? 'Reopen' : 'Mark done'}
                  </Button>
                </Stack>
                {item.policy_note && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" sx={{ color: SUBTLE }}>{item.policy_note}</Typography>
                  </>
                )}
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
