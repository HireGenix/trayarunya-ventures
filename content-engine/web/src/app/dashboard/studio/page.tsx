'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CodeIcon from '@mui/icons-material/Code';
import ImageIcon from '@mui/icons-material/Image';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import ArticleIcon from '@mui/icons-material/Article';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import IosShareIcon from '@mui/icons-material/IosShare';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '@/lib/auth';
import {
  Content,
  Images,
  Brand,
  assetUrl,
  downloadImage,
  AI_MODELS,
  IMAGE_MODELS,
  IMAGE_STYLES,
  type ContentItem,
  type Brand as BrandType,
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { BRAND } from '@/theme/theme';

/* ============================ format model ============================ */

type FormatOption = {
  value: string; // backend `format`
  label: string;
  icon: React.ReactNode;
  withImage: boolean;
  slides?: number; // default slide count for deck formats
  hint: string;
};

const TYPES = [
  { value: 'social_post', label: 'Social post' },
  { value: 'thread', label: 'Thread' },
  { value: 'blog', label: 'Blog article' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'lead_magnet', label: 'Lead magnet' },
  { value: 'ad_copy', label: 'Ad copy' },
];

const PLATFORMS = ['linkedin', 'x', 'instagram', 'facebook', 'youtube', 'tiktok'];

const SINGLE: FormatOption = {
  value: 'single',
  label: 'Single graphic',
  icon: <ImageIcon fontSize="small" />,
  withImage: true,
  hint: 'One branded social graphic + caption.',
};
const CAROUSEL: FormatOption = {
  value: 'carousel',
  label: 'Carousel',
  icon: <ViewCarouselIcon fontSize="small" />,
  withImage: true,
  slides: 6,
  hint: 'A multi-slide deck — one branded image per slide.',
};
const PDF: FormatOption = {
  value: 'pdf',
  label: 'PDF document',
  icon: <PictureAsPdfIcon fontSize="small" />,
  withImage: true,
  slides: 5,
  hint: 'A portrait, multi-page document you can download as PDF.',
};
const ARTICLE: FormatOption = {
  value: 'article',
  label: 'Article + hero',
  icon: <ArticleIcon fontSize="small" />,
  withImage: true,
  hint: 'A full article with a hero image.',
};
const NEWSLETTER: FormatOption = {
  value: 'newsletter',
  label: 'Email + header',
  icon: <MailOutlineIcon fontSize="small" />,
  withImage: true,
  hint: 'A full newsletter issue — always includes a branded header image (needs both a writing model and an image model).',
};
const TEXT: FormatOption = {
  value: 'text',
  label: 'Text only',
  icon: <ContentCopyIcon fontSize="small" />,
  withImage: false,
  hint: 'Copy only — no graphics.',
};

const FORMATS_BY_TYPE: Record<string, FormatOption[]> = {
  social_post: [SINGLE, CAROUSEL, TEXT],
  thread: [TEXT, CAROUSEL],
  blog: [ARTICLE, TEXT],
  newsletter: [NEWSLETTER],
  lead_magnet: [PDF, TEXT],
  ad_copy: [SINGLE, TEXT],
};

function formatsFor(type: string): FormatOption[] {
  return FORMATS_BY_TYPE[type] ?? [SINGLE, TEXT];
}

/* ============================ helpers ============================ */

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'content';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Minimal, safe markdown → HTML for our own generated content. */
function renderMarkdown(md: string): string {
  const lines = (md || '').split('\n');
  const html: string[] = [];
  let inList = false;
  const inline = (t: string) =>
    escapeHtml(t)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>');
  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const lvl = Math.min(h[1].length, 6);
      html.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      continue;
    }
    if (/^(-|\*|•)\s+/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${inline(line.replace(/^(-|\*|•)\s+/, ''))}</li>`);
      continue;
    }
    if (/^---+$/.test(line)) {
      closeList();
      html.push('<hr/>');
      continue;
    }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return html.join('\n');
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function itemToMarkdown(item: ContentItem): string {
  const lines: string[] = [];
  if (item.title) lines.push(`# ${item.title}`, '');
  lines.push(item.body || '');
  if (item.variants && Object.keys(item.variants).length > 0) {
    lines.push('', '---', '');
    for (const [k, v] of Object.entries(item.variants)) {
      lines.push(`## ${k}`, '', String(v), '');
    }
  }
  return lines.join('\n');
}

function assetUrls(item: ContentItem): string[] {
  if (item.asset_urls && item.asset_urls.length) return item.asset_urls.map(assetUrl);
  if (item.image_url) return [assetUrl(item.image_url)];
  return [];
}

/** Extract the ContentImage id from a `/api/v1/images/<id>/raw` URL. */
function imageIdFromUrl(url: string): string | null {
  const m = /\/images\/([^/]+)\/raw/.exec(url);
  return m ? m[1] : null;
}

function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slideMeta(item: ContentItem): { heading?: string; body?: string }[] {
  const slides = (item.meta as { slides?: { heading?: string; body?: string }[] } | null)?.slides;
  return Array.isArray(slides) ? slides : [];
}

function deckKind(item: ContentItem): 'carousel' | 'pdf' | 'article' | 'newsletter' | 'image' | 'text' {
  const k = item.asset_kind;
  if (k === 'carousel' || k === 'pdf') return k;
  if (item.content_type === 'blog') return 'article';
  if (item.content_type === 'newsletter') return 'newsletter';
  if (assetUrls(item).length > 1) return 'carousel';
  if (assetUrls(item).length === 1) return 'image';
  return 'text';
}

/** Print the deck: one full page per generated slide image. */
function printDeck(item: ContentItem, urls: string[], portrait: boolean) {
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) return;
  const size = portrait ? '1080px 1350px' : '1080px 1080px';
  const pages = urls
    .map((u) => `<section class="pg"><img src="${u}" alt=""/></section>`)
    .join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    item.title || 'Content',
  )}</title><style>
    @page { size: ${size}; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    .pg { width: 100%; page-break-after: always; }
    .pg img { width: 100%; display: block; }
  </style></head><body>${pages}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

/** Branded text PDF (fallback when there are no slide images). */
function printAsPdf(item: ContentItem, brand?: BrandType | null) {
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) return;
  const primary = brand?.primary_color || '#ffaf06';
  const accent = brand?.accent_color || '#14bb87';
  const brandName = (brand?.profile as { name?: string })?.name || 'Trayarunya Ventures';
  const bodyHtml = renderMarkdown(item.body || '');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    item.title || 'Content',
  )}</title><style>
    @page { margin: 48px; }
    body { font-family: 'Poppins', -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #0E1726; line-height: 1.6; }
    .cover { background: linear-gradient(135deg, ${primary} 0%, ${accent} 100%); color:#fff; padding: 64px; border-radius: 16px; margin-bottom: 32px; }
    .cover .eyebrow { text-transform: uppercase; letter-spacing: 3px; font-weight: 700; opacity:.9; }
    .cover h1 { font-size: 40px; margin: 12px 0 0; }
    h2 { color: ${primary}; margin-top: 28px; }
    .foot { margin-top: 40px; color:#667085; font-weight:600; }
  </style></head><body>
    <div class="cover"><div class="eyebrow">${escapeHtml(item.content_type)}</div><h1>${escapeHtml(
      item.title || 'Untitled',
    )}</h1></div>
    ${bodyHtml}
    <div class="foot">— ${escapeHtml(brandName)}</div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

/* ============================ shared bits ============================ */

const STAGE_BG = '#171A21';

/* shared premium styling tokens */
const PANEL_SHADOW = '0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.06)';
const PANEL_RADIUS = 5; // 20px
const TRANSITION = 'all .18s cubic-bezier(.4,0,.2,1)';

function InspectorSection({
  icon,
  title,
  children,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 3.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.85}>
          {icon}
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.1em', fontSize: 10.5, fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

/* ============================ create rail ============================ */

function FormatTile({
  option,
  selected,
  onClick,
}: {
  option: FormatOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      role="button"
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 3.5,
        p: 1.75,
        textAlign: 'center',
        border: '2px solid',
        borderColor: selected ? BRAND.amber : 'rgba(0,0,0,0.06)',
        bgcolor: selected ? BRAND.amberSoft : '#FAFBFC',
        boxShadow: selected
          ? `0 0 0 3px ${BRAND.amberSoft}, 0 4px 14px rgba(255,175,6,0.18)`
          : '0 1px 4px rgba(0,0,0,0.04)',
        transition: TRANSITION,
        '&:hover': {
          borderColor: selected ? BRAND.amber : '#CFD4DA',
          transform: 'translateY(-2px)',
          boxShadow: selected
            ? `0 0 0 3px ${BRAND.amberSoft}, 0 6px 20px rgba(255,175,6,0.22)`
            : '0 4px 16px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          mx: 'auto',
          mb: 1,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          color: selected ? '#fff' : 'text.secondary',
          background: selected ? BRAND.gradient : 'linear-gradient(135deg, #F3F4F6 0%, #E8EAEE 100%)',
          boxShadow: selected ? '0 4px 12px rgba(20,187,135,0.3)' : 'none',
          transition: TRANSITION,
        }}
      >
        {option.icon}
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: selected ? BRAND.amberDeep : 'text.primary' }}>
        {option.label}
      </Typography>
    </Box>
  );
}

function CreateRail({
  provider,
  list,
  loading,
  selectedId,
  onPreview,
  onCreated,
  onDelete,
}: {
  provider: string;
  list: ContentItem[];
  loading: boolean;
  selectedId?: string;
  onPreview: (item: ContentItem) => void;
  onCreated: (items: ContentItem[]) => void;
  onDelete: (item: ContentItem) => void;
}) {
  const [tab, setTab] = useState<'create' | 'library'>('create');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [contentType, setContentType] = useState('social_post');
  const [platform, setPlatform] = useState('linkedin');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [format, setFormat] = useState('single');
  const [slides, setSlides] = useState(6);
  const [imgStyle, setImgStyle] = useState<string>(IMAGE_STYLES[0].id);
  const [imgModel, setImgModel] = useState<string>(IMAGE_MODELS[0].id);

  const options = useMemo(() => formatsFor(contentType), [contentType]);
  const active = options.find((o) => o.value === format) ?? options[0];
  const isDeck = format === 'carousel' || format === 'pdf';

  // Keep format valid when content type changes.
  useEffect(() => {
    const opts = formatsFor(contentType);
    if (!opts.find((o) => o.value === format)) {
      setFormat(opts[0].value);
      if (opts[0].slides) setSlides(opts[0].slides);
    }
  }, [contentType, format]);

  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const created = await Content.generate({
        content_type: contentType,
        platform,
        topic: topic.trim(),
        notes: notes.trim() || undefined,
        provider,
        format,
        with_image: active.withImage,
        slides: isDeck ? slides : undefined,
        image_style: active.withImage ? imgStyle : undefined,
        image_provider: active.withImage ? imgModel : undefined,
      });
      onCreated(created);
      if (created[0]) onPreview(created[0]);
      setTopic('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.06)',
        borderRadius: PANEL_RADIUS,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: { lg: '100%' },
        minHeight: { xs: 440, lg: 0 },
        boxShadow: PANEL_SHADOW,
      }}
    >
      <ToggleButtonGroup
        exclusive
        value={tab}
        onChange={(_, v) => v && setTab(v)}
        sx={{
          p: 1.25,
          gap: 1,
          '& .MuiToggleButton-root': {
            flex: 1,
            border: '1px solid',
            borderColor: 'rgba(0,0,0,0.06)',
            borderRadius: '12px !important',
            textTransform: 'none',
            fontWeight: 700,
            py: 0.75,
            fontSize: 13,
            transition: TRANSITION,
          },
          '& .Mui-selected': {
            bgcolor: `${BRAND.amberSoft} !important`,
            color: `${BRAND.amberDeep} !important`,
            borderColor: `${BRAND.amber} !important`,
            boxShadow: `0 0 0 1px ${BRAND.amberSoft}`,
          },
        }}
      >
        <ToggleButton value="create">
          <AutoAwesomeIcon fontSize="small" sx={{ mr: 0.75 }} /> Create
        </ToggleButton>
        <ToggleButton value="library">
          <ViewCarouselIcon fontSize="small" sx={{ mr: 0.75 }} /> Library
          {list.length > 0 && (
            <Box component="span" sx={{ ml: 0.75, fontSize: 11, color: 'text.disabled' }}>
              {list.length}
            </Box>
          )}
        </ToggleButton>
      </ToggleButtonGroup>
      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        {tab === 'create' ? (
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5}>
              <TextField select label="Type" value={contentType} onChange={(e) => setContentType(e.target.value)} fullWidth>
                {TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </TextField>
              <TextField select label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)} fullWidth>
                {PLATFORMS.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Format</Typography>
              <Box
                sx={{
                  mt: 0.75,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.25,
                }}
              >
                {options.map((o) => (
                  <FormatTile
                    key={o.value}
                    option={o}
                    selected={o.value === active.value}
                    onClick={() => {
                      setFormat(o.value);
                      if (o.slides) setSlides(o.slides);
                    }}
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {active.hint}
              </Typography>
            </Box>

            <TextField
              label="Topic / brief"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              placeholder="What should this be about?"
            />
            <TextField
              label="Notes / angle (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
            />

            {(isDeck || active.withImage) && (
              <Stack spacing={1.5}>
                {isDeck && (
                  <TextField
                    select
                    label="Slides"
                    value={slides}
                    onChange={(e) => setSlides(Number(e.target.value))}
                    fullWidth
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <MenuItem key={n} value={n}>{n} slides</MenuItem>
                    ))}
                  </TextField>
                )}
                {active.withImage && (
                  <Stack direction="row" spacing={1.5}>
                    <TextField select label="Graphic style" value={imgStyle} onChange={(e) => setImgStyle(e.target.value)} fullWidth>
                      {IMAGE_STYLES.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
                      ))}
                    </TextField>
                    <TextField select label="Image model" value={imgModel} onChange={(e) => setImgModel(e.target.value)} fullWidth>
                      {IMAGE_MODELS.map((m) => (
                        <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                )}
              </Stack>
            )}

            <Button
              variant="contained"
              size="large"
              onClick={generate}
              disabled={generating || !topic.trim()}
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{
                background: generating || !topic.trim() ? undefined : BRAND.gradient,
                fontWeight: 700,
                fontSize: 15,
                py: 1.5,
                borderRadius: 3,
                boxShadow: generating || !topic.trim() ? undefined : '0 6px 20px rgba(255,175,6,0.3)',
                transition: TRANSITION,
                '&:hover': {
                  background: generating || !topic.trim() ? undefined : `linear-gradient(135deg,${BRAND.amberDeep},${BRAND.tealDeep})`,
                  boxShadow: generating || !topic.trim() ? undefined : '0 8px 28px rgba(255,175,6,0.4)',
                  transform: generating ? 'none' : 'translateY(-1px)',
                },
              }}
            >
              {generating ? 'Generating…' : 'Generate content'}
            </Button>
            {generating && active.withImage && (
              <Typography variant="caption" color="text.secondary">
                Writing copy and rendering {isDeck ? `${slides} branded slides` : 'a branded graphic'} — this can take up to a minute.
              </Typography>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        ) : (
          <Stack spacing={1.25}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={22} />
              </Box>
            ) : list.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No content yet — create your first deliverable.
              </Typography>
            ) : (
              list.map((c) => {
                const thumb = assetUrls(c)[0];
                const selected = c.id === selectedId;
                return (
                  <Box
                    key={c.id}
                    onClick={() => onPreview(c)}
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      p: 1.25,
                      borderRadius: 3,
                      cursor: 'pointer',
                      border: '1.5px solid',
                      borderColor: selected ? BRAND.amber : 'rgba(0,0,0,0.05)',
                      bgcolor: selected ? BRAND.amberSoft : '#FAFBFC',
                      boxShadow: selected ? `0 0 0 2px ${BRAND.amberSoft}` : '0 1px 3px rgba(0,0,0,0.03)',
                      transition: TRANSITION,
                      '&:hover': {
                        borderColor: selected ? BRAND.amber : '#CFD4DA',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        transform: 'translateY(-1px)',
                      },
                      '&:hover .del-btn': { opacity: 1 },
                    }}
                  >
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        borderRadius: 2.5,
                        flexShrink: 0,
                        overflow: 'hidden',
                        bgcolor: '#F0F1F4',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'text.disabled',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      {thumb ? (
                        <Box component="img" src={thumb} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <TextFieldsIcon fontSize="small" />
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>
                        {c.title || c.body.slice(0, 50)}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.4, flexWrap: 'wrap', gap: 0.4 }}>
                        <Chip size="small" label={c.content_type} sx={{ height: 18, fontSize: 10 }} />
                        {c.platform && <Chip size="small" label={c.platform} sx={{ height: 18, fontSize: 10 }} />}
                      </Stack>
                    </Box>
                    <IconButton
                      className="del-btn"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c);
                      }}
                      sx={{ opacity: { xs: 1, lg: 0 }, transition: 'opacity .14s', alignSelf: 'center', color: 'text.disabled' }}
                      aria-label="delete"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

/* ============================ canvas stage ============================ */

function CanvasStage({
  item,
  kind,
  urls,
  slides,
  activeIdx,
  setActiveIdx,
  portrait,
  isNewsletter,
  emailHtml,
  emailView,
  setEmailView,
  brand,
}: {
  item: ContentItem;
  kind: ReturnType<typeof deckKind>;
  urls: string[];
  slides: { heading?: string; body?: string }[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  portrait: boolean;
  isNewsletter: boolean;
  emailHtml: string | null;
  emailView: 'rendered' | 'source';
  setEmailView: (v: 'rendered' | 'source') => void;
  brand: BrandType | null;
}) {
  const [zoom, setZoom] = useState(1);
  const hasImages = urls.length > 0;
  const spec = slides[activeIdx];
  const go = (d: number) => setActiveIdx((activeIdx + d + urls.length) % urls.length);
  const showEmailFrame = isNewsletter && !!emailHtml;
  const primary = brand?.primary_color || BRAND.amberDeep;

  // The "artboard" rendered in the centre of the stage.
  let artboard: React.ReactNode;
  if (showEmailFrame && emailView === 'rendered') {
    artboard = (
      <Box
        sx={{
          width: 'min(680px, 96%)',
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: '#fff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 32px 80px rgba(0,0,0,0.25)',
        }}
      >
        <Box
          sx={{
            height: 40,
            px: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            bgcolor: '#2A2E37',
          }}
        >
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <Box key={c} sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: c }} />
          ))}
          <Box
            sx={{
              ml: 1,
              flex: 1,
              height: 22,
              borderRadius: 1.5,
              bgcolor: '#1F232B',
              color: '#9AA4B2',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              px: 1.25,
            }}
          >
            {item.title || 'Newsletter preview'}
          </Box>
        </Box>
        <Box
          component="iframe"
          title="email preview"
          srcDoc={emailHtml || ''}
          sandbox=""
          sx={{ width: '100%', height: 620, border: 0, display: 'block', bgcolor: '#f4f4f5' }}
        />
      </Box>
    );
  } else if (showEmailFrame && emailView === 'source') {
    artboard = (
      <Paper
        sx={{
          width: 'min(720px, 96%)',
          maxHeight: '88%',
          overflow: 'auto',
          p: 2.5,
          bgcolor: '#0E1116',
          border: '1px solid #2A2E37',
          borderRadius: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 32px 80px rgba(0,0,0,0.25)',
        }}
      >
        <Box component="pre" sx={{ m: 0, fontSize: 12, color: '#C7D0DC', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {emailHtml}
        </Box>
      </Paper>
    );
  } else if (hasImages) {
    artboard = (
      <Box
        component="img"
        src={urls[activeIdx]}
        alt={spec?.heading || item.title || 'graphic'}
        sx={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 32px 80px rgba(0,0,0,0.25)',
          transform: `scale(${zoom})`,
          transition: 'transform .18s ease',
        }}
      />
    );
  } else {
    // Pure text / document artboard.
    artboard = (
      <Paper
        sx={{
          width: 'min(720px, 96%)',
          maxHeight: '92%',
          overflow: 'auto',
          p: { xs: 3, md: 5 },
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 32px 80px rgba(0,0,0,0.2)',
          borderRadius: 4,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          transition: 'transform .18s ease',
        }}
      >
        {item.title && (
          <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
            {item.title}
          </Typography>
        )}
        <Box
          sx={{
            '& h1': { fontSize: 24, fontWeight: 800, mt: 2 },
            '& h2': { fontSize: 19, fontWeight: 700, mt: 2.5, color: primary },
            '& h3': { fontSize: 16, fontWeight: 700, mt: 2 },
            '& p': { my: 1, lineHeight: 1.75 },
            '& ul': { pl: 3, my: 1 },
            '& li': { mb: 0.5 },
            '& hr': { border: 0, borderTop: '1px solid', borderColor: 'divider', my: 2 },
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(item.body) }}
        />
      </Paper>
    );
  }

  const pillSx = {
    bgcolor: 'rgba(20,24,32,0.88)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#E7EAEF',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    '&:hover': { bgcolor: 'rgba(40,46,56,0.95)' },
  } as const;

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        position: 'relative',
        borderRadius: PANEL_RADIUS,
        overflow: 'hidden',
        bgcolor: STAGE_BG,
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        display: 'flex',
        flexDirection: 'column',
        height: { lg: '100%' },
        minHeight: { xs: 480, lg: 420 },
        boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 12px 40px rgba(0,0,0,0.15)',
      }}
    >
      {/* top artboard toolbar */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          bgcolor: 'rgba(14,17,22,0.65)',
          backdropFilter: 'blur(12px)',
          zIndex: 2,
        }}
      >
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }} noWrap>
          {item.title || 'Untitled'}
        </Typography>
        <Chip
          size="small"
          label={item.content_type}
          sx={{ bgcolor: 'rgba(255,175,6,0.16)', color: '#FFCF66', border: '1px solid rgba(255,175,6,0.2)', height: 22, fontWeight: 600, fontSize: 11 }}
        />
        {item.platform && (
          <Chip size="small" label={item.platform} sx={{ bgcolor: 'rgba(255,255,255,0.07)', color: '#C7D0DC', border: '1px solid rgba(255,255,255,0.08)', height: 22, fontWeight: 600, fontSize: 11 }} />
        )}
        {urls.length > 1 && (
          <Chip
            size="small"
            icon={<ViewCarouselIcon sx={{ fontSize: 14, color: '#9FE7CE !important' }} />}
            label={`${urls.length} ${kind === 'pdf' ? 'pages' : 'slides'}`}
            sx={{ bgcolor: 'rgba(20,187,135,0.14)', color: '#9FE7CE', border: '1px solid rgba(20,187,135,0.2)', height: 22, fontWeight: 600, fontSize: 11 }}
          />
        )}
        <Box sx={{ flex: 1 }} />
        {showEmailFrame && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={emailView}
            onChange={(_, v) => v && setEmailView(v)}
            sx={{
              '& .MuiToggleButton-root': {
                color: '#9AA4B2',
                border: '1px solid rgba(255,255,255,0.12)',
                px: 1.5,
                py: 0.35,
                textTransform: 'none',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: '10px !important',
                transition: TRANSITION,
              },
              '& .Mui-selected': { bgcolor: 'rgba(255,255,255,0.14) !important', color: '#fff !important', borderColor: 'rgba(255,255,255,0.2) !important' },
            }}
          >
            <ToggleButton value="rendered">
              <VisibilityIcon sx={{ fontSize: 15, mr: 0.5 }} /> Preview
            </ToggleButton>
            <ToggleButton value="source">
              <CodeIcon sx={{ fontSize: 15, mr: 0.5 }} /> HTML
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* stage */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 1.5, md: 2.5 },
          overflow: 'hidden',
        }}
      >
        {artboard}

        {/* slide navigation */}
        {urls.length > 1 && !showEmailFrame && (
          <>
            <IconButton onClick={() => go(-1)} sx={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, ...pillSx, transition: TRANSITION, '&:hover': { ...pillSx['&:hover'], transform: 'translateY(-50%) scale(1.08)' } }} aria-label="previous">
              <ChevronLeftIcon />
            </IconButton>
            <IconButton onClick={() => go(1)} sx={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, ...pillSx, transition: TRANSITION, '&:hover': { ...pillSx['&:hover'], transform: 'translateY(-50%) scale(1.08)' } }} aria-label="next">
              <ChevronRightIcon />
            </IconButton>
            <Box
              sx={{
                position: 'absolute',
                top: 14,
                left: '50%',
                transform: 'translateX(-50%)',
                px: 2,
                py: 0.6,
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
                ...pillSx,
              }}
            >
              {activeIdx + 1} / {urls.length}
            </Box>
          </>
        )}

        {/* zoom controls (images & docs) */}
        {!showEmailFrame && (
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ position: 'absolute', bottom: 14, right: 14, borderRadius: 99, px: 0.75, py: 0.5, ...pillSx }}
          >
            <IconButton size="small" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} sx={{ color: 'inherit' }} aria-label="zoom out">
              <ZoomOutIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ fontSize: 12, fontWeight: 600, minWidth: 38, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton size="small" onClick={() => setZoom((z) => Math.min(1.75, +(z + 0.25).toFixed(2)))} sx={{ color: 'inherit' }} aria-label="zoom in">
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
      </Box>

      {/* filmstrip */}
      {urls.length > 1 && !showEmailFrame && (
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            display: 'flex',
            gap: 1.25,
            overflowX: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            bgcolor: 'rgba(14,17,22,0.65)',
            backdropFilter: 'blur(8px)',
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
          }}
        >
          {urls.map((u, i) => (
            <Box
              key={u}
              component="img"
              src={u}
              onClick={() => setActiveIdx(i)}
              alt={`thumb ${i + 1}`}
              sx={{
                height: portrait ? 72 : 60,
                width: portrait ? 58 : 60,
                objectFit: 'cover',
                borderRadius: 2,
                cursor: 'pointer',
                flexShrink: 0,
                border: '2.5px solid',
                borderColor: i === activeIdx ? primary : 'transparent',
                opacity: i === activeIdx ? 1 : 0.5,
                boxShadow: i === activeIdx ? `0 0 0 2px ${primary}, 0 4px 12px rgba(0,0,0,0.3)` : '0 2px 6px rgba(0,0,0,0.2)',
                transition: TRANSITION,
                '&:hover': { opacity: 1, transform: 'translateY(-2px)' },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

/* ============================ inspector ============================ */

type InspectorTab = 'design' | 'image' | 'copy' | 'export';

function Inspector({
  item,
  brand,
  kind,
  urls,
  activeIdx,
  isNewsletter,
  emailHtml,
  emailFormat,
  setEmailFormat,
  imgStyle,
  setImgStyle,
  imgModel,
  setImgModel,
  busy,
  error,
  onRebuild,
  onCopy,
  onRefresh,
}: {
  item: ContentItem;
  brand: BrandType | null;
  kind: ReturnType<typeof deckKind>;
  urls: string[];
  activeIdx: number;
  isNewsletter: boolean;
  emailHtml: string | null;
  emailFormat: string;
  setEmailFormat: (v: string) => void;
  imgStyle: string;
  setImgStyle: (v: string) => void;
  imgModel: string;
  setImgModel: (v: string) => void;
  busy: boolean;
  error: string;
  onRebuild: () => void;
  onCopy: (text: string) => void;
  onRefresh: (updated: ContentItem) => void;
}) {
  const hasImages = urls.length > 0;
  const isText = kind === 'text';
  const portrait = kind === 'pdf';
  const [tab, setTab] = useState<InspectorTab>(isText ? 'copy' : 'design');

  // Edit-with-prompt state for the currently selected image.
  const [instruction, setInstruction] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const selectedUrl = urls[activeIdx];
  const selectedImgId = selectedUrl ? imageIdFromUrl(selectedUrl) : null;

  const regenImage = async () => {
    if (!selectedImgId || !instruction.trim()) return;
    setEditBusy(true);
    setEditError('');
    try {
      await Images.regenerate(selectedImgId, { instruction: instruction.trim(), replace: true });
      const fresh = await Content.get(item.id);
      onRefresh(fresh);
      setInstruction('');
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not regenerate the image');
    } finally {
      setEditBusy(false);
    }
  };

  const downloadPdf = () => {
    if (urls.length && (kind === 'carousel' || kind === 'pdf')) {
      printDeck(item, urls, portrait);
    } else {
      printAsPdf(item, brand);
    }
  };

  const TABS: { id: InspectorTab; icon: React.ReactNode; label: string; hidden?: boolean }[] = [
    { id: 'design', icon: <TuneIcon fontSize="small" />, label: 'Design', hidden: isText },
    { id: 'image', icon: <ImageOutlinedIcon fontSize="small" />, label: 'Image', hidden: !hasImages },
    { id: 'copy', icon: <TextFieldsIcon fontSize="small" />, label: 'Copy' },
    { id: 'export', icon: <IosShareIcon fontSize="small" />, label: 'Export' },
  ];
  const visibleTabs = TABS.filter((t) => !t.hidden);
  const activeTab = visibleTabs.find((t) => t.id === tab) ? tab : visibleTabs[0].id;

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.06)',
        borderRadius: PANEL_RADIUS,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: { lg: '100%' },
        minHeight: { xs: 440, lg: 0 },
        boxShadow: PANEL_SHADOW,
      }}
    >
      <Box sx={{ display: 'flex', gap: 0.5, p: 1.25, borderBottom: '1px solid', borderColor: 'rgba(0,0,0,0.06)' }}>
        {visibleTabs.map((t) => (
          <Box
            key={t.id}
            role="button"
            onClick={() => setTab(t.id)}
            sx={{
              flex: 1,
              py: 1,
              borderRadius: 2.5,
              textAlign: 'center',
              cursor: 'pointer',
              color: activeTab === t.id ? BRAND.amberDeep : 'text.secondary',
              bgcolor: activeTab === t.id ? BRAND.amberSoft : 'transparent',
              border: '1.5px solid',
              borderColor: activeTab === t.id ? BRAND.amber : 'transparent',
              transition: TRANSITION,
              '&:hover': {
                bgcolor: activeTab === t.id ? BRAND.amberSoft : '#F5F6F8',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Box sx={{ display: 'grid', placeItems: 'center' }}>{t.icon}</Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, mt: 0.3, letterSpacing: '0.02em' }}>{t.label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ---- DESIGN ---- */}
        {activeTab === 'design' && (
          <>
            <InspectorSection icon={<TuneIcon fontSize="small" color="action" />} title="Graphics">
              <Stack spacing={1.5}>
                <TextField select size="small" label="Style" value={imgStyle} onChange={(e) => setImgStyle(e.target.value)} fullWidth>
                  {IMAGE_STYLES.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
                  ))}
                </TextField>
                <TextField select size="small" label="Image model" value={imgModel} onChange={(e) => setImgModel(e.target.value)} fullWidth>
                  {IMAGE_MODELS.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
                  ))}
                </TextField>
                {isNewsletter && (
                  <TextField select size="small" label="Email format" value={emailFormat} onChange={(e) => setEmailFormat(e.target.value)} fullWidth>
                    <MenuItem value="html">Branded HTML</MenuItem>
                    <MenuItem value="normal">Plain / markdown</MenuItem>
                  </TextField>
                )}
                <Button
                  variant="contained"
                  onClick={onRebuild}
                  disabled={busy}
                  startIcon={busy ? <CircularProgress size={16} color="inherit" /> : hasImages ? <RefreshIcon /> : <AddPhotoAlternateIcon />}
                  sx={{
                    background: busy ? undefined : BRAND.gradient,
                    fontWeight: 700,
                    borderRadius: 2.5,
                    boxShadow: busy ? undefined : '0 4px 14px rgba(255,175,6,0.25)',
                    transition: TRANSITION,
                    '&:hover': {
                      background: busy ? undefined : `linear-gradient(135deg,${BRAND.amberDeep},${BRAND.tealDeep})`,
                      boxShadow: busy ? undefined : '0 6px 20px rgba(255,175,6,0.35)',
                    },
                  }}
                >
                  {busy ? 'Rendering…' : hasImages ? 'Regenerate graphics' : 'Add graphics'}
                </Button>
                {busy && (
                  <Typography variant="caption" color="text.secondary">
                    Rendering brand-aware graphics — a full carousel can take a minute.
                  </Typography>
                )}
              </Stack>
            </InspectorSection>

            {isNewsletter && !emailHtml && emailFormat === 'html' && (
              <Alert severity="info" sx={{ mt: 1 }}>
                No branded HTML yet. Keep <strong>Branded HTML</strong> selected and regenerate to build a responsive email.
              </Alert>
            )}
          </>
        )}

        {/* ---- IMAGE (edit selected) ---- */}
        {activeTab === 'image' && hasImages && (
          <>
            <InspectorSection
              icon={<ImageOutlinedIcon fontSize="small" color="action" />}
              title={urls.length > 1 ? `Selected — ${activeIdx + 1} / ${urls.length}` : 'Selected graphic'}
            >
              <Card variant="outlined" sx={{ overflow: 'hidden', mb: 1.5, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Box component="img" src={selectedUrl} alt="selected" sx={{ width: '100%', display: 'block' }} />
              </Card>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => downloadImage(selectedUrl, `${slugify(item.title || 'graphic')}-${activeIdx + 1}.png`)}
              >
                Download this image
              </Button>
            </InspectorSection>

            <InspectorSection icon={<AutoFixHighIcon fontSize="small" color="action" />} title="Edit with a prompt">
              <Stack spacing={1.25}>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  minRows={3}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Describe the change — e.g. 'make the background deep navy and add a laptop on the desk'"
                />
                <Button
                  variant="contained"
                  onClick={regenImage}
                  disabled={editBusy || !instruction.trim() || !selectedImgId}
                  startIcon={editBusy ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
                >
                  {editBusy ? 'Regenerating…' : 'Apply change'}
                </Button>
                {editError && <Alert severity="error">{editError}</Alert>}
                <Typography variant="caption" color="text.secondary">
                  Regenerates this exact slot, keeping brand colours, style and the composited logo.
                </Typography>
              </Stack>
            </InspectorSection>
          </>
        )}

        {/* ---- COPY ---- */}
        {activeTab === 'copy' && (
          <>
            <InspectorSection
              icon={<TextFieldsIcon fontSize="small" color="action" />}
              title={isNewsletter ? 'Newsletter' : kind === 'article' ? 'Article' : 'Copy'}
              action={
                <Tooltip title="Copy text">
                  <IconButton size="small" onClick={() => onCopy(item.body)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              {kind === 'article' || isNewsletter || kind === 'pdf' ? (
                <Box
                  sx={{
                    fontSize: 14,
                    '& h1': { fontSize: 20, fontWeight: 800, mt: 1.5 },
                    '& h2': { fontSize: 17, fontWeight: 700, mt: 2, color: 'primary.main' },
                    '& h3': { fontSize: 15, fontWeight: 700, mt: 1.5 },
                    '& p': { my: 1, lineHeight: 1.7 },
                    '& ul': { pl: 3, my: 1 },
                    '& li': { mb: 0.5 },
                    '& hr': { border: 0, borderTop: '1px solid', borderColor: 'divider', my: 2 },
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(item.body) }}
                />
              ) : (
                <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{item.body}</Typography>
              )}
            </InspectorSection>

            {item.variants && Object.keys(item.variants).length > 0 && (
              <InspectorSection title="Caption & variants">
                <Stack spacing={1.25}>
                  {Object.entries(item.variants).map(([k, text]) => (
                    <Paper key={k} variant="outlined" sx={{ p: 1.75, borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Chip size="small" label={k} color="primary" />
                        <IconButton size="small" onClick={() => onCopy(String(text))} aria-label="copy variant">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1, fontSize: 13 }}>
                        {Array.isArray(text) ? (text as string[]).join(' ') : String(text)}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </InspectorSection>
            )}
          </>
        )}

        {/* ---- EXPORT ---- */}
        {activeTab === 'export' && (
          <InspectorSection icon={<IosShareIcon fontSize="small" color="action" />} title="Download & export">
            <Stack spacing={1.25}>
              {hasImages && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => downloadImage(urls[activeIdx], `${slugify(item.title || 'graphic')}-${activeIdx + 1}.png`)}
                >
                  Download current image
                </Button>
              )}
              {urls.length > 1 && (
                <Button fullWidth variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={downloadPdf}>
                  Download all {kind === 'pdf' ? 'pages' : 'slides'} as PDF
                </Button>
              )}
              {urls.length <= 1 && (
                <Button fullWidth variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={downloadPdf}>
                  Download as PDF
                </Button>
              )}
              {isNewsletter && emailHtml && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CodeIcon />}
                  onClick={() => downloadHtml(`${slugify(item.title || 'newsletter')}.html`, emailHtml)}
                >
                  Download .html email
                </Button>
              )}
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => downloadText(`${slugify(item.title || 'content')}.md`, itemToMarkdown(item))}
              >
                Download .md (copy)
              </Button>
              <Button fullWidth variant="text" startIcon={<ContentCopyIcon />} onClick={() => onCopy(itemToMarkdown(item))}>
                Copy everything
              </Button>
            </Stack>
          </InspectorSection>
        )}
      </Box>
    </Box>
  );
}

/* ============================ studio editor ============================ */

function StudioEditor({
  item,
  onCopy,
  onRefresh,
}: {
  item: ContentItem;
  onCopy: (text: string) => void;
  onRefresh: (updated: ContentItem) => void;
}) {
  const [brand, setBrand] = useState<BrandType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imgStyle, setImgStyle] = useState<string>(IMAGE_STYLES[0].id);
  const [imgModel, setImgModel] = useState<string>(IMAGE_MODELS[0].id);
  const [emailFormat, setEmailFormat] = useState<string>(item.email_format || 'html');
  const [emailView, setEmailView] = useState<'rendered' | 'source'>('rendered');
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    Brand.get().then(setBrand).catch(() => setBrand(null));
  }, []);

  useEffect(() => {
    setEmailFormat(item.email_format || 'html');
    setActiveIdx(0);
  }, [item.id, item.email_format]);

  const urls = assetUrls(item);
  const slides = slideMeta(item);
  const kind = deckKind(item);
  const portrait = kind === 'pdf';
  const isNewsletter = kind === 'newsletter';
  const emailHtml = item.email_html || null;
  const safeIdx = Math.max(0, Math.min(activeIdx, Math.max(0, urls.length - 1)));

  const rebuildFormat =
    kind === 'carousel' ? 'carousel'
    : kind === 'pdf' ? 'pdf'
    : kind === 'article' ? 'article'
    : kind === 'newsletter' ? 'newsletter'
    : 'single';

  const rebuild = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await Content.generateAssets(item.id, {
        format: rebuildFormat,
        image_style: imgStyle,
        image_provider: imgModel,
        email_format: isNewsletter ? emailFormat : undefined,
      });
      onRefresh(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build graphics');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <CanvasStage
        item={item}
        kind={kind}
        urls={urls}
        slides={slides}
        activeIdx={safeIdx}
        setActiveIdx={setActiveIdx}
        portrait={portrait}
        isNewsletter={isNewsletter}
        emailHtml={emailHtml}
        emailView={emailView}
        setEmailView={setEmailView}
        brand={brand}
      />
      <Inspector
        item={item}
        brand={brand}
        kind={kind}
        urls={urls}
        activeIdx={safeIdx}
        isNewsletter={isNewsletter}
        emailHtml={emailHtml}
        emailFormat={emailFormat}
        setEmailFormat={setEmailFormat}
        imgStyle={imgStyle}
        setImgStyle={setImgStyle}
        imgModel={imgModel}
        setImgModel={setImgModel}
        busy={busy}
        error={error}
        onRebuild={rebuild}
        onCopy={onCopy}
        onRefresh={onRefresh}
      />
    </>
  );
}

