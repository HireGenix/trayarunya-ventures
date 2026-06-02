'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Switch,
  Alert,
  CircularProgress,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { checkAuth, isSuperAdmin, User } from '@/services/auth';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'superadmin';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

type EditState = {
  open: boolean;
  mode: 'create' | 'edit';
  id?: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'superadmin';
  active: boolean;
};

const emptyForm: EditState = {
  open: false,
  mode: 'create',
  name: '',
  email: '',
  password: '',
  role: 'admin',
  active: true,
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState<EditState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const authHeaders = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users', { headers: authHeaders() });
      if (res.status === 403) {
        setAllowed(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users || []);
      setAllowed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    const auth = checkAuth();
    setCurrentUser(auth.user);
    if (!isSuperAdmin(auth.user)) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => setForm({ ...emptyForm, open: true, mode: 'create' });
  const openEdit = (u: AdminUser) =>
    setForm({
      open: true,
      mode: 'edit',
      id: u.id,
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      active: u.active,
    });
  const closeForm = () => setForm((f) => ({ ...f, open: false }));

  const submitForm = async () => {
    setSaving(true);
    setError(null);
    try {
      if (form.mode === 'create') {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || 'Could not create user');
        }
      } else {
        const patch: Record<string, unknown> = {
          id: form.id,
          name: form.name,
          role: form.role,
          active: form.active,
        };
        if (form.password.trim()) patch.password = form.password;
        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || 'Could not update user');
        }
      }
      closeForm();
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (u: AdminUser) => {
    if (!window.confirm(`Delete ${u.name} (${u.email})? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(u.id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Could not delete user');
      }
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (allowed === false) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          User Management
        </Typography>
        <Alert severity="warning">
          Only super admins can manage users. Ask a super admin for access.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add unlimited team members and control their access.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add User
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 6 }}>
            <PersonAddIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No users yet. Add your first teammate.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={u.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                        color={u.role === 'superadmin' ? 'secondary' : 'default'}
                        variant={u.role === 'superadmin' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={u.active ? 'Active' : 'Disabled'}
                        color={u.active ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(u)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.id === currentUser?.id ? 'You cannot delete yourself' : 'Delete'}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={u.id === currentUser?.id}
                            onClick={() => deleteUser(u)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={form.open} onClose={closeForm} fullWidth maxWidth="sm">
        <DialogTitle>{form.mode === 'create' ? 'Add User' : 'Edit User'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
              disabled={form.mode === 'edit'}
              helperText={form.mode === 'edit' ? 'Email cannot be changed' : ''}
            />
            <TextField
              label={form.mode === 'create' ? 'Password' : 'New password (optional)'}
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              fullWidth
              helperText="Minimum 6 characters"
            />
            <TextField
              label="Role"
              select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'superadmin' }))
              }
              fullWidth
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="superadmin">Super Admin</MenuItem>
            </TextField>
            {form.mode === 'edit' && (
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography>Account active</Typography>
                <Switch
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeForm} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitForm} disabled={saving}>
            {saving ? 'Saving…' : form.mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
