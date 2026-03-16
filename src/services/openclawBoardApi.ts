import type {
  OpenClawApiResult,
  OpenClawAutomation,
  OpenClawBoardConfig,
  OpenClawEvoLog,
  OpenClawTask,
  OpenClawReview,
} from '@/types/openclaw';

const rawBase =
  typeof import.meta !== "undefined" &&
  typeof import.meta.env?.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : "";

const apiKey =
  typeof import.meta !== "undefined" &&
  typeof import.meta.env?.VITE_OPENCLAW_API_KEY === "string"
    ? import.meta.env.VITE_OPENCLAW_API_KEY.trim()
    : "";

export const API_BASE = rawBase ? rawBase.replace(/\/$/, "") : "";

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function computeApiBase(): string {
  const b = rawBase ? rawBase.replace(/\/$/, "") : "";
  if (!b) return "";
  if (typeof window === "undefined" || !window.location?.origin) return b;
  try {
    const url = new URL(b);
    const cur = new URL(window.location.origin);
    const sameOrigin = url.origin === cur.origin;
    const sameLoopback =
      url.protocol === cur.protocol &&
      url.port === cur.port &&
      isLoopbackHost(url.hostname) &&
      isLoopbackHost(cur.hostname);
    return sameOrigin || sameLoopback ? "" : b;
  } catch {
    return "";
  }
}

// If VITE_API_BASE_URL points to the same host (or a loopback alias), prefer relative paths.
export const EFFECTIVE_API_BASE = computeApiBase();

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return EFFECTIVE_API_BASE ? `${EFFECTIVE_API_BASE}${normalized}` : normalized;
}

export function apiHeaders(json = true): Record<string, string> {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  };
}

export function getApiDisplayLabel(): string {
  if (!EFFECTIVE_API_BASE) return "同源 proxy";
  return `後端 ${EFFECTIVE_API_BASE.replace(/^https?:\/\//, "").split("/")[0]}`;
}

const FETCH_TIMEOUT_MS = 25000;
const FETCH_RETRIES = 2;

async function fetchWithRetry<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  const url = apiUrl(path);
  for (let i = 0; i <= FETCH_RETRIES; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      if (signal) signal.addEventListener("abort", () => ctrl.abort(), { once: true });
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (r.status === 503) return null;
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch (e) {
      if (signal?.aborted) return null;
      if (i === FETCH_RETRIES) {
        console.warn("[OpenClaw] API request failed:", path, e);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return null;
}

export async function fetchOpenClaw<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  try {
    return await fetchWithRetry<T>(path, signal);
  } catch (e) {
    console.warn("[OpenClaw] API request failed:", path, e);
    return null;
  }
}

export async function persistTask(task: Partial<OpenClawTask> & { id: string }): Promise<void> {
  try {
    const r = await fetch(apiUrl("/api/openclaw/tasks?allowStub=1"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ ...task, fromR: task.fromR }),
    });
    if (!r.ok) console.warn("[OpenClaw] persist task failed:", r.status);
  } catch (e) {
    console.warn("[OpenClaw] persist task failed", e);
  }
}

export async function persistReview(review: Partial<OpenClawReview> & { id: string }): Promise<void> {
  try {
    const r = await fetch(apiUrl("/api/openclaw/reviews"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ ...review, desc: review.desc }),
    });
    if (!r.ok) console.warn("[OpenClaw] persist review failed:", r.status);
  } catch (e) {
    console.warn("[OpenClaw] persist review failed", e);
  }
}

export async function persistAutomation(auto: Partial<OpenClawAutomation> & { id: string }): Promise<void> {
  try {
    const r = await fetch(apiUrl("/api/openclaw/automations"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ ...auto, lastRun: auto.lastRun || auto.last_run }),
    });
    if (!r.ok) console.warn("[OpenClaw] persist automation failed:", r.status);
  } catch (e) {
    console.warn("[OpenClaw] persist automation failed", e);
  }
}

export async function persistEvo(e: OpenClawEvoLog): Promise<void> {
  try {
    const r = await fetch(apiUrl("/api/openclaw/evolution-log"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(e),
    });
    if (!r.ok) console.warn("[OpenClaw] persist evo failed:", r.status);
  } catch (err) {
    console.warn("[OpenClaw] persist evo failed", err);
  }
}

