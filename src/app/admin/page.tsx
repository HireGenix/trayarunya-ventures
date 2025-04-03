'use client';

import React from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
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
  LinearProgress,
  Tooltip
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  ShoppingCart as ShoppingCartIcon,
  Email as EmailIcon,
  ArrowForward as ArrowForwardIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Article as ArticleIcon,
  Search as SearchIcon,
  Analytics as AnalyticsIcon,
  ContactPage as ContactPageIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, PieLabelRenderProps } from 'recharts';

// Mock data for charts and statistics
const visitData = [
  { name: 'Mon', visits: 4000 },
  { name: 'Tue', visits: 3000 },
  { name: 'Wed', visits: 2000 },
  { name: 'Thu', visits: 2780 },
  { name: 'Fri', visits: 1890 },
  { name: 'Sat', visits: 2390 },
  { name: 'Sun', visits: 3490 },
];

const trafficSourceData = [
  { name: 'Direct', value: 400 },
  { name: 'Organic Search', value: 300 },
  { name: 'Referral', value: 300 },
  { name: 'Social Media', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const recentLeads = [
  { id: 1, name: 'John Doe', email: 'john.doe@example.com', company: 'ABC Corp', date: '2025-03-04', status: 'New' },
  { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', company: 'XYZ Inc', date: '2025-03-03', status: 'Contacted' },
  { id: 3, name: 'Robert Johnson', email: 'robert@example.com', company: 'Acme Ltd', date: '2025-03-02', status: 'Qualified' },
  { id: 4, name: 'Emily Davis', email: 'emily@example.com', company: 'Tech Solutions', date: '2025-03-01', status: 'New' },
];

const recentBlogPosts = [
  { id: 1, title: 'The Future of AI in Business', author: 'Admin', date: '2025-03-04', status: 'Published' },
  { id: 2, title: 'How to Optimize Your Website for SEO', author: 'Admin', date: '2025-03-02', status: 'Draft' },
  { id: 3, title: '10 Tips for Better Customer Engagement', author: 'Admin', date: '2025-02-28', status: 'Published' },
];

const quickActions = [
  { title: 'Manage SEO', icon: <SearchIcon />, color: '#0A66C2', path: '/admin/seo' },
  { title: 'New Blog Post', icon: <ArticleIcon />, color: '#14bb87', path: '/admin/blog/new' },
  { title: 'View Analytics', icon: <AnalyticsIcon />, color: '#d92c4a', path: '/admin/analytics' },
  { title: 'Lead Submissions', icon: <ContactPageIcon />, color: '#ffaf06', path: '/admin/leads' },
  { title: 'Settings', icon: <SettingsIcon />, color: '#6c757d', path: '/admin/settings' },
];

const StatCard = ({ title, value, icon, change, isPositive, color }: any) => {
  const theme = useTheme();
  
  return (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%',
        borderRadius: 4,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.05)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 100,
          height: 100,
          borderRadius: '0 0 0 100%',
          backgroundColor: alpha(color, 0.1),
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          p: 2,
        }}
      >
        <Box sx={{ color: color }}>
          {icon}
        </Box>
      </Box>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div" fontWeight={700} sx={{ mb: 1 }}>
          {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isPositive ? (
            <TrendingUpIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
          ) : (
            <TrendingDownIcon sx={{ color: 'error.main', fontSize: 16, mr: 0.5 }} />
          )}
          <Typography 
            variant="body2" 
            color={isPositive ? 'success.main' : 'error.main'}
            fontWeight={500}
          >
            {change}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
            vs last week
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default function AdminDashboard() {
  const theme = useTheme();
  
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to the Trayarunya Ventures admin panel. Here's an overview of your website's performance.
        </Typography>
      </Box>
      
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
          {quickActions.map((action, index) => (
            <Box key={index}>
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
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
                    '&:hover': {
                      backgroundColor: alpha(action.color, 0.05),
                      borderColor: action.color,
                    },
                  }}
                >
                  <Box sx={{ 
                    backgroundColor: alpha(action.color, 0.1),
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                  }}>
                    {action.icon}
                  </Box>
                  <Typography variant="body2" fontWeight={500}>
                    {action.title}
                  </Typography>
                </Button>
              </motion.div>
            </Box>
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
          Website Statistics
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
          <Box>
            <StatCard 
              title="Total Visitors" 
              value="12,345" 
              icon={<VisibilityIcon />} 
              change="+12.5%" 
              isPositive={true}
              color={theme.palette.primary.main}
            />
          </Box>
          <Box>
            <StatCard 
              title="New Leads" 
              value="286" 
              icon={<PeopleIcon />} 
              change="+8.2%" 
              isPositive={true}
              color="#14bb87"
            />
          </Box>
          <Box>
            <StatCard 
              title="Conversion Rate" 
              value="3.2%" 
              icon={<ShoppingCartIcon />} 
              change="-0.5%" 
              isPositive={false}
              color="#d92c4a"
            />
          </Box>
          <Box>
            <StatCard 
              title="Avg. Session Duration" 
              value="2m 45s" 
              icon={<TrendingUpIcon />} 
              change="+15.3%" 
              isPositive={true}
              color="#ffaf06"
            />
          </Box>
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
          <Box>
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
                  Website Visits (Last 7 Days)
                </Typography>
                <Box sx={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={visitData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="visits" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box>
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
                  Traffic Sources
                </Typography>
                <Box sx={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={trafficSourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }: PieLabelRenderProps) => `${name}: ${(percent ? (percent * 100).toFixed(0) : '0')}%`}
                      >
                        {trafficSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
      
      {/* Recent Activity */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Recent Activity
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
          <Box>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Recent Lead Submissions
                  </Typography>
                  <Button 
                    component={Link}
                    href="/admin/leads"
                    endIcon={<ArrowForwardIcon />}
                    size="small"
                  >
                    View All
                  </Button>
                </Box>
                <List sx={{ width: '100%' }}>
                  {recentLeads.map((lead) => (
                    <React.Fragment key={lead.id}>
                      <ListItem
                        alignItems="flex-start"
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton edge="end" aria-label="view" size="small">
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton edge="end" aria-label="delete" size="small">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                        sx={{ px: 0 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                            {lead.name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" fontWeight={500}>
                                {lead.name}
                              </Typography>
                              <Chip 
                                label={lead.status} 
                                size="small" 
                                color={lead.status === 'New' ? 'primary' : lead.status === 'Contacted' ? 'info' : 'success'} 
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.primary"
                              >
                                {lead.company}
                              </Typography>
                              {` — ${lead.email} • ${lead.date}`}
                            </>
                          }
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
          <Box>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Recent Blog Posts
                  </Typography>
                  <Button 
                    component={Link}
                    href="/admin/blog"
                    endIcon={<ArrowForwardIcon />}
                    size="small"
                  >
                    View All
                  </Button>
                </Box>
                <List sx={{ width: '100%' }}>
                  {recentBlogPosts.map((post) => (
                    <React.Fragment key={post.id}>
                      <ListItem
                        alignItems="flex-start"
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Edit">
                              <IconButton edge="end" aria-label="edit" size="small">
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton edge="end" aria-label="delete" size="small">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                        sx={{ px: 0 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: theme.palette.secondary ? theme.palette.secondary.main : '#14bb87' }}>
                            <ArticleIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" fontWeight={500}>
                                {post.title}
                              </Typography>
                              <Chip 
                                label={post.status} 
                                size="small" 
                                color={post.status === 'Published' ? 'success' : 'warning'} 
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.primary"
                              >
                                {post.author}
                              </Typography>
                              {` — ${post.date}`}
                            </>
                          }
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
