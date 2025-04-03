import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  LinearProgress, 
  Chip, 
  useTheme, 
  alpha,
  Skeleton
} from '@mui/material';
import { 
  Speed as SpeedIcon,
  Description as DescriptionIcon,
  Error as ErrorIcon,
  BarChart as BarChartIcon,
  ArrowUpward as ArrowUpwardIcon
} from '@mui/icons-material';
import { SEOOverviewStats } from '../types';

interface SEOOverviewCardsProps {
  stats?: SEOOverviewStats;
  loading: boolean;
}

export default function SEOOverviewCards({ stats, loading }: SEOOverviewCardsProps) {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
      {/* Overall Score Card */}
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Overall Score
            </Typography>
            <Box sx={{ 
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <SpeedIcon sx={{ color: theme.palette.info.main }} />
            </Box>
          </Box>
          
          {loading ? (
            <>
              <Skeleton variant="text" width="60%" height={60} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 4, mb: 1 }} />
              <Skeleton variant="text" width="80%" />
            </>
          ) : (
            <>
              <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
                {stats?.overallScore}<Typography component="span" variant="h5" color="text.secondary">/100</Typography>
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={stats?.overallScore || 0} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.info.main,
                  },
                  mb: 1
                }} 
              />
              <Typography variant="body2" color="text.secondary">
                {stats?.overallScore && stats.overallScore >= 90 
                  ? 'Excellent score!' 
                  : stats?.overallScore && stats.overallScore >= 80 
                  ? 'Good score, with room for improvement' 
                  : 'Needs improvement'}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pages Indexed Card */}
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Pages Indexed
            </Typography>
            <Box sx={{ 
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <DescriptionIcon sx={{ color: theme.palette.success.main }} />
            </Box>
          </Box>
          
          {loading ? (
            <>
              <Skeleton variant="text" width="60%" height={60} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 4, mb: 1 }} />
              <Skeleton variant="text" width="80%" />
            </>
          ) : (
            <>
              <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
                {stats?.pagesIndexed}<Typography component="span" variant="h5" color="text.secondary">/{stats?.totalPages}</Typography>
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={stats ? (stats.pagesIndexed / stats.totalPages) * 100 : 0} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.success.main,
                  },
                  mb: 1
                }} 
              />
              <Typography variant="body2" color="text.secondary">
                {stats && (stats.totalPages - stats.pagesIndexed) > 0 
                  ? `${stats.totalPages - stats.pagesIndexed} pages pending indexation` 
                  : 'All pages indexed'}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Active Issues Card */}
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Active Issues
            </Typography>
            <Box sx={{ 
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ErrorIcon sx={{ color: theme.palette.error.main }} />
            </Box>
          </Box>
          
          {loading ? (
            <>
              <Skeleton variant="text" width="40%" height={60} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="100%" height={30} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="60%" />
            </>
          ) : (
            <>
              <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
                {stats?.activeIssues.total}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Chip 
                  label={`${stats?.activeIssues.high} High`} 
                  size="small" 
                  sx={{ 
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                    color: theme.palette.error.main,
                    fontWeight: 500,
                  }} 
                />
                <Chip 
                  label={`${stats?.activeIssues.medium} Medium`} 
                  size="small" 
                  sx={{ 
                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                    fontWeight: 500,
                  }} 
                />
                <Chip 
                  label={`${stats?.activeIssues.low} Low`} 
                  size="small" 
                  sx={{ 
                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                    fontWeight: 500,
                  }} 
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {stats?.activeIssues.recentlyFixed} issues fixed in the last week
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Keyword Rankings Card */}
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Keyword Rankings
            </Typography>
            <Box sx={{ 
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BarChartIcon sx={{ color: theme.palette.primary.main }} />
            </Box>
          </Box>
          
          {loading ? (
            <>
              <Skeleton variant="text" width="40%" height={60} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="80%" height={30} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="60%" />
            </>
          ) : (
            <>
              <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
                {stats?.keywords.total}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2" color="success.main" fontWeight={500} sx={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />
                  {stats?.keywords.improved}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  keywords improved position
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {stats?.keywords.topTen} in top 10 results
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
