import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Skeleton,
  useTheme,
  alpha
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  PeopleAlt as PeopleAltIcon
} from '@mui/icons-material';
import { LeadStats } from '../types';

interface LeadStatsCardsProps {
  stats: LeadStats;
  loading: boolean;
}

export default function LeadStatsCards({ stats, loading }: LeadStatsCardsProps) {
  const theme = useTheme();

  const statCards = [
    {
      title: 'Total Leads',
      value: stats.total,
      icon: <PeopleAltIcon />,
      color: theme.palette.primary.main,
      description: 'All time leads'
    },
    {
      title: 'New Leads',
      value: stats.newLeads,
      icon: <TrendingUpIcon />,
      color: theme.palette.success.main,
      description: 'Uncontacted leads'
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      icon: <CheckCircleIcon />,
      color: theme.palette.info.main,
      description: 'Lead to customer'
    },
    {
      title: 'Avg. Response Time',
      value: `${stats.averageResponseTime}h`,
      icon: <AccessTimeIcon />,
      color: theme.palette.warning.main,
      description: 'Time to first contact'
    }
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { 
          xs: '1fr', 
          sm: 'repeat(2, 1fr)', 
          md: 'repeat(4, 1fr)' 
        }, 
        gap: 3 
      }}>
        {statCards.map((card, index) => (
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
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={500}>
                      {card.title}
                    </Typography>
                    {loading ? (
                      <Skeleton variant="text" width={80} height={40} />
                    ) : (
                      <Typography variant="h4" component="div" fontWeight={700} sx={{ mt: 0.5 }}>
                        {card.value}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: alpha(card.color, 0.1),
                      color: card.color,
                      p: 1,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
