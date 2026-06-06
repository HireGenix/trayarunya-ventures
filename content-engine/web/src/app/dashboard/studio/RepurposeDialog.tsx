'use client';

/**
 * Content repurposing dialog.
 *
 * Takes a source content item and generates channel-native variants
 * (X thread, LinkedIn post, Instagram caption, newsletter blurb, etc.)
 * with real character limits. Preview each variant in channel-styled cards.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import {
  PremiumDialog,
  DialogHero,
  DialogBody,
  SectionLabel,
  DialogFooter,
  inkPillSx,
  ghostPillSx,
} from '@/components/PremiumDialog';
import { BRAND } from '@/theme/theme';
import {
  ContentOptimize,
  Content,
  type RepurposedVariant,
  type ChannelInfo,
  type ContentItem,
} from '@/lib/api';

const INK = BRAND.ink;
const SUBTLE = '#6B7280';
const TEAL = BRAND.teal;

// Channel styling
const CHANNEL_COLORS: Record<string, string> = {
  x_thread: '#0f1419',
  linkedin_post: '#0a66c2',
  instagram_caption: '#e4405f',
  newsletter_blurb: BRAND.amber,
  blog_summary: TEAL,
  ad_copy: BRAND.pink,
};

interface RepurposeDialogProps {
  open: boolean;
  onClose: () => void;
  item?: ContentItem | null;
  provider?: string;
  onSaved?: () => void;
}

export default function RepurposeDialog({ open, onClose, item, provider, onSaved }: RepurposeDialogProps) {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [variants, setVariants] = useState<RepurposedVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Load available channels
  useEffect(() => {
    if (!open) return;
    setVariants([]);
    setGenerated(false);
    setSelectedChannels(new Set());
    ContentOptimize.repurposeChannels()
      .then(r => {
        setChannels(r.channels);
        setSelectedChannels(new Set(r.channels.map(c => c.key)));
      })
      .catch(() => {});
  }, [open]);

  const toggleChannel = useCallback((key: string) => {
    setSelectedChannels(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const generate = useCallback(async () => {
    if (!item || selectedChannels.size === 0) return;
    setLoading(true);
    try {
      const res = await ContentOptimize.repurpose({
        content_item_id: item.id,
        channels: Array.from(selectedChannels),
        provider,
      });
      setVariants(res.variants);
      setGenerated(true);
    } catch { /* */ }
    setLoading(false);
  }, [item, selectedChannels, provider]);

  const copyVariant = useCallback((v: RepurposedVariant) => {
    navigator.clipboard.writeText(v.body);
    setCopied(v.channel);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const saveAll = useCallback(async () => {
    if (!item) return;
    // Save each variant as a new content item via Content.generate (simplified)
    for (const v of variants) {
      try {
        await Content.update(item.id, {
          meta: { ...(item.meta || {}), [`repurposed_${v.channel}`]: v.body },
        });
      } catch { /* ignore */ }
    }
    onSaved?.();
    onClose();
  }, [item, variants, onSaved, onClose]);

  return (
    <PremiumDialog open={open} onClose={onClose} maxWidth="md" accent={BRAND.gradient}>
      <DialogHero
        icon={<ShareOutlinedIcon />}
        title="Repurpose Content"
        subtitle={item ? `Atomize "${item.title || 'Untitled'}" into channel-native variants` : 'Select channels to generate variants'}
        onClose={onClose}
        tint={TEAL}
        tintSoft={BRAND.tealSoft}
      />
      <DialogBody>
        {!generated ? (
          <Stack spacing={2.5}>
            <SectionLabel>Select target channels</SectionLabel>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {channels.map(ch => (
                <FormControlLabel
                  key={ch.key}
                  control={
                    <Checkbox
                      checked={selectedChannels.has(ch.key)}
                      onChange={() => toggleChannel(ch.key)}
                      size="small"
                      sx={{ color: CHANNEL_COLORS[ch.key] || TEAL, '&.Mui-checked': { color: CHANNEL_COLORS[ch.key] || TEAL } }}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: INK }}>{ch.label}</Typography>
                      <Typography sx={{ fontSize: 11, color: SUBTLE }}>({ch.max_chars} chars)</Typography>
                    </Stack>
                  }
                  sx={{ mr: 2 }}
                />
              ))}
            </Stack>

            {item && (
              <Box>
                <SectionLabel>Source content preview</SectionLabel>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 3, maxHeight: 200, overflow: 'auto' }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: INK, mb: 0.5 }}>{item.title || 'Untitled'}</Typography>
                  <Typography sx={{ fontSize: 13, color: SUBTLE, whiteSpace: 'pre-wrap' }}>{(item.body || '').slice(0, 500)}{(item.body || '').length > 500 ? '...' : ''}</Typography>
                </Card>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <SectionLabel>Generated variants</SectionLabel>
            {variants.map(v => (
              <Card
                key={v.channel}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: `1px solid rgba(14,17,22,0.1)`,
                }}
              >
                <Box sx={{
                  px: 2, py: 1,
                  background: `${CHANNEL_COLORS[v.channel] || TEAL}12`,
                  borderBottom: '1px solid rgba(14,17,22,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: CHANNEL_COLORS[v.channel] || TEAL,
                    }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: INK }}>{v.label}</Typography>
                    <Chip
                      size="small"
                      label={`${v.char_count} chars`}
                      sx={{ fontSize: 10, fontWeight: 600, height: 20, background: 'rgba(14,17,22,0.06)' }}
                    />
                  </Stack>
                  <Button
                    size="small"
                    startIcon={copied === v.channel ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                    onClick={() => copyVariant(v)}
                    sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, color: SUBTLE, minWidth: 0 }}
                  >
                    {copied === v.channel ? 'Copied' : 'Copy'}
                  </Button>
                </Box>
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography sx={{ fontSize: 13, color: INK, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{v.body}</Typography>
                </Box>
              </Card>
            ))}
          </Stack>
        )}
      </DialogBody>

      <DialogFooter>
        <Button sx={ghostPillSx} onClick={onClose}>Cancel</Button>
        {!generated ? (
          <Button
            sx={inkPillSx}
            onClick={generate}
            disabled={loading || selectedChannels.size === 0 || !item}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {loading ? 'Generating...' : `Repurpose to ${selectedChannels.size} channels`}
          </Button>
        ) : (
          <Button sx={inkPillSx} onClick={saveAll}>
            Save all variants
          </Button>
        )}
      </DialogFooter>
    </PremiumDialog>
  );
}
