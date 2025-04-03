'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText,
  Divider,
  IconButton,
  Chip,
  Paper,
  useTheme,
  alpha,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  SelectChangeEvent
} from '@mui/material';
import { 
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Image as ImageIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatListNumbered as FormatListNumberedIcon,
  FormatQuote as FormatQuoteIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Categories for the blog posts
const categories = [
  'Technology',
  'Business',
  'Marketing',
  'Design',
  'Development',
  'AI',
  'Data Science',
  'Product'
];

export default function NewBlogPost() {
  const theme = useTheme();
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: '',
    tags: [] as string[],
    featuredImage: '',
    status: 'Draft'
  });
  
  const [errors, setErrors] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: ''
  });
  
  const [currentTag, setCurrentTag] = useState('');
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value
      });
      
      // Clear error when field is edited
      if (name in errors) {
        setErrors({
          ...errors,
          [name]: ''
        });
      }
      
      // Auto-generate slug from title
      if (name === 'title') {
        const slug = (value as string)
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-');
        
        setFormData(prev => ({
          ...prev,
          slug
        }));
      }
    }
  };
  
  const handleAddTag = () => {
    if (currentTag && !formData.tags.includes(currentTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, currentTag]
      });
      setCurrentTag('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };
  
  const validateForm = () => {
    const newErrors = {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      category: ''
    };
    
    let isValid = true;
    
    if (!formData.title) {
      newErrors.title = 'Title is required';
      isValid = false;
    }
    
    if (!formData.slug) {
      newErrors.slug = 'Slug is required';
      isValid = false;
    }
    
    if (!formData.excerpt) {
      newErrors.excerpt = 'Excerpt is required';
      isValid = false;
    }
    
    if (!formData.content) {
      newErrors.content = 'Content is required';
      isValid = false;
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // In a real app, you would save the post to the database
      console.log('Form submitted:', formData);
      
      // Redirect to blog admin page
      window.location.href = '/admin/blog';
    }
  };
  
  const handleDiscard = () => {
    setDiscardDialogOpen(false);
    // Redirect to blog admin page
    window.location.href = '/admin/blog';
  };
  
  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            component={Link}
            href="/admin/blog"
            startIcon={<ArrowBackIcon />}
            sx={{ fontWeight: 500 }}
          >
            Back to Posts
          </Button>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Create New Blog Post
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDiscardDialogOpen(true)}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Discard
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 600,
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Save Post
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        <Box>
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
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Post Content
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <TextField
                label="Post Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                error={!!errors.title}
                helperText={errors.title}
                sx={{ mb: 3 }}
              />
              
              <TextField
                label="URL Slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                error={!!errors.slug}
                helperText={errors.slug || "This will be the URL of your post (e.g., 'your-post-title')"}
                sx={{ mb: 3 }}
              />
              
              <TextField
                label="Excerpt"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                multiline
                rows={2}
                error={!!errors.excerpt}
                helperText={errors.excerpt || "A brief summary of your post (displayed in previews)"}
                sx={{ mb: 3 }}
              />
              
              {/* Simple text editor toolbar */}
              <Paper 
                elevation={0} 
                sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 1, 
                  p: 1, 
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <IconButton size="small">
                  <FormatBoldIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <FormatItalicIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <FormatListBulletedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <FormatListNumberedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <FormatQuoteIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <CodeIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <LinkIcon fontSize="small" />
                </IconButton>
                <IconButton size="small">
                  <ImageIcon fontSize="small" />
                </IconButton>
              </Paper>
              
              <TextField
                label="Content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                fullWidth
                variant="outlined"
                multiline
                rows={15}
                error={!!errors.content}
                helperText={errors.content}
                sx={{ mb: 3 }}
              />
            </CardContent>
          </Card>
        </Box>
        
        <Box>
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
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Post Settings
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.category}>
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                  labelId="category-label"
                  name="category"
                  value={formData.category}
                  label="Category"
                  onChange={handleChange}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
                {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={formData.status}
                  label="Status"
                  onChange={handleChange}
                >
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Published">Published</MenuItem>
                </Select>
              </FormControl>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Add a tag"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddTag}
                    disabled={!currentTag}
                    sx={{ ml: 1, minWidth: 'auto', px: 2 }}
                  >
                    <AddIcon fontSize="small" />
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      size="small"
                    />
                  ))}
                  {formData.tags.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No tags added yet
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Featured Image
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  fullWidth
                  sx={{ 
                    height: 100, 
                    borderStyle: 'dashed', 
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}
                >
                  <Typography variant="body2">
                    Upload Image
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Recommended: 1200 x 630px
                  </Typography>
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
      
      {/* Discard Confirmation Dialog */}
      <Dialog
        open={discardDialogOpen}
        onClose={() => setDiscardDialogOpen(false)}
      >
        <DialogTitle>Discard Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to discard this post? All changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDiscard} color="error">
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
