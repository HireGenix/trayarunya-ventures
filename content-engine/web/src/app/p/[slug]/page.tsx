'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Box, Button, Typography, CircularProgress, Container, Stack, TextField, Grid } from '@mui/material';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const BASE = `${API}/api/v1/public`;

function getAnonId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem('_tv_anon');
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem('_tv_anon', id);
  }
  return id;
}

interface BlockProps {
  type: string;
  props: Record<string, unknown>;
  order: number;
}

interface PageData {
  id: string;
  name: string;
  slug: string;
  blocks: BlockProps[];
  seo_title: string | null;
  seo_description: string | null;
  theme: Record<string, unknown>;
  workspace_id: string;
}

interface VariantPayload {
  variant_key: string;
  variant: Record<string, unknown> | null;
  experiment_id: string;
}

/* ---------- Block renderers ---------- */

function HeroBlock({ props }: { props: Record<string, unknown> }) {
  const headline = (props.headline as string) || '';
  const subheadline = (props.subheadline as string) || '';
  const cta_text = (props.cta_text as string) || '';
  const cta_url = (props.cta_url as string) || '#';
  const bg = (props.background as string) || '#0E1116';

  return (
    <Box sx={{ py: { xs: 8, md: 14 }, px: 3, bgcolor: bg, textAlign: 'center' }}>
      <Container maxWidth="md">
        <Typography variant="h2" sx={{ fontWeight: 800, color: '#fff', mb: 2, fontSize: { xs: 28, md: 48 } }}>
          {headline}
        </Typography>
        {subheadline && (
          <Typography sx={{ fontSize: { xs: 16, md: 20 }, color: 'rgba(255,255,255,0.7)', mb: 4 }}>
            {subheadline}
          </Typography>
        )}
        {cta_text && (
          <Button
            href={cta_url}
            variant="contained"
            data-cro="hero_cta"
            sx={{
              bgcolor: '#FFAF06', color: '#0E1116', fontWeight: 700, px: 4, py: 1.5,
              '&:hover': { bgcolor: '#e09e00' }, textTransform: 'none', fontSize: 16,
            }}
          >
            {cta_text}
          </Button>
        )}
      </Container>
    </Box>
  );
}

