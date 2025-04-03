import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  useTheme, 
  alpha,
  Skeleton,
  Chip,
  Tooltip
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { TrafficSource } from '../types';

interface TrafficSourcesChartProps {
  data?: TrafficSource[];
  loading: boolean;
}

export default function TrafficSourcesChart({ data, loading }: TrafficSourcesChartProps) {
  const theme = useTheme();

  // Define colors for different traffic sources
  const getSourceColor = (source: string): string => {
    switch (source.toLowerCase()) {
      case 'organic search':
        return theme.palette.primary.main;
      case 'direct':
        return theme.palette.info.main;
      case 'referral':
        return theme.palette.success.main;
      case 'social':
        return theme.palette.warning.main;
      case 'email':
        return theme.palette.secondary.main;
      default:
        return '#9c27b0'; // Purple for other sources
    }
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
        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
          Traffic Sources
        </Typography>

        {loading ? (
          <Box sx={{ pt: 2 }}>
            {[1, 2, 3, 4, 5].map((_, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="20%" />
                </Box>
                <Skeleton variant="rectangular" height={8} width="100%" sx={{ borderRadius: 1 }} />
              </Box>
            ))}
          </Box>
        ) : data && data.length > 0 ? (
          <Box sx={{ pt: 2 }}>
            {data.map((source, index) => {
              const color = getSourceColor(source.source);
              
              return (
                <Box key={index} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: color,
                          mr: 1.5,
                        }}
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {source.source}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mr: 1 }}>
                        {source.percentage.toFixed(1)}%
                      </Typography>
                      <Tooltip title={`${Math.abs(source.change).toFixed(1)}% ${source.change >= 0 ? 'increase' : 'decrease'}`}>
                        <Chip
                          size="small"
                          icon={source.change >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                          label={`${Math.abs(source.change).toFixed(1)}%`}
                          sx={{
                            backgroundColor: alpha(source.change >= 0 ? theme.palette.success.main : theme.palette.error.main, 0.1),
                            color: source.change >= 0 ? theme.palette.success.main : theme.palette.error.main,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 20,
                            '& .MuiChip-icon': {
                              fontSize: '0.85rem',
                              marginLeft: '4px',
                            },
                          }}
                        />
                      </Tooltip>
                    </Box>
                  </Box>
                  <Box sx={{ position: 'relative', height: 8, backgroundColor: alpha(color, 0.1), borderRadius: 1 }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${source.percentage}%`,
                        backgroundColor: color,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {source.visitors.toLocaleString()} visitors
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No traffic source data available.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