export async function restartGateway(): Promise<OpenClawApiResult<{ ok?: boolean; message?: string }>> {
  try {
    const r = await fetch(apiUrl("/api/openclaw/restart-gateway"), {
      method: "POST",
      headers: apiHeaders(),
    });
    let data: { ok?: boolean; message?: string } | null = null;
    try {
      data = await r.json();
    } catch {
      data = null;
    }
    return { ok: r.ok && data !== null, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function runTask(taskId: string): Promise<OpenClawApiResult<{ id: string }>> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const r = await fetch(apiUrl(`/api/openclaw/tasks/${taskId}/run`), {
      method: "POST",
      headers: apiHeaders(),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));
    let data: { id: string } | null = null;
    try {
      data = await r.json();
    } catch {
      data = null;
    }
    return { ok: r.ok && data !== null, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function runAutomation(
  automationId: string,
  payload?: Record<string, unknown>
): Promise<OpenClawApiResult<{
  ok?: boolean;
  mode?: string;
  message?: string;
  automation?: Partial<OpenClawAutomation>;
  run?: { id?: string };
  taskId?: string | null;
}>> {
  try {
    const r = await fetch(apiUrl(`/api/openclaw/automations/${automationId}/run`), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(payload ?? {}),
    });
    let data: {
      ok?: boolean;
      mode?: string;
      message?: string;
      automation?: Partial<OpenClawAutomation>;
      run?: { id?: string };
      taskId?: string | null;
    } | null = null;
    try {
      data = await r.json();
    } catch {
      data = null;
    }
    return { ok: r.ok && data !== null, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function deleteTask(taskId: string): Promise<Pick<OpenClawApiResult<never>, 'ok' | 'status'>> {
  try {
    const r = await fetch(apiUrl(`/api/openclaw/tasks/${taskId}`), {
      method: "DELETE",
      headers: apiHeaders(false),
    });
    return { ok: r.ok, status: r.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function createTask(
  payload: Partial<OpenClawTask> & { name?: string; tags?: string[]; status?: string; fromR?: string }
): Promise<OpenClawApiResult<Partial<OpenClawTask> & { id: string }>> {
  try {
    const r = await fetch(apiUrl("/api/openclaw/tasks?allowStub=1"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(payload),
    });
    let data: (Partial<OpenClawTask> & { id: string }) | null = null;
    try {
      data = await r.json();
    } catch {
      data = null;
    }
    return { ok: r.ok && data !== null, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** 從發想建立專案（欄位對應：title→title, summary→description, tags→tags） */
export async function createProjectFromReview(idea: {
  title: string;
  summary?: string;
  tags?: string[];
  linkedTaskIds?: string[];
}): Promise<CreateProjectResult> {
  const phases = [
    { id: `ph-${Date.now()}-a`, name: '實作', done: false },
    { id: `ph-${Date.now()}-b`, name: '驗證', done: false },
  ];
  return createProject({
    title: idea.title,
    description: idea.summary ?? '',
    status: 'planning',
    progress: 0,
    phases,
    notes: '',
    priority: 3,
    tags: (idea.tags ?? []).filter(Boolean),
    linkedTaskIds: idea.linkedTaskIds ?? [],
  });
}

/** 從發想審核建立任務（使用 allowStub=1，寫入 from_review_id） */
export async function createTaskFromReview(review: { id: string; title: string; type?: string; desc?: string }): Promise<OpenClawApiResult<Partial<OpenClawTask> & { id: string }>> {
  try {
    const payload = {
      name: review.title,
      title: review.title,
      description: review.desc ?? '',
      tags: [review.type || 'feature'].filter(Boolean),
      status: 'ready',
      subs: [{ t: '實作', d: false }, { t: '驗證', d: false }],
      fromR: review.id,
    };
    const r = await fetch(apiUrl("/api/openclaw/tasks?allowStub=1"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(payload),
    });
    let data: (Partial<OpenClawTask> & { id: string }) | null = null;
    try {
      data = r.status === 204 ? null : await r.json();
    } catch {
      data = null;
    }
    return { ok: r.ok, status: r.status, data: data ?? ({ id: '' } as { id: string }) };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** 提交構想提案（呼叫 POST /api/openclaw/proposal） */
export async function submitProposal(payload: {
  title: string; category: string; background: string;
  idea: string; goal?: string; risk?: string;
}): Promise<OpenClawApiResult<{ ok: boolean; reviewId: string }>> {
  try {
    const r = await fetch(apiUrl("/api/openclaw/proposal"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function fetchBoardConfig(signal?: AbortSignal): Promise<OpenClawBoardConfig | null> {
  return fetchOpenClaw<OpenClawBoardConfig>('/api/openclaw/board-config', signal);
}

export async function fetchBoardHealth(signal?: AbortSignal): Promise<{
  ok: boolean;
  service: string;
  timestamp: string;
  backend: { supabaseConnected: boolean; n8nConfigured: boolean };
  counts: { tasks: number; reviews: number; automations: number; runs: number; alerts: number };
  notes: string[];
} | null> {
  return fetchOpenClaw('/api/openclaw/board-health', signal);
}

// ---- Agent Protocol API ----

type CommandNext = {
  agent: string;
  task: string;
  context?: Record<string, unknown>;
};

export async function sendAgentCommand(body: {
  sessionId: string;
  from: string;
  command: Record<string, unknown>;
}): Promise<OpenClawApiResult<{ ok?: boolean; next?: CommandNext }>> {
  try {
    const r = await fetch(apiUrl('/api/openclaw/command'), {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body),
    });
    let data: { ok?: boolean; next?: CommandNext } | null = null;
    try {
      data = await r.json();
    } catch {
      data = null;
    }
    return { ok: r.ok && data !== null, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function requestInterrupt(body: {
  sessionId: string;
  from: string;
  reason: string;
  details?: Record<string, unknown>;
  options?: string[];
  timeoutMinutes?: number;
}): Promise<
  OpenClawApiResult<{ ok?: boolean; interruptId?: string; deadline?: string; options?: string[] }>
> {
  try {
    const r = await fetch(apiUrl('/api/openclaw/interrupt'), {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body),
    });
    let data:
      | { ok?: boolean; interruptId?: string; deadline?: string; options?: string[] }
      | null = null;
    try {
      data = await r.json();
    } catch {
      data = null;
    }
    return { ok: r.ok && data !== null, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function resumeInterrupt(body: {
  sessionId: string;
  interruptId: string;
  decision: 'approve' | 'reject' | 'modify';
  feedback?: string;
}): Promise<OpenClawApiResult<{ ok?: boolean; next?: CommandNext }>> {
  try {
    const r = await fetch(apiUrl('/api/openclaw/resume'), {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body),
    });
    let data: { ok?: boolean; next?: CommandNext } | null = null;
    try {
      data = await r.json();
    } catch {
      data = null;
    }
    return { ok: r.ok && data !== null, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function fetchSessionState(sessionId: string) {
  return fetchOpenClaw<{
    id: string;
    status: string;
    sharedState: unknown;
    meta?: { status?: string; createdAt?: string; updatedAt?: string };
  }>(`/api/openclaw/sessions/${encodeURIComponent(sessionId)}`);
}

export async function fetchSessionCommands(sessionId: string) {
  return fetchOpenClaw<
    { id: number | string; sessionId: string; from: string; command: unknown; createdAt: string }[]
  >(`/api/openclaw/sessions/${encodeURIComponent(sessionId)}/commands`);
}

export async function fetchSessionInterrupts(sessionId: string) {
  return fetchOpenClaw<
    {
      id: string;
      sessionId: string;
      from: string;
      reason: string;
      decision?: string;
      decidedBy?: string;
      createdAt: string;
      resolvedAt?: string;
    }[]
  >(`/api/openclaw/sessions/${encodeURIComponent(sessionId)}/interrupts`);
}

// ==================== Projects 專案製作 API ====================

import type { Project, ProjectPhase } from '@/types/project';

export async function fetchProjects(): Promise<Project[]> {
  try {
    const r = await fetch(apiUrl('/api/openclaw/projects'), {
      headers: apiHeaders(false),
    });
    if (r.status === 503) {
      // 後端未連線 Supabase（Supabase not connected），優雅降級
      try {
        const raw = localStorage.getItem('openclaw_projects');
        if (raw) return JSON.parse(raw) as Project[];
      } catch {
        // Ignore parse errors and fallback to empty list.
      }
      return [];
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as Project[];
  } catch (e) {
    console.error('[BoardApi] fetchProjects error:', e);
    try {
      const raw = localStorage.getItem('openclaw_projects');
      if (raw) return JSON.parse(raw) as Project[];
    } catch {
      // Ignore parse errors and fallback to empty list.
    }
    return [];
  }
}

export type CreateProjectResult = { project: Project; savedTo: 'supabase' | 'local' } | null;
export type UpdateProjectResult = { project: Project; savedTo: 'supabase' | 'local' } | null;

export async function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreateProjectResult> {
  try {
    const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const payload: Project = {
      ...project,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const r = await fetch(apiUrl('/api/openclaw/projects'), {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const created = (await r.json()) as Project;
    return { project: created, savedTo: 'supabase' };
  } catch (e) {
    console.error('[BoardApi] createProject error:', e);
    try {
      const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();
      const newProject: Project = { ...project, id, createdAt: now, updatedAt: now };
      const existing = JSON.parse(localStorage.getItem('openclaw_projects') || '[]') as Project[];
      existing.unshift(newProject);
      localStorage.setItem('openclaw_projects', JSON.stringify(existing));
      return { project: newProject, savedTo: 'local' };
    } catch {
      return null;
    }
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<UpdateProjectResult> {
  try {
    const r = await fetch(apiUrl(`/api/openclaw/projects/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: apiHeaders(),
      body: JSON.stringify({ ...updates, updatedAt: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const updated = (await r.json()) as Project;
    return { project: updated, savedTo: 'supabase' };
  } catch (e) {
    console.error('[BoardApi] updateProject error:', e);
    try {
      const existing = JSON.parse(localStorage.getItem('openclaw_projects') || '[]') as Project[];
      const idx = existing.findIndex(p => p.id === id);
      if (idx === -1) return null;
      existing[idx] = { ...existing[idx], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem('openclaw_projects', JSON.stringify(existing));
      return { project: existing[idx], savedTo: 'local' };
    } catch {
      return null;
    }
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const r = await fetch(apiUrl(`/api/openclaw/projects/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: apiHeaders(false),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return true;
  } catch (e) {
    console.error('[BoardApi] deleteProject error:', e);
    // fallback: 從 localStorage 刪除
    try {
      const existing = JSON.parse(localStorage.getItem('openclaw_projects') || '[]') as Project[];
      const filtered = existing.filter(p => p.id !== id);
      localStorage.setItem('openclaw_projects', JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Wake Report（甦醒報告：前端 → 後端 → CLI 可讀）───

export async function postWakeReport(report: {
  level: string;
  totalErrors: number;
  errors: Array<{ ts: number; operation: string; error: string; taskId?: string }>;
  topOperations: Array<[string, number]>;
  preStrategy: string;
  newStrategy: string;
}): Promise<{ ok: boolean; id?: string }> {
  try {
    const r = await fetch(apiUrl('/api/openclaw/wake-report'), {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(report),
    });
    if (!r.ok) {
      console.warn('[OpenClaw] postWakeReport failed:', r.status);
      return { ok: false };
    }
    return await r.json();
  } catch (e) {
    console.warn('[OpenClaw] postWakeReport error:', e);
    // fallback: 存到 localStorage，讓下次 GET 時能補傳
    try {
      const key = 'openclaw_wake_reports_pending';
      const pending = JSON.parse(localStorage.getItem(key) || '[]');
      pending.unshift({ ...report, ts: new Date().toISOString(), id: `wake-local-${Date.now()}` });
      if (pending.length > 20) pending.length = 20;
      localStorage.setItem(key, JSON.stringify(pending));
    } catch { /* ignore */ }
    return { ok: false };
  }
}

export async function fetchWakeReports(): Promise<Array<Record<string, unknown>>> {
  try {
    const r = await fetch(apiUrl('/api/openclaw/wake-report'), {
      headers: apiHeaders(false),
    });
    if (!r.ok) return [];
    const data = await r.json();
    return data?.reports || [];
  } catch {
    // fallback: 讀 localStorage pending
    try {
      return JSON.parse(localStorage.getItem('openclaw_wake_reports_pending') || '[]');
    } catch { return []; }
  }
}
