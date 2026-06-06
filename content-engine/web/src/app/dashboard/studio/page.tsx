'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import ArticleIcon from '@mui/icons-material/Article';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBackIosNew';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunchOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import MovieCreationOutlinedIcon from '@mui/icons-material/MovieCreationOutlined';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import HistoryIcon from '@mui/icons-material/History';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '@/lib/auth';
import {
  Content,
  ContentOptimize,
  Images,
  Videos,
  Brand,
  Calendar,
  assetUrl,
  downloadImage,
  imageUrl,
  videoUrl,
  AI_MODELS,
  IMAGE_MODELS,
  IMAGE_STYLES,
  VIDEO_FORMATS,
  VIDEO_VOICES,
  VIDEO_QUALITIES,
  VIDEO_STYLES,
  VIDEO_VISUALS,
  type ContentItem,
  type ContentImage,
  type ContentCalendar,
  type CalendarEntry,
  type ContentVideo,
  type VideoFormat,
  type VideoQuality,
  type VideoStyle,
  type VideoVisuals,
  type Brand as BrandType,
} from '@/lib/api';
import { useAIModels } from '@/lib/useAIModels';
import { useConfirm } from '@/components/ConfirmDialog';
import { BRAND } from '@/theme/theme';
import SerpEditor from './SerpEditor';
import RepurposeDialog from './RepurposeDialog';
import TemplatesDialog from './TemplatesDialog';
import RichTextEditor from './RichTextEditor';
import { VersionHistoryDrawer, ContentBriefPanel, ReviewQueuePanel, FanOutDialog } from './EnterprisePanels';
import CollabPanel from '@/components/CollabPanel';

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

/* shared premium styling tokens */
const PANEL_SHADOW = '0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.06)';
const PANEL_RADIUS = 5; // 20px
const TRANSITION = 'all .18s cubic-bezier(.4,0,.2,1)';
const INK_STUDIO = BRAND.ink;
const SUBTLE = '#6B7280';

/* ============================ create studio ============================ */

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  x: { label: 'X', color: '#0E1116' },
  instagram: { label: 'Instagram', color: '#D92C7A' },
  facebook: { label: 'Facebook', color: '#1877F2' },
  youtube: { label: 'YouTube', color: '#FF0033' },
  tiktok: { label: 'TikTok', color: '#0E1116' },
};

function FieldSelect({
  label,
  value,
  onChange,
  children,
  minWidth = 132,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        minWidth,
        '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#fff' },
        '& .MuiInputLabel-root': { fontSize: 13 },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(15,17,22,0.12)' },
      }}
    >
      {children}
    </TextField>
  );
}

