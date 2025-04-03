import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Chip, 
  IconButton, 
  Tooltip, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  LinearProgress, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  useTheme, 
  alpha,
  Skeleton
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Edit as EditIcon, 
  Visibility as VisibilityIcon 
} from '@mui/icons-material';
import Link from 'next/link';
import { PageMetric } from '../types';
import { updatePageSEO } from '../api';

interface PageMetricsTableProps {
  pages?: PageMetric[];
  loading: boolean;
  onRefresh: () => void;
}

export default function PageMetricsTable({ pages, loading, onRefresh }: PageMetricsTableProps) {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageMetric | null>(null);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState({
    title: '',
    description: '',
    keywords: ''
  });

  const filteredPages = pages?.filter(page => 
    page.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.status.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getScoreColor = (score: number) => {
    if (score >= 90) return theme.palette.success.main;
    if (score >= 80) return theme.palette.info.main;
    if (score >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const handleEditPage = (page: PageMetric) => {
    setCurrentPage(page);
    setEditedData({
      title: page.title,
      description: page.description,
      keywords: page.keywords
    });
    setEditDialogOpen(true);
  };

  const handleSavePage = async () => {
    if (!currentPage) return;
    
    setSaving(true);
    try {
      await updatePageSEO(currentPage.id, {
        title: editedData.title,
        description: editedData.description,
        keywords: editedData.keywords
      });
      
      // Refresh the data
      onRefresh();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating page SEO:', error);
      // You could add error handling UI here
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Box sx={{ px: 3, pb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Page SEO Metrics
          </Typography>
          <TextField
            placeholder="Search pages..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
            sx={{
              width: { xs: '100%', sm: 250 },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </Box>
        
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Page</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title & Meta</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Issues</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Loading skeletons
                Array.from(new Array(5)).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell>
                      <Skeleton variant="text" width="80%" />
                      <Skeleton variant="text" width="60%" />
                    </TableCell>
                    <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={80} height={32} /></TableCell>
                  </TableRow>
                ))
              ) : filteredPages.length > 0 ? (
                // Actual data
                filteredPages.map((page) => (
                  <TableRow
                    key={page.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {page.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {page.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {page.description.substring(0, 60)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={page.status} 
                        size="small" 
                        color={
                          page.status === 'Optimized' 
                            ? 'success' 
                            : page.status === 'Needs Improvement' 
                            ? 'warning' 
                            : 'error'
                        } 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={600} 
                          sx={{ 
                            color: getScoreColor(page.score),
                            mr: 1
                          }}
                        >
                          {page.score}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={page.score} 
                          sx={{ 
                            width: 60,
                            height: 6, 
                            borderRadius: 3,
                            backgroundColor: alpha(getScoreColor(page.score), 0.2),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getScoreColor(page.score),
                            },
                          }} 
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      {page.issues > 0 ? (
                        <Chip 
                          label={`${page.issues} ${page.issues === 1 ? 'issue' : 'issues'}`} 
                          size="small" 
                          sx={{ 
                            backgroundColor: alpha(theme.palette.error.main, 0.1),
                            color: theme.palette.error.main,
                          }} 
                        />
                      ) : (
                        <Chip 
                          label="No issues" 
                          size="small" 
                          sx={{ 
                            backgroundColor: alpha(theme.palette.success.main, 0.1),
                            color: theme.palette.success.main,
                          }} 
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit SEO">
                          <IconButton 
                            size="small"
                            onClick={() => handleEditPage(page)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Page">
                          <IconButton 
                            size="small"
                            component={Link}
                            href={page.url}
                            target="_blank"
                          >
                            <VisibilityIcon fontSize="small" />
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
                      No pages found matching your search.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Edit Page Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => !saving && setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit SEO Metadata</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Page: {currentPage?.url}
            </Typography>
            
            <TextField
              label="Title"
              fullWidth
              margin="normal"
              value={editedData.title}
              onChange={(e) => setEditedData({...editedData, title: e.target.value})}
              helperText={`${editedData.title.length}/60 characters (recommended)`}
              disabled={saving}
            />
            
            <TextField
              label="Meta Description"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              value={editedData.description}
              onChange={(e) => setEditedData({...editedData, description: e.target.value})}
              helperText={`${editedData.description.length}/160 characters (recommended)`}
              disabled={saving}
            />
            
            <TextField
              label="Keywords"
              fullWidth
              margin="normal"
              value={editedData.keywords}
              onChange={(e) => setEditedData({...editedData, keywords: e.target.value})}
              helperText="Separate keywords with commas"
              disabled={saving}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSavePage} 
            variant="contained" 
            color="primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
