'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from '@/lib/auth';
import { Content, type ContentItem } from '@/lib/api';

const TYPES = [
  { value: 'social_post', label: 'Social post' },
  { value: 'thread', label: 'Thread' },
  { value: 'blog', label: 'Blog article' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'lead_magnet', label: 'Lead magnet' },
  { value: 'ad_copy', label: 'Ad copy' },
];
const PLATFORMS = ['linkedin', 'x', 'instagram', 'facebook', 'youtube', 'tiktok'];

export default function StudioPage() {
  const { activeWorkspace } = useAuth();
  const [list, setList] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [contentType, setContentType] = useState('social_post');
  const [platform, setPlatform] = useState('linkedin');
  const [topic, setTopic] = useState('');

  const refresh = () => {
    Content.list()
      .then((items) => {
        setList(items);
        setSelected((cur) => cur || items[0] || null);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const created = await Content.generate({
        content_type: contentType,
        platform,
        topic: topic.trim(),
      });
      setList((prev) => [...created, ...prev]);
      if (created[0]) setSelected(created[0]);
      setTopic('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id: string) => {
    await Content.remove(id);
    setList((prev) => prev.filter((c) => c.id !== id));
    setSelected((cur) => (cur?.id === id ? null : cur));
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Create
            </Typography>
            <Stack spacing={2}>
              <TextField
                select
                label="Type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                fullWidth
              >
                {TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                fullWidth
              >
                {PLATFORMS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Topic / brief"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
              <Button variant="contained" onClick={generate} disabled={generating}>
                {generating ? <CircularProgress size={22} /> : 'Generate with AI'}
              </Button>
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </CardContent>
        </Card>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          LIBRARY
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : list.length === 0 ? (
          <Typography color="text.secondary">No content yet.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {list.map((c) => (
              <Card key={c.id} variant="outlined">
                <Stack direction="row" alignItems="center">
                  <CardActionArea onClick={() => setSelected(c)} sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
                      <Chip size="small" label={c.content_type} color="primary" variant="outlined" />
                      {c.platform && <Chip size="small" label={c.platform} />}
                      <Chip size="small" label={c.status} />
                    </Stack>
                    <Typography fontWeight={600} noWrap>
                      {c.title || c.body.slice(0, 60)}
                    </Typography>
                  </CardActionArea>
                  <IconButton onClick={() => remove(c.id)} sx={{ mr: 1 }} aria-label="delete">
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        {selected ? (
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="start">
                <Typography variant="h5" fontWeight={800} gutterBottom>
                  {selected.title || 'Untitled'}
                </Typography>
                <IconButton
                  onClick={() => navigator.clipboard.writeText(selected.body)}
                  aria-label="copy"
                >
                  <ContentCopyIcon />
                </IconButton>
              </Stack>
              <Typography sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>{selected.body}</Typography>

              {selected.variants && Object.keys(selected.variants).length > 0 && (
                <>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Platform variants
                  </Typography>
                  <Stack spacing={2}>
                    {Object.entries(selected.variants).map(([plat, text]) => (
                      <Card key={plat} variant="outlined">
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Chip size="small" label={plat} color="primary" />
                            <IconButton
                              size="small"
                              onClick={() => navigator.clipboard.writeText(String(text))}
                              aria-label="copy variant"
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                          <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }} variant="body2">
                            {String(text)}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>Generate or select content to preview it here.</Typography>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );
}