function CalendarComposer({
  provider,
  initialCalId,
  initialDate,
  onPreview,
  onCreated,
}: {
  provider: string;
  initialCalId?: string;
  initialDate?: string;
  onPreview: (item: ContentItem) => void;
  onCreated: (items: ContentItem[]) => void;
}) {
  const [calendars, setCalendars] = useState<ContentCalendar[]>([]);
  const [loadingCals, setLoadingCals] = useState(true);
  const [calId, setCalId] = useState('');
  const [calDate, setCalDate] = useState(initialDate || '');
  const [withImage, setWithImage] = useState(true);
  const [imgStyle, setImgStyle] = useState<string>(IMAGE_STYLES[0].id);
  const [imgModel, setImgModel] = useState<string>(IMAGE_MODELS[0].id);
  const [emailFormat, setEmailFormat] = useState<'html' | 'plain'>('html');
  const [busyEntry, setBusyEntry] = useState<string | null>(null);
  const [busyDay, setBusyDay] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Calendar.list()
      .then((cals) => {
        if (cancelled) return;
        setCalendars(cals);
        const preferred = initialCalId && cals.find((c) => c.id === initialCalId);
        if (preferred) setCalId(preferred.id);
        else if (cals[0]) setCalId(cals[0].id);
      })
      .catch(() => setCalendars([]))
      .finally(() => { if (!cancelled) setLoadingCals(false); });
    return () => { cancelled = true; };
  }, [initialCalId]);

  const activeCal = useMemo(() => calendars.find((c) => c.id === calId) || null, [calendars, calId]);

  const dates = useMemo(() => {
    if (!activeCal) return [];
    return Array.from(new Set(activeCal.entries.map((e) => e.date))).sort();
  }, [activeCal]);

  useEffect(() => {
    if (dates.length && !dates.includes(calDate)) setCalDate(dates[0]);
  }, [dates, calDate]);

  const dayEntries = useMemo(() => {
    if (!activeCal || !calDate) return [];
    return activeCal.entries.filter((e) => e.date === calDate);
  }, [activeCal, calDate]);

  const pendingCount = dayEntries.filter((e) => e.status !== 'generated').length;

  const applyUpdated = async (updated: ContentCalendar, entryId?: string) => {
    setCalendars((cur) => cur.map((c) => (c.id === updated.id ? updated : c)));
    if (entryId) {
      const fresh = updated.entries.find((e) => e.id === entryId);
      if (fresh?.content_item_id) {
        try {
          const item = await Content.get(fresh.content_item_id);
          onCreated([item]);
          onPreview(item);
        } catch { /* ignore */ }
      }
    }
  };

  const generateEntry = async (entry: CalendarEntry) => {
    if (!activeCal) return;
    setBusyEntry(entry.id);
    setError('');
    try {
      const updated = await Calendar.generateEntry(activeCal.id, entry.id, {
        provider,
        with_image: withImage,
        image_style: imgStyle,
        image_provider: imgModel,
        email_format: entry.content_type === 'newsletter' ? emailFormat : undefined,
      });
      await applyUpdated(updated, entry.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusyEntry(null);
    }
  };

  const generateDay = async () => {
    if (!activeCal || !calDate || pendingCount === 0) return;
    setBusyDay(true);
    setError('');
    try {
      const updated = await Calendar.generateDay(activeCal.id, {
        date: calDate,
        provider,
        with_image: withImage,
        image_style: imgStyle,
        image_provider: imgModel,
        email_format: emailFormat,
      });
      await applyUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Day generation failed');
    } finally {
      setBusyDay(false);
    }
  };

  const openEntry = async (entry: CalendarEntry) => {
    if (!entry.content_item_id) return;
    try {
      const item = await Content.get(entry.content_item_id);
      onPreview(item);
    } catch { /* ignore */ }
  };

  const prettyDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '24px',
        border: '1px solid rgba(15,17,22,0.08)',
        boxShadow: '0 2px 4px rgba(15,17,22,0.04), 0 18px 48px rgba(15,17,22,0.08)',
        overflow: 'hidden',
        bgcolor: '#fff',
      }}
    >
      {loadingCals ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress size={24} /></Box>
      ) : calendars.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, px: 3, color: 'text.secondary' }}>
          <CalendarMonthIcon sx={{ fontSize: 32, opacity: 0.5, mb: 1 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: INK_STUDIO }}>No content calendar yet</Typography>
          <Typography sx={{ fontSize: 13, mt: 0.5 }}>
            Create a calendar first in <Box component="a" href="/dashboard/calendar" sx={{ color: BRAND.tealDeep, fontWeight: 700, textDecoration: 'none' }}>Content Calendar</Box>, then generate planned posts here.
          </Typography>
        </Box>
      ) : (
        <>
          {/* pickers */}
          <Box sx={{ p: 2, display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
            <FieldSelect label="Content calendar" value={calId} onChange={setCalId} minWidth={220}>
              {calendars.map((c) => <MenuItem key={c.id} value={c.id}>{c.title || c.client_name || 'Calendar'}</MenuItem>)}
            </FieldSelect>
            <FieldSelect label="Date" value={calDate} onChange={setCalDate} minWidth={170}>
              {dates.map((d) => {
                const n = activeCal?.entries.filter((e) => e.date === d).length || 0;
                return <MenuItem key={d} value={d}>{prettyDate(d)} · {n} post{n === 1 ? '' : 's'}</MenuItem>;
              })}
            </FieldSelect>
            <Box sx={{ flex: 1, minWidth: 8 }} />
            <Button
              variant="contained"
              onClick={generateDay}
              disabled={busyDay || pendingCount === 0}
              startIcon={busyDay ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{
                background: pendingCount > 0 ? BRAND.gradient : undefined,
                fontWeight: 800, fontSize: 13.5, px: 2, py: 1, borderRadius: '12px', textTransform: 'none',
                boxShadow: pendingCount > 0 ? '0 6px 18px rgba(255,175,6,0.3)' : undefined,
              }}
            >
              {busyDay ? 'Generating…' : pendingCount > 0 ? `Generate all (${pendingCount})` : 'All generated'}
            </Button>
          </Box>

          {/* asset options */}
          <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Switch size="small" checked={withImage} onChange={(e) => setWithImage(e.target.checked)} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>Generate images</Typography>
            </Stack>
            {withImage && (
              <>
                <FieldSelect label="Style" value={imgStyle} onChange={setImgStyle} minWidth={130}>
                  {IMAGE_STYLES.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                </FieldSelect>
                <FieldSelect label="Image model" value={imgModel} onChange={setImgModel} minWidth={150}>
                  {IMAGE_MODELS.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
                </FieldSelect>
              </>
            )}
            <FieldSelect label="Email format" value={emailFormat} onChange={(v) => setEmailFormat(v as 'html' | 'plain')} minWidth={130}>
              <MenuItem value="html">HTML email</MenuItem>
              <MenuItem value="plain">Plain text</MenuItem>
            </FieldSelect>
          </Box>

          <Divider sx={{ borderColor: 'rgba(15,17,22,0.06)' }} />

          {/* entries for the day */}
          {error && <Alert severity="error" sx={{ m: 2, borderRadius: '12px' }}>{error}</Alert>}
          {dayEntries.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontSize: 13.5 }}>No posts planned for this date.</Box>
          ) : (
            <Stack divider={<Divider sx={{ borderColor: 'rgba(15,17,22,0.05)' }} />}>
              {dayEntries.map((e) => {
                const done = e.status === 'generated';
                const busy = busyEntry === e.id;
                const pm = PLATFORM_META[e.platform];
                return (
                  <Box key={e.id} sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                        <Chip size="small" label={pm?.label ?? e.platform} sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: '#EEF6F2', color: BRAND.tealDeep }} />
                        <Chip size="small" label={(e.format || e.content_type).replace(/_/g, ' ')} sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: '#F0F2F4', color: 'text.secondary', textTransform: 'capitalize' }} />
                        {done && <CheckCircleIcon sx={{ fontSize: 16, color: BRAND.teal }} />}
                      </Stack>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: INK_STUDIO, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {e.title}
                      </Typography>
                      {e.hook && <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }} noWrap>{e.hook}</Typography>}
                    </Box>
                    {done ? (
                      <Button onClick={() => openEntry(e)} size="small" variant="outlined" startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, borderRadius: '10px', borderColor: 'rgba(15,17,22,0.15)', color: INK_STUDIO, flexShrink: 0 }}>
                        Open
                      </Button>
                    ) : (
                      <Button onClick={() => generateEntry(e)} disabled={busy} size="small" variant="contained"
                        startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                        sx={{ textTransform: 'none', fontWeight: 800, fontSize: 12.5, borderRadius: '10px', background: BRAND.gradient, flexShrink: 0, boxShadow: '0 4px 12px rgba(255,175,6,0.28)' }}>
                        {busy ? 'Generating…' : 'Generate'}
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
}

function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string>(IMAGE_STYLES[0].id);
  const [provider, setProvider] = useState<string>(IMAGE_MODELS[0].id);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<ContentImage[]>([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  useEffect(() => {
    let cancelled = false;
    Images.list()
      .then((imgs) => { if (!cancelled) setImages(imgs); })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const generate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError('');
    try {
      const img = await Images.generate({ prompt: prompt.trim(), style, provider });
      setImages((prev) => [img, ...prev]);
      setPrompt('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (img: ContentImage) => {
    const ok = await confirm({
      title: 'Delete image?',
      message: 'This permanently removes the generated image.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await Images.remove(img.id);
      setImages((prev) => prev.filter((x) => x.id !== img.id));
    } catch { /* ignore */ }
  };

  const canGenerate = !!prompt.trim() && !generating;

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: '20px',
          border: '1.5px solid rgba(15,17,22,0.08)',
          boxShadow: '0 10px 34px rgba(15,17,22,0.06)',
        }}
      >
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          placeholder="Describe the image — e.g. 'a serene mountain landscape at sunrise, soft pastel palette'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') generate(); }}
          variant="standard"
          InputProps={{ disableUnderline: true, sx: { fontSize: 16, fontWeight: 500, color: INK_STUDIO } }}
          sx={{ mb: 1.5 }}
        />

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <TextField
            select size="small" label="Style" value={style}
            onChange={(e) => setStyle(e.target.value)}
            sx={{ flex: '1 1 160px', minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          >
            {IMAGE_STYLES.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label="Model" value={provider}
            onChange={(e) => setProvider(e.target.value)}
            sx={{ flex: '1 1 180px', minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          >
            {IMAGE_MODELS.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
          </TextField>
          <Button
            onClick={generate}
            disabled={!canGenerate}
            variant="contained"
            startIcon={generating ? <CircularProgress size={15} color="inherit" /> : <ImageIcon />}
            sx={{
              fontWeight: 800,
              fontSize: 14,
              px: 2.5, py: 1.05,
              borderRadius: '12px',
              textTransform: 'none',
              flexShrink: 0,
              background: canGenerate ? `linear-gradient(135deg,${BRAND.amberDeep},${BRAND.tealDeep})` : undefined,
              boxShadow: canGenerate ? '0 6px 18px rgba(255,175,6,0.28)' : undefined,
              whiteSpace: 'nowrap',
            }}
          >
            {generating ? 'Generating…' : 'Generate'}
          </Button>
        </Box>

        <Typography sx={{ mt: 1.25, fontSize: 12, color: 'text.disabled' }}>
          Brand-ready visuals rendered from your prompt.{generating ? ' This takes a few seconds.' : ' ⌘↵ to generate.'}
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 1.5, borderRadius: '12px' }}>{error}</Alert>}
      </Paper>

      {/* generated images */}
      <Box sx={{ mt: 3 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800, color: INK_STUDIO, mb: 1.5 }}>Your images</Typography>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}><CircularProgress size={24} /></Box>
        ) : images.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5, border: '1.5px dashed rgba(15,17,22,0.12)', borderRadius: '18px', color: 'text.secondary' }}>
            <ImageIcon sx={{ fontSize: 28, opacity: 0.5, mb: 1 }} />
            <Typography sx={{ fontSize: 13.5 }}>No images yet — describe one above to generate it.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' } }}>
            {images.map((img) => (
              <Box key={img.id} sx={{ borderRadius: '18px', overflow: 'hidden', border: '1.5px solid rgba(15,17,22,0.08)', bgcolor: '#fff', position: 'relative' }}>
                <Box sx={{ position: 'relative', aspectRatio: '1 / 1', bgcolor: '#0b0d10' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(img)}
                    alt={img.prompt || 'Generated image'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.25, py: 1 }}>
                  <Typography noWrap sx={{ fontSize: 11.5, color: SUBTLE, minWidth: 0, flex: 1 }}>
                    {IMAGE_STYLES.find((s) => s.id === img.style)?.label || img.style || 'Image'}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => downloadImage(imageUrl(img), `image-${img.id}.png`)}>
                      <DownloadIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => remove(img)}>
                      <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function CreateStudio({
  provider,
  list,
  loading,
  initialMode = 'prompt',
  initialCalId,
  initialDate,
  onPreview,
  onCreated,
  onDelete,
  onRepurpose,
}: {
  provider: string;
  list: ContentItem[];
  loading: boolean;
  initialMode?: 'prompt' | 'calendar';
  initialCalId?: string;
  initialDate?: string;
  onPreview: (item: ContentItem) => void;
  onCreated: (items: ContentItem[]) => void;
  onDelete: (item: ContentItem) => void;
  onRepurpose?: (item: ContentItem) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'prompt' | 'calendar' | 'video' | 'images'>(initialMode);

  const [contentType, setContentType] = useState('social_post');
  const [platform, setPlatform] = useState('linkedin');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [format, setFormat] = useState('single');
  const [slides, setSlides] = useState(6);
  const [imgStyle, setImgStyle] = useState<string>(IMAGE_STYLES[0].id);
  const [imgModel, setImgModel] = useState<string>(IMAGE_MODELS[0].id);

  const options = useMemo(() => formatsFor(contentType), [contentType]);
  const active = options.find((o) => o.value === format) ?? options[0];
  const isDeck = format === 'carousel' || format === 'pdf';

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
      setNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = !!topic.trim() && !generating;

  return (
    <Box sx={{ pb: 4 }}>
      {/* ---------- HERO COMPOSER ---------- */}
      <Box sx={{ maxWidth: 880, mx: 'auto', pt: { xs: 1, md: 4 }, px: { xs: 0, md: 2 } }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: 15, color: `${BRAND.amberDeep} !important` }} />}
            label="AI Content Studio"
            sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700, fontSize: 11.5, mb: 2, '& .MuiChip-label': { px: 1 } }}
          />
          <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 800, letterSpacing: '-0.025em', color: INK_STUDIO, lineHeight: 1.15 }}>
            What should we{' '}
            <Box component="span" sx={{ background: BRAND.gradientText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              create
            </Box>{' '}
            today?
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 14.5, color: 'text.secondary', maxWidth: 560, mx: 'auto', lineHeight: 1.6 }}>
            Describe it once — we write the copy and render brand-ready visuals, carousels, emails and PDFs.
          </Typography>
        </Box>

        {/* mode toggle: free prompt vs from content calendar */}
        <Stack direction="row" justifyContent="center" sx={{ mb: 2.5 }}>
          <ToggleButtonGroup
            exclusive
            value={mode}
            onChange={(_, v) => v && setMode(v)}
            sx={{
              bgcolor: '#F0F2F4',
              borderRadius: '14px',
              p: 0.5,
              '& .MuiToggleButton-root': {
                border: 0,
                borderRadius: '11px !important',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 13,
                px: 2,
                py: 0.65,
                color: 'text.secondary',
                gap: 0.75,
                '&.Mui-selected': { bgcolor: '#fff', color: INK_STUDIO, boxShadow: '0 2px 8px rgba(15,17,22,0.1)', '&:hover': { bgcolor: '#fff' } },
              },
            }}
          >
            <ToggleButton value="prompt"><EditNoteIcon sx={{ fontSize: 18 }} />New prompt</ToggleButton>
            <ToggleButton value="calendar"><CalendarMonthIcon sx={{ fontSize: 17 }} />From calendar</ToggleButton>
            <ToggleButton value="video"><MovieCreationOutlinedIcon sx={{ fontSize: 17 }} />AI video</ToggleButton>
            <ToggleButton value="images"><ImageIcon sx={{ fontSize: 17 }} />AI Images</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {mode === 'calendar' ? (
          <CalendarComposer provider={provider} initialCalId={initialCalId} initialDate={initialDate} onPreview={onPreview} onCreated={onCreated} />
        ) : mode === 'video' ? (
          <VideoComposer />
        ) : mode === 'images' ? (
          <ImageGenerator />
        ) : (
        <Box>
        {/* format quick-pick */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 0.5, justifyContent: { md: 'center' }, '&::-webkit-scrollbar': { display: 'none' } }}>
          {options.map((o) => {
            const sel = o.value === active.value;
            return (
              <Box
                key={o.value}
                role="button"
                onClick={() => { setFormat(o.value); if (o.slides) setSlides(o.slides); }}
                sx={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.75,
                  py: 1,
                  borderRadius: '14px',
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: sel ? 'transparent' : 'rgba(15,17,22,0.1)',
                  bgcolor: sel ? INK_STUDIO : '#fff',
                  color: sel ? '#fff' : INK_STUDIO,
                  boxShadow: sel ? '0 6px 18px rgba(14,17,22,0.18)' : '0 1px 2px rgba(15,17,22,0.04)',
                  transition: TRANSITION,
                  '&:hover': { borderColor: sel ? 'transparent' : 'rgba(15,17,22,0.22)', transform: 'translateY(-1px)' },
                }}
              >
                <Box sx={{ display: 'grid', placeItems: 'center', color: sel ? BRAND.amber : 'text.secondary', '& svg': { fontSize: 18 } }}>{o.icon}</Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{o.label}</Typography>
              </Box>
            );
          })}
        </Stack>

        {/* composer card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '24px',
            border: '1px solid rgba(15,17,22,0.08)',
            boxShadow: '0 2px 4px rgba(15,17,22,0.04), 0 18px 48px rgba(15,17,22,0.08)',
            overflow: 'hidden',
            bgcolor: '#fff',
          }}
        >
          <TextField
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            placeholder={`Describe your ${active.label.toLowerCase()}… e.g. "Why Series B SaaS teams should rethink their payments stack — punchy, contrarian, data-backed."`}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={{ p: 2.5, '& textarea': { fontSize: 16, lineHeight: 1.6, color: INK_STUDIO } }}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') generate(); }}
          />

          {showNotes ? (
            <Box sx={{ px: 2.5, pb: 1 }}>
              <TextField
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                size="small"
                placeholder="Angle / notes — tone, hook, CTA, must-mention points…"
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={{ '& input': { fontSize: 13.5, color: 'text.secondary' } }}
              />
            </Box>
          ) : (
            <Box sx={{ px: 2.5, pb: 0.5 }}>
              <Button onClick={() => setShowNotes(true)} startIcon={<TuneIcon sx={{ fontSize: 15 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 600, color: 'text.secondary', px: 0.5, '&:hover': { bgcolor: 'transparent', color: INK_STUDIO } }}>
                Add angle / notes
              </Button>
            </Box>
          )}

          <Divider sx={{ borderColor: 'rgba(15,17,22,0.06)' }} />

          {/* toolbar */}
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <FieldSelect label="Type" value={contentType} onChange={setContentType} minWidth={140}>
              {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </FieldSelect>
            <FieldSelect label="Platform" value={platform} onChange={setPlatform} minWidth={130}>
              {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{PLATFORM_META[p]?.label ?? p}</MenuItem>)}
            </FieldSelect>
            {isDeck && (
              <FieldSelect label="Slides" value={slides} onChange={(v) => setSlides(Number(v))} minWidth={104}>
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <MenuItem key={n} value={n}>{n} slides</MenuItem>)}
              </FieldSelect>
            )}
            {active.withImage && (
              <>
                <FieldSelect label="Style" value={imgStyle} onChange={setImgStyle} minWidth={132}>
                  {IMAGE_STYLES.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                </FieldSelect>
                <FieldSelect label="Image model" value={imgModel} onChange={setImgModel} minWidth={150}>
                  {IMAGE_MODELS.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}
                </FieldSelect>
              </>
            )}
            <Box sx={{ flex: 1, minWidth: 8 }} />
            <Button
              variant="contained"
              onClick={generate}
              disabled={!canGenerate}
              startIcon={generating ? <CircularProgress size={17} color="inherit" /> : <AutoAwesomeIcon />}
              sx={{
                background: canGenerate ? BRAND.gradient : undefined,
                fontWeight: 800,
                fontSize: 14.5,
                px: 2.5,
                py: 1.1,
                borderRadius: '14px',
                textTransform: 'none',
                boxShadow: canGenerate ? '0 6px 18px rgba(255,175,6,0.3)' : undefined,
                transition: TRANSITION,
                '&:hover': { background: canGenerate ? `linear-gradient(135deg,${BRAND.amberDeep},${BRAND.tealDeep})` : undefined, transform: canGenerate ? 'translateY(-1px)' : 'none' },
              }}
            >
              {generating ? 'Generating…' : 'Generate'}
            </Button>
          </Box>
        </Paper>

        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mt: 1.5 }}>
          <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{active.hint}</Typography>
          <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
          <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>⌘↵ to generate</Typography>
        </Stack>
        {generating && active.withImage && (
          <Typography sx={{ mt: 1, fontSize: 12.5, color: 'text.secondary', textAlign: 'center' }}>
            Writing copy and rendering {isDeck ? `${slides} branded slides` : 'a branded graphic'} — this can take up to a minute.
          </Typography>
        )}
        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: '14px' }}>{error}</Alert>}
        </Box>
        )}
      </Box>

      {/* ---------- LIBRARY GALLERY ---------- */}
      <Box sx={{ maxWidth: 1180, mx: 'auto', mt: { xs: 4, md: 6 }, px: { xs: 0, md: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 800, color: INK_STUDIO, letterSpacing: '-0.01em' }}>Your library</Typography>
          {list.length > 0 && (
            <Box sx={{ px: 1, py: 0.2, borderRadius: 99, bgcolor: '#F0F2F4', fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{list.length}</Box>
          )}
        </Stack>

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress size={26} /></Box>
        ) : list.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 7, border: '1.5px dashed rgba(15,17,22,0.12)', borderRadius: '20px', color: 'text.secondary' }}>
            <ViewCarouselIcon sx={{ fontSize: 30, opacity: 0.5, mb: 1 }} />
            <Typography sx={{ fontSize: 14 }}>No content yet — generate your first deliverable above.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' } }}>
            {list.map((c) => <LibraryCard key={c.id} item={c} onOpen={() => onPreview(c)} onDelete={() => onDelete(c)} onRepurpose={onRepurpose ? () => onRepurpose(c) : undefined} />)}
          </Box>
        )}
      </Box>
    </Box>
  );
}

