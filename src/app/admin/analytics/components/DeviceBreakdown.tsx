import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  useTheme, 
  alpha,
  Skeleton
} from '@mui/material';
import { 
  DesktopWindows as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Tablet as TabletIcon
} from '@mui/icons-material';
import { DeviceData } from '../types';

interface DeviceBreakdownProps {
  data?: DeviceData[];
  loading: boolean;
}

export default function DeviceBreakdown({ data, loading }: DeviceBreakdownProps) {
  const theme = useTheme();

  // Get device icon
  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop':
        return <DesktopIcon />;
      case 'mobile':
        return <MobileIcon />;
      case 'tablet':
        return <TabletIcon />;
      default:
        return <DesktopIcon />;
    }
  };

  // Get device color
  const getDeviceColor = (device: string): string => {
    switch (device) {
      case 'desktop':
        return theme.palette.primary.main;
      case 'mobile':
        return theme.palette.success.main;
      case 'tablet':
        return theme.palette.warning.main;
      default:
        return theme.palette.info.main;
    }
  };

  // Get device name with proper capitalization
  const getDeviceName = (device: string): string => {
    return device.charAt(0).toUpperCase() + device.slice(1);
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
          Device Breakdown
        </Typography>

        {loading ? (
          <Box sx={{ pt: 2 }}>
            <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto', mb: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
              {[1, 2, 3].map((_, index) => (
                <Box key={index} sx={{ textAlign: 'center' }}>
                  <Skeleton variant="circular" width={40} height={40} sx={{ mx: 'auto', mb: 1 }} />
                  <Skeleton variant="text" width={60} sx={{ mx: 'auto' }} />
                  <Skeleton variant="text" width={40} sx={{ mx: 'auto' }} />
                </Box>
              ))}
            </Box>
          </Box>
        ) : data && data.length > 0 ? (
          <Box sx={{ pt: 2 }}>
            {/* Donut Chart */}
            <Box sx={{ position: 'relative', width: 200, height: 200, mx: 'auto', mb: 3 }}>
              <svg width="200" height="200" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={alpha(theme.palette.text.secondary, 0.1)}
                  strokeWidth="20"
                />
                
                {/* Generate segments for each device */}
                {(() => {
                  const circumference = 2 * Math.PI * 40;
                  let cumulativePercentage = 0;
                  
                  return data.map((device, index) => {
                    // Calculate the segment size and position
                    const segmentSize = device.percentage;
                    const segmentOffset = cumulativePercentage;
                    cumulativePercentage += segmentSize;
                    
                    // Calculate the stroke-dasharray and stroke-dashoffset
                    const dashArray = circumference;
                    const dashOffset = circumference * (1 - segmentSize / 100);
                    
                    // Calculate the rotation to position the segment
                    const rotation = (segmentOffset / 100) * 360;
                    
                    return (
                      <circle
                        key={index}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={getDeviceColor(device.device)}
                        strokeWidth="20"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        transform={`rotate(${rotation} 50 50)`}
                        style={{ transition: 'all 0.3s ease' }}
                      />
                    );
                  });
                })()}
                
                {/* Center text */}
                <text
                  x="50"
                  y="50"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill={theme.palette.text.primary}
                >
                  {data.reduce((acc, curr) => acc + curr.sessions, 0).toLocaleString()}
                </text>
                <text
                  x="50"
                  y="65"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fill={theme.palette.text.secondary}
                >
                  Total Sessions
                </text>
              </svg>
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
              {data.map((device, index) => (
                <Box key={index} sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: alpha(getDeviceColor(device.device), 0.1),
                      color: getDeviceColor(device.device),
                      mx: 'auto',
                      mb: 1,
                    }}
                  >
                    {getDeviceIcon(device.device)}
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    {getDeviceName(device.device)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {device.percentage.toFixed(1)}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No device data available.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
