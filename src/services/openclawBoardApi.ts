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

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalized}` : normalized;
}

export function apiHeaders(json = true): Record<string, string> {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  };
}

export function getApiDisplayLabel(): string {
  if (!API_BASE) return "同源 proxy";
  return `後端 ${API_BASE.replace(/^https?:\/\//, "").split("/")[0]}`;
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
    const r = await fetch(apiUrl("/api/openclaw/tasks"), {
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
    const r = await fetch(apiUrl(`/api/openclaw/tasks/${taskId}/run`), {
      method: "POST",
      headers: apiHeaders(),
    });
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
  payload: Partial<OpenClawTask> & { name?: string; tags?: string[]; status?: string }
): Promise<OpenClawApiResult<Partial<OpenClawTask> & { id: string }>> {
  try {
    const r = await fetch(apiUrl("/api/openclaw/tasks"), {
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

export async function fetchBoardConfig(signal?: AbortSignal): Promise<OpenClawBoardConfig | null> {
  return fetchOpenClaw<OpenClawBoardConfig>('/api/openclaw/board-config', signal);
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
      } catch {}
      return [];
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as Project[];
  } catch (e) {
    console.error('[BoardApi] fetchProjects error:', e);
    try {
      const raw = localStorage.getItem('openclaw_projects');
      if (raw) return JSON.parse(raw) as Project[];
    } catch {}
    return [];
  }
}

export async function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project | null> {
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
    return (await r.json()) as Project;
  } catch (e) {
    console.error('[BoardApi] createProject error:', e);
    // fallback: 存到 localStorage
    try {
      const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();
      const newProject: Project = { ...project, id, createdAt: now, updatedAt: now };
      const existing = JSON.parse(localStorage.getItem('openclaw_projects') || '[]') as Project[];
      existing.unshift(newProject);
      localStorage.setItem('openclaw_projects', JSON.stringify(existing));
      return newProject;
    } catch {
      return null;
    }
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  try {
    const r = await fetch(apiUrl(`/api/openclaw/projects/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: apiHeaders(),
      body: JSON.stringify({ ...updates, updatedAt: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as Project;
  } catch (e) {
    console.error('[BoardApi] updateProject error:', e);
    // fallback: 更新 localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('openclaw_projects') || '[]') as Project[];
      const idx = existing.findIndex(p => p.id === id);
      if (idx === -1) return null;
      existing[idx] = { ...existing[idx], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem('openclaw_projects', JSON.stringify(existing));
      return existing[idx];
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
