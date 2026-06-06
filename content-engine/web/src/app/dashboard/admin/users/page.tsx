'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import BusinessIcon from '@mui/icons-material/BusinessOutlined';
import BlockIcon from '@mui/icons-material/BlockOutlined';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import GroupIcon from '@mui/icons-material/GroupsOutlined';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import PaidIcon from '@mui/icons-material/PaidOutlined';
import ApartmentIcon from '@mui/icons-material/ApartmentOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import { useAuth } from '@/lib/auth';
import {
  Admin,
  type AdminUser,
  type AdminPlan,
  type AdminUserCreate,
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import CustomPlanDialog from '@/components/admin/CustomPlanDialog';
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

const ORG_TYPES = [
  { id: 'individual', label: 'Individual' },
  { id: 'freelancer', label: 'Freelancer' },
  { id: 'company', label: 'Company' },
  { id: 'agency', label: 'Agency' },
];

const CUSTOM_PLAN_VALUE = '__create_custom__';

const EMPTY_CREATE: AdminUserCreate = {
  email: '',
  password: '',
  full_name: '',
  org_name: '',
  org_type: 'company',
  plan_code: 'free',
  client_limit: null,
  is_superuser: false,
};

function initials(name: string, email: string): string {
  const src = (name || '').trim() || (email || '').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function avatarColor(seed: string): string {
  const palette = [BRAND.amberDeep, BRAND.tealDeep, BRAND.pink, '#6366F1', '#0EA5E9', '#7C3AED'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function randomPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) out += chars[arr[i] % chars.length];
  return out + '@7';
}

export default function AdminUsersPage() {
  const { me, loading: authLoading } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();

  const [rows, setRows] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<AdminUserCreate>(EMPTY_CREATE);
  const [showPw, setShowPw] = useState(false);

  // Edit user dialog
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editSuper, setEditSuper] = useState(false);
  const [editPassword, setEditPassword] = useState('');

  // Edit org dialog
  const [orgUser, setOrgUser] = useState<AdminUser | null>(null);
  const [orgPlan, setOrgPlan] = useState('free');
  const [orgType, setOrgType] = useState('company');
  const [orgLimit, setOrgLimit] = useState<string>('');

  // Custom plan dialog — `target` decides which form receives the new plan
  const [customPlanOpen, setCustomPlanOpen] = useState(false);
  const [customPlanTarget, setCustomPlanTarget] = useState<'create' | 'org'>('create');

  const isSuper = !!me?.user?.is_superuser;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [u, p] = await Promise.all([Admin.listUsers(), Admin.listPlans()]);
      setRows(u);
      setPlans(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
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

  const planLabel = (code: string) => plans.find((p) => p.code === code)?.name || code;

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.is_active).length;
    const paid = rows.filter((r) => r.org && r.org.plan !== 'free').length;
    const agencies = rows.filter((r) => r.org?.org_type === 'agency').length;
    return { total, active, paid, agencies };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.org?.name || '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  const openCreate = () => {
    setCreateForm({ ...EMPTY_CREATE, plan_code: plans[0]?.code || 'free', password: randomPassword() });
    setShowPw(true);
    setCreateOpen(true);
  };

  const onPlanSelect = (target: 'create' | 'org', value: string) => {
    if (value === CUSTOM_PLAN_VALUE) {
      setCustomPlanTarget(target);
      setCustomPlanOpen(true);
      return;
    }
    if (target === 'create') setCreateForm((f) => ({ ...f, plan_code: value }));
    else setOrgPlan(value);
  };

  const onCustomPlanCreated = (plan: AdminPlan) => {
    setPlans((prev) => [...prev, plan]);
    if (customPlanTarget === 'create') {
      setCreateForm((f) => ({ ...f, plan_code: plan.code }));
    } else {
      setOrgPlan(plan.code);
    }
    setToast(`Custom plan "${plan.name}" created`);
  };

  const submitCreate = async () => {
    setBusy(true);
    try {
      await Admin.createUser({
        ...createForm,
        email: createForm.email.trim().toLowerCase(),
        client_limit:
          createForm.org_type === 'agency' && createForm.client_limit != null
            ? Number(createForm.client_limit)
            : null,
      });
      setToast('User created — welcome email sent');
      setCreateOpen(false);
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const openEditUser = (u: AdminUser) => {
    setEditUser(u);
    setEditName(u.full_name);
    setEditActive(u.is_active);
    setEditSuper(u.is_superuser);
    setEditPassword('');
  };

  const submitEditUser = async () => {
    if (!editUser) return;
    setBusy(true);
    try {
      await Admin.updateUser(editUser.id, {
        full_name: editName,
        is_active: editActive,
        is_superuser: editSuper,
        password: editPassword ? editPassword : undefined,
      });
      setToast('User updated');
      setEditUser(null);
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const openEditOrg = (u: AdminUser) => {
    if (!u.org) {
      setToast('This user has no organization');
      return;
    }
    setOrgUser(u);
    setOrgPlan(u.org.plan);
    setOrgType(u.org.org_type);
    setOrgLimit(u.org.client_limit != null ? String(u.org.client_limit) : '');
  };

  const submitEditOrg = async () => {
    if (!orgUser?.org) return;
    setBusy(true);
    try {
      await Admin.updateOrg(orgUser.org.id, {
        plan_code: orgPlan,
        org_type: orgType,
        client_limit: orgLimit.trim() === '' ? null : Number(orgLimit),
      });
      setToast('Organization updated');
      setOrgUser(null);
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const terminate = async (u: AdminUser) => {
    if (!u.org) return;
    const ok = await confirm({
      title: `Terminate ${u.org.name}'s plan?`,
      message:
        'This cancels any active Stripe subscription and reverts the organization to the Free plan. The account stays active.',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await Admin.terminateOrg(u.org.id);
      setToast('Plan terminated');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Terminate failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: AdminUser) => {
    const ok = await confirm({
      title: `Delete ${u.email}?`,
      message:
        'This permanently deletes the user. If they solely own an organization, that org and its workspaces are deleted too. This cannot be undone.',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await Admin.deleteUser(u.id);
      setToast('User deleted');
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

  const planMenuItems = () => [
    ...plans.map((p) => (
      <MenuItem key={p.code} value={p.code}>
        {p.name}
        <Box component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
          {p.price_monthly > 0 ? ` · $${p.price_monthly}/mo` : ' · Free'}
        </Box>
      </MenuItem>
    )),
    <Divider key="div" />,
    <MenuItem key={CUSTOM_PLAN_VALUE} value={CUSTOM_PLAN_VALUE} sx={{ color: BRAND.tealDeep, fontWeight: 700 }}>
      <ListItemIcon sx={{ minWidth: 30 }}>
        <AutoAwesomeIcon sx={{ fontSize: 18, color: BRAND.tealDeep }} />
      </ListItemIcon>
      <ListItemText primary="Create custom plan…" primaryTypographyProps={{ fontWeight: 700 }} />
    </MenuItem>,
  ];

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography sx={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
            User Management
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Every registered account, their plan, and agency client caps.
          </Typography>
        </Box>
        <Stack direction="row" gap={1.5} alignItems="center">
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={() => void load()} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{
              background: BRAND.gradient,
              color: BRAND.ink,
              fontWeight: 800,
              textTransform: 'none',
              px: 2.5,
              boxShadow: '0 6px 18px rgba(255,175,6,0.28)',
            }}
          >
            New user
          </Button>
        </Stack>
      </Stack>

      {/* Stat cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total users', value: stats.total, icon: <GroupIcon />, color: BRAND.amberDeep, soft: BRAND.amberSoft },
          { label: 'Active', value: stats.active, icon: <VerifiedIcon />, color: BRAND.tealDeep, soft: BRAND.tealSoft },
          { label: 'Paid plans', value: stats.paid, icon: <PaidIcon />, color: '#6366F1', soft: '#EEF0FF' },
          { label: 'Agencies', value: stats.agencies, icon: <ApartmentIcon />, color: BRAND.pink, soft: BRAND.pinkSoft },
        ].map((s) => (
          <Paper
            key={s.label}
            elevation={0}
            sx={{
              flex: 1,
              p: 2.25,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1.75,
            }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2.5,
                bgcolor: s.soft,
                color: s.color,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {s.icon}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>{s.label}</Typography>
            </Box>
          </Paper>
        ))}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <TextField
        size="small"
        placeholder="Search by email, name or organization"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2, width: { xs: '100%', sm: 360 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
      >
        <Table size="medium">
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  fontWeight: 700,
                  fontSize: 12.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'text.secondary',
                  bgcolor: 'rgba(20,187,135,0.04)',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                },
              }}
            >
              <TableCell>User</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Clients</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell>
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <Avatar
                      sx={{
                        width: 38,
                        height: 38,
                        fontSize: 14,
                        fontWeight: 700,
                        bgcolor: avatarColor(u.email),
                      }}
                    >
                      {initials(u.full_name, u.email)}
                    </Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" gap={0.75}>
                        <Box sx={{ fontWeight: 700 }}>{u.full_name || '—'}</Box>
                        {u.is_superuser && (
                          <Tooltip title="Platform superadmin">
                            <ShieldIcon sx={{ fontSize: 15, color: BRAND.amberDeep }} />
                          </Tooltip>
                        )}
                      </Stack>
                      <Box sx={{ fontSize: 12.5, color: 'text.secondary' }}>{u.email}</Box>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Box sx={{ fontWeight: 600 }}>{u.org?.name || '—'}</Box>
                  <Box sx={{ fontSize: 12, color: 'text.secondary', textTransform: 'capitalize' }}>
                    {u.org?.org_type || ''}
                    {u.role ? ` · ${u.role}` : ''}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={planLabel(u.org?.plan || 'free')}
                    sx={{
                      fontWeight: 700,
                      bgcolor: u.org && u.org.plan !== 'free' ? BRAND.tealSoft : 'rgba(0,0,0,0.05)',
                      color: u.org && u.org.plan !== 'free' ? BRAND.tealDeep : 'text.secondary',
                    }}
                  />
                  {u.org?.has_subscription && (
                    <Box sx={{ fontSize: 11, color: BRAND.teal, mt: 0.5, fontWeight: 600 }}>● Stripe active</Box>
                  )}
                </TableCell>
                <TableCell>
                  {u.org
                    ? `${u.org.workspace_count}${u.org.client_limit != null ? ` / ${u.org.client_limit}` : ''}`
                    : '—'}
                  {u.org?.org_type === 'agency' && u.org.client_limit == null && (
                    <Box sx={{ fontSize: 11, color: 'text.secondary' }}>plan default</Box>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={u.is_active ? 'Active' : 'Disabled'}
                    color={u.is_active ? 'success' : 'default'}
                    variant={u.is_active ? 'filled' : 'outlined'}
                    sx={{ height: 22, fontSize: 11 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Plan / org type / client cap">
                    <span>
                      <IconButton size="small" onClick={() => openEditOrg(u)} disabled={!u.org}>
                        <BusinessIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Edit user">
                    <IconButton size="small" onClick={() => openEditUser(u)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Terminate plan">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => terminate(u)}
                        disabled={!u.org || u.org.plan === 'free'}
                      >
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete user">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => remove(u)}
                        disabled={u.id === me?.user?.id}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create user */}
      <PremiumDialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm">
        <DialogHero
          icon={<PersonAddRoundedIcon />}
          title="Create user"
          subtitle="Provision an account and its organization. A welcome email is sent on save."
          onClose={() => setCreateOpen(false)}
        />
        <DialogBody>
          <Stack gap={2.5}>
            <Box>
              <SectionLabel>Account</SectionLabel>
              <FieldGrid>
                <TextField
                  label="Full name"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  fullWidth
                  size="small"
                />
                <FullSpan>
                  <TextField
                    label="Temporary password"
                    type={showPw ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    helperText="Min 8 characters. Emailed to the user in their welcome message."
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Generate strong password">
                            <IconButton
                              size="small"
                              onClick={() => setCreateForm({ ...createForm, password: randomPassword() })}
                              edge="end"
                            >
                              <AutoAwesomeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <IconButton size="small" onClick={() => setShowPw((s) => !s)} edge="end">
                            {showPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </FullSpan>
              </FieldGrid>
            </Box>

            <Box>
              <SectionLabel>Organization</SectionLabel>
              <FieldGrid>
                <FullSpan>
                  <TextField
                    label="Organization name"
                    value={createForm.org_name}
                    onChange={(e) => setCreateForm({ ...createForm, org_name: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </FullSpan>
                <TextField
                  select
                  label="Org type"
                  value={createForm.org_type}
                  onChange={(e) => setCreateForm({ ...createForm, org_type: e.target.value })}
                  fullWidth
                  size="small"
                >
                  {ORG_TYPES.map((o) => (
                    <MenuItem key={o.id} value={o.id}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Plan"
                  value={createForm.plan_code}
                  onChange={(e) => onPlanSelect('create', e.target.value)}
                  fullWidth
                  size="small"
                >
                  {planMenuItems()}
                </TextField>
                {createForm.org_type === 'agency' && (
                  <FullSpan>
                    <TextField
                      label="Client limit (max workspaces)"
                      type="number"
                      value={createForm.client_limit ?? ''}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          client_limit: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      helperText="How many clients this agency can add. Leave blank to use the plan default."
                      fullWidth
                      size="small"
                    />
                  </FullSpan>
                )}
              </FieldGrid>
            </Box>

            <Box>
              <SectionLabel>Access</SectionLabel>
              <Paper
                variant="outlined"
                sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ShieldIcon sx={{ fontSize: 17, color: BRAND.amberDeep }} /> Platform superadmin
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    Full access to this admin area. Grant sparingly.
                  </Typography>
                </Box>
                <Switch
                  checked={!!createForm.is_superuser}
                  onChange={(e) => setCreateForm({ ...createForm, is_superuser: e.target.checked })}
                />
              </Paper>
            </Box>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setCreateOpen(false)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button
            onClick={submitCreate}
            disabled={busy || !createForm.email || !createForm.password || !createForm.org_name}
            sx={inkPillSx}
          >
            Create user
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Edit user */}
      <PremiumDialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="xs">
        <DialogHero
          icon={<EditRoundedIcon />}
          title="Edit user"
          subtitle={editUser?.email}
          onClose={() => setEditUser(null)}
          tint={BRAND.tealDeep}
          tintSoft={BRAND.tealSoft}
        />
        <DialogBody>
          <Stack gap={2.25}>
            <Box>
              <SectionLabel>Profile</SectionLabel>
              <Stack gap={1.75}>
                <TextField
                  label="Full name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Reset password (optional)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  helperText="Leave blank to keep the current password."
                  fullWidth
                  size="small"
                />
              </Stack>
            </Box>
            <Box>
              <SectionLabel>Access</SectionLabel>
              <Stack gap={0.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 600 }}>Active</Typography>
                  <Switch checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 600 }}>Superadmin</Typography>
                  <Switch
                    checked={editSuper}
                    onChange={(e) => setEditSuper(e.target.checked)}
                    disabled={editUser?.id === me?.user?.id}
                  />
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setEditUser(null)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={submitEditUser} disabled={busy} sx={inkPillSx}>
            Save
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Edit org (plan / type / client cap) */}
      <PremiumDialog open={!!orgUser} onClose={() => setOrgUser(null)} maxWidth="xs">
        <DialogHero
          icon={<ApartmentRoundedIcon />}
          title="Organization & plan"
          subtitle={orgUser?.org?.name}
          onClose={() => setOrgUser(null)}
        />
        <DialogBody>
          <Stack gap={1.75}>
            <SectionLabel>Plan & limits</SectionLabel>
            <TextField
              select
              label="Plan"
              value={orgPlan}
              onChange={(e) => onPlanSelect('org', e.target.value)}
              fullWidth
              size="small"
            >
              {planMenuItems()}
            </TextField>
            <TextField
              select
              label="Org type"
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
              fullWidth
              size="small"
            >
              {ORG_TYPES.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Client limit (max workspaces)"
              type="number"
              value={orgLimit}
              onChange={(e) => setOrgLimit(e.target.value)}
              helperText="Caps how many clients this account can add. Blank = plan default."
              fullWidth
              size="small"
            />
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => setOrgUser(null)} sx={ghostPillSx}>
            Cancel
          </Button>
          <Button onClick={submitEditOrg} disabled={busy} sx={inkPillSx}>
            Save
          </Button>
        </DialogFooter>
      </PremiumDialog>

      {/* Custom plan creator */}
      <CustomPlanDialog
        open={customPlanOpen}
        onClose={() => setCustomPlanOpen(false)}
        onCreated={onCustomPlanCreated}
        existingCodes={plans.map((p) => p.code)}
      />

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
