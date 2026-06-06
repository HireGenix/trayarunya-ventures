'use client';

// Global AI-activity store. A single, framework-agnostic module that every AI
// call funnels through so the app can show a live "AI is working" progress bar
// on any page. Most backend generation endpoints are blocking (no streaming), so
// running tasks trickle a determinate-looking progress through named phases keyed
// by the operation type, giving a realistic "kitna hua" feel. Long async jobs
// (e.g. deep research) can feed *real* progress via setTaskProgress().

export type AITaskStatus = 'running' | 'success' | 'error';

export interface AITask {
  id: string;
  kind: string;
  title: string;
  phaseLabel: string;
  progress: number; // 0 - 100
  status: AITaskStatus;
  startedAt: number;
  endedAt?: number;
  error?: string;
  manual: boolean; // true => progress is fed externally, no auto-trickle
  stalled?: boolean; // running but no progress for a while (likely stuck)
  updatedAt: number; // last time progress/phase moved
  cancel?: () => void; // optional: stop the underlying work (e.g. server job)
}

interface PhaseScript {
  title: string;
  etaMs: number;
  phases: string[];
}

// Per-operation phase scripts. Labels are surfaced live as the task progresses so
// the user sees what the AI is actually doing at each stage.
const SCRIPTS: Record<string, PhaseScript> = {
  content_generate: {
    title: 'Generating content',
    etaMs: 28000,
    phases: ['Analysing brief', 'Researching angle', 'Writing copy', 'Designing visuals', 'Compositing brand', 'Finalising'],
  },
  assets_generate: {
    title: 'Generating assets',
    etaMs: 30000,
    phases: ['Reading content', 'Planning layout', 'Generating visuals', 'Compositing brand logo', 'Finalising assets'],
  },
  calendar_plan: {
    title: 'Building content calendar',
    etaMs: 32000,
    phases: ['Reviewing strategy', 'Planning themes', 'Mapping the funnel', 'Scheduling posts', 'Finalising calendar'],
  },
  calendar_day: {
    title: 'Generating the day’s content',
    etaMs: 30000,
    phases: ['Reading the plan', 'Writing copy', 'Designing visuals', 'Compositing brand', 'Finalising'],
  },
  strategy: {
    title: 'Crafting strategy',
    etaMs: 26000,
    phases: ['Reading research', 'Building positioning', 'Drafting content pillars', 'Writing the playbook', 'Finalising'],
  },
  research_enqueue: {
    title: 'Starting deep research',
    etaMs: 3500,
    phases: ['Queuing research agent', 'Spinning up crawlers'],
  },
  research_run: {
    title: 'Deep research in progress',
    etaMs: 90000,
    phases: ['Planning', 'Searching', 'Crawling sources', 'Synthesising', 'Reflecting', 'Verifying'],
  },
  social_audit: {
    title: 'Auditing social profile',
    etaMs: 18000,
    phases: ['Fetching profile', 'Analysing posts', 'Scoring performance', 'Finalising'],
  },
  brand_build: {
    title: 'Building Brand Brain',
    etaMs: 24000,
    phases: ['Crawling website', 'Extracting brand voice', 'Detecting colours & logo', 'Mapping audience', 'Finalising'],
  },
  image_generate: {
    title: 'Generating image',
    etaMs: 20000,
    phases: ['Composing prompt', 'Generating image', 'Compositing brand logo', 'Finalising'],
  },
  image_regenerate: {
    title: 'Re-generating image',
    etaMs: 20000,
    phases: ['Reading source image', 'Applying your changes', 'Compositing brand logo', 'Finalising'],
  },
  video_generate: {
    title: 'Generating video',
    etaMs: 75000,
    phases: [
      'Writing script & scenes',
      'Sourcing stock footage',
      'Recording AI voiceover',
      'Timing captions',
      'Rendering & encoding',
    ],
  },
  learning: {
    title: 'Analysing performance',
    etaMs: 16000,
    phases: ['Gathering signals', 'Finding patterns', 'Writing recommendations', 'Finalising'],
  },
  watch_scan: {
    title: 'Scanning competitor',
    etaMs: 20000,
    phases: ['Fetching latest', 'Detecting changes', 'Classifying events', 'Finalising'],
  },
  abm_personas: {
    title: 'Generating personas',
    etaMs: 18000,
    phases: ['Researching account', 'Building personas', 'Writing message angles', 'Finalising'],
  },
  abm_assets: {
    title: 'Generating ABM assets',
    etaMs: 22000,
    phases: ['Reading account', 'Drafting assets', 'Personalising', 'Finalising'],
  },
  campaign: {
    title: 'Building campaign plan',
    etaMs: 22000,
    phases: ['Setting objectives', 'Planning channels', 'Drafting messaging', 'Finalising'],
  },
  campaign_to_content: {
    title: 'Turning campaign into content',
    etaMs: 24000,
    phases: ['Reading the plan', 'Writing content', 'Finalising'],
  },
  experiment: {
    title: 'Evaluating experiment',
    etaMs: 12000,
    phases: ['Reading variants', 'Crunching numbers', 'Picking a winner', 'Finalising'],
  },
  forecast: {
    title: 'Writing forecast narrative',
    etaMs: 12000,
    phases: ['Reading projections', 'Writing narrative', 'Finalising'],
  },
  insight_to_content: {
    title: 'Turning insight into content',
    etaMs: 20000,
    phases: ['Reading the insight', 'Writing content', 'Finalising'],
  },
  default: {
    title: 'AI is working',
    etaMs: 15000,
    phases: ['Thinking', 'Generating', 'Finalising'],
  },
};

