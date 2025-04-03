import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  useTheme, 
  alpha,
  Skeleton,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { TimeSeriesData } from '../types';

// Note: In a real application, you would use a charting library like Chart.js, Recharts, or Nivo
// For this example, we'll create a simplified chart visualization

interface VisitorsChartProps {
  data?: TimeSeriesData[];
  loading: boolean;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

export default function VisitorsChart({ data, loading, timeframe, onTimeframeChange }: VisitorsChartProps) {
  const theme = useTheme();

  const handleTimeframeChange = (event: SelectChangeEvent) => {
    onTimeframeChange(event.target.value);
  };

  // Find max values for scaling
  const maxVisitors = data ? Math.max(...data.map(item => item.visitors)) : 0;
  const maxPageViews = data ? Math.max(...data.map(item => item.pageViews)) : 0;
  const maxValue = Math.max(maxVisitors, maxPageViews);

  // Format date based on timeframe
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    
    switch(timeframe) {
      case 'today':
      case 'yesterday':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'week':
        return date.toLocaleDateString([], { weekday: 'short' });
      case 'month':
        return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
      case 'year':
        return date.toLocaleDateString([], { month: 'short' });
      default:
        return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight={600}>
            Visitors & Page Views
          </Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={timeframe}
              onChange={handleTimeframeChange}
              displayEmpty
              sx={{ 
                borderRadius: 2,
                fontSize: '0.875rem',
                '& .MuiSelect-select': { py: 0.75, px: 1.5 }
              }}
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="yesterday">Yesterday</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {loading ? (
          <Box sx={{ pt: 2, height: 300 }}>
            <Skeleton variant="rectangular" height="100%" width="100%" sx={{ borderRadius: 2 }} />
          </Box>
        ) : data && data.length > 0 ? (
          <Box sx={{ height: 300, position: 'relative' }}>
            {/* Chart Container */}
            <Box 
              sx={{ 
                height: '100%', 
                position: 'relative',
                pt: 2,
                pb: 5, // Space for x-axis labels
                px: 1
              }}
            >
              {/* Y-axis grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <Box 
                  key={ratio}
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `${(1 - ratio) * 100}%`,
                    borderTop: ratio > 0 ? `1px dashed ${alpha(theme.palette.text.secondary, 0.1)}` : 'none',
                    zIndex: 1
                  }}
                >
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      position: 'absolute',
                      left: -5,
                      top: -10,
                      fontSize: '0.7rem'
                    }}
                  >
                    {Math.round(maxValue * ratio).toLocaleString()}
                  </Typography>
                </Box>
              ))}

              {/* Visitors Line */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  left: 0,
                  right: 0,
                  height: 'calc(100% - 40px)',
                  zIndex: 2,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `linear-gradient(to bottom, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 100%)`,
                    clipPath: data.map((item, i) => 
                      `${(i / (data.length - 1)) * 100}% ${100 - (item.visitors / maxValue * 100)}%`
                    ).join(', '),
                    zIndex: 1
                  }
                }}
              >
                <svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${data.length - 1} 100`}
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={data.map((item, i) => 
                      `${i} ${100 - (item.visitors / maxValue * 100)}`
                    ).join(' ')}
                    fill="none"
                    stroke={theme.palette.primary.main}
                    strokeWidth="2"
                  />
                </svg>
              </Box>

              {/* Page Views Line */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  left: 0,
                  right: 0,
                  height: 'calc(100% - 40px)',
                  zIndex: 2
                }}
              >
                <svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${data.length - 1} 100`}
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={data.map((item, i) => 
                      `${i} ${100 - (item.pageViews / maxValue * 100)}`
                    ).join(' ')}
                    fill="none"
                    stroke={theme.palette.secondary.main}
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                </svg>
              </Box>

              {/* X-axis labels */}
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between' }}>
                {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((item, i) => (
                  <Typography 
                    key={i} 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'top left',
                      fontSize: '0.7rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {formatDate(item.date)}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    width: 12, 
                    height: 12, 
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: 1,
                    mr: 1
                  }} 
                />
                <Typography variant="caption" color="text.secondary">
                  Visitors
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    width: 12, 
                    height: 12, 
                    backgroundColor: theme.palette.secondary.main,
                    borderRadius: 1,
                    mr: 1
                  }} 
                />
                <Typography variant="caption" color="text.secondary">
                  Page Views
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No visitor data available for the selected timeframe.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
