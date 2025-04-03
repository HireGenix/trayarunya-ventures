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
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import Link from 'next/link';

// Import components
import TabPanel, { a11yProps } from './components/TabPanel';
import SEOOverviewCards from './components/SEOOverviewCards';
import PageMetricsTable from './components/PageMetricsTable';
import KeywordRankingsTable from './components/KeywordRankingsTable';
import SEOIssuesTable from './components/SEOIssuesTable';
import SEOSettings from './components/SEOSettings';

// Import API functions
import { 
  getSEOOverviewStats, 
  getPageMetrics, 
  getKeywordRankings, 
  getSEOIssues,
  refreshSEOAnalysis,
  runSEOAudit,
  exportSEODataToCsv,
  emptyState
} from './api';
import { SEOOverviewStats, PageMetric, KeywordRanking, SEOIssue } from './types';

export default function SEOManagement() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  
  // State for data
  const [overviewStats, setOverviewStats] = useState<SEOOverviewStats | undefined>(undefined);
  const [pageMetrics, setPageMetrics] = useState<PageMetric[] | undefined>(undefined);
  const [keywordRankings, setKeywordRankings] = useState<KeywordRanking[] | undefined>(undefined);
  const [seoIssues, setSeoIssues] = useState<SEOIssue[] | undefined>(undefined);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // In a production environment with real API endpoints, we would make API calls
      // For now, we'll use empty states since the API endpoints aren't available yet
      
      // Set empty states for all data
      setOverviewStats(emptyState.seoOverviewStats);
      setPageMetrics(emptyState.pageMetrics);
      setKeywordRankings(emptyState.keywordRankings);
      setSeoIssues(emptyState.seoIssues);
      
      // Show a message to the user
      setSnackbarMessage('Using empty states until API endpoints are available. No mock data is being used.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error loading SEO data:', error);
      
      // Show more specific error message
      let errorMessage = 'Failed to load SEO data. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('network')) {
          errorMessage = 'Network error while loading SEO data. Please check your connection and try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      
      // Set empty state when there's an error
      setOverviewStats(emptyState.seoOverviewStats);
      setPageMetrics(emptyState.pageMetrics);
      setKeywordRankings(emptyState.keywordRankings);
      setSeoIssues(emptyState.seoIssues);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAnalysis = async () => {
    setRefreshing(true);
    try {
      // In a production environment, this would call the API to refresh the analysis
      // For now, we'll just reload the empty states
      await loadData();
      
      setSnackbarMessage('SEO analysis refreshed with empty states. No mock data is being used.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error refreshing SEO analysis:', error);
      
      let errorMessage = 'Failed to refresh SEO analysis. Please try again.';
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
  
  // Handle running a full SEO audit
  const handleRunAudit = async () => {
    setRefreshing(true);
    try {
      // In a production environment, this would call the API to run a full SEO audit
      // For now, we'll just reload the empty states
      await loadData();
      
      setSnackbarMessage('SEO audit completed with empty states. No mock data is being used.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error running SEO audit:', error);
      
      let errorMessage = 'Failed to run SEO audit. Please try again.';
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
  
  // Handle exporting SEO data to CSV
  const handleExportData = async (dataType: 'pages' | 'keywords' | 'issues') => {
    try {
      // In a production environment, this would call the API to export data
      // For now, we'll create an empty CSV
      const headers = dataType === 'pages' 
        ? ['ID', 'URL', 'Title', 'Description', 'Keywords', 'Status', 'Score', 'Issues']
        : dataType === 'keywords'
          ? ['Keyword', 'Position', 'Change', 'Volume']
          : ['ID', 'Page', 'Issue', 'Severity', 'Status'];
      
      const csvData = headers.join(',') + '\n';
      
      // Create a download link
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `seo_${dataType}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSnackbarMessage(`Empty SEO ${dataType} data exported. No mock data is being used.`);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    } catch (error) {
      console.error(`Error exporting SEO ${dataType} data:`, error);
      
      let errorMessage = `Failed to export SEO ${dataType} data. Please try again.`;
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
            SEO Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={handleRefreshAnalysis}
          disabled={refreshing || loading}
          sx={{
            borderRadius: 2,
            px: 3,
            fontWeight: 600,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Analysis'}
        </Button>
      </Box>

      {/* SEO Overview Cards */}
      <SEOOverviewCards stats={overviewStats} loading={loading} />

      {/* Tabs for different SEO sections */}
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
            <Tab label="Page Metrics" {...a11yProps(0)} />
            <Tab label="Keyword Rankings" {...a11yProps(1)} />
            <Tab label="Issues" {...a11yProps(2)} />
            <Tab label="Settings" {...a11yProps(3)} />
          </Tabs>

          {/* Page Metrics Tab */}
          <TabPanel value={tabValue} index={0}>
            <PageMetricsTable 
              pages={pageMetrics} 
              loading={loading} 
              onRefresh={loadData} 
            />
          </TabPanel>

          {/* Keyword Rankings Tab */}
          <TabPanel value={tabValue} index={1}>
            <KeywordRankingsTable 
              keywords={keywordRankings} 
              loading={loading} 
            />
          </TabPanel>

          {/* Issues Tab */}
          <TabPanel value={tabValue} index={2}>
            <SEOIssuesTable 
              issues={seoIssues} 
              loading={loading} 
              onRefresh={loadData} 
            />
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel value={tabValue} index={3}>
            <SEOSettings loading={loading} />
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
