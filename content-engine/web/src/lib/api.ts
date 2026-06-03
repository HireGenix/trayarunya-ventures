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