/* ============================ page ============================ */

function StudioContent() {
  const searchParams = useSearchParams();
  const itemId = searchParams.get('item');
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();

  const [provider, setProvider] = useState<string>(AI_MODELS[0].id);
  const [preview, setPreview] = useState<ContentItem | null>(null);
  const [list, setList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const copy = useMemo(() => (text: string) => { navigator.clipboard.writeText(text); }, []);

  const refresh = useCallback(() => {
    Content.list()
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    refresh();
  }, [activeWorkspace, refresh]);

  // Open a specific item when arriving from the Content Calendar ("Open in Studio").
  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    Content.get(itemId)
      .then((item) => { if (!cancelled) setPreview(item); })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [itemId]);

  const onCreated = (items: ContentItem[]) => setList((prev) => [...items, ...prev]);

  const onRefresh = (updated: ContentItem) => {
    setPreview(updated);
    setList((cur) => cur.map((c) => (c.id === updated.id ? updated : c)));
  };

  const remove = async (item: ContentItem) => {
    const ok = await confirm({
      title: 'Delete content?',
      message: (
        <>
          Delete <b>“{item.title || 'this deliverable'}”</b>? Generated assets for it will also be removed.
        </>
      ),
    });
    if (!ok) return;
    const prev = list;
    setList((cur) => cur.filter((c) => c.id !== item.id));
    if (preview?.id === item.id) setPreview(null);
    try {
      await Content.remove(item.id);
    } catch {
      setList(prev);
    }
  };

  return (
    <Stack spacing={3} sx={{ height: { lg: 'calc(100vh - 140px)' } }}>
      {/* header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>Content Studio</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            A real editor for your brand — generate, preview on the canvas, fine-tune images, and export.
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          label="AI model"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          sx={{
            minWidth: 200,
            '& .MuiOutlinedInput-root': { borderRadius: 3 },
          }}
        >
          {AI_MODELS.map((m) => (
            <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {/* editor shell */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '360px minmax(0, 1fr) 340px' },
          alignItems: 'stretch',
        }}
      >
        <CreateRail
          provider={provider}
          list={list}
          loading={loading}
          selectedId={preview?.id}
          onPreview={setPreview}
          onCreated={onCreated}
          onDelete={remove}
        />

        {preview ? (
          <StudioEditor item={preview} onCopy={copy} onRefresh={onRefresh} />
        ) : (
          <Box
            sx={{
              gridColumn: { lg: '2 / 4' },
              minWidth: 0,
              minHeight: { xs: 420, lg: 0 },
              borderRadius: PANEL_RADIUS,
              bgcolor: STAGE_BG,
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 12px 40px rgba(0,0,0,0.15)',
            }}
          >
            <Box sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.65)', maxWidth: 440 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2.5,
                  borderRadius: 5,
                  display: 'grid',
                  placeItems: 'center',
                  background: BRAND.gradient,
                  boxShadow: '0 12px 36px rgba(20,187,135,0.35), 0 4px 12px rgba(255,175,6,0.2)',
                }}
              >
                <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 38 }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 0.75, letterSpacing: '-0.01em' }}>
                Your canvas is ready
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                Use <strong>Create</strong> on the left to generate a post, carousel, article, newsletter or PDF —
                it appears here on the canvas where you can preview slides, edit images with a prompt, and export.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Stack>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}>
      <StudioContent />
    </Suspense>
  );
}
