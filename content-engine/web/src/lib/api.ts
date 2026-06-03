'use client';

// Lightweight typed client for the Content Engine API. Handles JWT + workspace
// scoping headers and JSON (de)serialization.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8099';

const TOKEN_KEY = 'ce_token';
const WS_KEY = 'ce_workspace';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}
export function getWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(WS_KEY);
}
export function setWorkspaceId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) window.localStorage.setItem(WS_KEY, id);
  else window.localStorage.removeItem(WS_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  workspace?: boolean;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.workspace) {
    const ws = getWorkspaceId();
    if (ws) headers['X-Workspace-Id'] = ws;
  }

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    if (res.status === 401) setToken(null);
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------- Types ----------
export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
}
export interface Organization {
  id: string;
  name: string;
  slug: string;
  org_type: string;
  plan: string;
}
export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  website: string | null;
}
export interface Me {
  user: User;
  organizations: Organization[];
  workspaces: Workspace[];
}
export interface ReasoningStep {
  phase: 'plan' | 'search' | 'crawl' | 'synthesize' | 'reflect' | 'verify';
  label: string;
  detail?: string;
  sources?: number | null;
  status?: string;
  iteration?: number;
  ts?: number;
}
export interface ResearchSource {
  title: string;
  url: string;
  source_type?: string;
  platform?: string | null;
}
export interface ResearchJob {
  id: string;
  workspace_id: string;
  topic: string;
  target_url: string | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  summary: string | null;
  findings: Record<string, unknown> | null;
  sources: ResearchSource[] | null;
  reasoning: ReasoningStep[] | null;
  confidence: number | null;
  countries: string[] | null;
  platforms: string[] | null;
  created_at: string;
  updated_at: string;
}
export interface Insight {
  id: string;
  kind: string;
  text: string;
  intent: string | null;
  score: number;
  meta: { citations?: string[]; grounded?: boolean } | null;
}
export interface Competitor {
  id: string;
  name: string;
  website: string | null;
  positioning: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  content_themes: string[] | null;
  country: string | null;
  social_handles: Record<string, string | null> | null;
}
export interface SocialPost {
  thumbnail: string | null;
  likes: number | null;
  comments: number | null;
  is_video: boolean;
  media_type: string | null;
  taken_at: number | null;
  caption: string | null;
  permalink: string | null;
}
export interface FormatMix {
  format: string;
  label: string;
  count: number;
}
export interface ContentInsights {
  format_mix: FormatMix[];
  posts_per_week: number | null;
  last_post_days: number | null;
  avg_likes: number | null;
  avg_comments: number | null;
  top_post_index: number | null;
  best_format: string | null;
  best_format_label: string | null;
  sample_size: number | null;
}
export interface SocialProfile {
  platform: string;
  found: boolean;
  username: string | null;
  full_name: string | null;
  biography: string | null;
  is_verified: boolean;
  is_business: boolean;
  private: boolean;
  limited: boolean;
  category: string | null;
  profile_pic_url: string | null;
  external_url: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  engagement_rate: number | null;
  recent_posts: SocialPost[];
  content_insights: ContentInsights | null;
  query: string | null;
  is_primary: boolean;
  source: string | null;
  note: string | null;
  error: string | null;
}
export interface AuditSnapshot {
  id: string;
  research_job_id: string | null;
  competitor_id: string | null;
  platform: string;
  handle: string | null;
  is_primary: boolean;
  country: string | null;
  profile: SocialProfile | null;
  created_at: string;
}
export interface Strategy {
  id: string;
  workspace_id: string;
  research_job_id: string | null;
  title: string;
  objective: string | null;
  positioning: string | null;
  pillars: { name: string; why: string; angles: string[] }[] | null;
  channel_plan: Record<string, { cadence?: string; formats?: string[] }> | null;
  funnel: Record<string, string[]> | null;
  lead_magnets: { title: string; format: string; promise: string }[] | null;
  content_calendar:
    | { week: number; theme: string; items: { platform: string; type: string; hook: string }[] }[]
    | null;
  kpis: { metric: string; target: string }[] | null;
  created_at: string;
}

