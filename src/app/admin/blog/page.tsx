'use client';

import React, { useState, useEffect } from 'react';
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

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  category: string;
  date: string;
  status: 'Published' | 'Draft';
  views: number;
}

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export default function BlogAdmin() {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadPosts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blog', { headers: authHeaders() });
      if (res.ok) setPosts(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (id: string) => {
    setPostToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/blog/${postToDelete}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postToDelete));
      }
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
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
                            href={`/admin/blog/new?id=${post.id}`}
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
                        {loading
                          ? 'Loading posts…'
                          : posts.length === 0
                          ? 'No blog posts yet. Click “New Post” to create your first one.'
                          : 'No posts found matching your search.'}
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
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
