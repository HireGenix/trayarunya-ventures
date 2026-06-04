'use client';

// Lightweight typed client for the Content Engine API. Handles JWT + workspace
// scoping headers and JSON (de)serialization.

import { runAITask } from '@/lib/aiProgress';

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
  }) =>
    runAITask('research_enqueue', () =>
      api<ResearchJob>('/research', { method: 'POST', body, workspace: true }),
    ),
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
    runAITask('social_audit', () =>
      api<SocialProfile>('/research/social-audit', { method: 'POST', body: { url }, workspace: true }),
    ),
  socialBenchmark: (urls: string[]) =>
    runAITask('social_audit', () =>
      api<SocialProfile[]>('/research/social-benchmark', { method: 'POST', body: { urls }, workspace: true }),
      { title: 'Benchmarking profiles' },
    ),
};

export const Strategies = {
  create: (body: { research_job_id: string; objective?: string }) =>
    runAITask('strategy', () =>
      api<Strategy>('/strategies', { method: 'POST', body, workspace: true }),
    ),
  list: () => api<Strategy[]>('/strategies', { workspace: true }),
  get: (id: string) => api<Strategy>(`/strategies/${id}`, { workspace: true }),
  update: (
    id: string,
    body: Partial<Pick<Strategy, 'title' | 'objective' | 'positioning'>>,
  ) => api<Strategy>(`/strategies/${id}`, { method: 'PATCH', body, workspace: true }),
  remove: (id: string) => api<void>(`/strategies/${id}`, { method: 'DELETE', workspace: true }),
};

// ---------- Learning loop (M6) ----------
export interface LearningSignal {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  recommendation: string | null;
  metric: Record<string, unknown> | null;
  applied: boolean;
  created_at: string | null;
}
export interface StrategyRefinement {
  summary: string;
  keep: string[];
  stop: string[];
  double_down: string[];
  pillar_changes: string[];
  updated_pillars: Strategy['pillars'];
}

export const Learning = {
  signals: () => api<LearningSignal[]>('/learning/signals', { workspace: true }),
  analyze: () =>
    runAITask('learning', () =>
      api<LearningSignal[]>('/learning/analyze', { method: 'POST', workspace: true }),
    ),
  refineStrategy: (strategyId: string) =>
    runAITask('learning', () =>
      api<StrategyRefinement>(`/learning/strategies/${strategyId}/refine`, {
        method: 'POST',
        workspace: true,
      }),
      { title: 'Refining strategy' },
    ),
  applyStrategy: (strategyId: string, updatedPillars: Strategy['pillars']) =>
    api<{ id: string; pillars: Strategy['pillars'] }>(
      `/learning/strategies/${strategyId}/apply`,
      { method: 'POST', body: { updated_pillars: updatedPillars }, workspace: true },
    ),
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
  tags?: string[] | null;
  status?: string;
  created_at: string;
}

export interface InsightAction {
  id: string;
  kind: string;
  text: string;
  intent: string | null;
  score: number;
  tags: string[] | null;
  status: string;
  created_at: string;
}

export const Brand = {
  get: () => api<Brand | null>('/brand', { workspace: true }),
  build: (body: { website: string }) =>
    runAITask('brand_build', () =>
      api<Brand>('/brand', { method: 'POST', body, workspace: true }),
    ),
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
  update: (id: string, body: { tags?: string[]; status?: string }) =>
    api<InsightAction>(`/insights/${id}`, { method: 'PATCH', body, workspace: true }),
  toContent: (id: string) =>
    runAITask('insight_to_content', () =>
      api<{ content_item_id: string; title: string }>(
        `/insights/${id}/to-content`, { method: 'POST', workspace: true }),
    ),
  toStrategy: (id: string, strategy_id: string) =>
    api<{ strategy_id: string; added: boolean }>(
      `/insights/${id}/to-strategy`, { method: 'POST', body: { strategy_id }, workspace: true }),
  bulkTag: (ids: string[], tags: string[]) =>
    api<{ updated: number }>(`/insights/bulk-tag`, { method: 'POST', body: { ids, tags }, workspace: true }),
};