// ---------- Endpoints ----------
export const Auth = {
  signup: (body: {
    email: string;
    password: string;
    full_name: string;
    org_name: string;
    org_type: string;
  }) => api<{ access_token: string; user: User }>('/auth/signup', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    api<{ access_token: string; user: User }>('/auth/login', { method: 'POST', body }),
  me: () => api<Me>('/auth/me'),
};

export const Workspaces = {
  list: () => api<Workspace[]>('/workspaces'),
  create: (body: { name: string; website?: string }) =>
    api<Workspace>('/workspaces', { method: 'POST', body }),
};

export const Research = {
  create: (body: {
    topic: string;
    target_url?: string;
    countries?: string[];
    platforms?: string[];
    self_handle?: string;
  }) => api<ResearchJob>('/research', { method: 'POST', body, workspace: true }),
  list: () => api<ResearchJob[]>('/research', { workspace: true }),
  get: (id: string) => api<ResearchJob>(`/research/${id}`, { workspace: true }),
  update: (id: string, body: { topic?: string; target_url?: string; summary?: string }) =>
    api<ResearchJob>(`/research/${id}`, { method: 'PATCH', body, workspace: true }),
  remove: (id: string) => api<void>(`/research/${id}`, { method: 'DELETE', workspace: true }),
  insights: (id: string) => api<Insight[]>(`/research/${id}/insights`, { workspace: true }),
  competitors: (id: string) => api<Competitor[]>(`/research/${id}/competitors`, { workspace: true }),
  auditSnapshots: (id: string) =>
    api<AuditSnapshot[]>(`/research/${id}/audit-snapshots`, { workspace: true }),
  socialAudit: (url: string) =>
    api<SocialProfile>('/research/social-audit', { method: 'POST', body: { url }, workspace: true }),
  socialBenchmark: (urls: string[]) =>
    api<SocialProfile[]>('/research/social-benchmark', { method: 'POST', body: { urls }, workspace: true }),
};

export const Strategies = {
  create: (body: { research_job_id: string; objective?: string }) =>
    api<Strategy>('/strategies', { method: 'POST', body, workspace: true }),
  list: () => api<Strategy[]>('/strategies', { workspace: true }),
  get: (id: string) => api<Strategy>(`/strategies/${id}`, { workspace: true }),
  update: (
    id: string,
    body: Partial<Pick<Strategy, 'title' | 'objective' | 'positioning'>>,
  ) => api<Strategy>(`/strategies/${id}`, { method: 'PATCH', body, workspace: true }),
  remove: (id: string) => api<void>(`/strategies/${id}`, { method: 'DELETE', workspace: true }),
};

// ---------- M1: Brand Brain + Insights ----------
export interface Brand {
  id: string;
  workspace_id: string;
  website: string | null;
  primary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  mission: string | null;
  value_prop: string | null;
  voice: Record<string, unknown> | null;
  audience: Record<string, unknown> | null;
  pillars: unknown[] | null;
  keywords: unknown[] | null;
  profile: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
export interface ExplorerInsight {
  id: string;
  research_job_id: string | null;
  kind: string;
  text: string;
  intent: string | null;
  score: number;
  created_at: string;
}

export const Brand = {
  get: () => api<Brand | null>('/brand', { workspace: true }),
  build: (body: { website: string }) =>
    api<Brand>('/brand', { method: 'POST', body, workspace: true }),
  update: (body: {
    primary_color?: string;
    accent_color?: string;
    logo_url?: string;
    mission?: string;
    value_prop?: string;
  }) => api<Brand>('/brand', { method: 'PATCH', body, workspace: true }),
  uploadLogo: async (file: File): Promise<Brand> => {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const ws = getWorkspaceId();
    if (ws) headers['X-Workspace-Id'] = ws;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/api/v1/brand/logo`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!res.ok) {
      let detail = `Upload failed (${res.status})`;
      try {
        const data = await res.json();
        detail = data.detail || detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, detail);
    }
    return (await res.json()) as Brand;
  },
};

export const Insights = {
  list: (params?: { kind?: string; intent?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.kind) qs.set('kind', params.kind);
    if (params?.intent) qs.set('intent', params.intent);
    if (params?.q) qs.set('q', params.q);
    const s = qs.toString();
    return api<ExplorerInsight[]>(`/insights${s ? `?${s}` : ''}`, { workspace: true });
  },
  remove: (id: string) => api<void>(`/insights/${id}`, { method: 'DELETE', workspace: true }),
};

// ---------- M2: Content Studio ----------
export interface ContentItem {
  id: string;
  workspace_id: string;
  strategy_id: string | null;
  content_type: string;
  status: string;
  platform: string | null;
  title: string | null;
  body: string;
  variants: Record<string, string> | null;
  meta: Record<string, unknown> | null;
  image_url: string | null;
  image_id: string | null;
  asset_urls: string[] | null;
  asset_kind: string | null;
  email_html?: string | null;
  email_format?: string | null;
  created_at: string;
  updated_at: string;
}

export const Content = {
  generate: (body: {
    content_type: string;
    topic: string;
    platform?: string;
    strategy_id?: string;
    count?: number;
    notes?: string;
    provider?: string;
    scheduled_date?: string;
    format?: string;
    slides?: number;
    with_image?: boolean;
    image_style?: string;
    image_provider?: string;
    email_format?: string;
  }) =>
    api<ContentItem[]>('/content/generate', { method: 'POST', body, workspace: true }),
  list: () => api<ContentItem[]>('/content', { workspace: true }),
  get: (id: string) => api<ContentItem>(`/content/${id}`, { workspace: true }),
  generateAssets: (
    id: string,
    body: {
      format: string;
      slides?: number;
      image_style?: string;
      image_provider?: string;
      provider?: string;
      email_format?: string;
    },
  ) =>
    api<ContentItem>(`/content/${id}/assets`, { method: 'POST', body, workspace: true }),
  update: (
    id: string,
    body: Partial<Pick<ContentItem, 'title' | 'body' | 'status' | 'platform' | 'variants' | 'meta'>>,
  ) => api<ContentItem>(`/content/${id}`, { method: 'PATCH', body, workspace: true }),
  remove: (id: string) =>
    api<void>(`/content/${id}`, { method: 'DELETE', workspace: true }),
};

// ---------- Content Calendar (date-aware, multi-platform) ----------
export interface CalendarEntry {
  id: string;
  date: string;
  platform: string;
  content_type: string;
  format?: string | null;
  title: string;
  hook?: string | null;
  theme?: string | null;
  funnel_stage?: string | null;
  notes?: string | null;
  status: 'planned' | 'generated';
  content_item_id: string | null;
  image_url?: string | null;
  asset_urls?: string[] | null;
  asset_kind?: 'image' | 'carousel' | 'pdf' | 'text' | 'video' | null;
}
export interface ContentCalendar {
  id: string;
  workspace_id: string;
  strategy_id: string | null;
  title: string;
  client_name: string | null;
  start_date: string;
  end_date: string;
  platforms: string[];
  entries: CalendarEntry[];
  meta: Record<string, unknown> | null;
  created_at: string;
}

export const ALL_PLATFORMS = [
  'linkedin',
  'x',
  'instagram',
  'facebook',
  'youtube',
  'blog',
  'newsletter',
  'quora',
  'reddit',
  'medium',
] as const;

export const AI_MODELS = [
  { id: 'claude', label: 'Claude Opus (recommended)' },
  { id: 'gpt-5.5', label: 'GPT-5.5' },
] as const;

export const IMAGE_MODELS = [
  { id: 'gpt-image', label: 'GPT Image 2.1 (recommended)' },
  { id: 'mai', label: 'MAI Image 2.5' },
  { id: 'flux', label: 'FLUX.2 Pro' },
] as const;

export const IMAGE_STYLES = [
  { id: 'modern_gradient', label: 'Modern gradient' },
  { id: 'flat_vector', label: 'Flat vector' },
  { id: '3d_render', label: '3D render' },
  { id: 'minimal_editorial', label: 'Minimal editorial' },
  { id: 'bold_typographic', label: 'Bold typographic' },
  { id: 'photo_realistic', label: 'Photorealistic' },
] as const;

export const Calendar = {
  generate: (body: {
    client_name?: string;
    title?: string;
    goal?: string;
    strategy_id?: string;
    platforms?: string[];
    start_date?: string;
    end_date?: string;
    provider?: string;
  }) => api<ContentCalendar>('/calendar/generate', { method: 'POST', body, workspace: true }),
  list: () => api<ContentCalendar[]>('/calendar', { workspace: true }),
  get: (id: string) => api<ContentCalendar>(`/calendar/${id}`, { workspace: true }),
  remove: (id: string) => api<void>(`/calendar/${id}`, { method: 'DELETE', workspace: true }),
  generateEntry: (
    calendarId: string,
    entryId: string,
    body: {
      provider?: string;
      notes?: string;
      with_image?: boolean;
      image_style?: string;
      image_provider?: string;
      email_format?: string;
    },
  ) =>
    api<ContentCalendar>(`/calendar/${calendarId}/entries/${entryId}/generate`, {
      method: 'POST',
      body,
      workspace: true,
    }),
  generateDay: (
    calendarId: string,
    body: {
      date: string;
      provider?: string;
      with_image?: boolean;
      image_style?: string;
      image_provider?: string;
      email_format?: string;
    },
  ) =>
    api<ContentCalendar>(`/calendar/${calendarId}/generate-day`, {
      method: 'POST',
      body,
      workspace: true,
    }),
};

// ---------- Image generation (Canva/Gamma-style social graphics) ----------
export interface ContentImage {
  id: string;
  workspace_id: string;
  content_item_id: string | null;
  prompt: string | null;
  provider: string | null;
  style: string | null;
  size: string | null;
  mime: string;
  url: string;
  created_at: string;
}

export function imageUrl(image: ContentImage): string {
  return `${API_URL}${image.url}`;
}

/** Build an absolute URL for an image path returned on content/entries (e.g. /api/v1/images/<id>/raw). */
export function assetUrl(path: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

export const Images = {
  generate: (body: {
    prompt?: string;
    topic?: string;
    headline?: string;
    platform?: string;
    style?: string;
    size?: string;
    provider?: string;
    content_item_id?: string;
    use_brand?: boolean;
    extra?: string;
  }) => api<ContentImage>('/images/generate', { method: 'POST', body, workspace: true }),
  regenerate: (
    id: string,
    body: { instruction: string; provider?: string; replace?: boolean },
  ) => api<ContentImage>(`/images/${id}/regenerate`, { method: 'POST', body, workspace: true }),
  list: (contentItemId?: string) =>
    api<ContentImage[]>(
      `/images${contentItemId ? `?content_item_id=${contentItemId}` : ''}`,
      { workspace: true },
    ),
  remove: (id: string) => api<void>(`/images/${id}`, { method: 'DELETE', workspace: true }),
};

/** Download an image (by absolute or API-relative URL) to the user's device. */
export async function downloadImage(url: string, filename: string): Promise<void> {
  const abs = url.startsWith('http') ? url : `${API_URL}${url}`;
  const res = await fetch(abs);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

// ---------- M3/M4: Social Publishing ----------
export interface SocialAccount {
  id: string;
  platform: string;
  external_id: string | null;
  display_name: string | null;
  scopes: unknown[] | null;
  is_active: boolean;
  created_at: string;
}
export interface Schedule {
  id: string;
  content_item_id: string;
  social_account_id: string;
  scheduled_at: string;
  status: string;
  external_post_id: string | null;
  error: string | null;
  created_at: string;
}

export const Social = {
  providers: () => api<Record<string, boolean>>('/social/providers', { workspace: true }),
  accounts: () => api<SocialAccount[]>('/social/accounts', { workspace: true }),
  connect: (platform: string) =>
    api<{ authorization_url: string; state: string }>(`/social/${platform}/connect`, {
      method: 'POST',
      workspace: true,
    }),
  connectManual: (body: {
    platform: string;
    display_name?: string;
    access_token: string;
    external_id?: string;
  }) =>
    api<SocialAccount>('/social/connect/manual', { method: 'POST', body, workspace: true }),
  removeAccount: (id: string) =>
    api<void>(`/social/accounts/${id}`, { method: 'DELETE', workspace: true }),
  schedules: () => api<Schedule[]>('/social/schedules', { workspace: true }),
  schedule: (body: { content_item_id: string; social_account_id: string; scheduled_at: string }) =>
    api<Schedule>('/social/schedules', { method: 'POST', body, workspace: true }),
  removeSchedule: (id: string) =>
    api<void>(`/social/schedules/${id}`, { method: 'DELETE', workspace: true }),
  publishNow: (body: { content_item_id: string; social_account_id: string }) =>
    api<Schedule>('/social/publish', { method: 'POST', body, workspace: true }),
};

// ---------- M5: Ads ----------
export interface AdAccount {
  id: string;
  platform: string;
  external_id: string | null;
  name: string | null;
  is_grant: boolean;
  created_at: string;
}
export interface Campaign {
  id: string;
  ad_account_id: string;
  name: string;
  objective: string | null;
  status: string;
  daily_budget: number | null;
  plan: Record<string, unknown> | null;
  assets: Record<string, unknown> | null;
  created_at: string;
}

export const Ads = {
  accounts: () => api<AdAccount[]>('/ads/accounts', { workspace: true }),
  createAccount: (body: {
    platform?: string;
    name: string;
    external_id?: string;
    is_grant?: boolean;
  }) => api<AdAccount>('/ads/accounts', { method: 'POST', body, workspace: true }),
  generate: (body: {
    ad_account_id: string;
    objective: string;
    product: string;
    daily_budget?: number;
    strategy_id?: string;
  }) => api<Campaign>('/ads/campaigns/generate', { method: 'POST', body, workspace: true }),
  campaigns: () => api<Campaign[]>('/ads/campaigns', { workspace: true }),
  campaign: (id: string) => api<Campaign>(`/ads/campaigns/${id}`, { workspace: true }),
  setStatus: (id: string, statusValue: string) =>
    api<Campaign>(`/ads/campaigns/${id}/status`, {
      method: 'PATCH',
      body: { status: statusValue },
      workspace: true,
    }),
};

// ---------- M6: Analytics + Billing ----------
export interface AnalyticsSummary {
  totals: Record<string, number>;
  by_source: Record<string, Record<string, number>>;
  series: { date: string; impressions: number; clicks: number; engagements: number; conversions: number; spend: number }[];
  content_count: number;
  published_count: number;
  scheduled_count: number;
}
export interface Plan {
  id: string;
  code: string;
  name: string;
  price_monthly: number;
  limits: Record<string, unknown> | null;
  features: unknown[] | null;
}
export interface BillingSummary {
  plan: Plan | null;
  usage: { metric: string; quantity: number; period: string }[];
}

export const Analytics = {
  summary: () => api<AnalyticsSummary>('/analytics/summary', { workspace: true }),
  ingest: (body: {
    source: string;
    metric_date: string;
    impressions?: number;
    clicks?: number;
    engagements?: number;
    conversions?: number;
    spend?: number;
    ref_id?: string;
  }) => api('/analytics/metrics', { method: 'POST', body, workspace: true }),
};

export const Billing = {
  plans: () => api<Plan[]>('/billing/plans', { workspace: true }),
  summary: () => api<BillingSummary>('/billing/summary', { workspace: true }),
};
