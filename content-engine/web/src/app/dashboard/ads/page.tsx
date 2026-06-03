'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/lib/auth';
import { Ads, type AdAccount, type Campaign } from '@/lib/api';

function renderValue(v: unknown): React.ReactNode {
  if (Array.isArray(v)) {
    return (
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
        {v.map((item, i) => (
          <Chip
            key={i}
            size="small"
            variant="outlined"
            label={typeof item === 'string' ? item : JSON.stringify(item)}
          />
        ))}
      </Stack>
    );
  }
  if (v && typeof v === 'object') {
    return (
      <Box sx={{ pl: 1.5, mt: 0.5 }}>
        {Object.entries(v as Record<string, unknown>).map(([k, val]) => (
          <Box key={k} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {k.replace(/_/g, ' ')}
            </Typography>
            {renderValue(val)}
          </Box>
        ))}
      </Box>
    );
  }
  return <Typography variant="body2">{String(v)}</Typography>;
}

export default function AdsPage() {
  const { activeWorkspace } = useAuth();
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [acctOpen, setAcctOpen] = useState(false);
  const [acctName, setAcctName] = useState('');
  const [acctPlatform, setAcctPlatform] = useState('google_ads');
  const [acctGrant, setAcctGrant] = useState(false);

  const [genAccount, setGenAccount] = useState('');
  const [genObjective, setGenObjective] = useState('');
  const [genProduct, setGenProduct] = useState('');
  const [genBudget, setGenBudget] = useState('');
  const [generating, setGenerating] = useState(false);

  const refresh = () => {
    Promise.all([Ads.accounts().catch(() => []), Ads.campaigns().catch(() => [])]).then(
      ([a, c]) => {
        setAccounts(a);
        setCampaigns(c);
        setSelected((cur) => cur || c[0] || null);
        if (a[0] && !genAccount) setGenAccount(a[0].id);
        setLoading(false);
      },
    );
  };

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  const createAccount = async () => {
    if (!acctName.trim()) return;
    await Ads.createAccount({
      name: acctName.trim(),
      platform: acctPlatform,
      is_grant: acctGrant,
    });
    setAcctOpen(false);
    setAcctName('');
    refresh();
  };

  const generate = async () => {
    if (!genAccount || !genObjective.trim() || !genProduct.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const c = await Ads.generate({
        ad_account_id: genAccount,
        objective: genObjective.trim(),
        product: genProduct.trim(),
        daily_budget: genBudget ? Number(genBudget) : undefined,
      });
      setCampaigns((prev) => [c, ...prev]);
      setSelected(c);
      setGenObjective('');
      setGenProduct('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const toggleStatus = async (c: Campaign) => {
    const next = c.status === 'active' ? 'paused' : 'active';
    const updated = await Ads.setStatus(c.id, next);
    setCampaigns((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    setSelected(updated);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={800}>
                Ad accounts
              </Typography>
              <Button size="small" onClick={() => setAcctOpen(true)}>
                Add account
              </Button>
            </Stack>
            {accounts.length === 0 ? (
              <Typography color="text.secondary">No ad accounts yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {accounts.map((a) => (
                  <Stack key={a.id} direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={a.platform} color="primary" variant="outlined" />
                    <Typography sx={{ flex: 1 }}>{a.name}</Typography>
                    {a.is_grant && <Chip size="small" label="Ad Grant" color="success" />}
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Generate campaign
            </Typography>
            <Stack spacing={2}>
              <TextField
                select
                label="Account"
                value={genAccount}
                onChange={(e) => setGenAccount(e.target.value)}
                fullWidth
              >
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name} ({a.platform})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Objective"
                placeholder="Drive qualified B2B demo bookings"
                value={genObjective}
                onChange={(e) => setGenObjective(e.target.value)}
                fullWidth
              />
              <TextField
                label="Product / offer"
                value={genProduct}
                onChange={(e) => setGenProduct(e.target.value)}
                fullWidth
              />
              <TextField
                label="Daily budget (optional)"
                type="number"
                value={genBudget}
                onChange={(e) => setGenBudget(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={generate}
                disabled={generating || !genAccount}
              >
                {generating ? <CircularProgress size={22} /> : 'Generate with AI'}
              </Button>
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </CardContent>
        </Card>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          CAMPAIGNS
        </Typography>
        <Stack spacing={1.5}>
          {campaigns.length === 0 && (
            <Typography color="text.secondary">No campaigns yet.</Typography>
          )}
          {campaigns.map((c) => (
            <Card key={c.id} variant="outlined">
              <CardActionArea onClick={() => setSelected(c)} sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
                  <Chip size="small" label={c.status} />
                  {c.daily_budget != null && (
                    <Chip size="small" label={`$${c.daily_budget}/day`} variant="outlined" />
                  )}
                </Stack>
                <Typography fontWeight={600}>{c.name}</Typography>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        {selected ? (
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={800}>
                  {selected.name}
                </Typography>
                <Button variant="outlined" size="small" onClick={() => toggleStatus(selected)}>
                  {selected.status === 'active' ? 'Pause' : 'Activate'}
                </Button>
              </Stack>
              {selected.objective && (
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {selected.objective}
                </Typography>
              )}

              {selected.plan && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Campaign plan
                  </Typography>
                  {Object.entries(selected.plan).map(([k, v]) => (
                    <Box key={k} sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                        {k.replace(/_/g, ' ')}
                      </Typography>
                      {renderValue(v)}
                    </Box>
                  ))}
                </Box>
              )}

              {selected.assets && Object.keys(selected.assets).length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Assets
                  </Typography>
                  {Object.entries(selected.assets).map(([k, v]) => (
                    <Box key={k} sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                        {k.replace(/_/g, ' ')}
                      </Typography>
                      {renderValue(v)}
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>Generate or select a campaign to see the full plan.</Typography>
            </CardContent>
          </Card>
        )}
      </Grid>

      <Dialog open={acctOpen} onClose={() => setAcctOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add ad account</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Account name"
              value={acctName}
              onChange={(e) => setAcctName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Platform"
              value={acctPlatform}
              onChange={(e) => setAcctPlatform(e.target.value)}
              fullWidth
            >
              <MenuItem value="google_ads">Google Ads</MenuItem>
              <MenuItem value="meta_ads">Meta Ads</MenuItem>
              <MenuItem value="linkedin_ads">LinkedIn Ads</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Switch checked={acctGrant} onChange={(e) => setAcctGrant(e.target.checked)} />
              }
              label="Google Ad Grant (non-profit) account"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcctOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={createAccount} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