// ---------- Notifications & Alerts ----------
export interface NotificationItem {
  id: string;
  level: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export const Notifications = {
  list: (params?: { unread_only?: boolean; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.unread_only) qs.set('unread_only', 'true');
    if (params?.limit) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return api<NotificationItem[]>(`/notifications${s ? `?${s}` : ''}`, { workspace: true });
  },
  unreadCount: () =>
    api<{ count: number }>('/notifications/unread-count', { workspace: true }),
  markRead: (id: string) =>
    api<NotificationItem>(`/notifications/${id}/read`, { method: 'POST', workspace: true }),
  markAllRead: () =>
    api<{ updated: number }>('/notifications/read-all', { method: 'POST', workspace: true }),
  remove: (id: string) =>
    api<void>(`/notifications/${id}`, { method: 'DELETE', workspace: true }),
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
    runAITask('content_generate', () =>
      api<ContentItem[]>('/content/generate', { method: 'POST', body, workspace: true }),
    ),
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
    runAITask('assets_generate', () =>
      api<ContentItem>(`/content/${id}/assets`, { method: 'POST', body, workspace: true }),
    ),
  update: (
    id: string,
    body: Partial<Pick<ContentItem, 'title' | 'body' | 'status' | 'platform' | 'variants' | 'meta'>>,
  ) => api<ContentItem>(`/content/${id}`, { method: 'PATCH', body, workspace: true }),
  remove: (id: string) =>
    api<void>(`/content/${id}`, { method: 'DELETE', workspace: true }),
  approve: (id: string) =>
    api<ContentItem>(`/content/${id}/approve`, { method: 'POST', workspace: true }),
  unapprove: (id: string) =>
    api<ContentItem>(`/content/${id}/unapprove`, { method: 'POST', workspace: true }),
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
  }) =>
    runAITask('calendar_plan', () =>
      api<ContentCalendar>('/calendar/generate', { method: 'POST', body, workspace: true }),
    ),
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
    runAITask('content_generate', () =>
      api<ContentCalendar>(`/calendar/${calendarId}/entries/${entryId}/generate`, {
        method: 'POST',
        body,
        workspace: true,
      }),
    ),
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
    runAITask('calendar_day', () =>
      api<ContentCalendar>(`/calendar/${calendarId}/generate-day`, {
        method: 'POST',
        body,
        workspace: true,
      }),
    ),
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
  }) =>
    runAITask('image_generate', () =>
      api<ContentImage>('/images/generate', { method: 'POST', body, workspace: true }),
    ),
  regenerate: (
    id: string,
    body: { instruction: string; provider?: string; replace?: boolean },
  ) =>
    runAITask('image_regenerate', () =>
      api<ContentImage>(`/images/${id}/regenerate`, { method: 'POST', body, workspace: true }),
    ),
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
export interface DiscoveredAccount {
  external_id: string;
  name: string;
  currency: string;
  is_manager: boolean;
  is_test: boolean;
  is_grant_guess: boolean;
  monthly_budget: number | null;
  grant_signals: string[];
}
export interface AdAccountMeta {
  mode?: string;
  discovered?: DiscoveredAccount[];
  grant_detected?: boolean;
  grant_signals?: string[];
  needs_confirmation?: boolean;
  [key: string]: unknown;
}
export interface AdAccount {
  id: string;
  platform: string;
  external_id: string | null;
  name: string | null;
  is_grant: boolean;
  connected: boolean;
  currency: string;
  meta: AdAccountMeta | null;
  created_at: string;
}
export interface Campaign {
  id: string;
  ad_account_id: string;
  platform: string | null;
  name: string;
  objective: string | null;
  status: string;
  daily_budget: number | null;
  external_id: string | null;
  plan: Record<string, unknown> | null;
  assets: Record<string, unknown> | null;
  recommendations: CampaignRecommendations | null;
  metrics_synced_at: string | null;
  created_at: string;
}

export interface CampaignRecommendations {
  health?: string;
  summary?: string;
  engine?: string;
  budget_recommendation?: { action: string; change_pct: number; rationale: string };
  actions?: { priority: string; type: string; action: string; expected_impact?: string }[];
  tests_to_run?: string[];
  benchmarks?: Record<string, number>;
}

export interface AdMetricTotals {
  impressions: number;
  clicks: number;
  engagements: number;
  conversions: number;
  spend: number;
}
export interface AdKpis {
  ctr: number;
  cpc: number;
  cpm: number;
  conversion_rate: number;
  cpa: number;
}
export interface AdSeriesPoint extends AdMetricTotals {
  date: string;
}
export interface CampaignRollup {
  id: string;
  name: string;
  status: string;
  daily_budget: number | null;
  totals: AdMetricTotals;
  kpis: AdKpis;
}
export interface PlatformOverview {
  platform: string;
  days: number;
  connected: boolean;
  live: boolean;
  totals: AdMetricTotals;
  kpis: AdKpis;
  series: AdSeriesPoint[];
  campaigns: CampaignRollup[];
  campaign_count: number;
  active_count: number;
}
export interface CampaignMetrics {
  campaign_id: string;
  days: number;
  totals: AdMetricTotals;
  kpis: AdKpis;
  series: AdSeriesPoint[];
}

export const AD_PLATFORMS = [
  { id: 'google_ads', label: 'Google Ads', color: '#4285F4' },
  { id: 'meta_ads', label: 'Meta Ads', color: '#0866FF' },
  { id: 'linkedin_ads', label: 'LinkedIn Ads', color: '#0A66C2' },
] as const;

