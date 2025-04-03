import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Chip, 
  Button, 
  IconButton, 
  Tooltip, 
  useTheme, 
  alpha,
  Skeleton,
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import { 
  Check as CheckIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { SEOIssue } from '../types';
import { fixSEOIssue } from '../api';

interface SEOIssuesTableProps {
  issues?: SEOIssue[];
  loading: boolean;
  onRefresh: () => void;
}

export default function SEOIssuesTable({ issues, loading, onRefresh }: SEOIssuesTableProps) {
  const theme = useTheme();
  const [issueFilter, setIssueFilter] = useState('all');
  const [fixingIssueId, setFixingIssueId] = useState<number | null>(null);

  const handleIssueFilterChange = (event: SelectChangeEvent) => {
    setIssueFilter(event.target.value);
  };

  const filteredIssues = issues?.filter(issue => 
    issueFilter === 'all' || issue.status.toLowerCase() === issueFilter.toLowerCase()
  ) || [];

  const getSeverityColor = (severity: string) => {
    if (severity === 'High') return theme.palette.error.main;
    if (severity === 'Medium') return theme.palette.warning.main;
    return theme.palette.info.main;
  };

  const handleFixIssue = async (issueId: number) => {
    setFixingIssueId(issueId);
    try {
      await fixSEOIssue(issueId);
      onRefresh();
    } catch (error) {
      console.error('Error fixing SEO issue:', error);
      // You could add error handling UI here
    } finally {
      setFixingIssueId(null);
    }
  };

  return (
    <Box sx={{ px: 3, pb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          SEO Issues
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="issue-filter-label">Status</InputLabel>
          <Select
            labelId="issue-filter-label"
            value={issueFilter}
            label="Status"
            onChange={handleIssueFilterChange}
          >
            <MenuItem value="all">All Issues</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="fixed">Fixed</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Page</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Issue</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Severity</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // Loading skeletons
              Array.from(new Array(5)).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="100%" /></TableCell>
                  <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                  <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                  <TableCell><Skeleton variant="rounded" width={120} height={32} /></TableCell>
                </TableRow>
              ))
            ) : filteredIssues.length > 0 ? (
              // Actual data
              filteredIssues.map((issue) => (
                <TableRow
                  key={issue.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {issue.page}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {issue.issue}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={issue.severity} 
                      size="small" 
                      sx={{ 
                        backgroundColor: alpha(getSeverityColor(issue.severity), 0.1),
                        color: getSeverityColor(issue.severity),
                      }} 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={issue.status} 
                      size="small" 
                      color={issue.status === 'Fixed' ? 'success' : 'default'} 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {issue.status === 'Open' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={fixingIssueId === issue.id ? <CircularProgress size={16} /> : <CheckIcon />}
                          onClick={() => handleFixIssue(issue.id)}
                          disabled={fixingIssueId !== null}
                        >
                          {fixingIssueId === issue.id ? 'Fixing...' : 'Fix Issue'}
                        </Button>
                      )}
                      <Tooltip title="View Page">
                        <IconButton 
                          size="small"
                          component={Link}
                          href={issue.page}
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
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    {issueFilter === 'all' 
                      ? 'No SEO issues found.' 
                      : issueFilter === 'open' 
                      ? 'No open issues found. Great job!' 
                      : 'No fixed issues found.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
