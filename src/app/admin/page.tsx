'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
  Card,
  CardContent,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Skeleton,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  EmojiEvents as EmojiEventsIcon,
  ShoppingCart as ShoppingCartIcon,
  ArrowForward as ArrowForwardIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Article as ArticleIcon,
  Search as SearchIcon,
  Analytics as AnalyticsIcon,
  ContactPage as ContactPageIcon,
  SmartToy as SmartToyIcon,
  People as UsersIcon,
  Refresh as RefreshIcon,
  GroupAdd as GroupAddIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  PieLabelRenderProps,
} from 'recharts';
import { checkAuth, User } from '@/services/auth';
import { deleteLead } from '@/app/admin/leads/api';

interface RecentLead {
  id: string;
  name: string;
  email: string;
  company: string;
  date: string;
  status: string;
  source: string;
}

interface DashboardData {
  leads: {
    total: number;
    newLeads: number;
    qualifiedLeads: number;
    wonLeads: number;
    conversionRate: number;
    averageResponseTime: number;
    bySource: { source: string; count: number; percentage: number }[];
    byStatus: { status: string; count: number; percentage: number }[];
    trend: { date: string; count: number }[];
    recent: RecentLead[];
  };
  users: { total: number; admins: number; superadmins: number };
  conversations: { total: number };
}

const STATUS_COLORS: Record<string, string> = {
  New: '#0A66C2',
  Contacted: '#00B8D9',
  Qualified: '#14bb87',
  Proposal: '#ffaf06',
  Negotiation: '#ff7a06',
  Won: '#2e7d32',
  Lost: '#d92c4a',
  'On Hold': '#6c757d',
};

const PIE_FALLBACK = ['#0A66C2', '#14bb87', '#ffaf06', '#ff7a06', '#d92c4a', '#00B8D9'];

const quickActions = [
  { title: 'View Leads', icon: <ContactPageIcon />, color: '#ffaf06', path: '/admin/leads' },
  { title: 'AI Assistant', icon: <SmartToyIcon />, color: '#0A66C2', path: '/admin/assistant' },
  { title: 'Analytics', icon: <AnalyticsIcon />, color: '#d92c4a', path: '/admin/analytics' },
  { title: 'SEO', icon: <SearchIcon />, color: '#14bb87', path: '/admin/seo' },
  { title: 'New Blog Post', icon: <ArticleIcon />, color: '#ff7a06', path: '/admin/blog/new' },
];

function StatCard({
  title,
  value,
  icon,
  change,
  isPositive,
  color,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  isPositive?: boolean;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 3,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.07)',
        transition: 'box-shadow .2s ease, transform .2s ease',
        '&:hover': { boxShadow: '0 8px 28px rgba(0,0,0,0.10)', transform: 'translateY(-3px)' },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: alpha(color, 0.12),
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          {change && !loading && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                px: 1,
                py: 0.25,
                borderRadius: 5,
                bgcolor: alpha(isPositive ? '#14bb87' : '#d92c4a', 0.12),
              }}
            >
              {isPositive ? (
                <TrendingUpIcon sx={{ color: '#14bb87', fontSize: 15 }} />
              ) : (
                <TrendingDownIcon sx={{ color: '#d92c4a', fontSize: 15 }} />
              )}
              <Typography variant="caption" fontWeight={700} color={isPositive ? '#0e8a63' : '#b01e38'}>
                {change}
              </Typography>
            </Box>
          )}
        </Box>
        {loading ? (
          <Skeleton width={80} height={40} />
        ) : (
          <Typography variant="h4" component="div" fontWeight={800} sx={{ mb: 0.5, fontSize: 30 }}>
            {value}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
        textAlign: 'center',
        px: 2,
      }}
    >
      <AnalyticsIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}