function scriptFor(kind: string): PhaseScript {
  return SCRIPTS[kind] || SCRIPTS.default;
}

const LINGER_SUCCESS_MS = 1100;
const LINGER_ERROR_MS = 4000;
const TICK_MS = 120;
// A running task whose progress hasn't moved for this long is flagged "stalled"
// so the UI can surface it as stuck and offer a cancel/dismiss.
const STALL_MS = 45000;

type Listener = (tasks: AITask[]) => void;

const tasks = new Map<string, AITask>();
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;
let seq = 0;

function snapshot(): AITask[] {
  // Newest first.
  return Array.from(tasks.values()).sort((a, b) => b.startedAt - a.startedAt);
}

function emit() {
  const snap = snapshot();
  listeners.forEach((l) => {
    try {
      l(snap);
    } catch {
      /* ignore listener errors */
    }
  });
}

function ensureTimer() {
  if (timer || typeof window === 'undefined') return;
  timer = setInterval(tick, TICK_MS);
}

function maybeStopTimer() {
  if (timer && tasks.size === 0) {
    clearInterval(timer);
    timer = null;
  }
}

// Asymptotic ease toward a 92% ceiling: fast at first, creeping as it nears the
// ETA, so a running task always looks like it is making progress but never
// completes until the real call resolves.
function trickleProgress(elapsed: number, etaMs: number): number {
  const k = 2.4;
  const p = 92 * (1 - Math.exp((-k * elapsed) / etaMs));
  return Math.min(92, p);
}

function phaseFor(script: PhaseScript, elapsed: number): string {
  const frac = Math.min(0.999, elapsed / script.etaMs);
  const idx = Math.min(script.phases.length - 1, Math.floor(frac * script.phases.length));
  return script.phases[idx];
}

function tick() {
  const now = Date.now();
  let changed = false;

  for (const t of tasks.values()) {
    if (t.status === 'running') {
      if (!t.manual) {
        const script = scriptFor(t.kind);
        const elapsed = now - t.startedAt;
        const next = trickleProgress(elapsed, script.etaMs);
        if (next > t.progress) {
          t.progress = next;
          t.updatedAt = now;
          changed = true;
        }
        const label = phaseFor(script, elapsed);
        if (label !== t.phaseLabel) {
          t.phaseLabel = label;
          t.updatedAt = now;
          changed = true;
        }
      }
      // Flag long-idle running tasks as stalled (likely stuck server-side).
      const stalled = now - t.updatedAt > STALL_MS;
      if (stalled !== !!t.stalled) {
        t.stalled = stalled;
        changed = true;
      }
    } else if (t.endedAt) {
      const linger = t.status === 'error' ? LINGER_ERROR_MS : LINGER_SUCCESS_MS;
      if (now - t.endedAt > linger) {
        tasks.delete(t.id);
        changed = true;
      }
    }
  }

  if (changed) emit();
  maybeStopTimer();
}

