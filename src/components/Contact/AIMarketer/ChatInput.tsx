'use client';

import React, { useRef, useState } from 'react';
import { Box, TextField, Button, IconButton, Tooltip, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';

interface ChatInputProps {
  onSend: (text: string, images?: string[], links?: string[]) => void;
  disabled?: boolean;
}

const MAX_IMAGES = 4;
const MAX_DIM = 1280;

/** Downscale + compress an image file to a JPEG data URL to keep payloads small. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normaliseLink(raw: string): string | null {
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    return new URL(u).href;
  } catch {
    return null;
  }
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const canSend = Boolean((value.trim() || images.length || links.length) && !disabled);

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim(), images.length ? images : undefined, links.length ? links : undefined);
    setValue('');
    setImages([]);
    setLinks([]);
    setShowLink(false);
    setLinkDraft('');
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const slots = MAX_IMAGES - images.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, slots);
    const urls = await Promise.all(picked.map((f) => fileToDataUrl(f).catch(() => '')));
    setImages((prev) => [...prev, ...urls.filter(Boolean)]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const addLink = () => {
    const url = normaliseLink(linkDraft);
    if (!url) return;
    setLinks((prev) => Array.from(new Set([...prev, url])));
    setLinkDraft('');
    setShowLink(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Attachment previews */}
      {(images.length > 0 || links.length > 0) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {images.map((src, i) => (
            <Box
              key={`img-${i}`}
              sx={{
                position: 'relative',
                width: 56,
                height: 56,
                borderRadius: 1.5,
                overflow: 'hidden',
                border: '1px solid rgba(15,23,42,0.12)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <IconButton
                size="small"
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                sx={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 18,
                  height: 18,
                  background: 'rgba(15,23,42,0.7)',
                  color: '#fff',
                  '&:hover': { background: 'rgba(15,23,42,0.9)' },
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
          {links.map((url, i) => (
            <Box
              key={`lnk-${i}`}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                pl: 1,
                pr: 0.5,
                py: 0.4,
                maxWidth: 220,
                borderRadius: 99,
                background: 'rgba(255,175,6,0.1)',
                border: '1px solid rgba(255,175,6,0.3)',
              }}
            >
              <LinkIcon sx={{ fontSize: 14, color: '#b8730a' }} />
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#b8730a',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {url.replace(/^https?:\/\//, '')}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                sx={{ width: 16, height: 16, color: '#b8730a' }}
              >
                <CloseIcon sx={{ fontSize: 11 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Inline link input */}
      {showLink && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLink();
              }
            }}
            placeholder="Paste a website / Instagram / YouTube link…"
            variant="filled"
            size="small"
            fullWidth
            autoFocus
            sx={{
              '& .MuiFilledInput-root': {
                background: 'rgba(15,23,42,0.04)',
                borderRadius: 1.5,
                '&:before, &:after': { display: 'none' },
              },
              '& input': { color: '#0f1320', fontSize: '0.85rem' },
            }}
          />
          <Button
            onClick={addLink}
            disabled={!linkDraft.trim()}
            sx={{ minWidth: 64, borderRadius: 2, textTransform: 'none', fontWeight: 700, color: '#b8730a' }}
          >
            Add
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Tooltip title="Attach screenshot">
          <span>
            <IconButton
              onClick={() => fileRef.current?.click()}
              disabled={disabled || images.length >= MAX_IMAGES}
              sx={{ color: '#64748b', '&:hover': { color: '#b8730a', background: 'rgba(255,175,6,0.08)' } }}
            >
              <ImageIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Attach a link">
          <span>
            <IconButton
              onClick={() => setShowLink((v) => !v)}
              disabled={disabled}
              sx={{
                color: showLink ? '#b8730a' : '#64748b',
                '&:hover': { color: '#b8730a', background: 'rgba(255,175,6,0.08)' },
              }}
            >
              <LinkIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <TextField
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a message…"
          variant="filled"
          size="small"
          fullWidth
          autoComplete="off"
          disabled={disabled}
          sx={{
            '& .MuiFilledInput-root': {
              background: 'rgba(15,23,42,0.04)',
              color: '#0f1320',
              borderRadius: 1.5,
              '&:hover, &.Mui-focused': { background: 'rgba(15,23,42,0.06)' },
              '&:before, &:after': { display: 'none' },
            },
            '& input': { color: '#0f1320', fontSize: '0.95rem' },
            '& input::placeholder': { color: 'rgba(15,23,42,0.4)' },
          }}
        />
        <Button
          onClick={submit}
          disabled={!canSend}
          sx={{
            minWidth: 44,
            height: 44,
            borderRadius: 2,
            background: canSend ? 'linear-gradient(135deg,#ffaf06,#ff7a06)' : 'rgba(15,23,42,0.06)',
            color: canSend ? '#0a0a0f' : 'rgba(15,23,42,0.3)',
            '&:hover': { background: 'linear-gradient(135deg,#ffbf2a,#ff8a1a)' },
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </Button>
      </Box>
    </Box>
  );
}
