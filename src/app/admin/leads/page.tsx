'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  CircularProgress,
  Backdrop,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Drawer,
  TextField,
  Stack,
  Avatar,
  Link as MuiLink
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Dashboard as DashboardIcon,
  List as ListIcon,
  FilterAlt as FilterAltIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Slideshow as SlideshowIcon,
  Language as LanguageIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import Link from 'next/link';

// Import components
import TabPanel, { a11yProps } from './components/TabPanel';
import LeadStatsCards from './components/LeadStatsCards';
import LeadsTable from './components/LeadsTable';

// Import API functions
import { 
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats,
  exportLeadsToCsv,
  emptyState
} from './api';

import { Lead, LeadStats, LeadFilter, LeadStatus, LeadSource, LeadPriority } from './types';

const STATUS_OPTIONS: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];
const SOURCE_OPTIONS: LeadSource[] = ['Website Contact Form', 'Newsletter Signup', 'Demo Request', 'Webinar Registration', 'Event', 'Referral', 'Social Media', 'Email Campaign', 'Other'];
const PRIORITY_OPTIONS: LeadPriority[] = ['Low', 'Medium', 'High'];

type LeadFormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
};

const emptyForm: LeadFormState = {
  name: '', email: '', phone: '', company: '', position: '', message: '',
  source: 'Website Contact Form', status: 'New', priority: 'Medium',
};

