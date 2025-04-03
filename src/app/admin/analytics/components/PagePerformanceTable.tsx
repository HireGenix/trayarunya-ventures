import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  useTheme, 
  alpha,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Search as SearchIcon,
  OpenInNew as OpenInNewIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { PagePerformance } from '../types';

interface PagePerformanceTableProps {
  data?: PagePerformance[];
  loading: boolean;
}

export default function PagePerformanceTable({ data, loading }: PagePerformanceTableProps) {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = data?.filter(page => 
    page.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    page.path.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Format time in seconds
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(0)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  // Get color based on bounce rate
  const getBounceRateColor = (rate: number): string => {
    if (rate < 30) return theme.palette.success.main;
    if (rate < 50) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Page Performance
          </Typography>
          <TextField
            placeholder="Search pages..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
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
                <TableCell sx={{ fontWeight: 600 }}>Views</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Unique Views</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Avg. Time</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Bounce Rate</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Exit Rate</TableCell>
                <TableCell sx={{ fontWeight: 600 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Loading skeletons
                Array.from(new Array(5)).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton variant="text" width="100%" /></TableCell>
                    <TableCell><Skeleton variant="text" width={60} /></TableCell>
                    <TableCell><Skeleton variant="text" width={60} /></TableCell>
                    <TableCell><Skeleton variant="text" width={60} /></TableCell>
                    <TableCell><Skeleton variant="text" width={60} /></TableCell>
                    <TableCell><Skeleton variant="text" width={60} /></TableCell>
                    <TableCell><Skeleton variant="circular" width={30} height={30} /></TableCell>
                  </TableRow>
                ))
              ) : filteredData.length > 0 ? (
                // Actual data
                filteredData.map((page, index) => (
                  <TableRow
                    key={index}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                          {page.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {page.path}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {page.views.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {page.uniqueViews.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {formatTime(page.avgTimeOnPage)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${page.bounceRate.toFixed(1)}%`} 
                        size="small" 
                        sx={{ 
                          backgroundColor: alpha(getBounceRateColor(page.bounceRate), 0.1),
                          color: getBounceRateColor(page.bounceRate),
                          fontWeight: 600,
                          minWidth: 60
                        }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {page.exitRate.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Page">
                        <IconButton 
                          size="small"
                          component="a"
                          href={page.path}
                          target="_blank"
                          sx={{
                            color: theme.palette.primary.main,
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            }
                          }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // No results
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No pages found matching your search.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
