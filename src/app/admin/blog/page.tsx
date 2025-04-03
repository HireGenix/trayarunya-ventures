'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Divider, 
  IconButton, 
  Chip, 
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
  alpha
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Mock data for blog posts
const blogPosts = [
  { 
    id: 1, 
    title: 'The Future of AI in Business', 
    slug: 'future-of-ai-in-business',
    excerpt: 'Exploring how artificial intelligence is transforming modern business operations and decision-making processes.',
    author: 'Admin', 
    category: 'Technology',
    date: '2025-03-04', 
    status: 'Published',
    views: 1245
  },
  { 
    id: 2, 
    title: 'How to Optimize Your Website for SEO', 
    slug: 'optimize-website-for-seo',
    excerpt: 'A comprehensive guide to improving your website\'s search engine rankings and visibility.',
    author: 'Admin', 
    category: 'Marketing',
    date: '2025-03-02', 
    status: 'Draft',
    views: 0
  },
  { 
    id: 3, 
    title: '10 Tips for Better Customer Engagement', 
    slug: '10-tips-customer-engagement',
    excerpt: 'Strategies to enhance customer interactions and build stronger relationships with your audience.',
    author: 'Admin', 
    category: 'Business',
    date: '2025-02-28', 
    status: 'Published',
    views: 876
  },
  { 
    id: 4, 
    title: 'Understanding Machine Learning Models', 
    slug: 'understanding-machine-learning-models',
    excerpt: 'A beginner-friendly introduction to different machine learning models and their applications.',
    author: 'Admin', 
    category: 'Technology',
    date: '2025-02-25', 
    status: 'Published',
    views: 1032
  },
  { 
    id: 5, 
    title: 'The Impact of Digital Transformation', 
    slug: 'impact-of-digital-transformation',
    excerpt: 'How digital transformation is reshaping industries and creating new opportunities for growth.',
    author: 'Admin', 
    category: 'Business',
    date: '2025-02-20', 
    status: 'Draft',
    views: 0
  },
];

export default function BlogAdmin() {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<number | null>(null);
  
  const filteredPosts = blogPosts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.status.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleDeleteClick = (id: number) => {
    setPostToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    // In a real app, you would delete the post from the database
    console.log(`Deleting post with ID: ${postToDelete}`);
    setDeleteDialogOpen(false);
    setPostToDelete(null);
  };
  
  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" fontWeight={700}>
          Blog Management
        </Typography>
        <Button
          component={Link}
          href="/admin/blog/new"
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            fontWeight: 600,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          New Post
        </Button>
      </Box>
      
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
          mb: 4,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              All Blog Posts
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                placeholder="Search posts..."
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
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
              <Tooltip title="Filter options">
                <IconButton>
                  <FilterListIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Views</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPosts.map((post) => (
                  <TableRow
                    key={post.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      <Typography variant="body2" fontWeight={500}>
                        {post.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {post.excerpt.substring(0, 60)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={post.category} 
                        size="small" 
                        sx={{ 
                          backgroundColor: post.category === 'Technology' 
                            ? alpha(theme.palette.info.main, 0.1) 
                            : post.category === 'Marketing'
                            ? alpha(theme.palette.warning.main, 0.1)
                            : alpha(theme.palette.success.main, 0.1),
                          color: post.category === 'Technology' 
                            ? theme.palette.info.main 
                            : post.category === 'Marketing'
                            ? theme.palette.warning.main
                            : theme.palette.success.main,
                          fontWeight: 500,
                        }} 
                      />
                    </TableCell>
                    <TableCell>{post.date}</TableCell>
                    <TableCell>
                      <Chip 
                        label={post.status} 
                        size="small" 
                        color={post.status === 'Published' ? 'success' : 'warning'} 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{post.status === 'Published' ? post.views : '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {post.status === 'Published' && (
                          <Tooltip title="View Post">
                            <IconButton 
                              size="small"
                              component={Link}
                              href={`/blog/${post.slug}`}
                              target="_blank"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Edit Post">
                          <IconButton 
                            size="small"
                            component={Link}
                            href={`/admin/blog/edit/${post.id}`}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Post">
                          <IconButton 
                            size="small"
                            onClick={() => handleDeleteClick(post.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPosts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1" color="text.secondary">
                        No posts found matching your search.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this blog post? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
