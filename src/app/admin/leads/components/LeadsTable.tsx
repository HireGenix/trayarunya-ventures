import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Skeleton,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  alpha,
  SelectChangeEvent
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Notes as NotesIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { Lead, LeadStatus, LeadSource, LeadPriority } from '../types';

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  onViewLead: (id: string) => void;
  onEditLead: (id: string) => void;
  onDeleteLead: (id: string) => void;
}

export default function LeadsTable({
  leads,
  loading,
  onViewLead,
  onEditLead,
  onDeleteLead
}: LeadsTableProps) {
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const rowsPerPage = 10;

  // Ensure leads is an array
  const validLeads = Array.isArray(leads) ? leads : [];
  
  // Filter leads based on search term and filters
  const filteredLeads = validLeads.filter((lead) => {
    // Skip invalid leads
    if (!lead || typeof lead !== 'object') return false;
    
    // Ensure required properties exist
    if (!lead.name || !lead.email || !lead.status || !lead.source || !lead.priority) return false;
    
    const matchesSearch = searchTerm === '' || 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === '' || lead.status === statusFilter;
    const matchesSource = sourceFilter === '' || lead.source === sourceFilter;
    const matchesPriority = priorityFilter === '' || lead.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesSource && matchesPriority;
  });

  // Pagination
  const paginatedLeads = filteredLeads.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleSourceFilterChange = (event: SelectChangeEvent) => {
    setSourceFilter(event.target.value);
    setPage(1);
  };

  const handlePriorityFilterChange = (event: SelectChangeEvent) => {
    setPriorityFilter(event.target.value);
    setPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleDeleteClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedLead) {
      onDeleteLead(selectedLead.id);
      setDeleteDialogOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'New':
        return theme.palette.primary.main;
      case 'Contacted':
        return theme.palette.info.main;
      case 'Qualified':
        return theme.palette.success.main;
      case 'Proposal':
        return '#9c27b0'; // Purple
      case 'Negotiation':
        return '#ff9800'; // Orange
      case 'Won':
        return '#4caf50'; // Green
      case 'Lost':
        return theme.palette.error.main;
      case 'On Hold':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getPriorityColor = (priority: LeadPriority) => {
    switch (priority) {
      case 'High':
        return theme.palette.error.main;
      case 'Medium':
        return theme.palette.warning.main;
      case 'Low':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <>
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Lead Management
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => onEditLead('new')}
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
              Add Lead
            </Button>
          </Box>

          <Box sx={{ display: 'flex', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <TextField
              placeholder="Search leads..."
              value={searchTerm}
              onChange={handleSearchChange}
              variant="outlined"
              size="small"
              sx={{ 
                minWidth: 250,
                flex: { xs: '1 1 100%', sm: '1 1 auto' },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 150,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            >
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="New">New</MenuItem>
                <MenuItem value="Contacted">Contacted</MenuItem>
                <MenuItem value="Qualified">Qualified</MenuItem>
                <MenuItem value="Proposal">Proposal</MenuItem>
                <MenuItem value="Negotiation">Negotiation</MenuItem>
                <MenuItem value="Won">Won</MenuItem>
                <MenuItem value="Lost">Lost</MenuItem>
                <MenuItem value="On Hold">On Hold</MenuItem>
              </Select>
            </FormControl>

            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 150,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            >
              <InputLabel>Source</InputLabel>
              <Select
                value={sourceFilter}
                label="Source"
                onChange={handleSourceFilterChange}
              >
                <MenuItem value="">All Sources</MenuItem>
                <MenuItem value="Website Contact Form">Website Contact Form</MenuItem>
                <MenuItem value="Newsletter Signup">Newsletter Signup</MenuItem>
                <MenuItem value="Demo Request">Demo Request</MenuItem>
                <MenuItem value="Webinar Registration">Webinar Registration</MenuItem>
                <MenuItem value="Event">Event</MenuItem>
                <MenuItem value="Referral">Referral</MenuItem>
                <MenuItem value="Social Media">Social Media</MenuItem>
                <MenuItem value="Email Campaign">Email Campaign</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 150,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            >
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={handlePriorityFilterChange}
              >
                <MenuItem value="">All Priorities</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Lead</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  // Loading skeletons
                  Array.from(new Array(5)).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                          <Box>
                            <Skeleton variant="text" width={120} />
                            <Skeleton variant="text" width={150} />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={100} /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={60} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={80} /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={100} height={30} /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedLeads.length > 0 ? (
                  // Actual data
                  paginatedLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        },
                      }}
                      onClick={() => onViewLead(lead.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            sx={{ 
                              width: 40, 
                              height: 40, 
                              mr: 2,
                              bgcolor: theme.palette.primary.main
                            }}
                          >
                            {lead.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={500}>
                              {lead.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                <EmailIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                                {lead.email}
                              </Typography>
                              {lead.company && (
                                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box component="span" sx={{ mx: 0.5 }}>•</Box>
                                  {lead.company}
                                </Typography>
                              )}
                            </Box>
                            {lead.formType && (
                              <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  label={lead.formType} 
                                  size="small" 
                                  sx={{ 
                                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                                    color: theme.palette.info.main,
                                    fontWeight: 500,
                                    fontSize: '0.7rem',
                                    height: 20
                                  }} 
                                />
                                {lead.pageUrl && (
                                  <Typography variant="caption" color="text.secondary">
                                    {lead.pageUrl}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={lead.status} 
                          size="small" 
                          sx={{ 
                            backgroundColor: alpha(getStatusColor(lead.status), 0.1),
                            color: getStatusColor(lead.status),
                            fontWeight: 600,
                            minWidth: 80
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {lead.source}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={lead.priority} 
                          size="small" 
                          sx={{ 
                            backgroundColor: alpha(getPriorityColor(lead.priority), 0.1),
                            color: getPriorityColor(lead.priority),
                            fontWeight: 600,
                            minWidth: 60
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(lead.date)}
                        </Typography>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit Lead">
                            <IconButton 
                              size="small" 
                              onClick={() => onEditLead(lead.id)}
                              sx={{
                                color: theme.palette.primary.main,
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Lead">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteClick(lead)}
                              sx={{
                                color: theme.palette.error.main,
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // No results
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1" color="text.secondary">
                        No leads found matching your filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredLeads.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination 
                count={Math.ceil(filteredLeads.length / rowsPerPage)} 
                page={page} 
                onChange={handleChangePage} 
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Lead</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedLead?.name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteConfirm}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
