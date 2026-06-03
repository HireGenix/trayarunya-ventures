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
export interface ResearchJob {
  id: string;
  workspace_id: string;
  topic: string;
  target_url: string | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  summary: string | null;
  findings: Record<string, unknown> | null;
  sources: { title: string; url: string }[] | null;
  created_at: string;
  updated_at: string;
}
export interface Insight {
  id: string;
  kind: string;
  text: string;
  intent: string | null;
  score: number;
}
export interface Competitor {
  id: string;
  name: string;
  website: string | null;
  positioning: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  content_themes: string[] | null;
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
  create: (body: { topic: string; target_url?: string }) =>
    api<ResearchJob>('/research', { method: 'POST', body, workspace: true }),
  list: () => api<ResearchJob[]>('/research', { workspace: true }),
  get: (id: string) => api<ResearchJob>(`/research/${id}`, { workspace: true }),
  insights: (id: string) => api<Insight[]>(`/research/${id}/insights`, { workspace: true }),
  competitors: (id: string) => api<Competitor[]>(`/research/${id}/competitors`, { workspace: true }),
};

export const Strategies = {
  create: (body: { research_job_id: string; objective?: string }) =>
    api<Strategy>('/strategies', { method: 'POST', body, workspace: true }),
  list: () => api<Strategy[]>('/strategies', { workspace: true }),
  get: (id: string) => api<Strategy>(`/strategies/${id}`, { workspace: true }),
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
  }) =>
    api<ContentItem[]>('/content/generate', { method: 'POST', body, workspace: true }),
  list: () => api<ContentItem[]>('/content', { workspace: true }),
  get: (id: string) => api<ContentItem>(`/content/${id}`, { workspace: true }),
  update: (
    id: string,
    body: Partial<Pick<ContentItem, 'title' | 'body' | 'status' | 'platform' | 'variants' | 'meta'>>,
  ) => api<ContentItem>(`/content/${id}`, { method: 'PATCH', body, workspace: true }),
  remove: (id: string) =>
    api<void>(`/content/${id}`, { method: 'DELETE', workspace: true }),
};

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