export default function LeadsPage() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filter, setFilter] = useState<LeadFilter>({});

  // State for form source filter
  const [formSourceFilter, setFormSourceFilter] = useState<string>('all');
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  // Detail drawer + edit/create dialog state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<LeadFormState>(emptyForm);
  const [savingLead, setSavingLead] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  
  // Load data on component mount and when retry count changes
  useEffect(() => {
    loadData();
  }, [retryCount]);

  // Memoize loadData to prevent unnecessary re-renders
  // State for authentication status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('auth_token');
        setIsAuthenticated(!!token);
      } catch (e) {
        console.warn('Could not access localStorage:', e);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Check if authenticated
      if (isAuthenticated === false) {
        throw new Error('Authentication required. Please log in to view form submissions.');
      }
      
      // Make real API calls to fetch data
      const [leadsData, statsData] = await Promise.allSettled([
        getLeads(),
        getLeadStats()
      ]);
      
      // Handle the results
      if (leadsData.status === 'fulfilled') {
        setLeads(leadsData.value);
      } else {
        console.error('Error fetching leads:', leadsData.reason);
        
        // Check if it's an authentication error
        if (leadsData.reason && 
            (leadsData.reason.message?.includes('401') || 
             leadsData.reason.message?.includes('Unauthorized'))) {
          setIsAuthenticated(false);
          setSnackbarMessage('Authentication required. Please log in to view form submissions.');
          setSnackbarSeverity('warning');
          setSnackbarOpen(true);
        }
        
        setLeads(emptyState.leads);
      }
      
      if (statsData.status === 'fulfilled') {
        setLeadStats(statsData.value);
      } else {
        console.error('Error fetching lead stats:', statsData.reason);
        setLeadStats(emptyState.leadStats);
      }
    } catch (error) {
      console.error('Error loading leads data:', error);
      
      // Show more specific error message
      let errorMessage = 'Failed to load form submissions. Please try again.';
      let severity: 'error' | 'warning' | 'info' | 'success' = 'error';
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized') || 
            error.message.includes('Authentication required')) {
          errorMessage = 'Authentication required. Please log in to view form submissions.';
          severity = 'warning';
          setIsAuthenticated(false);
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
          errorMessage = 'Network error while loading form submissions. Please check your connection and try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity(severity);
      setSnackbarOpen(true);
      
      // Set empty state when there's an error
      setLeads(emptyState.leads);
      setLeadStats(emptyState.leadStats);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);
  
  // Handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };
  
  // Handle export to CSV
  const handleExportCsv = async () => {
    setExportLoading(true);
    try {
      // Call the API to export leads to CSV
      const csvData = await exportLeadsToCsv(filter);
      
      // Create a download link
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSnackbarMessage('Leads exported successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error exporting leads:', error);
      
      let errorMessage = 'Failed to export leads. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Authentication error. Please log in again to export leads.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setExportLoading(false);
      setMenuAnchorEl(null);
    }
  };

  // Get unique form sources from leads data
  const getFormSources = useCallback(() => {
    // Ensure leads is an array before filtering
    if (!Array.isArray(leads) || leads.length === 0) {
      return ['Contact Form'];
    }
    
    try {
      const formSources = leads
        .filter(lead => lead && (lead.source?.includes('Form') || lead.formType))
        .map(lead => lead.formType || 'Contact Form');
      
      // Use Array.from instead of spread operator for better SSR compatibility
      return Array.from(new Set(formSources));
    } catch (error) {
      console.error('Error getting form sources:', error);
      return ['Contact Form'];
    }
  }, [leads]);

  // Filter leads by form source
  const filterLeadsByFormSource = useCallback((leadsToFilter: Lead[]) => {
    // Ensure leadsToFilter is an array
    if (!Array.isArray(leadsToFilter) || leadsToFilter.length === 0) {
      return [];
    }
    
    if (formSourceFilter === 'all') {
      return leadsToFilter;
    }
    
    try {
      return leadsToFilter.filter(lead => 
        lead && (
          (lead.formType && lead.formType === formSourceFilter) || 
          (!lead.formType && formSourceFilter === 'Contact Form' && lead.source === 'Website Contact Form')
        )
      );
    } catch (error) {
      console.error('Error filtering leads by form source:', error);
      return [];
    }
  }, [formSourceFilter]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const notify = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleViewLead = async (id: string) => {
    const local = Array.isArray(leads) ? leads.find((l) => l && l.id === id) : null;
    if (local) {
      setSelectedLead(local);
      setDrawerOpen(true);
    }
    try {
      const fresh = await getLead(id);
      if (fresh) setSelectedLead(fresh);
      setDrawerOpen(true);
    } catch (error) {
      if (!local) {
        notify(error instanceof Error ? error.message : 'Could not load lead.', 'error');
      }
    }
  };

  const openCreateEditor = () => {
    setEditorMode('create');
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const handleEditLead = (id: string) => {
    const lead = Array.isArray(leads) ? leads.find((l) => l && l.id === id) : null;
    if (!lead) {
      notify('Lead not found.', 'error');
      return;
    }
    setSelectedLead(lead);
    setEditorMode('edit');
    setForm({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      position: lead.position || '',
      message: lead.message || '',
      source: lead.source || 'Website Contact Form',
      status: lead.status || 'New',
      priority: lead.priority || 'Medium',
    });
    setEditorOpen(true);
  };

  const handleSaveLead = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      notify('Name and email are required.', 'warning');
      return;
    }
    setSavingLead(true);
    try {
      if (editorMode === 'edit' && selectedLead) {
        const updated = await updateLead(selectedLead.id, { ...form });
        setSelectedLead(updated);
        notify('Lead updated successfully!', 'success');
      } else {
        await createLead({ ...form });
        notify('Lead created successfully!', 'success');
      }
      setEditorOpen(false);
      await loadData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to save lead.', 'error');
    } finally {
      setSavingLead(false);
    }
  };

  const handleQuickUpdate = async (changes: Partial<Lead>) => {
    if (!selectedLead) return;
    setActionLoading(true);
    try {
      const updated = await updateLead(selectedLead.id, changes);
      setSelectedLead(updated);
      notify('Lead updated.', 'success');
      await loadData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Update failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateProposalForLead = async () => {
    if (!selectedLead) return;
    setGeneratingProposal(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: 'proposal',
          leadId: selectedLead.id,
          prompt: `Create a tailored marketing proposal for ${selectedLead.company || selectedLead.name}.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.proposal) {
        notify(data?.message || 'Could not generate proposal.', 'error');
        return;
      }
      const { buildProposalPdf } = await import('@/lib/pdfBuilder');
      await buildProposalPdf(data.proposal.spec);
      notify('Proposal generated and saved to Proposals.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Generation failed.', 'error');
    } finally {
      setGeneratingProposal(false);
    }
  };

  const handleDeleteConfirm = (id: string) => {
    setLeadToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteCancel = () => {
    setLeadToDelete(null);
    setDeleteDialogOpen(false);
  };
  
  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    
    setActionLoading(true);
    try {
      // Call the API to delete the lead
      await deleteLead(leadToDelete);
      
      // Update the local state
      setLeads(Array.isArray(leads) ? leads.filter(lead => lead && lead.id !== leadToDelete) : []);
      
      setSnackbarMessage('Lead deleted successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      // Close detail drawer if the deleted lead was open, and refresh stats
      setDrawerOpen((open) => (selectedLead?.id === leadToDelete ? false : open));
      await loadData();
    } catch (error) {
      console.error('Error deleting lead:', error);
      
      let errorMessage = 'Failed to delete lead. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Authentication error. Please log in again to delete leads.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    }
  };
  
  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            Website Form Submissions
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Refresh data">
            <IconButton 
              onClick={handleRetry}
              disabled={loading}
              color="primary"
              sx={{ 
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={openCreateEditor}
            sx={{ 
              fontWeight: 600,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            Add Form Submission
          </Button>
          
          <Tooltip title="More options">
            <IconButton
              onClick={handleMenuOpen}
              color="primary"
              sx={{ 
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                }
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          
          <Menu
            anchorEl={menuAnchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            PaperProps={{
              elevation: 3,
              sx: { 
                minWidth: 200,
                borderRadius: 2,
                mt: 1,
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
              }
            }}
          >
            <MenuItem 
              onClick={handleExportCsv}
              disabled={exportLoading || loading}
              sx={{ py: 1.5 }}
            >
              {exportLoading ? (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              ) : (
                <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
              )}
              Export to CSV
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleMenuClose} sx={{ py: 1.5 }}>
              Import Leads
            </MenuItem>
            <MenuItem onClick={handleMenuClose} sx={{ py: 1.5 }}>
              Settings
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {/* Loading backdrop for long operations */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: 'blur(4px)'
        }}
        open={actionLoading}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2, color: 'white' }}>
            Processing...
          </Typography>
        </Box>
      </Backdrop>

      {/* Authentication Required Message */}
      {isAuthenticated === false && (
        <Card 
          elevation={0}
          sx={{ 
            borderRadius: 4,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.05)',
            mb: 4,
            p: 4,
            textAlign: 'center',
            backgroundColor: alpha(theme.palette.warning.light, 0.1),
            borderLeft: `4px solid ${theme.palette.warning.main}`
          }}
        >
          <Typography variant="h5" fontWeight={600} gutterBottom color="warning.dark">
            Authentication Required
          </Typography>
          <Typography variant="body1" paragraph>
            You need to be logged in to view website form submissions.
          </Typography>
          <Button
            component={Link}
            href="/admin/login"
            variant="contained"
            color="primary"
            sx={{ 
              mt: 2,
              fontWeight: 600,
              borderRadius: 2,
              px: 4,
              py: 1
            }}
          >
            Go to Login
          </Button>
        </Card>
      )}

      {/* Lead Stats */}
      {leadStats && isAuthenticated !== false && <LeadStatsCards stats={leadStats} loading={loading} />}

      {/* Form Source Filter - Only show if authenticated */}
      {isAuthenticated !== false && (
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
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterAltIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={600}>
              Form Submissions Filter
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip 
              label="All Forms" 
              clickable
              onClick={() => setFormSourceFilter('all')}
              color={formSourceFilter === 'all' ? 'primary' : 'default'}
              variant={formSourceFilter === 'all' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 500 }}
            />
            
            {getFormSources().map((source) => (
              <Chip 
                key={source}
                label={source} 
                clickable
                onClick={() => setFormSourceFilter(source)}
                color={formSourceFilter === source ? 'primary' : 'default'}
                variant={formSourceFilter === source ? 'filled' : 'outlined'}
                sx={{ fontWeight: 500 }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
      )}

      {/* Tabs for different lead views - Only show if authenticated */}
      {isAuthenticated !== false && (
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
            <Tab 
              label="All Submissions" 
              icon={<ListIcon />} 
              iconPosition="start" 
              {...a11yProps(0)} 
            />
            <Tab 
              label="Analytics" 
              icon={<DashboardIcon />} 
              iconPosition="start" 
              {...a11yProps(1)} 
            />
            <Tab 
              label="By Form Type" 
              icon={<ListIcon />} 
              iconPosition="start" 
              {...a11yProps(2)} 
            />
          </Tabs>

          {/* All Leads Tab */}
          <TabPanel value={tabValue} index={0}>
            <LeadsTable 
              leads={Array.isArray(leads) ? leads : []} 
              loading={loading} 
              onViewLead={handleViewLead}
              onEditLead={handleEditLead}
              onDeleteLead={handleDeleteConfirm}
            />
          </TabPanel>

          {/* Dashboard Tab */}
          <TabPanel value={tabValue} index={1}>
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
                  Form Submission Analytics
                </Typography>
                <Box sx={{ py: 10, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    Form submission analytics will be implemented here, showing trends, conversion rates, and submission patterns over time.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Form Submissions Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Submissions by Form Type
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This tab categorizes submissions by the type of form they came from. Use the filter above to view submissions from specific form types.
              </Typography>
            </Box>

            <LeadsTable 
              leads={filterLeadsByFormSource(
                Array.isArray(leads) 
                  ? leads.filter(lead => lead && typeof lead === 'object' && (
                      (lead.source === 'Website Contact Form') || 
                      (lead.source === 'Newsletter Signup') || 
                      lead.formType
                    ))
                  : []
              )} 
              loading={loading} 
              onViewLead={handleViewLead}
              onEditLead={handleEditLead}
              onDeleteLead={handleDeleteConfirm}
            />
          </TabPanel>
        </CardContent>
      </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle id="delete-dialog-title" sx={{ fontWeight: 700 }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this form submission? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleDeleteCancel} 
            color="primary"
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteLead} 
            color="error"
            variant="contained"
            sx={{ 
              borderRadius: 2, 
              px: 3,
              boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)',
            }}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Lead Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, maxWidth: '100%' } }}
      >
        {selectedLead && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, #0e1726 0%, #15223a 100%)',
                color: '#fff',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#ffaf06', color: '#000', fontWeight: 700, width: 48, height: 48 }}>
                    {selectedLead.name?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedLead.name}
                    </Typography>
                    {selectedLead.position || selectedLead.company ? (
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {[selectedLead.position, selectedLead.company].filter(Boolean).join(' · ')}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
                <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#fff' }}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <Chip label={selectedLead.status} size="small" sx={{ bgcolor: alpha('#ffaf06', 0.2), color: '#ffaf06', fontWeight: 600 }} />
                <Chip label={`${selectedLead.priority} priority`} size="small" sx={{ bgcolor: alpha('#fff', 0.15), color: '#fff' }} />
                <Chip label={selectedLead.source} size="small" sx={{ bgcolor: alpha('#fff', 0.15), color: '#fff' }} />
              </Box>
            </Box>

            <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <EmailIcon fontSize="small" color="action" />
                  <MuiLink href={`mailto:${selectedLead.email}`} underline="hover">
                    {selectedLead.email}
                  </MuiLink>
                </Box>
                {selectedLead.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">{selectedLead.phone}</Typography>
                  </Box>
                )}
                {selectedLead.company && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <BusinessIcon fontSize="small" color="action" />
                    <Typography variant="body2">{selectedLead.company}</Typography>
                  </Box>
                )}
                {selectedLead.pageUrl && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <LanguageIcon fontSize="small" color="action" />
                    <MuiLink href={selectedLead.pageUrl} target="_blank" rel="noopener" underline="hover" sx={{ wordBreak: 'break-all' }}>
                      {selectedLead.pageUrl}
                    </MuiLink>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  Submitted {new Date(selectedLead.date).toLocaleString()}
                </Typography>

                <Divider />

                {/* Quick status / priority */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Status"
                    value={selectedLead.status}
                    onChange={(e) => handleQuickUpdate({ status: e.target.value as LeadStatus })}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Priority"
                    value={selectedLead.priority}
                    onChange={(e) => handleQuickUpdate({ priority: e.target.value as LeadPriority })}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <MenuItem key={p} value={p}>{p}</MenuItem>
                    ))}
                  </TextField>
                </Box>

                {selectedLead.message && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Message
                    </Typography>
                    <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedLead.message}
                      </Typography>
                    </Card>
                  </Box>
                )}

                {selectedLead.formData && Object.keys(selectedLead.formData).length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Form Data
                    </Typography>
                    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack spacing={1}>
                        {Object.entries(selectedLead.formData).map(([k, v]) => (
                          <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                              {k}
                            </Typography>
                            <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Card>
                  </Box>
                )}

                {Array.isArray(selectedLead.notes) && selectedLead.notes.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Notes
                    </Typography>
                    <Stack spacing={1}>
                      {selectedLead.notes.map((n, i) => (
                        <Card key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Typography variant="body2">{n}</Typography>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Box>

            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => {
                  setDrawerOpen(false);
                  handleEditLead(selectedLead.id);
                }}
                sx={{ fontWeight: 600 }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                startIcon={generatingProposal ? <CircularProgress size={16} /> : <SlideshowIcon />}
                onClick={handleGenerateProposalForLead}
                disabled={generatingProposal}
              >
                Proposal
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteConfirm(selectedLead.id)}
              >
                Delete
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Lead Create / Edit Dialog */}
      <Dialog open={editorOpen} onClose={() => !savingLead && setEditorOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editorMode === 'edit' ? 'Edit Lead' : 'Add New Lead'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <TextField
                label="Name"
                required
                fullWidth
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <TextField
                label="Email"
                required
                type="email"
                fullWidth
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <TextField
                label="Phone"
                fullWidth
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <TextField
                label="Company"
                fullWidth
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </Box>
            <TextField
              label="Position"
              fullWidth
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <TextField
                select
                label="Source"
                fullWidth
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as LeadSource }))}
              >
                {SOURCE_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Status"
                fullWidth
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as LeadStatus }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Priority"
                fullWidth
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as LeadPriority }))}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              label="Message"
              fullWidth
              multiline
              minRows={3}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditorOpen(false)} disabled={savingLead}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveLead}
            disabled={savingLead}
            startIcon={savingLead ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            sx={{ fontWeight: 600 }}
          >
            {savingLead ? 'Saving…' : editorMode === 'edit' ? 'Save Changes' : 'Create Lead'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