const VIDEO_DURATIONS = [15, 30, 45, 60, 90];

function VideoComposer() {
  const [topic, setTopic] = useState('');
  const [fmt, setFmt] = useState<VideoFormat>('reels');
  const [seconds, setSeconds] = useState(30);
  const [voice, setVoice] = useState<string>('alloy');
  const [tone, setTone] = useState('');
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [style, setStyle] = useState<VideoStyle>('dynamic');
  const [visuals, setVisuals] = useState<VideoVisuals>('hybrid');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  const activeFmt = VIDEO_FORMATS.find((f) => f.value === fmt) ?? VIDEO_FORMATS[0];
  const maxSeconds = fmt === 'youtube' ? 180 : fmt === 'youtube_shorts' ? 60 : 90;
  const durations = VIDEO_DURATIONS.filter((d) => d <= maxSeconds).concat(
    fmt === 'youtube' ? [120, 180] : [],
  );

  useEffect(() => {
    let cancelled = false;
    Videos.list()
      .then((v) => { if (!cancelled) setVideos(v); })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (seconds > maxSeconds) setSeconds(maxSeconds);
  }, [fmt, maxSeconds, seconds]);

  const generate = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setError('');
    try {
      const v = await Videos.generate({
        topic: topic.trim(),
        fmt,
        seconds,
        voice,
        tone: tone.trim() || undefined,
        quality,
        style,
        visuals,
      });
      setVideos((prev) => [v, ...prev]);
      setTopic('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Video generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (v: ContentVideo) => {
    const ok = await confirm({
      title: 'Delete video?',
      message: 'This permanently removes the rendered video.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await Videos.remove(v.id);
      setVideos((prev) => prev.filter((x) => x.id !== v.id));
    } catch { /* ignore */ }
  };

  const canGenerate = !!topic.trim() && !generating;

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: '20px',
          border: '1.5px solid rgba(15,17,22,0.08)',
          boxShadow: '0 10px 34px rgba(15,17,22,0.06)',
        }}
      >
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={5}
          placeholder="What's the video about? e.g. '5 reasons nonprofits should invest in storytelling'"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') generate(); }}
          variant="standard"
          InputProps={{ disableUnderline: true, sx: { fontSize: 16, fontWeight: 500, color: INK_STUDIO } }}
          sx={{ mb: 1 }}
        />

        {/* format pills */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
          {VIDEO_FORMATS.map((f) => {
            const sel = f.value === fmt;
            return (
              <Box
                key={f.value}
                role="button"
                onClick={() => setFmt(f.value)}
                sx={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.85,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: `1.5px solid ${sel ? BRAND.tealDeep : 'rgba(15,17,22,0.1)'}`,
                  bgcolor: sel ? 'rgba(20,124,124,0.06)' : '#fff',
                  transition: TRANSITION,
                }}
              >
                <MovieCreationOutlinedIcon sx={{ fontSize: 16, color: sel ? BRAND.tealDeep : 'text.secondary' }} />
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: sel ? BRAND.tealDeep : INK_STUDIO, lineHeight: 1.1 }}>{f.label}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{f.aspect}</Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* controls */}
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <TextField
              select size="small" label="Duration" value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value))}
              sx={{ flex: '1 1 120px', minWidth: 120, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            >
              {durations.map((d) => <MenuItem key={d} value={d}>{d}s</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="Voice" value={voice}
              onChange={(e) => setVoice(e.target.value)}
              SelectProps={{ startAdornment: <GraphicEqIcon sx={{ fontSize: 15, mr: 0.5, color: 'text.disabled' }} /> }}
              sx={{ flex: '1 1 130px', minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            >
              {VIDEO_VOICES.map((v) => <MenuItem key={v} value={v} sx={{ textTransform: 'capitalize' }}>{v}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="Quality" value={quality}
              onChange={(e) => setQuality(e.target.value as VideoQuality)}
              sx={{ flex: '1 1 140px', minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            >
              {VIDEO_QUALITIES.map((q) => <MenuItem key={q.value} value={q.value}>{q.label}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="Style" value={style}
              onChange={(e) => setStyle(e.target.value as VideoStyle)}
              sx={{ flex: '1 1 130px', minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            >
              {VIDEO_STYLES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="Visuals" value={visuals}
              onChange={(e) => setVisuals(e.target.value as VideoVisuals)}
              sx={{ flex: '1 1 140px', minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            >
              {VIDEO_VISUALS.map((v) => <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>)}
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <TextField
              size="small" label="Tone (optional)" placeholder="energetic, warm…"
              value={tone} onChange={(e) => setTone(e.target.value)}
              sx={{ flex: 1, minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            />
            <Button
              onClick={generate}
              disabled={!canGenerate}
              variant="contained"
              startIcon={generating ? <CircularProgress size={15} color="inherit" /> : <MovieCreationOutlinedIcon />}
              sx={{
                fontWeight: 800,
                fontSize: 14,
                px: 2.5, py: 1.05,
                borderRadius: '12px',
                textTransform: 'none',
                flexShrink: 0,
                background: canGenerate ? `linear-gradient(135deg,${BRAND.amberDeep},${BRAND.tealDeep})` : undefined,
                boxShadow: canGenerate ? '0 6px 18px rgba(255,175,6,0.28)' : undefined,
                whiteSpace: 'nowrap',
              }}
            >
              {generating ? 'Rendering…' : 'Generate video'}
            </Button>
          </Box>
        </Stack>

        <Typography sx={{ mt: 1.25, fontSize: 12, color: 'text.disabled' }}>
          {activeFmt.hint} · AI script + Pexels footage + voiceover + auto captions.
          {generating
            ? (quality === '4k' ? ' 4K renders can take a few minutes.' : ' This takes up to ~90 seconds.')
            : ' ⌘↵ to generate.'}
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 1.5, borderRadius: '12px' }}>{error}</Alert>}
      </Paper>

      {/* rendered videos */}
      <Box sx={{ mt: 3 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800, color: INK_STUDIO, mb: 1.5 }}>Your videos</Typography>
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}><CircularProgress size={24} /></Box>
        ) : videos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5, border: '1.5px dashed rgba(15,17,22,0.12)', borderRadius: '18px', color: 'text.secondary' }}>
            <MovieCreationOutlinedIcon sx={{ fontSize: 28, opacity: 0.5, mb: 1 }} />
            <Typography sx={{ fontSize: 13.5 }}>No videos yet — generate your first Reel or Short above.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3,1fr)', lg: 'repeat(4,1fr)' } }}>
            {videos.map((v) => <VideoCard key={v.id} video={v} onDelete={() => remove(v)} onRegenerate={async () => {
              try {
                const updated = await Videos.regenerate(v.id, {});
                setVideos((prev) => prev.map((x) => x.id === v.id ? updated : x));
              } catch { /* ignore */ }
            }} />)}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function VideoCard({ video, onDelete, onRegenerate }: { video: ContentVideo; onDelete: () => void; onRegenerate?: () => void }) {
  const portrait = (video.height ?? 1920) >= (video.width ?? 1080);
  const fmtLabel = VIDEO_FORMATS.find((f) => f.value === video.fmt)?.label ?? video.fmt;
  const shortSide = Math.min(video.width ?? 0, video.height ?? 0);
  const resLabel = shortSide >= 2000 ? '4K' : shortSide >= 1000 ? '1080p' : shortSide >= 700 ? '720p' : '';
  return (
    <Box sx={{ borderRadius: '18px', overflow: 'hidden', border: '1.5px solid rgba(15,17,22,0.08)', bgcolor: '#0b0d10', position: 'relative' }}>
      <Box sx={{ position: 'relative', aspectRatio: portrait ? '9 / 16' : '16 / 9', bgcolor: '#000' }}>
        {resLabel && (
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, px: 0.85, py: 0.25, borderRadius: '6px', bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>{resLabel}</Typography>
          </Box>
        )}
        <video
          src={videoUrl(video)}
          controls
          playsInline
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.25, py: 1, bgcolor: '#fff' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 700, color: INK_STUDIO }}>{fmtLabel}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
            {video.duration_s ? `${video.duration_s}s` : ''}{video.voice ? ` · ${video.voice}` : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => downloadImage(videoUrl(video), `video-${video.id}.mp4`)}>
            <DownloadIcon sx={{ fontSize: 17 }} />
          </IconButton>
          {onRegenerate && (
            <IconButton size="small" onClick={onRegenerate}>
              <RefreshIcon sx={{ fontSize: 17 }} />
            </IconButton>
          )}
          <IconButton size="small" onClick={onDelete}>
            <DeleteOutlineIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
}

/* ===================== turn a post/script into a video ===================== */

function ScriptToVideo({ item }: { item: ContentItem }) {
  const [fmt, setFmt] = useState<VideoFormat>(
    (item.platform || '').toLowerCase().includes('youtube') ? 'youtube_shorts' : 'reels',
  );
  const [voice, setVoice] = useState<string>('coral');
  const [tone, setTone] = useState('');
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [style, setStyle] = useState<VideoStyle>('dynamic');
  const [visuals, setVisuals] = useState<VideoVisuals>('hybrid');
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirm = useConfirm();

  const words = (item.body || '').trim().split(/\s+/).filter(Boolean).length;
  const estSeconds = Math.max(5, Math.round(words / 2.5));

  useEffect(() => {
    let live = true;
    setLoading(true);
    Videos.list(item.id)
      .then((v) => { if (live) setVideos(v); })
      .catch(() => { if (live) setVideos([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [item.id]);

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const v = await Videos.generate({
        content_item_id: item.id,
        fmt,
        voice,
        tone: tone.trim() || undefined,
        platform: item.platform || undefined,
        quality,
        style,
        visuals,
      });
      setVideos((prev) => [v, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate the video');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (v: ContentVideo) => {
    const ok = await confirm({ title: 'Delete video?', message: 'This permanently removes the rendered video.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await Videos.remove(v.id);
      setVideos((prev) => prev.filter((x) => x.id !== v.id));
    } catch { /* ignore */ }
  };

  const hasScript = !!(item.body && item.body.trim());

  return (
    <EditorSection
      title="Turn script into video"
      subtitle="AI voiceover + matching stock footage + auto captions — from this post"
      action={<Chip size="small" icon={<MovieCreationOutlinedIcon sx={{ fontSize: 14, color: '#fff !important' }} />} label="AI video" sx={{ height: 24, fontSize: 10.5, fontWeight: 700, color: '#fff', background: BRAND.gradient, '& .MuiChip-label': { px: 0.75 } }} />}
    >
      {!hasScript ? (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>Add some body text above first — that script becomes the voiceover.</Alert>
      ) : (
        <Stack spacing={1.5}>
          <TextField select size="small" label="Format" value={fmt} onChange={(e) => setFmt(e.target.value as VideoFormat)} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
            {VIDEO_FORMATS.map((f) => (
              <MenuItem key={f.value} value={f.value}>{f.label} · {f.aspect}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Voice" value={voice} onChange={(e) => setVoice(e.target.value)} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
            {VIDEO_VOICES.map((v) => (
              <MenuItem key={v} value={v} sx={{ textTransform: 'capitalize' }}>{v}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1.5}>
            <TextField select size="small" label="Quality" value={quality} onChange={(e) => setQuality(e.target.value as VideoQuality)} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
              {VIDEO_QUALITIES.map((q) => (
                <MenuItem key={q.value} value={q.value}>{q.label}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Style" value={style} onChange={(e) => setStyle(e.target.value as VideoStyle)} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
              {VIDEO_STYLES.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField select size="small" label="Visuals" value={visuals} onChange={(e) => setVisuals(e.target.value as VideoVisuals)} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
            {VIDEO_VISUALS.map((v) => (
              <MenuItem key={v.value} value={v.value}>{v.label} — {v.hint}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" label="Delivery style (optional)" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. warm and inspiring, energetic, calm" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
          <Button
            variant="contained"
            onClick={generate}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <MovieCreationOutlinedIcon />}
            sx={{ background: busy ? undefined : BRAND.gradient, fontWeight: 800, borderRadius: '12px', textTransform: 'none', py: 1, '&:hover': { background: busy ? undefined : `linear-gradient(135deg,${BRAND.amberDeep},${BRAND.tealDeep})` } }}
          >
            {busy ? 'Rendering video…' : 'Turn script into video (AI powered)'}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {busy
              ? 'Synthesizing voiceover, pulling stock footage and burning captions — this can take a minute.'
              : `Narrates your script verbatim · ~${estSeconds}s of voiceover.`}
          </Typography>
          {error && <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}><CircularProgress size={22} /></Box>
          ) : videos.length > 0 ? (
            <Stack spacing={1.5} sx={{ mt: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK_STUDIO, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rendered videos</Typography>
              {videos.map((v) => <VideoCard key={v.id} video={v} onDelete={() => remove(v)} onRegenerate={async () => {
                try {
                  const updated = await Videos.regenerate(v.id, {});
                  setVideos((prev) => prev.map((x) => x.id === v.id ? updated : x));
                } catch { /* ignore */ }
              }} />)}
            </Stack>
          ) : null}
        </Stack>
      )}
    </EditorSection>
  );
}

function LibraryCard({ item, onOpen, onDelete, onRepurpose }: { item: ContentItem; onOpen: () => void; onDelete: () => void; onRepurpose?: () => void }) {
  const urls = assetUrls(item);
  const thumb = urls[0];
  const kind = deckKind(item);
  const count = urls.length;
  return (
    <Box
      onClick={onOpen}
      sx={{
        borderRadius: '18px',
        overflow: 'hidden',
        cursor: 'pointer',
        bgcolor: '#fff',
        border: '1px solid rgba(15,17,22,0.08)',
        boxShadow: '0 1px 2px rgba(15,17,22,0.04)',
        transition: TRANSITION,
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 34px rgba(15,17,22,0.12)', borderColor: 'rgba(15,17,22,0.14)' },
        '&:hover .lib-del': { opacity: 1 },
      }}
    >
      <Box sx={{ position: 'relative', aspectRatio: '4 / 3', bgcolor: '#0E1116', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        {thumb ? (
          <Box component="img" src={thumb} alt={item.title || ''} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', p: 2 }}>
            <TextFieldsIcon sx={{ fontSize: 24, mb: 0.5 }} />
            <Typography sx={{ fontSize: 11, px: 1, lineHeight: 1.4, opacity: 0.85, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {item.body?.slice(0, 70)}
            </Typography>
          </Box>
        )}
        <Box sx={{ position: 'absolute', top: 8, left: 8, px: 0.9, py: 0.3, borderRadius: 99, bgcolor: 'rgba(14,17,22,0.7)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
          {KIND_LABEL[kind]}{count > 1 ? ` · ${count}` : ''}
        </Box>
        {onRepurpose && (
          <IconButton
            className="lib-del"
            size="small"
            onClick={(e) => { e.stopPropagation(); onRepurpose(); }}
            sx={{ position: 'absolute', top: 6, right: 38, width: 28, height: 28, bgcolor: 'rgba(14,17,22,0.62)', color: '#fff', opacity: { xs: 1, lg: 0 }, transition: 'opacity .14s', '&:hover': { bgcolor: BRAND.tealDeep } }}
            aria-label="repurpose"
          >
            <ShareOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
        <IconButton
          className="lib-del"
          size="small"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          sx={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, bgcolor: 'rgba(14,17,22,0.62)', color: '#fff', opacity: { xs: 1, lg: 0 }, transition: 'opacity .14s', '&:hover': { bgcolor: BRAND.pink } }}
          aria-label="delete"
        >
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK_STUDIO, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 36 }}>
          {item.title || item.body?.slice(0, 50) || 'Untitled'}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.4 }}>
          {item.platform && <Chip size="small" label={PLATFORM_META[item.platform]?.label ?? item.platform} sx={{ height: 19, fontSize: 10, bgcolor: '#EEF6F2', color: BRAND.tealDeep, fontWeight: 700 }} />}
          <Chip size="small" label={(item.status || 'draft')} sx={{ height: 19, fontSize: 10, bgcolor: '#F0F2F4', color: 'text.secondary', fontWeight: 600, textTransform: 'capitalize' }} />
        </Stack>
      </Box>
    </Box>
  );
}

/* ============================ studio editor ============================ */

const KIND_LABEL: Record<string, string> = {
  carousel: 'Carousel',
  pdf: 'PDF Playbook',
  article: 'Article',
  newsletter: 'Newsletter',
  image: 'Image Post',
  text: 'Text Post',
};

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: '#FFF6E0', fg: '#9A6B00', label: 'Draft' },
  ready: { bg: '#E6F7F0', fg: '#0FA874', label: 'Ready' },
  generating: { bg: '#EEF0F3', fg: '#5A6472', label: 'Generating' },
  published: { bg: '#E8F0FE', fg: '#1A56DB', label: 'Published' },
  scheduled: { bg: '#F3E8FF', fg: '#7E22CE', label: 'Scheduled' },
  failed: { bg: '#FDE8E8', fg: '#C0392B', label: 'Failed' },
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'draft').toLowerCase();
  const c = STATUS_STYLE[s] || STATUS_STYLE.draft;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.1,
        height: 24,
        borderRadius: 99,
        bgcolor: c.bg,
        color: c.fg,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}
    >
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.fg }} />
      {c.label}
    </Box>
  );
}

function EditorSection({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
        <Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: INK_STUDIO, letterSpacing: '-0.01em' }}>{title}</Typography>
          {subtitle && <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.1 }}>{subtitle}</Typography>}
        </Box>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

function MiniCalendar({ selected, onSelect }: { selected: number | null; onSelect: (d: number) => void }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return (
    <Box sx={{ border: '1px solid rgba(15,17,22,0.08)', borderRadius: '14px', p: 1.5, bgcolor: '#fff' }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: INK_STUDIO, mb: 1, textAlign: 'center' }}>{monthLabel}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0.5 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Typography key={i} sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textAlign: 'center', py: 0.25 }}>{d}</Typography>
        ))}
        {cells.map((c, i) => {
          if (c === null) return <Box key={`e${i}`} />;
          const isToday = c === today;
          const isSel = c === selected;
          return (
            <Box
              key={c}
              role="button"
              onClick={() => onSelect(c)}
              sx={{
                aspectRatio: '1 / 1',
                display: 'grid',
                placeItems: 'center',
                fontSize: 11.5,
                fontWeight: isSel || isToday ? 800 : 600,
                borderRadius: '9px',
                cursor: 'pointer',
                color: isSel ? '#fff' : isToday ? BRAND.amberDeep : INK_STUDIO,
                bgcolor: isSel ? INK_STUDIO : 'transparent',
                border: isToday && !isSel ? `1.5px solid ${BRAND.amber}` : '1.5px solid transparent',
                transition: TRANSITION,
                '&:hover': { bgcolor: isSel ? INK_STUDIO : '#F3F5F7' },
              }}
            >
              {c}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: 13.5, fontWeight: 600, color: INK_STUDIO, mt: 0.25, wordBreak: 'break-word' }}>{value}</Typography>
    </Box>
  );
}

type EditorTab = 'details' | 'design' | 'export' | 'brief' | 'history' | 'collab';

function StudioEditor({
  item,
  onBack,
  onCopy,
  onRefresh,
  onDelete,
  onFanOut,
}: {
  item: ContentItem;
  onBack: () => void;
  onCopy: (text: string) => void;
  onRefresh: (updated: ContentItem) => void;
  onDelete: () => void;
  onFanOut?: () => void;
}) {
  const [brand, setBrand] = useState<BrandType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imgStyle, setImgStyle] = useState<string>(IMAGE_STYLES[0].id);
  const [imgModel, setImgModel] = useState<string>(IMAGE_MODELS[0].id);
  const [emailFormat, setEmailFormat] = useState<string>(item.email_format || 'html');
  const [emailView, setEmailView] = useState<'rendered' | 'source'>('rendered');
  const [activeIdx, setActiveIdx] = useState(0);

  const [tab, setTab] = useState<EditorTab>('details');
  const [title, setTitle] = useState(item.title || '');
  const [slug, setSlug] = useState(() => {
    const ms = (item.meta as Record<string, unknown> | null)?.slug;
    return typeof ms === 'string' ? ms : slugify(item.title || '');
  });
  const [desc, setDesc] = useState(item.body || '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [exclusive, setExclusive] = useState(!!((item.meta as Record<string, unknown> | null)?.exclusive));
  const [allowLikes, setAllowLikes] = useState(((item.meta as Record<string, unknown> | null)?.allow_likes) !== false);
  const [scheduleOn, setScheduleOn] = useState(item.status === 'scheduled' || !!((item.meta as Record<string, unknown> | null)?.scheduled_at));
  const [scheduleDay, setScheduleDay] = useState<number | null>(() => {
    const sa = (item.meta as Record<string, unknown> | null)?.scheduled_at;
    return typeof sa === 'string' ? new Date(sa).getDate() : new Date().getDate();
  });
  const [scheduleTime, setScheduleTime] = useState<string>(() => {
    const sa = (item.meta as Record<string, unknown> | null)?.scheduled_at;
    if (typeof sa === 'string') {
      const d = new Date(sa);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '09:00';
  });

  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [provider] = useState<string>(AI_MODELS[0].id);

  const [instruction, setInstruction] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    Brand.get().then(setBrand).catch(() => setBrand(null));
  }, []);

  useEffect(() => {
    setTitle(item.title || '');
    const meta = (item.meta || {}) as Record<string, unknown>;
    setSlug(typeof meta.slug === 'string' ? meta.slug : slugify(item.title || ''));
    setDesc(item.body || '');
    setEmailFormat(item.email_format || 'html');
    setActiveIdx(0);
    setSavedAt(null);
    setExclusive(!!meta.exclusive);
    setAllowLikes(meta.allow_likes !== false);
    setScheduleOn(item.status === 'scheduled' || !!meta.scheduled_at);
    if (typeof meta.scheduled_at === 'string') {
      const d = new Date(meta.scheduled_at);
      setScheduleDay(d.getDate());
      setScheduleTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
  }, [item.id, item.email_format, item.title, item.body, item.meta, item.status]);

  const urls = assetUrls(item);
  const kind = deckKind(item);
  const portrait = kind === 'pdf';
  const isNewsletter = kind === 'newsletter';
  const emailHtml = item.email_html || null;
  const showEmailFrame = isNewsletter && !!emailHtml;
  const hasImages = urls.length > 0;
  const safeIdx = Math.max(0, Math.min(activeIdx, Math.max(0, urls.length - 1)));
  const selectedUrl = urls[safeIdx];
  const selectedImgId = selectedUrl ? imageIdFromUrl(selectedUrl) : null;
  const accent = brand?.primary_color || BRAND.amberDeep;

  const rebuildFormat =
    kind === 'carousel' ? 'carousel'
    : kind === 'pdf' ? 'pdf'
    : kind === 'article' ? 'article'
    : kind === 'newsletter' ? 'newsletter'
    : 'single';

  const go = (d: number) => urls.length && setActiveIdx((safeIdx + d + urls.length) % urls.length);

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

  const save = async () => {
    setSaving(true);
    try {
      const now = new Date();
      let scheduledAt: string | null = null;
      if (scheduleOn && scheduleDay) {
        const d = new Date(now.getFullYear(), now.getMonth(), scheduleDay);
        const [hh, mm] = scheduleTime.split(':');
        d.setHours(Number(hh) || 9, Number(mm) || 0, 0, 0);
        scheduledAt = d.toISOString();
      }
      const nextStatus = scheduleOn && scheduledAt ? 'scheduled' : undefined;
      const mergedMeta = {
        ...(item.meta || {}),
        slug,
        exclusive,
        allow_likes: allowLikes,
        scheduled_at: scheduledAt,
        visibility: exclusive ? 'exclusive' : 'public',
      };
      const updated = await Content.update(item.id, {
        title,
        body: desc,
        meta: mergedMeta,
        ...(nextStatus ? { status: nextStatus } : {}),
      });
      onRefresh(updated);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const next = item.status === 'published' ? 'draft' : 'published';
      const updated = await Content.update(item.id, { status: next });
      onRefresh(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update status');
    } finally {
      setPublishing(false);
    }
  };

  const downloadPdf = () => {
    if (urls.length && (kind === 'carousel' || kind === 'pdf')) printDeck(item, urls, portrait);
    else printAsPdf(item, brand);
  };

  const share = () => {
    onCopy(itemToMarkdown(item));
    setSavedAt(Date.now());
  };

  const dirty = title !== (item.title || '') || desc !== (item.body || '') || slug !== (typeof (item.meta as Record<string, unknown> | null)?.slug === 'string' ? (item.meta as Record<string, unknown>).slug : slugify(item.title || ''));

  // ----- metadata derivations -----
  const m = (item.meta || {}) as Record<string, unknown>;
  const mstr = (k: string): string | null => {
    const v = m[k];
    return typeof v === 'string' && v.trim() ? v : null;
  };
  const topics: string[] = Array.isArray(m.topics) ? (m.topics as unknown[]).map(String) : [];
  const audience = mstr('audience') || mstr('target_audience') || 'General audience';
  const tone = mstr('tone') || 'Professional';
  const funnel = mstr('funnel_stage') || mstr('funnel') || 'Awareness';
  const wordCount = (item.body || '').trim().split(/\s+/).filter(Boolean).length;
  const lengthLabel = urls.length > 1 ? `${urls.length} ${kind === 'pdf' ? 'pages' : 'slides'}` : `${wordCount} words`;
  const dateLabel = new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const creatorName = (typeof (brand?.profile as Record<string, unknown>)?.name === 'string' ? String((brand?.profile as Record<string, unknown>).name) : null) || 'Trayarunya Studio';
  const keywords: string[] = Array.isArray(brand?.keywords) ? (brand!.keywords as unknown[]).slice(0, 8).map(String) : topics;

  const cardSx = {
    bgcolor: '#fff',
    border: '1px solid rgba(15,17,22,0.07)',
    borderRadius: '20px',
    boxShadow: '0 1px 2px rgba(15,17,22,0.04), 0 10px 30px rgba(15,17,22,0.05)',
  } as const;

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'brief', label: 'Brief' },
    { id: 'design', label: 'Design' },
    { id: 'export', label: 'Export' },
    { id: 'collab', label: 'Collaborate' },
    { id: 'history', label: 'History' },
  ];

  // ----- preview hero by kind -----
  let hero: React.ReactNode;
  if (showEmailFrame) {
    hero = (
      <Box sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15,17,22,0.08)', bgcolor: '#fff' }}>
        <Stack direction="row" alignItems="center" sx={{ px: 1.5, height: 38, bgcolor: '#F3F5F7', borderBottom: '1px solid rgba(15,17,22,0.06)' }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c, mr: 0.6 }} />
          ))}
          <Box sx={{ flex: 1 }} />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={emailView}
            onChange={(_, v) => v && setEmailView(v)}
            sx={{ '& .MuiToggleButton-root': { px: 1.2, py: 0.2, textTransform: 'none', fontSize: 11.5, fontWeight: 700, border: '1px solid rgba(15,17,22,0.12)', borderRadius: '8px !important' }, '& .Mui-selected': { bgcolor: `${INK_STUDIO} !important`, color: '#fff !important' } }}
          >
            <ToggleButton value="rendered">Preview</ToggleButton>
            <ToggleButton value="source">HTML</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {emailView === 'rendered' ? (
          <Box component="iframe" title="email preview" srcDoc={emailHtml || ''} sandbox="" sx={{ width: '100%', height: 560, border: 0, display: 'block', bgcolor: '#f4f4f5' }} />
        ) : (
          <Box component="pre" sx={{ m: 0, p: 2, maxHeight: 560, overflow: 'auto', fontSize: 11.5, color: '#3A4250', whiteSpace: 'pre-wrap', wordBreak: 'break-word', bgcolor: '#FAFBFC' }}>{emailHtml}</Box>
        )}
      </Box>
    );
  } else if (hasImages) {
    hero = (
      <Box>
        <Box sx={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', bgcolor: '#0E1116', display: 'grid', placeItems: 'center', minHeight: 280 }}>
          <Box component="img" src={selectedUrl} alt={item.title || 'graphic'} sx={{ width: '100%', maxHeight: 520, objectFit: 'contain', display: 'block' }} />
          {urls.length > 1 && (
            <>
              <IconButton onClick={() => go(-1)} sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' }, width: 34, height: 34 }}><ChevronLeftIcon /></IconButton>
              <IconButton onClick={() => go(1)} sx={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' }, width: 34, height: 34 }}><ChevronRightIcon /></IconButton>
              <Box sx={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', px: 1.4, py: 0.4, borderRadius: 99, bgcolor: 'rgba(14,17,22,0.78)', color: '#fff', fontSize: 11.5, fontWeight: 700 }}>{safeIdx + 1} / {urls.length}</Box>
            </>
          )}
        </Box>
        {urls.length > 1 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1.25, overflowX: 'auto', pb: 0.5 }}>
            {urls.map((u, i) => (
              <Box key={u} component="img" src={u} onClick={() => setActiveIdx(i)} alt={`thumb ${i + 1}`}
                sx={{ height: portrait ? 64 : 54, width: portrait ? 50 : 54, objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', flexShrink: 0, border: '2px solid', borderColor: i === safeIdx ? accent : 'transparent', opacity: i === safeIdx ? 1 : 0.55, transition: TRANSITION, '&:hover': { opacity: 1 } }} />
            ))}
          </Stack>
        )}
      </Box>
    );
  } else {
    hero = (
      <Box sx={{ borderRadius: '16px', border: '1px solid rgba(15,17,22,0.08)', bgcolor: '#fff', p: { xs: 2.5, md: 3.5 }, maxHeight: 560, overflow: 'auto' }}>
        <Box
          sx={{
            '& h1': { fontSize: 22, fontWeight: 800, mt: 1.5 },
            '& h2': { fontSize: 18, fontWeight: 700, mt: 2.5, color: accent },
            '& h3': { fontSize: 15, fontWeight: 700, mt: 2 },
            '& p': { my: 1, lineHeight: 1.75, fontSize: 14.5 },
            '& ul': { pl: 3, my: 1 },
            '& li': { mb: 0.5, fontSize: 14.5 },
            '& hr': { border: 0, borderTop: '1px solid', borderColor: 'divider', my: 2 },
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(item.body) }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 520 }}>
      {/* top bar */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <IconButton onClick={onBack} sx={{ width: 38, height: 38, borderRadius: '12px', border: '1px solid rgba(15,17,22,0.1)', bgcolor: '#fff', '&:hover': { bgcolor: '#F3F5F7' } }} aria-label="back">
          <ArrowBackIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 16, fontWeight: 800, color: INK_STUDIO, letterSpacing: '-0.01em', maxWidth: { xs: 180, sm: 360 } }}>{title || 'Untitled'}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.3 }}>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{KIND_LABEL[kind]}{item.platform ? ` · ${item.platform}` : ''}</Typography>
            <StatusBadge status={item.status} />
          </Stack>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button onClick={share} startIcon={<ShareOutlinedIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none', fontWeight: 700, color: INK_STUDIO, borderRadius: '12px', px: 1.5, '&:hover': { bgcolor: '#F3F5F7' } }}>Share</Button>
        <Button onClick={() => setTab('export')} startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />} variant="outlined" sx={{ textTransform: 'none', fontWeight: 700, color: INK_STUDIO, borderColor: 'rgba(15,17,22,0.14)', borderRadius: '12px', px: 1.75, '&:hover': { borderColor: INK_STUDIO, bgcolor: '#F3F5F7' } }}>Export</Button>
        <Button
          onClick={togglePublish}
          disabled={publishing}
          startIcon={publishing ? <CircularProgress size={15} color="inherit" /> : <RocketLaunchIcon sx={{ fontSize: 16 }} />}
          variant="contained"
          sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '12px', px: 2, bgcolor: INK_STUDIO, '&:hover': { bgcolor: '#000' } }}
        >
          {item.status === 'published' ? 'Unpublish' : 'Publish'}
        </Button>
        <IconButton onClick={(e) => setMenuEl(e.currentTarget)} sx={{ width: 38, height: 38, borderRadius: '12px', border: '1px solid rgba(15,17,22,0.1)', bgcolor: '#fff', '&:hover': { bgcolor: '#F3F5F7' } }} aria-label="more">
          <MoreHorizIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Menu anchorEl={menuEl} open={!!menuEl} onClose={() => setMenuEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <MenuItem onClick={() => { setMenuEl(null); downloadPdf(); }}>
            <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>Download as PDF
          </MenuItem>
          {hasImages && (
            <MenuItem onClick={() => { setMenuEl(null); downloadImage(selectedUrl, `${slugify(item.title || 'graphic')}-${safeIdx + 1}.png`); }}>
              <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>Download current image
            </MenuItem>
          )}
          {showEmailFrame && (
            <MenuItem onClick={() => { setMenuEl(null); downloadHtml(`${slugify(item.title || 'newsletter')}.html`, emailHtml!); }}>
              <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>Download .html email
            </MenuItem>
          )}
          <MenuItem onClick={() => { setMenuEl(null); downloadText(`${slugify(item.title || 'content')}.md`, itemToMarkdown(item)); }}>
            <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>Download .md (copy)
          </MenuItem>
          <Divider />
          <MenuItem onClick={async () => {
            setMenuEl(null);
            try {
              const updated = await Content.update(item.id, { status: 'in_review' });
              onRefresh(updated);
            } catch { /* ignore */ }
          }}>
            <ListItemIcon><SendIcon fontSize="small" /></ListItemIcon>Submit for review
          </MenuItem>
          {item.status === 'approved' && (
            <MenuItem onClick={async () => {
              setMenuEl(null);
              try {
                const updated = await Content.unapprove(item.id);
                onRefresh(updated);
              } catch { /* ignore */ }
            }}>
              <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>Unapprove / Reopen
            </MenuItem>
          )}
          {onFanOut && (
            <MenuItem onClick={() => { setMenuEl(null); onFanOut(); }}>
              <ListItemIcon><AutoAwesomeIcon fontSize="small" /></ListItemIcon>Fan out to channels
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={() => { setMenuEl(null); onDelete(); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>Delete content
          </MenuItem>
        </Menu>
      </Stack>

      {/* two-pane body */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: 'minmax(360px, 430px) minmax(0, 1fr)' }, overflow: { lg: 'hidden' } }}>
        {/* LEFT — form card */}
        <Box sx={{ ...cardSx, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', gap: 0.5, p: 1, borderBottom: '1px solid rgba(15,17,22,0.06)' }}>
            {tabs.map((t) => (
              <Box key={t.id} role="button" onClick={() => setTab(t.id)}
                sx={{ flex: 1, py: 0.9, textAlign: 'center', borderRadius: '11px', cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                  color: tab === t.id ? '#fff' : 'text.secondary', bgcolor: tab === t.id ? INK_STUDIO : 'transparent', transition: TRANSITION,
                  '&:hover': { bgcolor: tab === t.id ? INK_STUDIO : '#F3F5F7' } }}>
                {t.label}
              </Box>
            ))}
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {tab === 'details' && (
              <Stack spacing={3}>
                <EditorSection
                  title="Basic Information"
                  action={<Chip size="small" icon={<AutoAwesomeIcon sx={{ fontSize: 13, color: '#fff !important' }} />} label="AI Generated" sx={{ height: 24, fontSize: 10.5, fontWeight: 700, color: '#fff', background: BRAND.gradient, '& .MuiChip-label': { px: 0.75 } }} />}
                >
                  <Stack spacing={1.75}>
                    <Box>
                      <TextField label="Title" size="small" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 120 }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', textAlign: 'right', mt: 0.4 }}>{title.length}/120</Typography>
                    </Box>
                    <TextField label="Slug" size="small" fullWidth value={slug} onChange={(e) => setSlug(slugify(e.target.value))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                    <Box>
                      <RichTextEditor
                        value={desc}
                        onChange={setDesc}
                        onInlineAI={async (text, command) => {
                          const res = await ContentOptimize.inlineAI({ text, command, provider });
                          return res.result;
                        }}
                        placeholder="Write your content body here…"
                        minHeight={160}
                      />
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', textAlign: 'right', mt: 0.4 }}>{desc.trim().split(/\s+/).filter(Boolean).length} words</Typography>
                    </Box>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Button onClick={save} disabled={saving || !dirty} variant="contained" startIcon={saving ? <CircularProgress size={15} color="inherit" /> : undefined}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', bgcolor: INK_STUDIO, '&:hover': { bgcolor: '#000' } }}>
                        {saving ? 'Saving…' : 'Save changes'}
                      </Button>
                      {savedAt && !dirty && (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: BRAND.tealDeep }}>
                          <CheckCircleIcon sx={{ fontSize: 16 }} />
                          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Saved</Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                </EditorSection>

                {hasImages && (
                  <EditorSection title="Thumbnail">
                    <Box component="img" src={urls[0]} alt="thumbnail" sx={{ width: '100%', borderRadius: '14px', border: '1px solid rgba(15,17,22,0.08)', display: 'block' }} />
                  </EditorSection>
                )}

                <EditorSection title="Visibility">
                  <Stack spacing={0.5}>
                    {([['Exclusive content', exclusive, setExclusive], ['Allow likes & reactions', allowLikes, setAllowLikes], ['Schedule publication', scheduleOn, setScheduleOn]] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
                      <Stack key={label} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.4 }}>
                        <Typography sx={{ fontSize: 13.5, color: INK_STUDIO }}>{label}</Typography>
                        <Switch checked={val} onChange={(e) => set(e.target.checked)} size="small" sx={{ '& .Mui-checked': { color: BRAND.tealDeep }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: `${BRAND.teal} !important` } }} />
                      </Stack>
                    ))}
                  </Stack>
                  {scheduleOn && (
                    <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                      <MiniCalendar selected={scheduleDay} onSelect={setScheduleDay} />
                      <TextField label="Time" type="time" size="small" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                    </Stack>
                  )}
                </EditorSection>

                <EditorSection title="Creators">
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip avatar={<Avatar sx={{ bgcolor: INK_STUDIO, color: '#fff !important', fontSize: 12 }}>{creatorName.charAt(0)}</Avatar>} label={creatorName} sx={{ borderRadius: '999px', fontWeight: 600 }} />
                  </Stack>
                </EditorSection>
              </Stack>
            )}

            {tab === 'design' && (
              <Stack spacing={3}>
                <ScriptToVideo item={item} />

                <EditorSection title="Graphics" subtitle="Brand-aware images, carousels & email">
                  <Stack spacing={1.5}>
                    <TextField select size="small" label="Style" value={imgStyle} onChange={(e) => setImgStyle(e.target.value)} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                      {IMAGE_STYLES.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Image model" value={imgModel} onChange={(e) => setImgModel(e.target.value)} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                      {IMAGE_MODELS.map((mm) => <MenuItem key={mm.id} value={mm.id}>{mm.label}</MenuItem>)}
                    </TextField>
                    {isNewsletter && (
                      <TextField select size="small" label="Email format" value={emailFormat} onChange={(e) => setEmailFormat(e.target.value)} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                        <MenuItem value="html">Branded HTML</MenuItem>
                        <MenuItem value="normal">Plain / markdown</MenuItem>
                      </TextField>
                    )}
                    <Button variant="contained" onClick={rebuild} disabled={busy}
                      startIcon={busy ? <CircularProgress size={16} color="inherit" /> : hasImages ? <RefreshIcon /> : <AddPhotoAlternateIcon />}
                      sx={{ background: busy ? undefined : BRAND.gradient, fontWeight: 700, borderRadius: '12px', textTransform: 'none', '&:hover': { background: busy ? undefined : `linear-gradient(135deg,${BRAND.amberDeep},${BRAND.tealDeep})` } }}>
                      {busy ? 'Rendering…' : hasImages ? 'Regenerate graphics' : 'Add graphics'}
                    </Button>
                    {busy && <Typography variant="caption" color="text.secondary">Rendering brand-aware graphics — a full carousel can take a minute.</Typography>}
                  </Stack>
                  {isNewsletter && !emailHtml && emailFormat === 'html' && (
                    <Alert severity="info" sx={{ mt: 1.5 }}>No branded HTML yet. Keep <strong>Branded HTML</strong> selected and regenerate to build a responsive email.</Alert>
                  )}
                </EditorSection>

                {hasImages && (
                  <EditorSection title={urls.length > 1 ? `Edit image — ${safeIdx + 1} / ${urls.length}` : 'Edit image'} subtitle="Regenerates this exact slot, keeping brand colours & logo">
                    <Card variant="outlined" sx={{ overflow: 'hidden', mb: 1.5, borderRadius: '14px' }}>
                      <Box component="img" src={selectedUrl} alt="selected" sx={{ width: '100%', display: 'block' }} />
                    </Card>
                    <Stack spacing={1.25}>
                      <TextField size="small" fullWidth multiline minRows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Describe the change — e.g. 'make the background deep navy and add a laptop on the desk'" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                      <Button variant="contained" onClick={regenImage} disabled={editBusy || !instruction.trim() || !selectedImgId} startIcon={editBusy ? <CircularProgress size={14} color="inherit" /> : <AutoFixHighIcon />}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', bgcolor: INK_STUDIO, '&:hover': { bgcolor: '#000' } }}>
                        {editBusy ? 'Regenerating…' : 'Apply change'}
                      </Button>
                      {editError && <Alert severity="error">{editError}</Alert>}
                    </Stack>
                  </EditorSection>
                )}
              </Stack>
            )}

            {tab === 'export' && (
              <Stack spacing={3}>
                <EditorSection title="Download & export">
                  <Stack spacing={1.25}>
                    {hasImages && (
                      <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadImage(selectedUrl, `${slugify(item.title || 'graphic')}-${safeIdx + 1}.png`)} sx={{ textTransform: 'none', borderRadius: '12px', justifyContent: 'flex-start' }}>Download current image</Button>
                    )}
                    <Button fullWidth variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={downloadPdf} sx={{ textTransform: 'none', borderRadius: '12px', justifyContent: 'flex-start' }}>
                      {urls.length > 1 ? `Download all ${kind === 'pdf' ? 'pages' : 'slides'} as PDF` : 'Download as PDF'}
                    </Button>
                    {showEmailFrame && (
                      <Button fullWidth variant="outlined" startIcon={<CodeIcon />} onClick={() => downloadHtml(`${slugify(item.title || 'newsletter')}.html`, emailHtml!)} sx={{ textTransform: 'none', borderRadius: '12px', justifyContent: 'flex-start' }}>Download .html email</Button>
                    )}
                    <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadText(`${slugify(item.title || 'content')}.md`, itemToMarkdown(item))} sx={{ textTransform: 'none', borderRadius: '12px', justifyContent: 'flex-start' }}>Download .md (copy)</Button>
                    <Button fullWidth variant="text" startIcon={<ContentCopyIcon />} onClick={() => onCopy(itemToMarkdown(item))} sx={{ textTransform: 'none', borderRadius: '12px', justifyContent: 'flex-start' }}>Copy everything</Button>
                  </Stack>
                </EditorSection>

                {item.variants && Object.keys(item.variants).length > 0 && (
                  <EditorSection title="Caption & variants">
                    <Stack spacing={1.25}>
                      {Object.entries(item.variants).map(([k, text]) => (
                        <Paper key={k} variant="outlined" sx={{ p: 1.75, borderRadius: '14px', border: '1px solid rgba(15,17,22,0.08)' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Chip size="small" label={k} sx={{ bgcolor: BRAND.amberSoft, color: BRAND.amberDeep, fontWeight: 700 }} />
                            <IconButton size="small" onClick={() => onCopy(String(text))} aria-label="copy variant"><ContentCopyIcon fontSize="small" /></IconButton>
                          </Stack>
                          <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1, fontSize: 13 }}>{Array.isArray(text) ? (text as string[]).join(' ') : String(text)}</Typography>
                        </Paper>
                      ))}
                    </Stack>
                  </EditorSection>
                )}
              </Stack>
            )}

            {tab === 'brief' && (
              <ContentBriefPanel item={item} provider={provider} />
            )}

            {tab === 'history' && (
              <Stack spacing={2}>
                <EditorSection title="Version History" subtitle="View and restore previous versions of this content">
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<HistoryIcon />}
                    onClick={() => setVersionDrawerOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px', borderColor: 'rgba(15,17,22,0.15)', color: INK_STUDIO }}
                  >
                    Open Version History
                  </Button>
                </EditorSection>
              </Stack>
            )}

            {tab === 'collab' && (
              <CollabPanel entityType="content" entityId={item.id} />
            )}
          </Box>
        </Box>

        {/* RIGHT — live preview */}
        <Box sx={{ ...cardSx, minHeight: 0, overflowY: { lg: 'auto' }, p: { xs: 2.5, md: 3.5 } }}>
          {hero}

          <Typography sx={{ fontSize: 24, fontWeight: 800, color: INK_STUDIO, letterSpacing: '-0.02em', mt: 3 }}>{title || 'Untitled'}</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Avatar sx={{ width: 26, height: 26, bgcolor: INK_STUDIO, fontSize: 12 }}>{creatorName.charAt(0)}</Avatar>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: INK_STUDIO }}>{creatorName}</Typography>
            </Stack>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled' }} />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{dateLabel}</Typography>
          </Stack>

          {(topics.length > 0 || item.platform) && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              {item.platform && <Chip size="small" label={item.platform} sx={{ bgcolor: '#EEF6F2', color: BRAND.tealDeep, fontWeight: 700 }} />}
              {topics.slice(0, 5).map((t) => <Chip key={t} size="small" label={t} variant="outlined" sx={{ borderColor: 'rgba(15,17,22,0.14)' }} />)}
            </Stack>
          )}

          {desc && (
            <Typography sx={{ mt: 2.5, fontSize: 14.5, lineHeight: 1.8, color: '#3A4250', whiteSpace: kind === 'text' || kind === 'image' ? 'pre-wrap' : 'normal' }}>
              {desc.length > 600 ? `${desc.slice(0, 600)}…` : desc}
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3,1fr)' }, gap: 2.5 }}>
            <MetaCell label="Format" value={KIND_LABEL[kind]} />
            <MetaCell label="Audience" value={audience} />
            <MetaCell label="Tone" value={tone} />
            <MetaCell label="Funnel" value={funnel} />
            <MetaCell label="Length" value={lengthLabel} />
            <MetaCell label="Status" value={<StatusBadge status={item.status} />} />
          </Box>

          {keywords.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>Keywords</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {keywords.map((k) => <Chip key={k} size="small" label={k} variant="outlined" sx={{ borderColor: 'rgba(15,17,22,0.12)', fontSize: 11.5 }} />)}
              </Stack>
            </>
          )}
        </Box>
      </Box>
      <VersionHistoryDrawer
        open={versionDrawerOpen}
        onClose={() => setVersionDrawerOpen(false)}
        item={item}
        onRestore={(updated) => { onRefresh(updated); setDesc(updated.body || ''); setTitle(updated.title || ''); }}
      />
    </Box>
  );
}

/* ============================ page ============================ */

function StudioContent() {
  const searchParams = useSearchParams();
  const itemId = searchParams.get('item');
  const initialMode = searchParams.get('mode') === 'calendar' ? 'calendar' : 'prompt';
  const initialCalId = searchParams.get('cal') || undefined;
  const initialDate = searchParams.get('date') || undefined;
  const { activeWorkspace } = useAuth();
  const confirm = useConfirm();

  const { models: aiModels } = useAIModels();
  const [provider, setProvider] = useState<string>(AI_MODELS[0].id);
  const [preview, setPreview] = useState<ContentItem | null>(null);
  const [list, setList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [serpOpen, setSerpOpen] = useState(false);
  const [repurposeOpen, setRepurposeOpen] = useState(false);
  const [repurposeItem, setRepurposeItem] = useState<ContentItem | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [fanOutOpen, setFanOutOpen] = useState(false);
  const [fanOutItem, setFanOutItem] = useState<ContentItem | null>(null);

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

  if (preview) {
    return (
      <StudioEditor
        item={preview}
        onBack={() => setPreview(null)}
        onCopy={copy}
        onRefresh={onRefresh}
        onDelete={() => remove(preview)}
        onFanOut={() => { setFanOutItem(preview); setFanOutOpen(true); }}
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      {/* header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>Content Studio</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            A real editor for your brand — generate, preview, fine-tune images, and export.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Button
            size="small"
            onClick={() => setSerpOpen(true)}
            sx={{
              borderRadius: '999px', textTransform: 'none', fontWeight: 700, px: 2, py: 0.7,
              color: BRAND.tealDeep, background: BRAND.tealSoft,
              '&:hover': { background: '#cdf5e5' },
            }}
          >
            SERP Editor
          </Button>
          <Button
            size="small"
            onClick={() => setTemplatesOpen(true)}
            sx={{
              borderRadius: '999px', textTransform: 'none', fontWeight: 700, px: 2, py: 0.7,
              color: BRAND.amberDeep, background: BRAND.amberSoft,
              '&:hover': { background: '#ffecb3' },
            }}
          >
            Templates
          </Button>
          <Button
            size="small"
            onClick={() => setReviewQueueOpen(true)}
            startIcon={<AssignmentIcon sx={{ fontSize: 15 }} />}
            sx={{
              borderRadius: '999px', textTransform: 'none', fontWeight: 700, px: 2, py: 0.7,
              color: '#7C3AED', background: '#F3E8FF',
              '&:hover': { background: '#E9D5FF' },
            }}
          >
            Review Queue
          </Button>
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
            {aiModels.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>

      <CreateStudio
        provider={provider}
        list={list}
        loading={loading}
        initialMode={initialMode}
        initialCalId={initialCalId}
        initialDate={initialDate}
        onPreview={(item) => setPreview(item)}
        onCreated={onCreated}
        onDelete={remove}
        onRepurpose={(item) => { setRepurposeItem(item); setRepurposeOpen(true); setFanOutItem(item); }}
      />

      {/* Enterprise dialogs */}
      <SerpEditor
        open={serpOpen}
        onClose={() => setSerpOpen(false)}
        initialText=""
        initialKeyword=""
        provider={provider}
        onSave={(text) => {
          Content.createDraft({ title: 'SEO draft', body: text })
            .then((created) => {
              setList((cur) => [created, ...cur]);
              setSerpOpen(false);
            })
            .catch(() => {});
        }}
      />
      <RepurposeDialog
        open={repurposeOpen}
        onClose={() => { setRepurposeOpen(false); setRepurposeItem(null); }}
        item={repurposeItem}
        provider={provider}
        onSaved={refresh}
      />
      <TemplatesDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        provider={provider}
        onGenerated={() => refresh()}
      />
      <ReviewQueuePanel
        open={reviewQueueOpen}
        onClose={() => setReviewQueueOpen(false)}
        onOpenItem={(item) => { setPreview(item); setReviewQueueOpen(false); }}
      />
      <FanOutDialog
        open={fanOutOpen}
        onClose={() => { setFanOutOpen(false); setFanOutItem(null); }}
        item={fanOutItem}
        provider={provider}
        onCreated={(items) => { setList((cur) => [...items, ...cur]); }}
      />
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