export default function AdminDashboard() {
  const theme = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load dashboard data');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setUser(checkAuth().user);
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this lead? This cannot be undone.')) return;
    try {
      await deleteLead(id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              leads: {
                ...prev.leads,
                total: Math.max(0, prev.leads.total - 1),
                recent: prev.leads.recent.filter((l) => l.id !== id),
              },
            }
          : prev
      );
      setSnack('Lead deleted');
    } catch {
      setSnack('Could not delete lead');
    }
  };

  const leads = data?.leads;
  const trendData = (leads?.trend || []).map((t) => ({
    name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    leads: t.count,
  }));
  const statusData = (leads?.byStatus || []).map((s) => ({ name: s.status, value: s.count }));
  const hasLeads = (leads?.total || 0) > 0;

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          p: { xs: 3, md: 3.5 },
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(120deg, #0e1726 0%, #1a2942 100%)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '-40%',
            right: '-5%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,175,6,0.30) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h4" component="h1" fontWeight={800} sx={{ mb: 0.5, fontSize: { xs: 24, md: 30 } }}>
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Live overview of your leads, pipeline, and team — straight from your data.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} sx={{ color: '#0e1726' }} /> : <RefreshIcon />}
          onClick={load}
          disabled={loading}
          sx={{
            position: 'relative',
            zIndex: 1,
            bgcolor: '#ffaf06',
            color: '#0e1726',
            fontWeight: 700,
            borderRadius: 2,
            '&:hover': { bgcolor: '#e69e00' },
          }}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button onClick={load}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {/* Quick Actions */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{ mb: 4 }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Quick Actions
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
            gap: 2,
          }}
        >
          {quickActions.map((action, index) => (
            <motion.div key={index} whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 300 }}>
              <Button
                component={Link}
                href={action.path}
                variant="outlined"
                fullWidth
                sx={{
                  p: 2,
                  borderRadius: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  borderColor: alpha(action.color, 0.3),
                  color: action.color,
                  '&:hover': { backgroundColor: alpha(action.color, 0.05), borderColor: action.color },
                }}
              >
                <Box
                  sx={{
                    backgroundColor: alpha(action.color, 0.1),
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                  }}
                >
                  {action.icon}
                </Box>
                <Typography variant="body2" fontWeight={500}>
                  {action.title}
                </Typography>
              </Button>
            </motion.div>
          ))}
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        sx={{ mb: 4 }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Lead & Pipeline Metrics
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          <StatCard
            title="Total Leads"
            value={leads?.total ?? 0}
            icon={<PeopleIcon />}
            color={theme.palette.primary.main}
            loading={loading}
          />
          <StatCard
            title="New (Last 7 Days)"
            value={leads?.newLeads ?? 0}
            icon={<GroupAddIcon />}
            color="#14bb87"
            loading={loading}
          />
          <StatCard
            title="Qualified"
            value={leads?.qualifiedLeads ?? 0}
            icon={<ShoppingCartIcon />}
            color="#ffaf06"
            loading={loading}
          />
          <StatCard
            title="Won / Conversion"
            value={`${leads?.wonLeads ?? 0} · ${leads?.conversionRate ?? 0}%`}
            icon={<EmojiEventsIcon />}
            color="#2e7d32"
            loading={loading}
          />
        </Box>
      </Box>

      {/* Team & AI stats */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        sx={{ mb: 4 }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          <StatCard
            title="Team Members"
            value={data?.users.total ?? 0}
            icon={<UsersIcon />}
            color="#0A66C2"
            loading={loading}
          />
          <StatCard
            title="AI Conversations"
            value={data?.conversations.total ?? 0}
            icon={<SmartToyIcon />}
            color="#7048e8"
            loading={loading}
          />
          <StatCard
            title="Avg. Response Time"
            value={`${leads?.averageResponseTime ?? 0}h`}
            icon={<TrendingUpIcon />}
            color="#ff7a06"
            loading={loading}
          />
        </Box>
      </Box>

      {/* Charts */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        sx={{ mb: 4 }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Analytics Overview
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 4,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                New Leads (Last 14 Days)
              </Typography>
              <Box sx={{ height: 300, width: '100%' }}>
                {loading ? (
                  <Skeleton variant="rounded" height={280} />
                ) : hasLeads ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <RechartsTooltip />
                      <Bar dataKey="leads" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label="No leads yet — they'll appear here as they come in." />
                )}
              </Box>
            </CardContent>
          </Card>

          <Card
            elevation={0}
            sx={{
              height: '100%',
              borderRadius: 4,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Pipeline by Status
              </Typography>
              <Box sx={{ height: 300, width: '100%' }}>
                {loading ? (
                  <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto', mt: 3 }} />
                ) : hasLeads ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }: PieLabelRenderProps) =>
                          `${name}: ${percent ? (percent * 100).toFixed(0) : '0'}%`
                        }
                      >
                        {statusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.name] || PIE_FALLBACK[index % PIE_FALLBACK.length]}
                          />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label="No pipeline data yet." />
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Recent Activity */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, gap: 3 }}>
          {/* Recent leads */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Recent Lead Submissions
                </Typography>
                <Button component={Link} href="/admin/leads" endIcon={<ArrowForwardIcon />} size="small">
                  View All
                </Button>
              </Box>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="40%" />
                      <Skeleton width="70%" />
                    </Box>
                  </Box>
                ))
              ) : leads && leads.recent.length > 0 ? (
                <List sx={{ width: '100%' }}>
                  {leads.recent.map((lead) => (
                    <React.Fragment key={lead.id}>
                      <ListItem
                        alignItems="flex-start"
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="View in Leads">
                              <IconButton
                                edge="end"
                                size="small"
                                onClick={() => router.push('/admin/leads')}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                edge="end"
                                size="small"
                                color="error"
                                onClick={() => handleDelete(lead.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                        sx={{ px: 0 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: STATUS_COLORS[lead.status] || theme.palette.primary.main }}>
                            {lead.name.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body1" fontWeight={500}>
                                {lead.name}
                              </Typography>
                              <Chip
                                label={lead.status}
                                size="small"
                                sx={{
                                  bgcolor: alpha(STATUS_COLORS[lead.status] || '#999', 0.12),
                                  color: STATUS_COLORS[lead.status] || 'text.secondary',
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              {lead.company && (
                                <Typography component="span" variant="body2" color="text.primary">
                                  {lead.company} —{' '}
                                </Typography>
                              )}
                              {lead.email} ·{' '}
                              {new Date(lead.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </>
                          }
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                  <ContactPageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                  <Typography>No leads yet. New submissions will show up here.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Lead sources */}
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Top Lead Sources
              </Typography>
              {loading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} height={40} />)
              ) : leads && leads.bySource.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {leads.bySource
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 6)
                    .map((s, i) => (
                      <Box key={s.source}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {s.source}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {s.count} ({s.percentage}%)
                          </Typography>
                        </Box>
                        <Box sx={{ height: 8, borderRadius: 4, bgcolor: alpha('#0A66C2', 0.1), overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${s.percentage}%`,
                              borderRadius: 4,
                              bgcolor: PIE_FALLBACK[i % PIE_FALLBACK.length],
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                  <Typography>No source data yet.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setSnack(null)}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}
