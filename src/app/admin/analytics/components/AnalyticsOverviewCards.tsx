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
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  Timer as TimerIcon,
  ExitToApp as ExitToAppIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import { AnalyticsOverview } from '../types';

interface AnalyticsOverviewCardsProps {
  data?: AnalyticsOverview;
  loading: boolean;
}

export default function AnalyticsOverviewCards({ data, loading }: AnalyticsOverviewCardsProps) {
  const theme = useTheme();

  // Format time in seconds to minutes and seconds
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const cards = [
    {
      title: 'Total Visitors',
      value: data?.totalVisitors.toLocaleString() || '0',
      icon: <PeopleIcon />,
      color: theme.palette.primary.main,
      subtitle: 'All website visitors'
    },
    {
      title: 'Unique Visitors',
      value: data?.uniqueVisitors.toLocaleString() || '0',
      icon: <PeopleIcon />,
      color: theme.palette.info.main,
      subtitle: 'Distinct users'
    },
    {
      title: 'Page Views',
      value: data?.pageViews.toLocaleString() || '0',
      icon: <VisibilityIcon />,
      color: theme.palette.success.main,
      subtitle: 'Total page views'
    },
    {
      title: 'Bounce Rate',
      value: `${data?.bounceRate.toFixed(1) || '0'}%`,
      icon: <ExitToAppIcon />,
      color: theme.palette.warning.main,
      subtitle: 'Single page sessions'
    },
    {
      title: 'Avg. Session Duration',
      value: data ? formatTime(data.avgSessionDuration) : '0m 0s',
      icon: <TimerIcon />,
      color: theme.palette.secondary.main,
      subtitle: 'Time spent on site'
    },
    {
      title: 'Conversion Rate',
      value: `${data?.conversionRate.toFixed(1) || '0'}%`,
      icon: <ShoppingCartIcon />,
      color: '#9c27b0', // Purple
      subtitle: 'Goal completions'
    }
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { 
          xs: '1fr', 
          sm: 'repeat(2, 1fr)', 
          md: 'repeat(3, 1fr)' 
        }, 
        gap: 3 
      }}>
        {cards.map((card, index) => (
          <Box key={index}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)',
                height: '100%',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
                    {card.title}
                  </Typography>
                  <Box
                    sx={{
                      backgroundColor: alpha(card.color, 0.1),
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box sx={{ color: card.color }}>{card.icon}</Box>
                  </Box>
                </Box>

                {loading ? (
                  <>
                    <Skeleton variant="text" width="60%" height={60} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="80%" />
                  </>
                ) : (
                  <>
                    <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