export const Ads = {
  providers: () =>
    api<{ providers: Record<string, boolean>; labels: Record<string, string> }>(
      '/ads/providers',
      { workspace: true },
    ),
  accounts: () => api<AdAccount[]>('/ads/accounts', { workspace: true }),
  createAccount: (body: {
    platform?: string;
    name: string;
    external_id?: string;
    is_grant?: boolean;
  }) => api<AdAccount>('/ads/accounts', { method: 'POST', body, workspace: true }),
  quickConnect: (body: { platform: string; name?: string; is_grant?: boolean }) =>
    api<AdAccount>('/ads/accounts/quick-connect', { method: 'POST', body, workspace: true }),
  oauthStart: (platform: string) =>
    api<{ authorization_url: string; state: string }>(`/ads/${platform}/connect`, {
      method: 'POST',
      workspace: true,
    }),
  connectAccount: (id: string) =>
    api<AdAccount>(`/ads/accounts/${id}/connect`, { method: 'POST', workspace: true }),
  disconnectAccount: (id: string) =>
    api<AdAccount>(`/ads/accounts/${id}/disconnect`, { method: 'POST', workspace: true }),
  updateAccount: (
    id: string,
    body: { external_id?: string; name?: string; is_grant?: boolean },
  ) => api<AdAccount>(`/ads/accounts/${id}`, { method: 'PATCH', body, workspace: true }),
  discoverAccount: (id: string) =>
    api<AdAccount>(`/ads/accounts/${id}/discover`, { method: 'POST', workspace: true }),
  generate: (body: {
    ad_account_id: string;
    objective: string;
    product: string;
    daily_budget?: number;
    audience?: string;
    locations?: string[];
    strategy_id?: string;
  }) => api<Campaign>('/ads/campaigns/generate', { method: 'POST', body, workspace: true }),
  campaigns: (platform?: string) =>
    api<Campaign[]>(
      `/ads/campaigns${platform ? `?platform=${platform}` : ''}`,
      { workspace: true },
    ),
  campaign: (id: string) => api<Campaign>(`/ads/campaigns/${id}`, { workspace: true }),
  setStatus: (id: string, statusValue: string) =>
    api<Campaign>(`/ads/campaigns/${id}/status?new_status=${statusValue}`, {
      method: 'PATCH',
      workspace: true,
    }),
  deleteCampaign: (id: string) =>
    api<void>(`/ads/campaigns/${id}`, { method: 'DELETE', workspace: true }),
  overview: (platform: string, days = 30) =>
    api<PlatformOverview>(`/ads/overview?platform=${platform}&days=${days}`, {
      workspace: true,
    }),
  sync: (id: string, days = 30) =>
    api<CampaignMetrics>(`/ads/campaigns/${id}/sync?days=${days}`, {
      method: 'POST',
      workspace: true,
    }),
  metrics: (id: string, days = 30) =>
    api<CampaignMetrics>(`/ads/campaigns/${id}/metrics?days=${days}`, { workspace: true }),
  optimize: (id: string, days = 30) =>
    api<Campaign>(`/ads/campaigns/${id}/optimize?days=${days}`, {
      method: 'POST',
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

export interface PostStat {
  schedule_id: string;
  content_item_id: string;
  title: string | null;
  platform: string;
  external_post_id: string | null;
  published_at: string | null;
  impressions: number;
  clicks: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  simulated: boolean;
}

export interface NextMove {
  title: string;
  rationale: string;
  impact: string;
  category: string;
}
export interface NextMovesResponse {
  moves: NextMove[];
  generated: boolean;
}

export interface NextMove {
  title: string;
  rationale: string;
  impact: string;
  category: string;
}
export interface NextMovesResponse {
  moves: NextMove[];
  generated: boolean;
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
  refresh: (lookbackDays = 30) =>
    api<{ refreshed: number }>(
      `/analytics/refresh?lookback_days=${lookbackDays}`,
      { method: 'POST', workspace: true },
    ),
  posts: (days = 30) =>
    api<PostStat[]>(`/analytics/posts?days=${days}`, { workspace: true }),
  nextMoves: (days = 30, refresh = false) =>
    api<NextMovesResponse>(
      `/analytics/next-moves?days=${days}&refresh=${refresh}`,
      { workspace: true },
    ),
};

export const Billing = {
  plans: () => api<Plan[]>('/billing/plans', { workspace: true }),
  summary: () => api<BillingSummary>('/billing/summary', { workspace: true }),
  checkout: (planCode: string) =>
    api<{ url: string }>('/billing/checkout', {
      method: 'POST', workspace: true, body: { plan_code: planCode },
    }),
  portal: () => api<{ url: string }>('/billing/portal', { method: 'POST', workspace: true }),
  checkoutStatus: () => api<{ configured: boolean }>('/billing/status'),
};

// ---------- Client Reports ----------
export interface ReportOut {
  id: string;
  token: string;
  title: string;
  client_name: string | null;
  date_from: string | null;
  date_to: string | null;
  views: number;
  created_at: string;
}

export interface PublicReport {
  title: string;
  client_name: string | null;
  date_from: string | null;
  date_to: string | null;
  workspace_name: string;
  views: number;
  created_at: string;
  data: {
    totals: Record<string, number>;
    ctr: number;
    by_source: Record<string, Record<string, number>>;
    series: { date: string; impressions: number; clicks: number; engagements: number; conversions: number; spend: number }[];
    content_count: number;
    published_count: number;
    posts: {
      schedule_id: string;
      title: string | null;
      platform: string;
      published_at: string | null;
      impressions: number;
      clicks: number;
      engagements: number;
      likes: number;
      comments: number;
      shares: number;
      simulated: boolean;
    }[];
  };
}

export const Reports = {
  list: () => api<ReportOut[]>('/reports', { workspace: true }),
  create: (body: { title: string; client_name?: string; days?: number }) =>
    api<ReportOut>('/reports', { method: 'POST', body, workspace: true }),
  delete: (token: string) =>
    api<void>(`/reports/${token}`, { method: 'DELETE', workspace: true }),
  /** Public — no auth header needed, fetched directly */
  getPublic: (token: string, code?: string) =>
    fetch(
      `${API_URL}/api/v1/reports/public/${token}${code ? `?code=${encodeURIComponent(code)}` : ''}`,
    ).then(async (r) => {
      if (!r.ok) throw new ApiError(r.status, await r.text());
      return r.json() as Promise<PublicReport>;
    }),
  pdfUrl: (id: string) => `${API_URL}/api/v1/reports/${id}/pdf`,
  publicPdfUrl: (token: string, code?: string) =>
    `${API_URL}/api/v1/reports/public/${token}/pdf${code ? `?code=${encodeURIComponent(code)}` : ''}`,
  shareSettings: (
    id: string,
    body: { expires_in_days?: number; passcode?: string | null; revoked?: boolean },
  ) =>
    api<ShareSettingsOut>(`/reports/${id}/share-settings`, {
      method: 'POST',
      body,
      workspace: true,
    }),
};

export interface ShareSettingsOut {
  id: string;
  token: string;
  expires_at: string | null;
  revoked: boolean;
  passcode_set: boolean;
}

// ====================================================================
// Platform expansion clients (experiments, integrations, watchtower,
// ABM, creative intelligence, campaigns, collaboration, forecasting)
// ====================================================================

// ---------- Experiment Hub ----------
export interface ExperimentVariant {
  key: string;
  label?: string;
  content_item_id?: string | null;
  notes?: string | null;
}
export interface Experiment {
  id: string;
  name: string;
  hypothesis?: string | null;
  context?: Record<string, unknown> | null;
  success_metric: string;
  variants?: ExperimentVariant[] | null;
  status: 'draft' | 'running' | 'completed' | 'archived';
  winner_key?: string | null;
  result?: Record<string, unknown> | null;
  learning?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
export const Experiments = {
  list: () => api<Experiment[]>('/experiments', { workspace: true }),
  create: (body: {
    name: string;
    hypothesis?: string;
    success_metric?: string;
    context?: Record<string, unknown>;
    variants?: ExperimentVariant[];
  }) => api<Experiment>('/experiments', { method: 'POST', body, workspace: true }),
  get: (id: string) => api<Experiment>(`/experiments/${id}`, { workspace: true }),
  update: (id: string, body: Partial<Experiment>) =>
    api<Experiment>(`/experiments/${id}`, { method: 'PATCH', body, workspace: true }),
  evaluate: (id: string) =>
    runAITask('experiment', () =>
      api<Experiment>(`/experiments/${id}/evaluate`, { method: 'POST', workspace: true }),
    ),
  remove: (id: string) =>
    api<void>(`/experiments/${id}`, { method: 'DELETE', workspace: true }),
};

// ---------- Integrations (CRM / analytics / ecommerce) ----------
export type IntegrationStatus = 'disconnected' | 'connected' | 'error' | 'expired';
export interface Integration {
  id: string;
  provider: string;
  category: string;
  display_name: string | null;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  last_error: string | null;
  expires_at: string | null;
  created_at: string | null;
}
export interface IntegrationCatalogEntry {
  provider: string;
  label: string;
  category: string;
  oauth: boolean;
  configured: boolean;
  manual_connect: boolean;
  token_label: string | null;
}
export interface IntegrationHealth {
  total: number;
  connected: number;
  error: number;
  expired: number;
  disconnected: number;
  providers: { provider: string; status: IntegrationStatus; last_sync_at: string | null; last_error: string | null }[];
}
export const Integrations = {
  list: () => api<Integration[]>('/integrations', { workspace: true }),
  catalog: () => api<IntegrationCatalogEntry[]>('/integrations/catalog', { workspace: true }),
  health: () => api<IntegrationHealth>('/integrations/health', { workspace: true }),
  connect: (body: {
    provider: string;
    category?: string;
    display_name?: string;
    api_key?: string;
    access_token?: string;
    refresh_token?: string;
    config?: Record<string, unknown>;
  }) => api<Integration>('/integrations/connect', { method: 'POST', body, workspace: true }),
  sync: (id: string) =>
    api<Integration>(`/integrations/${id}/sync`, { method: 'POST', workspace: true }),
  disconnect: (id: string) =>
    api<void>(`/integrations/${id}`, { method: 'DELETE', workspace: true }),
};

// ---------- Competitor Watchtower ----------
export type WatchImportance = 'low' | 'medium' | 'high';
export type WatchKind = 'messaging' | 'pricing' | 'content' | 'launch' | 'seo' | 'hiring' | 'other';
export interface WatchEvent {
  id: string;
  watch_id: string;
  kind: WatchKind;
  title: string;
  detail: string | null;
  url: string | null;
  importance: WatchImportance;
  created_at: string;
}
export interface CompetitorWatch {
  id: string;
  name: string;
  website: string | null;
  social_handles: Record<string, string> | null;
  active: boolean;
  last_checked_at: string | null;
  created_at: string;
  event_count?: number;
  last_snapshot?: Record<string, unknown> | null;
  events?: WatchEvent[];
}
export const Watchtower = {
  list: () => api<CompetitorWatch[]>('/watchtower', { workspace: true }),
  create: (body: { name: string; website?: string; social_handles?: Record<string, string>; seed?: boolean }) =>
    api<CompetitorWatch>('/watchtower', { method: 'POST', body, workspace: true }),
  get: (id: string) => api<CompetitorWatch>(`/watchtower/${id}`, { workspace: true }),
  check: (id: string) =>
    runAITask('watch_scan', () =>
      api<{ watch_id: string; ok: boolean; events_created: number; error: string | null; events: WatchEvent[] }>(
        `/watchtower/${id}/check`,
        { method: 'POST', workspace: true },
      ),
    ),
  events: (limit = 50) => api<WatchEvent[]>(`/watchtower/events?limit=${limit}`, { workspace: true }),
  update: (id: string, body: Partial<Pick<CompetitorWatch, 'name' | 'website' | 'social_handles' | 'active'>>) =>
    api<CompetitorWatch>(`/watchtower/${id}`, { method: 'PATCH', body, workspace: true }),
  remove: (id: string) => api<void>(`/watchtower/${id}`, { method: 'DELETE', workspace: true }),
};

// ---------- B2B ABM ----------
export type AbmTier = 'tier_1' | 'tier_2' | 'tier_3';
export type AbmStage = 'new' | 'researching' | 'engaging' | 'opportunity' | 'won' | 'lost';
export interface Persona {
  role: string;
  title: string;
  pains: string[];
  priorities: string[];
  objections: string[];
  message_angle: string;
}
export interface AbmAccount {
  id: string;
  company: string;
  website?: string | null;
  industry?: string | null;
  tier: AbmTier;
  stage: AbmStage;
  notes?: string | null;
  firmographics?: Record<string, unknown> | null;
  personas?: Persona[] | null;
  assets?: Record<string, unknown> | null;
}
export const Abm = {
  listAccounts: (params?: { stage?: AbmStage; tier?: AbmTier }) => {
    const qs = new URLSearchParams();
    if (params?.stage) qs.set('stage', params.stage);
    if (params?.tier) qs.set('tier', params.tier);
    const s = qs.toString();
    return api<AbmAccount[]>(`/abm/accounts${s ? `?${s}` : ''}`, { workspace: true });
  },
  createAccount: (body: { company: string; website?: string; industry?: string; tier?: AbmTier; notes?: string }) =>
    api<AbmAccount>('/abm/accounts', { method: 'POST', body, workspace: true }),
  bulkCreateAccounts: (accounts: { company: string; website?: string; industry?: string; tier?: AbmTier }[]) =>
    api<AbmAccount[]>('/abm/accounts/bulk', { method: 'POST', body: { accounts }, workspace: true }),
  getAccount: (id: string) => api<AbmAccount>(`/abm/accounts/${id}`, { workspace: true }),
  updateAccount: (id: string, body: Partial<Pick<AbmAccount, 'stage' | 'tier' | 'notes' | 'firmographics'>>) =>
    api<AbmAccount>(`/abm/accounts/${id}`, { method: 'PATCH', body, workspace: true }),
  deleteAccount: (id: string) => api<void>(`/abm/accounts/${id}`, { method: 'DELETE', workspace: true }),
  generatePersonas: (id: string) =>
    runAITask('abm_personas', () =>
      api<Persona[]>(`/abm/accounts/${id}/personas`, { method: 'POST', workspace: true }),
    ),
  generateAssets: (id: string) =>
    runAITask('abm_assets', () =>
      api<Record<string, unknown>>(`/abm/accounts/${id}/assets`, { method: 'POST', workspace: true }),
    ),
};

// ---------- Creative Intelligence ----------
export interface CreativeSummary {
  low_data: boolean;
  post_count: number;
  min_posts_for_signal: number;
  generated_at: string | null;
  overall: Record<string, number>;
  top_posts: Record<string, unknown>[];
  breakdowns: Record<string, Record<string, Record<string, number>>>;
  winning_patterns: { attribute: string; value: string; avg_engagement_rate: number; lift_pct: number; sample_size: number }[];
  fatigue_signals: { attribute: string; value: string; earlier_avg_engagement_rate: number; recent_avg_engagement_rate: number; change_pct: number; sample_size: number }[];
}
export type CreativeAction = 'double_down' | 'stop' | 'test';
export interface CreativeRecommendation {
  action: CreativeAction;
  attribute: string;
  value: string | boolean | null;
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
  lift_pct?: number | null;
  change_pct?: number | null;
}
export const CreativeIntel = {
  summary: (top = 5) => api<CreativeSummary>(`/creative-intel/summary?top=${top}`, { workspace: true }),
  recommendations: (enrich = false) =>
    api<{ low_data: boolean; post_count: number; recommendations: CreativeRecommendation[] }>(
      `/creative-intel/recommendations?enrich=${enrich}`,
      { workspace: true },
    ),
};

// ---------- Campaign Builder ----------
export interface CampaignPlan {
  id: string;
  name: string;
  goal: string | null;
  audience: string | null;
  offer: string | null;
  channels: string[] | null;
  plan: Record<string, unknown> | null;
  source_insight_id: string | null;
  source_strategy_id: string | null;
  budget: number | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}
export const Campaigns = {
  list: (status?: string) =>
    api<CampaignPlan[]>(`/campaign-plans${status ? `?status=${encodeURIComponent(status)}` : ''}`, { workspace: true }),
  build: (body: {
    name?: string;
    goal: string;
    audience?: string;
    offer?: string;
    channels?: string[];
    budget?: number;
    source_insight_id?: string;
    source_strategy_id?: string;
    start_date?: string;
    end_date?: string;
  }) =>
    runAITask('campaign', () =>
      api<CampaignPlan>('/campaign-plans/build', { method: 'POST', body, workspace: true }),
    ),
  get: (id: string) => api<CampaignPlan>(`/campaign-plans/${id}`, { workspace: true }),
  update: (id: string, body: Partial<Pick<CampaignPlan, 'name' | 'status' | 'budget' | 'start_date' | 'end_date'>>) =>
    api<CampaignPlan>(`/campaign-plans/${id}`, { method: 'PATCH', body, workspace: true }),
  remove: (id: string) => api<void>(`/campaign-plans/${id}`, { method: 'DELETE', workspace: true }),
  toContent: (id: string) =>
    runAITask('campaign_to_content', () =>
      api<{ created_item_ids: string[]; count: number }>(`/campaign-plans/${id}/to-content`, {
        method: 'POST',
        workspace: true,
      }),
    ),
};

// ---------- Workflow Collaboration ----------
export type CollabEntity = 'content' | 'strategy' | 'campaign' | 'abm';
export interface CollabComment {
  id: string;
  entity_type: CollabEntity;
  entity_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}
export interface CollabApproval {
  id: string;
  entity_type: CollabEntity;
  entity_id: string;
  status: 'pending' | 'approved' | 'changes_requested' | 'rejected';
  reviewer_id: string | null;
  reviewer_name: string | null;
  assignee_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}
export interface ContentVersion {
  id: string;
  content_item_id: string;
  version: number;
  title: string | null;
  body: string | null;
  variants: Record<string, unknown> | null;
  author_name: string | null;
  note: string | null;
  created_at: string;
}
export interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}
export const Collab = {
  listComments: (entityType: CollabEntity, entityId: string) =>
    api<CollabComment[]>(`/collab/comments?entity_type=${entityType}&entity_id=${entityId}`, { workspace: true }),
  createComment: (body: { entity_type: CollabEntity; entity_id: string; body: string }) =>
    api<CollabComment>('/collab/comments', { method: 'POST', body, workspace: true }),
  resolveComment: (id: string) =>
    api<CollabComment>(`/collab/comments/${id}/resolve`, { method: 'POST', workspace: true }),
  deleteComment: (id: string) =>
    api<void>(`/collab/comments/${id}`, { method: 'DELETE', workspace: true }),
  getApprovals: (entityType: CollabEntity, entityId: string) =>
    api<{ current: CollabApproval | null; history: CollabApproval[] }>(
      `/collab/approvals?entity_type=${entityType}&entity_id=${entityId}`,
      { workspace: true },
    ),
  createApproval: (body: {
    entity_type: CollabEntity;
    entity_id: string;
    status: 'pending' | 'approved' | 'changes_requested' | 'rejected';
    note?: string;
    assignee_id?: string;
  }) => api<CollabApproval>('/collab/approvals', { method: 'POST', body, workspace: true }),
  assignContent: (contentItemId: string, assigneeId: string | null) =>
    api<{ content_item_id: string; assignee_id: string | null }>(`/collab/content/${contentItemId}/assign`, {
      method: 'POST',
      body: { assignee_id: assigneeId },
      workspace: true,
    }),
  listVersions: (contentItemId: string) =>
    api<ContentVersion[]>(`/collab/content/${contentItemId}/versions`, { workspace: true }),
  createVersion: (contentItemId: string, note?: string) =>
    api<ContentVersion>(`/collab/content/${contentItemId}/versions`, { method: 'POST', body: { note }, workspace: true }),
  restoreVersion: (contentItemId: string, versionId: string) =>
    api<ContentVersion>(`/collab/content/${contentItemId}/versions/${versionId}/restore`, {
      method: 'POST',
      workspace: true,
    }),
  listAudit: (limit = 50) => api<AuditEntry[]>(`/collab/audit?limit=${limit}`, { workspace: true }),
};

// ---------- Forecasting + Benchmarks ----------
export interface ForecastSummary {
  horizon_days: number;
  low_data: boolean;
  min_points: number;
  days_with_data: number;
  range: { start: string; end: string };
  historical: Record<string, { date: string; value: number }[]>;
  projected: Record<string, { date: string; value: number; lower: number; upper: number }[]>;
  projected_totals: Record<string, { total: number; slope_per_day: number; residual_std: number }>;
}
export interface BenchmarksResponse {
  items: { id: string; industry: string | null; channel: string | null; metric: string; p50: number | null; p75: number | null; p90: number | null; sample_size: number }[];
  note: string | null;
  position: { computable: boolean; engagement_rate: number | null; tier: string | null; benchmark: Record<string, unknown> | null; note: string | null };
}
export const Forecast = {
  summary: (horizonDays = 30, lookbackDays = 90) =>
    api<ForecastSummary>(`/forecast/summary?horizon_days=${horizonDays}&lookback_days=${lookbackDays}`, {
      workspace: true,
    }),
  benchmarks: (industry?: string, channel?: string) => {
    const q = new URLSearchParams();
    if (industry) q.set('industry', industry);
    if (channel) q.set('channel', channel);
    const qs = q.toString();
    return api<BenchmarksResponse>(`/forecast/benchmarks${qs ? `?${qs}` : ''}`, { workspace: true });
  },
  narrative: (body: { summary: unknown; metric?: string }) =>
    runAITask('forecast', () =>
      api<{ narrative: string; source: 'llm' | 'fallback' }>('/forecast/narrative', {
        method: 'POST',
        body,
        workspace: true,
      }),
    ),
};

// --- Revenue Attribution ---
export type RevenueChannel =
  | 'linkedin' | 'content' | 'ads' | 'email' | 'organic' | 'referral' | 'events' | 'other';
export type RevenueStage =
  | 'touch' | 'lead' | 'mql' | 'sql' | 'opportunity' | 'closed_won' | 'closed_lost';

export interface RevenueEvent {
  id: string;
  contact_ref: string;
  channel: RevenueChannel;
  campaign: string | null;
  stage: RevenueStage;
  value: number;
  cost: number;
  currency: string;
  occurred_at: string;
}

export interface AttributionChannel {
  channel: string;
  touches: number;
  leads: number;
  deals_won: number;
  revenue: number;
  pipeline: number;
  cost: number;
  attributed_revenue: { first_touch: number; last_touch: number; linear: number };
  roi_linear: number | null;
  roi_last_touch: number | null;
}

export interface AttributionSummary {
  channels: AttributionChannel[];
  funnel: Record<string, number>;
  totals: {
    revenue: number;
    pipeline: number;
    cost: number;
    deals_won: number;
    leads: number;
    blended_roi: number | null;
  };
}

export interface RevenueEventInput {
  contact_ref: string;
  channel: RevenueChannel;
  stage: RevenueStage;
  campaign?: string | null;
  value?: number;
  cost?: number;
  currency?: string;
  occurred_at?: string | null;
}

export const Attribution = {
  summary: (since?: string) =>
    api<AttributionSummary>(`/attribution/summary${since ? `?since=${encodeURIComponent(since)}` : ''}`, {
      workspace: true,
    }),
  events: (params?: { channel?: string; stage?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.channel) q.set('channel', params.channel);
    if (params?.stage) q.set('stage', params.stage);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api<RevenueEvent[]>(`/attribution/events${qs ? `?${qs}` : ''}`, { workspace: true });
  },
  create: (body: RevenueEventInput) =>
    api<RevenueEvent>('/attribution/events', { method: 'POST', body, workspace: true }),
  createBulk: (items: RevenueEventInput[]) =>
    api<{ created: number }>('/attribution/events/bulk', { method: 'POST', body: items, workspace: true }),
  remove: (id: string) =>
    api<void>(`/attribution/events/${id}`, { method: 'DELETE', workspace: true }),
};

// ===========================================================================
// Client Portal
// ===========================================================================
// The portal is a separate, client-facing surface. It uses its OWN token store
// (independent of the agency `ce_token`) so an agency user and a client can be
// logged in side by side without clobbering each other's session.

const PORTAL_TOKEN_KEY = 'ce_portal_token';

export function getPortalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PORTAL_TOKEN_KEY);
}
export function setPortalToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(PORTAL_TOKEN_KEY, token);
  else window.localStorage.removeItem(PORTAL_TOKEN_KEY);
}