function TextBlock({ props }: { props: Record<string, unknown> }) {
  const title = (props.title as string) || '';
  const body = (props.body as string) || '';
  return (
    <Box sx={{ py: 6, px: 3 }}>
      <Container maxWidth="md">
        {title && <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#0E1116' }}>{title}</Typography>}
        <Typography sx={{ fontSize: 16, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{body}</Typography>
      </Container>
    </Box>
  );
}

function FeaturesBlock({ props }: { props: Record<string, unknown> }) {
  const title = (props.title as string) || '';
  const items = (props.items as Array<{ title?: string; description?: string }>) || [];
  return (
    <Box sx={{ py: 8, px: 3, bgcolor: '#F9FAFB' }}>
      <Container maxWidth="lg">
        {title && (
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, textAlign: 'center', color: '#0E1116' }}>
            {title}
          </Typography>
        )}
        <Grid container spacing={3}>
          {items.map((item, idx) => (
            <Grid key={idx} size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #E5E7EB', height: '100%' }}>
                <Typography sx={{ fontWeight: 600, mb: 1, color: '#0E1116' }}>{item.title || ''}</Typography>
                <Typography sx={{ fontSize: 14, color: '#6B7280' }}>{item.description || ''}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

function CtaBlock({ props }: { props: Record<string, unknown> }) {
  const text = (props.text as string) || '';
  const button_text = (props.button_text as string) || 'Get Started';
  const button_url = (props.button_url as string) || '#';
  return (
    <Box sx={{ py: 8, px: 3, bgcolor: '#14BB87', textAlign: 'center' }}>
      <Container maxWidth="sm">
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#fff', mb: 3 }}>{text}</Typography>
        <Button
          href={button_url}
          variant="contained"
          data-cro="cta_click"
          sx={{
            bgcolor: '#0E1116', color: '#fff', fontWeight: 600, px: 4, py: 1.5,
            '&:hover': { bgcolor: '#1a2030' }, textTransform: 'none',
          }}
        >
          {button_text}
        </Button>
      </Container>
    </Box>
  );
}

function TestimonialBlock({ props }: { props: Record<string, unknown> }) {
  const items = (props.items as Array<{ quote?: string; author?: string; role?: string }>) || [];
  return (
    <Box sx={{ py: 8, px: 3, bgcolor: '#F9FAFB' }}>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {items.map((t, idx) => (
            <Grid key={idx} size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 2, border: '1px solid #E5E7EB' }}>
                <Typography sx={{ fontSize: 14, color: '#374151', fontStyle: 'italic', mb: 2 }}>
                  &ldquo;{t.quote || ''}&rdquo;
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#0E1116' }}>{t.author || ''}</Typography>
                {t.role && <Typography sx={{ fontSize: 12, color: '#9CA3AF' }}>{t.role}</Typography>}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

function FaqBlock({ props }: { props: Record<string, unknown> }) {
  const items = (props.items as Array<{ question?: string; answer?: string }>) || [];
  return (
    <Box sx={{ py: 8, px: 3 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, color: '#0E1116' }}>FAQ</Typography>
        <Stack spacing={3}>
          {items.map((item, idx) => (
            <Box key={idx}>
              <Typography sx={{ fontWeight: 600, mb: 0.5, color: '#0E1116' }}>{item.question || ''}</Typography>
              <Typography sx={{ fontSize: 14, color: '#6B7280' }}>{item.answer || ''}</Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

function ImageBlock({ props }: { props: Record<string, unknown> }) {
  const src = (props.src as string) || '';
  const alt = (props.alt as string) || '';
  const caption = (props.caption as string) || '';
  if (!src) return null;
  return (
    <Box sx={{ py: 4, px: 3, textAlign: 'center' }}>
      <Container maxWidth="md">
        <Box component="img" src={src} alt={alt} sx={{ maxWidth: '100%', borderRadius: 2 }} />
        {caption && <Typography sx={{ fontSize: 13, color: '#9CA3AF', mt: 1 }}>{caption}</Typography>}
      </Container>
    </Box>
  );
}

function FormEmbedBlock({ props }: { props: Record<string, unknown> }) {
  const form_id = (props.form_id as string) || '';
  if (!form_id) return null;
  return (
    <Box sx={{ py: 6, px: 3 }}>
      <Container maxWidth="sm">
        <iframe
          src={`/f/${form_id}`}
          style={{ width: '100%', minHeight: 400, border: 'none', borderRadius: 8 }}
          title="Form"
        />
      </Container>
    </Box>
  );
}

const BLOCK_MAP: Record<string, React.FC<{ props: Record<string, unknown> }>> = {
  hero: HeroBlock,
  features: FeaturesBlock,
  text: TextBlock,
  cta: CtaBlock,
  form: FormEmbedBlock,
  testimonial: TestimonialBlock,
  faq: FaqBlock,
  image: ImageBlock,
};

function renderBlock(block: BlockProps, idx: number) {
  const Comp = BLOCK_MAP[block.type];
  if (!Comp) return null;
  return <Comp key={idx} props={block.props || {}} />;
}

/* ---------- Apply variant overrides ---------- */
function applyVariantOverrides(blocks: BlockProps[], variant: Record<string, unknown> | null): BlockProps[] {
  if (!variant) return blocks;
  const payload = variant.payload as Record<string, unknown> | undefined;
  if (!payload) return blocks;

  return blocks.map((block) => {
    const overrides = payload[block.type] as Record<string, unknown> | undefined;
    if (!overrides) return block;
    return { ...block, props: { ...block.props, ...overrides } };
  });
}

/* ---------- Main page ---------- */
export default function PublicLandingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState<PageData | null>(null);
  const [variant, setVariant] = useState<VariantPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const visitFired = useRef(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`${BASE}/pages/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error(res.status === 404 ? 'Page not found' : 'Failed to load');
        const data: PageData = await res.json();
        setPage(data);

        // Check for experiment assignment (from URL params)
        const urlParams = new URLSearchParams(window.location.search);
        const expId = urlParams.get('experiment');
        if (expId) {
          const anonId = getAnonId();
          try {
            const assignRes = await fetch(
              `${BASE}/assign?experiment=${encodeURIComponent(expId)}&visitor=${encodeURIComponent(anonId)}`
            );
            if (assignRes.ok) {
              const assignData = await assignRes.json();
              setVariant(assignData);
            }
          } catch { /* variant assignment is best-effort */ }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Fire visit event once page is loaded
  useEffect(() => {
    if (!page || visitFired.current) return;
    visitFired.current = true;
    const anonId = getAnonId();
    const urlParams = new URLSearchParams(window.location.search);
    fetch(`${BASE}/pages/${encodeURIComponent(slug)}/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anon_id: anonId,
        referrer: document.referrer || null,
        device: /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        experiment_id: variant?.experiment_id || null,
        variant_id: variant?.variant_key || null,
        utm_source: urlParams.get('utm_source'),
        utm_medium: urlParams.get('utm_medium'),
        campaign: urlParams.get('utm_campaign'),
      }),
    }).catch(() => {});
  }, [page, slug, variant]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FAFAFA' }}>
        <CircularProgress sx={{ color: '#14BB87' }} />
      </Box>
    );
  }

  if (error || !page) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#FAFAFA', gap: 2 }}>
        <Typography sx={{ fontSize: 48, color: '#E5E7EB' }}>404</Typography>
        <Typography sx={{ fontSize: 16, color: '#6B7280' }}>{error || 'Page not found'}</Typography>
      </Box>
    );
  }

  const blocks = applyVariantOverrides(page.blocks, variant?.variant || null);

  return (
    <>
      {page.seo_title && <title>{page.seo_title}</title>}
      <Box sx={{ minHeight: '100vh', bgcolor: '#fff' }}>
        {blocks.map((block, idx) => renderBlock(block, idx))}
        {blocks.length === 0 && (
          <Box sx={{ py: 20, textAlign: 'center' }}>
            <Typography sx={{ color: '#9CA3AF' }}>This page has no content yet.</Typography>
          </Box>
        )}
      </Box>
    </>
  );
}
