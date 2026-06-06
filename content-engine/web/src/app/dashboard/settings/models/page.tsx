'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useAuth } from '@/lib/auth';
import { Models, type ModelAdmin, type ModelWrite } from '@/lib/api';
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

const KINDS = [
  { id: 'responses', label: 'OpenAI Responses' },
  { id: 'anthropic', label: 'Anthropic Messages' },
  { id: 'chat_completions', label: 'Chat Completions' },
];

const EMPTY: ModelWrite = {
  key: '',
  label: '',
  kind: 'chat_completions',
  model_name: '',
  endpoint: '',
  api_key: '',
  api_version: '',
  enabled: true,
  is_default: false,
  sort_order: 100,
};

export default function ModelsSettingsPage() {
  const { me, loading: authLoading } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();

  const [rows, setRows] = useState<ModelAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ModelAdmin | null>(null);
  const [form, setForm] = useState<ModelWrite>(EMPTY);
  const [saving, setSaving] = useState(false);

  const isSuper = !!me?.user?.is_superuser;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await Models.adminList();
      setRows([...data].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isSuper) return;
    void load();
  }, [authLoading, isSuper]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (row: ModelAdmin) => {
    setEditing(row);
    setForm({
      key: row.key,
      label: row.label,
      kind: row.kind,
      model_name: row.model_name,
      endpoint: row.endpoint ?? '',
      api_key: '',
      api_version: row.api_version ?? '',
      enabled: row.enabled,
      is_default: row.is_default,
      sort_order: row.sort_order,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: ModelWrite = { ...form };
      if (!payload.api_key) delete payload.api_key; // keep existing key on edit
      if (editing) {
        await Models.update(editing.id, payload);
        setToast('Model updated');
      } else {
        await Models.create(payload);
        setToast('Model added');
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (row: ModelAdmin) => {
    try {
      await Models.update(row.id, { enabled: !row.enabled });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const makeDefault = async (row: ModelAdmin) => {
    try {
      await Models.update(row.id, { is_default: true, enabled: true });
      setToast(`${row.label} is now the default model`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const remove = async (row: ModelAdmin) => {
    const ok = await confirm({
      title: `Delete ${row.label}?`,
      message:
        row.source === 'env'
          ? 'This model is provisioned from environment config and will be re-created on the next server restart. Delete anyway?'
          : 'This permanently removes the model from the registry.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await Models.remove(row.id);
      setToast('Model deleted');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const formValid = useMemo(
    () => !!form.key && !!form.label && !!form.kind && !!form.model_name,
    [form],
  );

  if (authLoading) {
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
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SettingsIcon sx={{ color: BRAND.amber }} />
          <Box>
            <Typography variant="h5" fontWeight={800} color={BRAND.ink}>
              AI Models
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The platform model registry — add, edit, enable or set the default model. No redeploy
              needed.
            </Typography>
          </Box>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ borderRadius: 2 }}>
          Add model
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ my: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: BRAND.ink } }}>
                <TableCell>Default</TableCell>
                <TableCell>Label</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Kind</TableCell>
                <TableCell>Model name</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Key set</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Enabled</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Tooltip title={row.is_default ? 'Default model' : 'Set as default'}>
                      <IconButton size="small" onClick={() => !row.is_default && makeDefault(row)}>
                        {row.is_default ? (
                          <StarIcon fontSize="small" sx={{ color: BRAND.amber }} />
                        ) : (
                          <StarBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {row.label}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <code style={{ fontSize: 12 }}>{row.key}</code>
                  </TableCell>
                  <TableCell>
                    <Chip label={row.kind} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.model_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.source}
                      size="small"
                      color={row.source === 'env' ? 'default' : 'primary'}
                      variant={row.source === 'env' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell>
                    {row.has_key ? (
                      <Chip label="yes" size="small" color="success" variant="outlined" />
                    ) : (
                      <Chip label="no" size="small" color="warning" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>{row.sort_order}</TableCell>
                  <TableCell>
                    <Switch
                      size="small"
                      checked={row.enabled}
                      onChange={() => toggleEnabled(row)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => remove(row)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No models yet. Click “Add model”.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      <PremiumDialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm">
        <DialogHero
          icon={editing ? <EditRoundedIcon /> : <TuneRoundedIcon />}
          title={editing ? `Edit ${editing.label}` : 'Add model'}
          subtitle="Configure how this model connects and where it appears in pickers."
          onClose={() => setDialogOpen(false)}
        />
        <DialogBody>
          <Stack gap={2.5}>
            <Box>
              <SectionLabel>Identity</SectionLabel>
              <FieldGrid>
                <TextField
                  label="Key (stable id used in API calls)"
                  value={form.key ?? ''}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  disabled={!!editing && editing.source === 'env'}
                  helperText="e.g. grok-4.3 — lowercase, no spaces"
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Label (shown in pickers)"
                  value={form.label ?? ''}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  fullWidth
                  size="small"
                />
              </FieldGrid>
            </Box>

            <Box>
              <SectionLabel>Connection</SectionLabel>
              <FieldGrid>
                <TextField
                  select
                  label="Kind (API shape)"
                  value={form.kind ?? 'chat_completions'}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  fullWidth
                  size="small"
                >
                  {KINDS.map((k) => (
                    <MenuItem key={k.id} value={k.id}>
                      {k.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Model / deployment name"
                  value={form.model_name ?? ''}
                  onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                  fullWidth
                  size="small"
                />
                <FullSpan>
                  <TextField
                    label="Endpoint URL"
                    value={form.endpoint ?? ''}
                    onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </FullSpan>
                <TextField
                  label="API version (optional)"
                  value={form.api_version ?? ''}
                  onChange={(e) => setForm({ ...form, api_version: e.target.value })}
                  fullWidth
                  size="small"
                />
                <TextField
                  label={editing ? 'API key (leave blank to keep current)' : 'API key'}
                  type="password"
                  value={form.api_key ?? ''}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  helperText="Stored encrypted at rest. Never shown again."
                  fullWidth
                  size="small"
                />
              </FieldGrid>
            </Box>

            <Box>
              <SectionLabel>Availability</SectionLabel>
              <Stack direction="row" spacing={3} alignItems="center">
                <TextField
                  label="Sort order"
                  type="number"
                  value={form.sort_order ?? 100}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  sx={{ width: 140 }}
                  size="small"
                />
                <Stack direction="row" alignItems="center">
                  <Switch
                    checked={!!form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  />
                  <Typography variant="body2">Enabled</Typography>
                </Stack>
                <Stack direction="row" alignItems="center">
                  <Switch
                    checked={!!form.is_default}
                    onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  />
                  <Typography variant="body2">Default</Typography>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setDialogOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={!formValid || saving}
            startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={inkPillSx}
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add model'}
          </Button>
        </DialogFooter>
      </PremiumDialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