export async function portalApi<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getPortalToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

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
    if (res.status === 401) setPortalToken(null);
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type PortalRole = 'viewer' | 'approver';
export type PortalInviteStatus = 'pending' | 'accepted' | 'revoked';

export interface PortalWorkspaceRef {
  workspace_id: string;
  workspace_name: string;
  role: PortalRole;
}

export interface PortalSession {
  access_token: string;
  workspace_id: string;
  workspace_name: string;
  role: PortalRole;
  full_name: string;
  email: string;
  workspaces: PortalWorkspaceRef[];
}

export interface PortalInvite {
  id: string;
  email: string;
  role: PortalRole;
  status: PortalInviteStatus;
  invited_by_name: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface PortalInviteCreated {
  invite: PortalInvite;
  token: string;
  accept_path: string;
}

export interface PortalMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: PortalRole;
  is_active: boolean;
  created_at: string;
}

export interface PortalInvitePreview {
  email: string;
  role: PortalRole;
  workspace_name: string;
  agency_name: string | null;
  valid: boolean;
}

export interface PortalOverview {
  workspace: { id: string; name: string };
  role: PortalRole;
  totals: AttributionSummary['totals'];
  top_channels: AttributionChannel[];
  funnel: Record<string, number>;
  content_counts: Record<string, number>;
  reports_count: number;
  pending_approvals: number;
  published_count: number;
}

