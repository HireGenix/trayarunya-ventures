'use client';

import React from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  alpha, 
  useTheme,
  LinearProgress,
  Avatar,
  Grid,
  Paper
} from '@mui/material';
import { motion } from 'framer-motion';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Product } from './ProductsData';

interface ProductDashboardPreviewProps {
  product: Product;
}

const ProductDashboardPreview: React.FC<ProductDashboardPreviewProps> = ({ product }) => {
  const theme = useTheme();

  // Render different dashboard content based on product type
  const renderDashboardContent = () => {
    if (product.id === 'hiregenix' && product.dashboard.candidates) {
      return (
        <Box>
          {/* Metrics */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {product.dashboard.metrics.map((metric, index) => (
              <Box key={index} sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '200px' }}>
                <Paper
                  sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {metric.label}
                  </Typography>
                  <Typography variant="h5" component="div" fontWeight={600} sx={{ mb: 1 }}>
                    {metric.value}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                    <Chip
                      size="small"
                      icon={metric.isPositive ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                      label={`${metric.isPositive ? '+' : ''}${Math.abs(metric.change)}%`}
                      color={metric.isPositive ? 'success' : 'error'}
                      sx={{ height: 24 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      vs last month
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>

          {/* Candidates */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Top Candidates
            </Typography>
            {product.dashboard.candidates.map((candidate, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1.5,
                  borderRadius: 2,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                <Avatar sx={{ width: 40, height: 40, mr: 2, bgcolor: alpha(product.color, 0.2), color: product.color }}>
                  {candidate.name.charAt(0)}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" fontWeight={500}>
                      {candidate.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${candidate.matchScore}% Match`}
                      color="primary"
                      sx={{ 
                        height: 24,
                        backgroundColor: alpha(product.color, 0.1),
                        color: product.color,
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {candidate.position}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Chip
                      size="small"
                      label={candidate.status}
                      variant="outlined"
                      sx={{ height: 24, mr: 1, borderColor: product.color, color: product.color }}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {candidate.skills.slice(0, 2).map((skill, idx) => (
                        <Chip
                          key={idx}
                          size="small"
                          label={skill}
                          sx={{ 
                            height: 24,
                            backgroundColor: alpha(theme.palette.grey[500], 0.1),
                            fontSize: '0.7rem'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      );
    } else if (product.id === 'marketiq' && product.dashboard.trends) {
      return (
        <Box>
          {/* Metrics */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {product.dashboard.metrics.map((metric, index) => (
              <Box key={index} sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '200px' }}>
                <Paper
                  sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {metric.label}
                  </Typography>
                  <Typography variant="h5" component="div" fontWeight={600} sx={{ mb: 1 }}>
                    {metric.value}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                    <Chip
                      size="small"
                      icon={metric.isPositive ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                      label={`${metric.isPositive ? '+' : ''}${Math.abs(metric.change)}%`}
                      color={metric.isPositive ? 'success' : 'error'}
                      sx={{ height: 24 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      vs last quarter
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>

          {/* Market Trends */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Market Trends
            </Typography>
            {product.dashboard.trends.map((trend, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1" fontWeight={600}>
                    {trend.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={trend.forecast}
                    sx={{ 
                      height: 24,
                      backgroundColor: 
                        trend.forecast === 'Booming' ? alpha(theme.palette.success.main, 0.1) :
                        trend.forecast === 'Growing' ? alpha(theme.palette.info.main, 0.1) :
                        alpha(theme.palette.error.main, 0.1),
                      color: 
                        trend.forecast === 'Booming' ? theme.palette.success.main :
                        trend.forecast === 'Growing' ? theme.palette.info.main :
                        theme.palette.error.main
                    }}
                  />
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Growth Potential
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LinearProgress
                      variant="determinate"
                      value={trend.growth}
                      sx={{ 
                        height: 8, 
                        borderRadius: 4, 
                        flexGrow: 1,
                        mr: 2,
                        backgroundColor: alpha(product.color, 0.1),
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: product.color
                        }
                      }}
                    />
                    <Typography variant="body2" fontWeight={600}>
                      {trend.growth}%
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      );
    } else if (product.id === 'medcodex' && product.dashboard.procedures) {
      return (
        <Box>
          {/* Metrics */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {product.dashboard.metrics.map((metric, index) => (
              <Box key={index} sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '200px' }}>
                <Paper
                  sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {metric.label}
                  </Typography>
                  <Typography variant="h5" component="div" fontWeight={600} sx={{ mb: 1 }}>
                    {metric.value}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                    <Chip
                      size="small"
                      icon={metric.isPositive ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                      label={`${metric.isPositive ? '+' : ''}${Math.abs(metric.change)}%`}
                      color={metric.isPositive ? 'success' : 'error'}
                      sx={{ height: 24 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      improvement
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>

          {/* Procedures */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Recent Coding Examples
            </Typography>
            {product.dashboard.procedures.map((procedure, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip
                      label={procedure.code}
                      size="small"
                      sx={{ 
                        mr: 2,
                        fontWeight: 700,
                        backgroundColor: alpha(product.color, 0.1),
                        color: product.color
                      }}
                    />
                    <Typography variant="body2">
                      {procedure.description}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={`${procedure.confidence}%`}
                    color="success"
                    sx={{ height: 24 }}
                  />
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Confidence Score
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={procedure.confidence}
                    sx={{ 
                      height: 6, 
                      borderRadius: 3, 
                      mt: 0.5,
                      backgroundColor: alpha(product.color, 0.1),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: product.color
                      }
                    }}
                  />
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      );
    }

    // Default fallback
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1" color="text.secondary">
          Dashboard preview not available
        </Typography>
      </Box>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: 0.2 }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: 350, sm: 450, md: 600 },
          borderRadius: '20px',
          background: 'white',
          boxShadow: '0 20px 80px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        {/* Browser-like header */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: alpha(theme.palette.grey[100], 0.8),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            display: 'flex',
            alignItems: 'center',
            px: 2,
            zIndex: 2
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f57' }} />
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#febc2e' }} />
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#28c840' }} />
          </Box>
          <Box
            sx={{
              ml: 2,
              flex: 1,
              height: 24,
              borderRadius: 12,
              bgcolor: alpha(theme.palette.grey[200], 0.7),
              display: 'flex',
              alignItems: 'center',
              px: 2
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              app.{product.id}.com
            </Typography>
          </Box>
        </Box>
        
        {/* Dashboard content */}
        <Box sx={{ p: 3, pt: 6, height: '100%', overflow: 'auto' }}>
          {renderDashboardContent()}
        </Box>
        
        {/* Floating badge */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            padding: 2,
            borderRadius: 3,
            background: alpha(product.color, 0.9),
            color: 'white',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            border: `1px solid ${alpha('#ffffff', 0.3)}`
          }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            AI-Powered Insights
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
};

export default ProductDashboardPreview;