export function startAITask(
  kind: string,
  opts?: { title?: string; manual?: boolean; onCancel?: () => void },
): string {
  const script = scriptFor(kind);
  const id = `ai_${Date.now()}_${seq++}`;
  const now = Date.now();
  const task: AITask = {
    id,
    kind,
    title: opts?.title || script.title,
    phaseLabel: script.phases[0],
    progress: opts?.manual ? 0 : 4,
    status: 'running',
    startedAt: now,
    updatedAt: now,
    manual: !!opts?.manual,
    cancel: opts?.onCancel,
  };
  tasks.set(id, task);
  ensureTimer();
  emit();
  return id;
}

// Attach (or replace) a cancel handler for an existing task.
export function setTaskCancel(id: string, onCancel: () => void) {
  const t = tasks.get(id);
  if (t) t.cancel = onCancel;
}

// Feed real progress for long-running, externally-tracked jobs (e.g. research).
export function setTaskProgress(id: string, progress: number, phaseLabel?: string) {
  const t = tasks.get(id);
  if (!t || t.status !== 'running') return;
  const clamped = Math.max(0, Math.min(99, progress));
  let changed = false;
  if (clamped > t.progress) {
    t.progress = clamped;
    t.updatedAt = Date.now();
    if (t.stalled) t.stalled = false;
    changed = true;
  }
  if (phaseLabel && phaseLabel !== t.phaseLabel) {
    t.phaseLabel = phaseLabel;
    t.updatedAt = Date.now();
    if (t.stalled) t.stalled = false;
    changed = true;
  }
  if (changed) emit();
}

export function finishAITask(id: string, ok = true) {
  const t = tasks.get(id);
  if (!t) return;
  t.status = ok ? 'success' : 'error';
  t.progress = 100;
  t.phaseLabel = ok ? 'Done' : t.phaseLabel;
  t.endedAt = Date.now();
  ensureTimer();
  emit();
}

export function failAITask(id: string, message?: string) {
  const t = tasks.get(id);
  if (!t) return;
  t.status = 'error';
  t.error = message;
  t.phaseLabel = message ? truncate(message, 80) : 'Failed';
  t.endedAt = Date.now();
  ensureTimer();
  emit();
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// Remove a task from the indicator immediately (user dismissed it). Does not
// touch any underlying work — pair with cancelAITask() to also stop it.
export function dismissAITask(id: string) {
  if (tasks.delete(id)) {
    emit();
    maybeStopTimer();
  }
}

// User asked to stop a running task: invoke its cancel handler (if any) to halt
// the underlying work, then remove it from the indicator.
export function cancelAITask(id: string) {
  const t = tasks.get(id);
  if (!t) return;
  try {
    t.cancel?.();
  } catch {
    /* best-effort cancel */
  }
  tasks.delete(id);
  emit();
  maybeStopTimer();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot());
  return () => {
    listeners.delete(listener);
  };
}

export function getTasks(): AITask[] {
  return snapshot();
}

// Convenience wrapper: run an async AI call while reporting its progress globally.
export async function runAITask<T>(
  kind: string,
  fn: () => Promise<T>,
  opts?: { title?: string },
): Promise<T> {
  const id = startAITask(kind, opts);
  try {
    const result = await fn();
    finishAITask(id, true);
    return result;
  } catch (err) {
    failAITask(id, err instanceof Error ? err.message : 'Generation failed');
    throw err;
  }
}
