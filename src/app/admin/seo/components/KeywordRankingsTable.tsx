import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  useTheme,
  Skeleton
} from '@mui/material';
import { 
  Search as SearchIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { KeywordRanking } from '../types';

interface KeywordRankingsTableProps {
  keywords?: KeywordRanking[];
  loading: boolean;
}

export default function KeywordRankingsTable({ keywords, loading }: KeywordRankingsTableProps) {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredKeywords = keywords?.filter(keyword =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Box sx={{ px: 3, pb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Keyword Rankings
        </Typography>
        <TextField
          placeholder="Search keywords..."
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
              <TableCell sx={{ fontWeight: 600 }}>Keyword</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Position</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Change</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Search Volume</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // Loading skeletons
              Array.from(new Array(5)).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                  <TableCell><Skeleton variant="text" width={40} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                </TableRow>
              ))
            ) : filteredKeywords.length > 0 ? (
              // Actual data
              filteredKeywords.map((keyword, index) => (
                <TableRow
                  key={index}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {keyword.keyword}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {keyword.position}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {keyword.change !== 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {keyword.change > 0 ? (
                          <ArrowUpwardIcon 
                            fontSize="small" 
                            sx={{ 
                              color: theme.palette.success.main,
                              mr: 0.5
                            }} 
                          />
                        ) : (
                          <ArrowDownwardIcon 
                            fontSize="small" 
                            sx={{ 
                              color: theme.palette.error.main,
                              mr: 0.5
                            }} 
                          />
                        )}
                        <Typography 
                          variant="body2" 
                          fontWeight={500}
                          color={keyword.change > 0 ? 'success.main' : 'error.main'}
                        >
                          {Math.abs(keyword.change)}
                        </Typography>
                      </Box>
                    )}
                    {keyword.change === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No change
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {keyword.volume.toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              // No results
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No keywords found matching your search.
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
