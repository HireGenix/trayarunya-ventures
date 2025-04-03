'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Tabs, 
  Tab, 
  useTheme, 
  alpha,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import Link from 'next/link';

// Import components
import TabPanel, { a11yProps } from './components/TabPanel';
import AnalyticsOverviewCards from './components/AnalyticsOverviewCards';
import VisitorsChart from './components/VisitorsChart';
import TrafficSourcesChart from './components/TrafficSourcesChart';
import PagePerformanceTable from './components/PagePerformanceTable';
import DeviceBreakdown from './components/DeviceBreakdown';

// Import API functions
import { 
  getAnalyticsOverview, 
  getTrafficSources, 
  getPagePerformance, 
  getDeviceData,
  getBrowserData,
  getCountryData,
  getTimeSeriesData,
  getConversionData,
  getUserJourneys,
  getEventData,
  exportAnalyticsData,
  emptyState,
  generateEmptyTimeSeriesData
} from './api';

import { 
  AnalyticsOverview, 
  TrafficSource, 
  PagePerformance, 
  DeviceData,
  BrowserData,
  CountryData,
  TimeSeriesData,
  ConversionData,
  UserJourney,
  EventData,
  TimeframeOption
} from './types';

export default function AnalyticsPage() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<string>('month');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  
  // State for data
  const [overviewStats, setOverviewStats] = useState<AnalyticsOverview | undefined>(undefined);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[] | undefined>(undefined);
  const [pagePerformance, setPagePerformance] = useState<PagePerformance[] | undefined>(undefined);
  const [deviceData, setDeviceData] = useState<DeviceData[] | undefined>(undefined);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[] | undefined>(undefined);

  // Load data on component mount and when timeframe changes
  useEffect(() => {
    loadData();
  }, [timeframe]);

  const loadData = async () => {
    setLoading(true);
    try {
      // In a production environment with real API endpoints, we would make API calls
      // For now, we'll use empty states since the API endpoints aren't available yet
      
      // Set empty states for all data
      setOverviewStats({...emptyState.analyticsOverview, timeframe: timeframe as any});
      setTrafficSources(emptyState.trafficSources);
      setPagePerformance(emptyState.pagePerformance);
      setDeviceData(emptyState.deviceData);
      setTimeSeriesData(generateEmptyTimeSeriesData(timeframe));
      
      // Show a message to the user
      setSnackbarMessage('Using empty states until API endpoints are available. No mock data is being used.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      
      // Show more specific error message
      let errorMessage = 'Failed to load analytics data. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('network')) {
          errorMessage = 'Network error while loading analytics data. Please check your connection and try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      
      // Set empty state when there's an error
      setOverviewStats({...emptyState.analyticsOverview, timeframe: timeframe as any});
      setTrafficSources(emptyState.trafficSources);
      setPagePerformance(emptyState.pagePerformance);
      setDeviceData(emptyState.deviceData);
      setTimeSeriesData(generateEmptyTimeSeriesData(timeframe));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      // In a production environment, this would call the API to refresh the data
      // For now, we'll just reload the empty states
      await loadData();
      
      setSnackbarMessage('Analytics data refreshed with empty states. No mock data is being used.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error refreshing analytics data:', error);
      
      let errorMessage = 'Failed to refresh analytics data. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportData = async () => {
    try {
      // In a production environment, this would call the API to export data
      // For now, we'll create an empty CSV
      const headers = ['Date', 'Visitors', 'Page Views'];
      const csvData = headers.join(',') + '\n';
      
      // Create a download link
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSnackbarMessage('Empty analytics data exported. No mock data is being used.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      
      let errorMessage = 'Failed to export analytics data. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  const timeframeOptions: TimeframeOption[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' }
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            component={Link}
            href="/admin"
            startIcon={<ArrowBackIcon />}
            sx={{ fontWeight: 500 }}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Analytics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportData}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
            }}
          >
            Export Data
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshData}
            disabled={refreshing || loading}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </Box>
      </Box>

      {/* Analytics Overview Cards */}
      <AnalyticsOverviewCards data={overviewStats} loading={loading} />

      {/* Visitors Chart and Traffic Sources */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mb: 4 }}>
        <VisitorsChart 
          data={timeSeriesData} 
          loading={loading} 
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
        />
        <TrafficSourcesChart 
          data={trafficSources} 
          loading={loading} 
        />
      </Box>

      {/* Tabs for different analytics sections */}
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
          mb: 4,
          overflow: 'visible'
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              px: 2,
              '& .MuiTab-root': {
                py: 3,
                px: 2,
                fontWeight: 600,
              }
            }}
          >
            <Tab label="Page Performance" {...a11yProps(0)} />
            <Tab label="Audience" {...a11yProps(1)} />
            <Tab label="Behavior" {...a11yProps(2)} />
            <Tab label="Conversions" {...a11yProps(3)} />
          </Tabs>

          {/* Page Performance Tab */}
          <TabPanel value={tabValue} index={0}>
            <PagePerformanceTable 
              data={pagePerformance} 
              loading={loading} 
            />
          </TabPanel>

          {/* Audience Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <DeviceBreakdown 
                data={deviceData} 
                loading={loading} 
              />
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  height: '100%',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Geographic Distribution
                  </Typography>
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      Geographic data visualization will be implemented here.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>

          {/* Behavior Tab */}
          <TabPanel value={tabValue} index={2}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  User Behavior Analysis
                </Typography>
                <Box sx={{ py: 10, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    User behavior analysis will be implemented here.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Conversions Tab */}
          <TabPanel value={tabValue} index={3}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Conversion Tracking
                </Typography>
                <Box sx={{ py: 10, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Conversion tracking will be implemented here.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
