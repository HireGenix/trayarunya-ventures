'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import { useAuth } from '@/lib/auth';
import { Admin, type AdminPlan } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  DialogFooter,
  SectionLabel,
  FieldGrid,
  FullSpan,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';

const LIMIT_FIELDS: { key: string; label: string }[] = [
  { key: 'workspaces', label: 'Workspaces / clients' },
  { key: 'seats', label: 'Team seats' },
  { key: 'research_jobs', label: 'Research jobs / mo' },
  { key: 'strategies', label: 'Strategies / mo' },
  { key: 'content_calendars', label: 'Content calendars / mo' },
  { key: 'content_items', label: 'Content items / mo' },
  { key: 'social_accounts', label: 'Social accounts' },
  { key: 'ad_accounts', label: 'Ad accounts' },
];

const PROTECTED = new Set(['free', 'pro', 'agency']);

type LimitState = Record<string, string>;

function limitsToState(limits: Record<string, number> | null): LimitState {
  const s: LimitState = {};
  for (const f of LIMIT_FIELDS) {
    const v = limits?.[f.key];
    s[f.key] = v != null ? String(v) : '';
  }
  return s;
}

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

export default function AdminPlansPage() {
  const { me, loading: authLoading } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();

  const [rows, setRows] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [limits, setLimits] = useState<LimitState>(limitsToState(null));
  const [features, setFeatures] = useState('');

  const isSuper = !!me?.user?.is_superuser;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await Admin.listPlans());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isSuper) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isSuper]);

  const openCreate = () => {
    setEditing(null);
    setCode('');
    setName('');
    setPrice('0');
    setLimits(limitsToState(null));
    setFeatures('');
    setOpen(true);
  };

  const openEdit = (p: AdminPlan) => {
    setEditing(p);
    setCode(p.code);
    setName(p.name);
    setPrice(String(p.price_monthly));
    setLimits(limitsToState(p.limits));
    setFeatures((p.features || []).join('\n'));
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const featureList = features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);
      if (editing) {
        await Admin.updatePlan(editing.id, {
          name,
          price_monthly: Number(price) || 0,
          limits: stateToLimits(limits),
          features: featureList,
        });
        setToast('Plan updated');
      } else {
        await Admin.createPlan({
          code: code.trim().toLowerCase(),
          name,
          price_monthly: Number(price) || 0,
          limits: stateToLimits(limits),
          features: featureList,
        });
        setToast('Plan created');
      }
      setOpen(false);
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: AdminPlan) => {
    const ok = await confirm({
      title: `Delete plan "${p.name}"?`,
      message: 'This removes the custom plan. Plans assigned to organizations cannot be deleted.',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await Admin.deletePlan(p.id);
      setToast('Plan deleted');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || (loading && isSuper)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isSuper) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', py: 8 }}>
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => router.push('/dashboard')}>
              Back
            </Button>
          }
        >
          This area is restricted to platform superadmins.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 26, fontWeight: 800 }}>Plans</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Built-in and custom plans. Define price, limits and features.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{
            background: `linear-gradient(135deg, ${BRAND.amber}, ${BRAND.teal})`,
            fontWeight: 700,
            textTransform: 'none',
          }}
        >
          New plan
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {rows.map((p) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                p: 2.5,
                height: '100%',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{p.code}</Typography>
                </Box>
                <Stack direction="row">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEdit(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={PROTECTED.has(p.code) ? 'Built-in plan' : 'Delete'}>
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => remove(p)}
                        disabled={PROTECTED.has(p.code) || p.in_use > 0}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>

              <Typography sx={{ fontWeight: 800, fontSize: 24, mt: 1 }}>
                ${p.price_monthly}
                <Box component="span" sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary' }}>
                  {' '}
                  / mo
                </Box>
              </Typography>

              <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 1.5 }}>
                {LIMIT_FIELDS.map((f) =>
                  p.limits?.[f.key] != null ? (
                    <Chip
                      key={f.key}
                      size="small"
                      label={`${f.label.split(' ')[0]}: ${p.limits[f.key]}`}
                      sx={{ height: 22, fontSize: 11, bgcolor: BRAND.tealSoft, color: BRAND.tealDeep }}
                    />
                  ) : null,
                )}
              </Stack>

              <Box sx={{ mt: 1.5 }}>
                {(p.features || []).slice(0, 5).map((f, i) => (
                  <Typography key={i} sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                    • {f}
                  </Typography>
                ))}
              </Box>

              <Chip
                size="small"
                label={p.in_use > 0 ? `${p.in_use} org(s)` : 'Unused'}
                variant="outlined"
                sx={{ mt: 1.5, height: 20, fontSize: 11 }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>

      <PremiumDialog open={open} onClose={() => setOpen(false)} maxWidth="sm">
        <DialogHero
          icon={editing ? <EditIcon /> : <PaymentsRoundedIcon />}
          title={editing ? 'Edit plan' : 'New plan'}
          subtitle="Define the price, usage limits and feature list for this plan."
          onClose={() => setOpen(false)}
        />
        <DialogBody>
          <Stack gap={2.5}>
            <Box>
              <SectionLabel>Plan details</SectionLabel>
              <FieldGrid>
                <TextField
                  label="Code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!!editing}
                  helperText={editing ? 'Code is fixed' : 'Lowercase id, e.g. "studio_pro"'}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  size="small"
                />
                <FullSpan>
                  <TextField
                    label="Price (USD / month)"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </FullSpan>
              </FieldGrid>
            </Box>

            <Box>
              <SectionLabel>Limits</SectionLabel>
              <FieldGrid>
                {LIMIT_FIELDS.map((f) => (
                  <TextField
                    key={f.key}
                    label={f.label}
                    type="number"
                    value={limits[f.key] ?? ''}
                    onChange={(e) => setLimits({ ...limits, [f.key]: e.target.value })}
                    helperText="Blank = unlimited"
                    fullWidth
                    size="small"
                  />
                ))}
              </FieldGrid>
            </Box>

            <Box>
              <SectionLabel>Features</SectionLabel>
              <TextField
                label="Features (one per line)"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                size="small"
              />
            </Box>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || !name || (!editing && !code)} sx={inkPillSx}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
