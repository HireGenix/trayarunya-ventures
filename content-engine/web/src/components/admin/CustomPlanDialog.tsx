'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { Admin, type AdminPlan } from '@/lib/api';
import { BRAND } from '@/theme/theme';

export const LIMIT_FIELDS: { key: string; label: string }[] = [
  { key: 'workspaces', label: 'Workspaces / clients' },
  { key: 'seats', label: 'Team seats' },
  { key: 'research_jobs', label: 'Research jobs / mo' },
  { key: 'strategies', label: 'Strategies / mo' },
  { key: 'content_calendars', label: 'Content calendars / mo' },
  { key: 'content_items', label: 'Content items / mo' },
  { key: 'social_accounts', label: 'Social accounts' },
  { key: 'ad_accounts', label: 'Ad accounts' },
];

type LimitState = Record<string, string>;

function stateToLimits(s: LimitState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of LIMIT_FIELDS) {
    const raw = s[f.key]?.trim();
    if (raw !== '' && raw != null && !Number.isNaN(Number(raw))) {
      out[f.key] = Number(raw);
    }
  }
  return out;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export default function CustomPlanDialog({
  open,
  onClose,
  onCreated,
  existingCodes,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (plan: AdminPlan) => void;
  existingCodes: string[];
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [price, setPrice] = useState('0');
  const [limits, setLimits] = useState<LimitState>({});
  const [features, setFeatures] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setCode('');
    setCodeTouched(false);
    setPrice('0');
    setLimits({});
    setFeatures('');
    setError('');
  };

  const effectiveCode = codeTouched ? code : slugify(name);

  const handleName = (v: string) => {
    setName(v);
    if (!codeTouched) setCode(slugify(v));
  };

  const save = async () => {
    setError('');
    const finalCode = (effectiveCode || '').trim().toLowerCase();
    if (!name.trim()) {
      setError('Give the plan a name.');
      return;
    }
    if (!finalCode) {
      setError('A plan code is required.');
      return;
    }
    if (existingCodes.map((c) => c.toLowerCase()).includes(finalCode)) {
      setError(`Plan code "${finalCode}" already exists. Pick another.`);
      return;
    }
    setBusy(true);
    try {
      const plan = await Admin.createPlan({
        code: finalCode,
        name: name.trim(),
        price_monthly: Number(price) || 0,
        limits: stateToLimits(limits),
        features: features
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
      });
      onCreated(plan);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create plan');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) {
          reset();
          onClose();
        }
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            background: BRAND.gradient,
            color: BRAND.ink,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 18 }} />
        </Box>
        Create custom plan
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
          Define a bespoke plan and it will be assigned to this user immediately.
        </Typography>
        <Stack gap={2}>
          <Stack direction="row" gap={2}>
            <TextField
              label="Plan name"
              value={name}
              onChange={(e) => handleName(e.target.value)}
              placeholder="e.g. Studio Pro"
              fullWidth
              autoFocus
            />
            <TextField
              label="Code"
              value={effectiveCode}
              onChange={(e) => {
                setCodeTouched(true);
                setCode(e.target.value.toLowerCase());
              }}
              helperText="Unique id"
              sx={{ maxWidth: 180 }}
            />
          </Stack>
          <TextField
            label="Price (USD / month)"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            fullWidth
          />
          <Typography sx={{ fontWeight: 700, fontSize: 13, mt: 0.5 }}>Limits</Typography>
          <Grid container spacing={1.5}>
            {LIMIT_FIELDS.map((f) => (
              <Grid size={{ xs: 6 }} key={f.key}>
                <TextField
                  label={f.label}
                  type="number"
                  value={limits[f.key] ?? ''}
                  onChange={(e) => setLimits({ ...limits, [f.key]: e.target.value })}
                  helperText="Blank = unlimited"
                  fullWidth
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
          <TextField
            label="Features (one per line)"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            multiline
            minRows={3}
            placeholder={'Everything in Pro\nDedicated success manager\nPriority rendering'}
            fullWidth
          />
          {error && (
            <Typography sx={{ color: 'error.main', fontSize: 13 }}>{error}</Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => {
            reset();
            onClose();
          }}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={busy || !name.trim()}>
          Create &amp; assign
        </Button>
      </DialogActions>
    </Dialog>
  );
}
