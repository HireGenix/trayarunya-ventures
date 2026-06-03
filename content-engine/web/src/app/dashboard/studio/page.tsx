'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ImageIcon from '@mui/icons-material/Image';
import { useAuth } from '@/lib/auth';
import {
  Content,
  Calendar,
  Images,
  Brand,
  imageUrl,
  assetUrl,
  AI_MODELS,
  IMAGE_MODELS,
  IMAGE_STYLES,
  type ContentItem,
  type ContentCalendar,
  type CalendarEntry,
  type ContentImage,
  type Brand as BrandType,
} from '@/lib/api';

const TYPES = [
  { value: 'social_post', label: 'Social post' },
  { value: 'thread', label: 'Thread' },
  { value: 'blog', label: 'Blog article' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'lead_magnet', label: 'Lead magnet' },
  { value: 'ad_copy', label: 'Ad copy' },
];
const PLATFORMS = ['linkedin', 'x', 'instagram', 'facebook', 'youtube', 'tiktok'];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'content';
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

function splitSlides(item: ContentItem): { heading: string; body: string }[] {
  const slides: { heading: string; body: string }[] = [];
  const body = (item.body || '').trim();
  // Split on blank lines or markdown headings into digestible carousel slides.
  const blocks = body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  for (const block of blocks) {
    const lines = block.split('\n');
    let heading = '';
    let rest = block;
    if (/^#{1,6}\s/.test(lines[0]) || (lines.length > 1 && lines[0].length < 70)) {
      heading = lines[0].replace(/^#{1,6}\s/, '').trim();
      rest = lines.slice(1).join('\n').trim();
    }
    slides.push({ heading, body: rest });
  }
  if (slides.length === 0) slides.push({ heading: '', body });
  return slides;
}

// Gamma.app-style branded PDF: a gradient cover + clean content slides, one per page.
function printAsPdf(item: ContentItem, brand?: BrandType | null) {
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) return;
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const primary = brand?.primary_color || '#ffaf06';
  const accent = brand?.accent_color || '#14bb87';
  const logo = brand?.logo_url || '';
  const brandName = (brand?.profile as { name?: string })?.name || '';

  const slides = splitSlides(item);
  const slideHtml = slides
    .map((s, i) => {
      const num = `${i + 1} / ${slides.length}`;
      return `<section class="slide">
        <div class="slide-top">
          <span class="kicker">${esc(item.platform || item.content_type)}</span>
          <span class="page">${num}</span>
        </div>
        ${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}
        <div class="slide-body">${esc(s.body).replace(/\n/g, '<br/>')}</div>
        <div class="slide-foot"><span class="dot"></span>${esc(brandName || 'Trayarunya Ventures')}</div>
      </section>`;
    })
    .join('');

  const variants = item.variants
    ? Object.entries(item.variants)
        .map(([k, v]) => `<div class="variant"><h3>${esc(k)}</h3><pre>${esc(String(v))}</pre></div>`)
        .join('')
    : '';

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(
    item.title || 'Content',
  )}</title><style>
    @page { size: 1080px 1080px; margin: 0; }
    * { box-sizing: border-box; }
    body { font-family: 'Poppins', -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; color: #0E1726; }
    .slide, .cover {
      width: 1080px; height: 1080px; padding: 96px; page-break-after: always;
      display: flex; flex-direction: column; position: relative; overflow: hidden;
    }
    .cover {
      justify-content: center;
      background: linear-gradient(135deg, ${primary} 0%, ${accent} 100%);
      color: #fff;
    }
    .cover .eyebrow { text-transform: uppercase; letter-spacing: 4px; font-weight: 700; opacity: .9; font-size: 22px; }
    .cover h1 { font-size: 78px; line-height: 1.05; font-weight: 800; margin: 24px 0 0; }
    .cover .sub { font-size: 30px; margin-top: 28px; max-width: 80%; opacity: .95; }
    .cover .brandbar { position: absolute; bottom: 80px; left: 96px; display: flex; align-items: center; gap: 16px; font-size: 24px; font-weight: 600; }
    .cover .brandbar img { height: 56px; border-radius: 10px; background: #fff; padding: 6px; }
    .slide { background: #fff; }
    .slide:nth-child(even) { background: #F7F8FA; }
    .slide-top { display: flex; justify-content: space-between; align-items: center; }
    .kicker { text-transform: uppercase; letter-spacing: 3px; font-weight: 700; color: ${primary}; font-size: 22px; }
    .page { color: #98A2B3; font-weight: 600; font-size: 22px; }
    .slide h2 { font-size: 60px; line-height: 1.1; font-weight: 800; margin: 40px 0 28px; }
    .slide-body { font-size: 34px; line-height: 1.5; color: #475467; flex: 1; }
    .slide-foot { display: flex; align-items: center; gap: 14px; font-weight: 700; font-size: 24px; color: #0E1726; }
    .slide-foot .dot { width: 18px; height: 18px; border-radius: 50%; background: ${accent}; display: inline-block; }
    .variants { padding: 80px 96px; }
    .variant h3 { color: ${primary}; text-transform: capitalize; }
    .variant pre { white-space: pre-wrap; font-family: inherit; background: #f6f6fb; padding: 20px; border-radius: 12px; font-size: 24px; }
  </style></head><body>
    <div class="cover">
      <div class="eyebrow">${esc(item.content_type)}${item.platform ? ' · ' + esc(item.platform) : ''}</div>
      <h1>${esc(item.title || 'Untitled')}</h1>
      ${slides[0] ? `<div class="sub">${esc((slides[0].body || '').slice(0, 160))}</div>` : ''}
      <div class="brandbar">${logo ? `<img src="${esc(logo)}" alt=""/>` : ''}${esc(brandName || 'Trayarunya Ventures')}</div>
    </div>
    ${slideHtml}
    ${variants ? `<div class="variants">${variants}</div>` : ''}
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

function ImageStudio({ item }: { item: ContentItem }) {
  const [style, setStyle] = useState<string>(IMAGE_STYLES[0].id);
  const [model, setModel] = useState<string>(IMAGE_MODELS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState<ContentImage | null>(null);

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const img = await Images.generate({
        content_item_id: item.id,
        platform: item.platform || undefined,
        style,
        provider: model,
        use_brand: true,
      });
      setImage(img);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image generation failed');
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!image) return;
    const a = document.createElement('a');
    a.href = imageUrl(image);
    a.download = `${slugify(item.title || 'social-image')}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <ImageIcon fontSize="small" color="primary" />
        <Typography variant="h6">Social graphic</Typography>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          fullWidth
        >
          {IMAGE_STYLES.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Image model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          fullWidth
        >
          {IMAGE_MODELS.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              {m.label}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          onClick={run}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
          sx={{ minWidth: 160, whiteSpace: 'nowrap' }}
        >
          {image ? 'Regenerate' : 'Generate image'}
        </Button>
      </Stack>
      {busy && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Rendering brand-aware graphic… this can take up to a minute.
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {image && (
        <Card variant="outlined">
          <Box
            component="img"
            src={imageUrl(image)}
            alt={item.title || 'Generated social graphic'}
            sx={{ width: '100%', display: 'block', borderRadius: 1 }}
          />
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={image.provider || 'image'} />
                {image.size && <Chip size="small" variant="outlined" label={image.size} />}
              </Stack>
              <Button size="small" startIcon={<DownloadIcon />} onClick={download}>
                Download PNG
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

function ContentPreview({
  item,
  onCopy,
}: {
  item: ContentItem;
  onCopy: (text: string) => void;
}) {
  const [brand, setBrand] = useState<BrandType | null>(null);

  useEffect(() => {
    Brand.get()
      .then(setBrand)
      .catch(() => setBrand(null));
  }, []);

  const postImage = item.image_url ? assetUrl(item.image_url) : null;

  return (
    <Card>
      <CardContent sx={{ p: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 1 }}>
          <Typography variant="h5" fontWeight={800}>
            {item.title || 'Untitled'}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Copy">
              <IconButton onClick={() => onCopy(item.body)} aria-label="copy">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download .md">
              <IconButton
                onClick={() => downloadText(`${slugify(item.title || 'content')}.md`, itemToMarkdown(item))}
                aria-label="download"
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Branded PDF (carousel)">
              <IconButton onClick={() => printAsPdf(item, brand)} aria-label="pdf">
                <PictureAsPdfIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip size="small" label={item.content_type} color="primary" variant="outlined" />
          {item.platform && <Chip size="small" label={item.platform} />}
          <Chip size="small" label={item.status} />
        </Stack>

        {postImage && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              READY-TO-PUBLISH POST
            </Typography>
            <Card variant="outlined">
              <Box
                component="img"
                src={postImage}
                alt={item.title || 'Post graphic'}
                sx={{ width: '100%', display: 'block' }}
              />
            </Card>
          </Box>
        )}

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          CAPTION / COPY
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>{item.body}</Typography>

        {item.variants && Object.keys(item.variants).length > 0 && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Variants
            </Typography>
            <Stack spacing={2}>
              {Object.entries(item.variants).map(([plat, text]) => (
                <Card key={plat} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Chip size="small" label={plat} color="primary" />
                      <IconButton
                        size="small"
                        onClick={() => onCopy(String(text))}
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

        <ImageStudio item={item} />
      </CardContent>
    </Card>
  );
}

/* -------------------- Calendar view -------------------- */

function groupByDate(entries: CalendarEntry[]): [string, CalendarEntry[]][] {
  const map = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.date) || [];
    arr.push(e);
    map.set(e.date, arr);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function CalendarView({
  provider,
  onPreview,
}: {
  provider: string;
  onPreview: (item: ContentItem) => void;
}) {
  const { activeWorkspace } = useAuth();
  const [calendars, setCalendars] = useState<ContentCalendar[]>([]);
  const [active, setActive] = useState<ContentCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyEntry, setBusyEntry] = useState<string | null>(null);
  const [busyDay, setBusyDay] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [withImage, setWithImage] = useState(true);
  const [imageStyle, setImageStyle] = useState<string>(IMAGE_STYLES[0].id);
  const [imageModel, setImageModel] = useState<string>(IMAGE_MODELS[0].id);

  const load = useCallback(() => {
    setLoading(true);
    Calendar.list()
      .then((cals) => {
        setCalendars(cals);
        setActive((cur) => cals.find((c) => c.id === cur?.id) || cals[0] || null);
      })
      .catch(() => setCalendars([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    load();
  }, [activeWorkspace, load]);

  const generateEntry = async (entry: CalendarEntry) => {
    if (!active) return;
    setBusyEntry(entry.id);
    setError('');
    try {
      const updated = await Calendar.generateEntry(active.id, entry.id, {
        provider,
        with_image: withImage,
        image_style: imageStyle,
        image_provider: imageModel,
      });
      setActive(updated);
      setCalendars((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      const fresh = updated.entries.find((e) => e.id === entry.id);
      if (fresh?.content_item_id) {
        const item = await Content.get(fresh.content_item_id);
        onPreview(item);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusyEntry(null);
    }
  };

  const generateDay = async (date: string) => {
    if (!active) return;
    setBusyDay(date);
    setError('');
    try {
      const updated = await Calendar.generateDay(active.id, {
        date,
        provider,
        with_image: withImage,
        image_style: imageStyle,
        image_provider: imageModel,
      });
      setActive(updated);
      setCalendars((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Day generation failed');
    } finally {
      setBusyDay(null);
    }
  };

  const openItem = async (entry: CalendarEntry) => {
    if (!entry.content_item_id) return;
    try {
      const item = await Content.get(entry.content_item_id);
      onPreview(item);
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: string) => {
    await Calendar.remove(id);
    setCalendars((prev) => prev.filter((c) => c.id !== id));
    setActive((cur) => (cur?.id === id ? null : cur));
  };

  if (loading) return <CircularProgress />;

  if (calendars.length === 0) {
    return (
      <Alert severity="info">
        No content calendars yet. Go to the <strong>Strategy</strong> page to generate a
        date-aware monthly calendar, then come back here to create each piece.
      </Alert>
    );
  }

  const grouped = active ? groupByDate(active.entries) : [];
  const generatedCount = active
    ? active.entries.filter((e) => e.status === 'generated').length
    : 0;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {calendars.map((c) => (
          <Chip
            key={c.id}
            label={`${c.client_name || c.title}`}
            onClick={() => setActive(c)}
            onDelete={() => remove(c.id)}
            color={active?.id === c.id ? 'primary' : 'default'}
            variant={active?.id === c.id ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      {active && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {active.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Client: <strong>{active.client_name || '—'}</strong> · {active.start_date} →{' '}
                  {active.end_date}
                </Typography>
              </Box>
              <Chip
                label={`${generatedCount}/${active.entries.length} generated`}
                color={generatedCount === active.entries.length ? 'success' : 'default'}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Card variant="outlined">
        <CardContent sx={{ py: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <FormControlLabel
              control={
                <Switch checked={withImage} onChange={(e) => setWithImage(e.target.checked)} />
              }
              label="Auto branded graphic"
            />
            <TextField
              select
              size="small"
              label="Graphic style"
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value)}
              disabled={!withImage}
              sx={{ minWidth: 170 }}
            >
              {IMAGE_STYLES.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Image model"
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              disabled={!withImage}
              sx={{ minWidth: 170 }}
            >
              {IMAGE_MODELS.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {grouped.map(([date, entries]) => {
          const pending = entries.filter((e) => e.status !== 'generated');
          return (
          <Box key={date}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Typography>
              {pending.length > 0 && (
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  startIcon={
                    busyDay === date ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <AutoAwesomeIcon />
                    )
                  }
                  disabled={busyDay !== null || busyEntry !== null}
                  onClick={() => generateDay(date)}
                >
                  {busyDay === date
                    ? 'Generating all…'
                    : `Generate all (${pending.length})`}
                </Button>
              )}
            </Stack>
            <Stack spacing={1}>
              {entries.map((e) => (
                <Card key={e.id} variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                      <Chip size="small" label={e.platform} color="primary" variant="outlined" />
                      <Chip size="small" label={e.content_type} variant="outlined" />
                      {e.format && (
                        <Chip
                          size="small"
                          label={e.format}
                          color="secondary"
                          variant="outlined"
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 180 }}>
                        <Typography fontWeight={600}>{e.title}</Typography>
                        {e.hook && (
                          <Typography variant="caption" color="text.secondary">
                            {e.hook}
                          </Typography>
                        )}
                      </Box>
                      {e.status === 'generated' ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          {(e.asset_kind === 'image' ||
                            e.asset_kind === 'carousel' ||
                            e.asset_kind === 'pdf' ||
                            e.image_url) && (
                            <Chip
                              size="small"
                              icon={<ImageIcon />}
                              label={
                                e.asset_urls && e.asset_urls.length > 1
                                  ? `${e.asset_urls.length} slides`
                                  : 'graphic'
                              }
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                          <Button size="small" variant="text" onClick={() => openItem(e)}>
                            View
                          </Button>
                        </Stack>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={
                            busyEntry === e.id ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <AutoAwesomeIcon />
                            )
                          }
                          disabled={busyEntry !== null || busyDay !== null}
                          onClick={() => generateEntry(e)}
                        >
                          Generate
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

/* -------------------- Quick create -------------------- */

function QuickCreate({
  provider,
  onPreview,
}: {
  provider: string;
  onPreview: (item: ContentItem) => void;
}) {
  const { activeWorkspace } = useAuth();
  const [list, setList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [contentType, setContentType] = useState('social_post');
  const [platform, setPlatform] = useState('linkedin');
  const [topic, setTopic] = useState('');

  const refresh = useCallback(() => {
    Content.list()
      .then((items) => setList(items))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    refresh();
  }, [activeWorkspace, refresh]);

  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const created = await Content.generate({
        content_type: contentType,
        platform,
        topic: topic.trim(),
        provider,
      });
      setList((prev) => [...created, ...prev]);
      if (created[0]) onPreview(created[0]);
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
  };

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Quick create
          </Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
            </Stack>
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

      <Box>
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
                  <CardActionArea onClick={() => onPreview(c)} sx={{ p: 2 }}>
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
      </Box>
    </Stack>
  );
}

/* -------------------- Page -------------------- */

export default function StudioPage() {
  const [tab, setTab] = useState(0);
  const [provider, setProvider] = useState<string>(AI_MODELS[0].id);
  const [preview, setPreview] = useState<ContentItem | null>(null);

  const copy = useMemo(
    () => (text: string) => {
      navigator.clipboard.writeText(text);
    },
    [],
  );

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                <Tab label="Calendar" />
                <Tab label="Quick create" />
              </Tabs>
              <TextField
                select
                size="small"
                label="AI model"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                sx={{ minWidth: 220 }}
              >
                {AI_MODELS.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        {tab === 0 ? (
          <CalendarView provider={provider} onPreview={setPreview} />
        ) : (
          <QuickCreate provider={provider} onPreview={setPreview} />
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        {preview ? (
          <ContentPreview item={preview} onCopy={copy} />
        ) : (
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>
                Generate or select content to preview, copy, download (.md) or save as PDF.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );
}