export interface PortalApprovalItem {
  id: string;
  title: string | null;
  body: string;
  content_type: string;
  platform: string | null;
  updated_at: string | null;
  latest_decision: string | null;
  latest_note: string | null;
}

export interface PortalReport {
  id: string;
  token: string;
  title: string;
  client_name: string | null;
  date_from: string | null;
  date_to: string | null;
  views: number;
  created_at: string;
}

// Agency-side portal management (uses the agency `api()` client + workspace header).
export const PortalAdmin = {
  invites: () => api<PortalInvite[]>('/portal/invites', { workspace: true }),
  createInvite: (body: { email: string; role: PortalRole }) =>
    api<PortalInviteCreated>('/portal/invites', { method: 'POST', body, workspace: true }),
  revokeInvite: (id: string) =>
    api<PortalInvite>(`/portal/invites/${id}/revoke`, { method: 'POST', workspace: true }),
  members: () => api<PortalMember[]>('/portal/members', { workspace: true }),
  revokeMember: (id: string) =>
    api<PortalMember>(`/portal/members/${id}/revoke`, { method: 'POST', workspace: true }),
  restoreMember: (id: string) =>
    api<PortalMember>(`/portal/members/${id}/restore`, { method: 'POST', workspace: true }),
};

// Client-side portal (uses the portal token store).
export const Portal = {
  previewInvite: (token: string) =>
    portalApi<PortalInvitePreview>(`/portal/invites/preview/${token}`),
  accept: (body: { token: string; full_name: string; password: string }) =>
    portalApi<PortalSession>('/portal/accept', { method: 'POST', body }),
  login: (body: { email: string; password: string; workspace_id?: string }) =>
    portalApi<PortalSession>('/portal/login', { method: 'POST', body }),
  me: () => portalApi<PortalSession>('/portal/me'),
  switch: (workspaceId: string) =>
    portalApi<PortalSession>(`/portal/switch/${workspaceId}`, { method: 'POST' }),
  overview: () => portalApi<PortalOverview>('/portal/overview'),
  attribution: () => portalApi<AttributionSummary>('/portal/attribution'),
  reports: () => portalApi<PortalReport[]>('/portal/reports'),
  approvals: () => portalApi<PortalApprovalItem[]>('/portal/approvals'),
  decide: (contentItemId: string, body: { decision: 'approved' | 'changes_requested'; note?: string }) =>
    portalApi<{ content_item_id: string; decision: string; status: string; approval_id: string }>(
      `/portal/approvals/${contentItemId}`,
      { method: 'POST', body },
    ),
};
