/**
 * 真實後端 API 客戶端
 * 當 config.dataConfig.apiBaseUrl 有值時，api.ts 會改用此 client
 * 含 timeout、retry，避免長時間操作異常中斷
 */
import { dataConfig } from './config';
import type { Task, Run, Alert } from '@/types';

const base = dataConfig.apiBaseUrl.replace(/\/$/, '');
const apiKey =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env?.VITE_OPENCLAW_API_KEY === 'string'
    ? import.meta.env.VITE_OPENCLAW_API_KEY.trim()
    : '';
const REQUEST_TIMEOUT_MS = 30000;
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function request<T>(
  path: string,
  options?: RequestInit & { method?: string; body?: object }
): Promise<T> {
  const { method = 'GET', body, ...rest } = options ?? {};
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `${base}${path}`,
        {
          ...rest,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'x-api-key': apiKey } : {}),
            ...(rest.headers as Record<string, string>),
          },
          body: body ? JSON.stringify(body) : rest.body,
        },
        REQUEST_TIMEOUT_MS
      );
      const text = await res.text();
      const contentType = res.headers.get('Content-Type') || '';
      if (!res.ok) {
        let msg = text;
        try {
          const j = JSON.parse(text);
          if (j?.message) msg = j.message;
          else if (j?.error) msg = j.error;
        } catch {
          // use text as message
        }
        if (res.status === 401) {
          throw new Error(
            '後端需要 API Key。請在專案 .env 設定 VITE_OPENCLAW_API_KEY，並與後端 OPENCLAW_API_KEY 一致。'
          );
        }
        if (res.status === 503) {
          throw new Error(
            '後端尚未設定 API Key。請在後端 .env 設定 OPENCLAW_API_KEY，或將 OPENCLAW_ENFORCE_WRITE_AUTH 設為 false。'
          );
        }
        throw new Error(msg || `HTTP ${res.status}`);
      }
      if (res.status === 204) return undefined as T;
      if (!contentType.includes('application/json')) {
        throw new Error(
          'API 回傳非 JSON。請確認 VITE_API_BASE_URL 指向後端 API（如 http://localhost:3011），而非前端網址。'
        );
      }
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error('API 回傳無法解析的 JSON');
      }
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const isRetryable =
        lastErr.name === 'AbortError' ||
        lastErr.message.includes('fetch') ||
        lastErr.message.includes('network');
      if (!isRetryable || attempt === RETRY_COUNT) throw lastErr;
      await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }
  const err = lastErr ?? new Error('Request failed');
  if (
    err.message.includes('fetch') ||
    err.message.includes('network') ||
    err.name === 'AbortError'
  ) {
    throw new Error(
      '無法連線後端。請確認後端已啟動（cd server && npm run dev），且 Vite proxy 指向後端 port（預設 3011）。'
    );
  }
  throw err;
}

export const apiClient = {
  // ---- Tasks ----
  async listTasks(): Promise<Task[]> {
    return request<Task[]>('/api/tasks');
  },

  async getTask(taskId: string): Promise<Task | null> {
    try {
      return await request<Task>(`/api/tasks/${encodeURIComponent(taskId)}`);
    } catch {
      return null;
    }
  },

  async updateTask(taskId: string, patch: Partial<Task>): Promise<Task | null> {
    return await request<Task>(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      body: patch,
    });
  },

  async deleteTask(taskId: string): Promise<boolean> {
    await request<void>(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
    });
    return true;
  },

  async batchDeleteTasks(ids: string[]): Promise<void> {
    await request<void>('/api/tasks/batch', {
      method: 'DELETE',
      body: { ids },
    });
  },

  async createTask(
    task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Task> {
    return request<Task>('/api/tasks', {
      method: 'POST',
      body: task,
    });
  },

  // ---- Runs ----
  async listRuns(): Promise<Run[]> {
    return request<Run[]>('/api/runs');
  },

  async getRunsByTask(taskId: string): Promise<Run[]> {
    return request<Run[]>(`/api/runs?taskId=${encodeURIComponent(taskId)}`);
  },

  async getRun(runId: string): Promise<Run | null> {
    try {
      return await request<Run>(`/api/runs/${encodeURIComponent(runId)}`);
    } catch {
      return null;
    }
  },

  async runNow(taskId: string): Promise<Run> {
    return request<Run>(`/api/tasks/${encodeURIComponent(taskId)}/run`, {
      method: 'POST',
    });
  },

  async rerun(runId: string): Promise<Run> {
    return request<Run>(`/api/runs/${encodeURIComponent(runId)}/rerun`, {
      method: 'POST',
    });
  },

  // ---- Alerts ----
  async listAlerts(): Promise<Alert[]> {
    return request<Alert[]>('/api/alerts');
  },

  async updateAlert(
    alertId: string,
    patch: Partial<Alert>
  ): Promise<Alert | null> {
    try {
      return await request<Alert>(`/api/alerts/${encodeURIComponent(alertId)}`, {
        method: 'PATCH',
        body: patch,
      });
    } catch {
      return null;
    }
  },

  async getLogs(): Promise<import('@/types').LogEntry[]> {
    return request('/api/logs');
  },

  async getAuditLogs(): Promise<import('@/types').AuditLog[]> {
    return request('/api/audit-logs');
  },

  async getStats(): Promise<{
    todayRuns: number;
    successRate: number;
    failedRuns: number;
    avgDuration: number;
    queueDepth: number;
    activeTasks: number;
    weeklyTrend: { day: string; success: number; failed: number }[];
    agentStats?: { name: string; runs: number; success: number; failed: number; successRate: number }[];
  }> {
    return request('/api/stats');
  },

  // ---- Feature Flags ----
  async getFeatures(): Promise<{ ok: boolean; features: Record<string, boolean> }> {
    return request('/api/features');
  },

  async patchFeatures(patch: Record<string, boolean>): Promise<{ ok: boolean; features: Record<string, boolean> }> {
    return request('/api/features', { method: 'PATCH', body: patch });
  },

  // ---- Board / Taxonomy ----
  async getDomains(): Promise<{ ok: boolean; domains: Array<{ slug: string; label: string; keywords: string[] }> }> {
    return request('/api/domains');
  },

  // ---- Telegram (Ops) ----
  async telegramForceTest(): Promise<{
    ok: boolean;
    chat_id?: number | null;
    message_id?: number | null;
    time?: string;
    nonce?: string;
    description?: string | null;
    error_code?: number | null;
  }> {
    return request('/api/telegram/force-test');
  },

  // ---- AutoExecutor ----
  async getAutoExecutorStatus(): Promise<{
    ok: boolean;
    isRunning: boolean;
    pollIntervalMs: number;
    maxTasksPerMinute?: number;
    lastPollAt: string | null;
    lastExecutedTaskId: string | null;
    lastExecutedAt: string | null;
    totalExecutedToday: number;
    nextPollAt: string | null;
  }> {
    return request('/api/openclaw/auto-executor/status');
  },

  async startAutoExecutor(
    pollIntervalMs?: number,
    maxTasksPerMinute?: number
  ): Promise<{
    ok: boolean;
    message: string;
    isRunning: boolean;
    pollIntervalMs: number;
    maxTasksPerMinute: number;
    lastPollAt: string | null;
    lastExecutedTaskId: string | null;
    lastExecutedAt: string | null;
    totalExecutedToday: number;
    nextPollAt: string | null;
  }> {
    return request('/api/openclaw/auto-executor/start', {
      method: 'POST',
      body: { pollIntervalMs, maxTasksPerMinute },
    });
  },

  async stopAutoExecutor(): Promise<{
    ok: boolean;
    message: string;
    isRunning: boolean;
    pollIntervalMs: number;
    maxTasksPerMinute: number;
    lastPollAt: string | null;
    lastExecutedTaskId: string | null;
    lastExecutedAt: string | null;
    totalExecutedToday: number;
    nextPollAt: string | null;
  }> {
    return request('/api/openclaw/auto-executor/stop', {
      method: 'POST',
    });
  },

  // ---- Maintenance ----
  async reconcileMaintenance(): Promise<{
    ok: boolean;
    scanned: number;
    fixedToReady: number;
    fixedToDone: number;
    fixedToRunning: number;
    details: Array<{ taskId: string; from: string; to: string; reason: string }>;
  }> {
    return request('/api/openclaw/maintenance/reconcile', {
      method: 'POST',
    });
  },

  // ---- Task Indexer ----
  async getTaskIndexerStatus(): Promise<{
    ok: boolean;
    dir: string;
    jsonlPath: string;
    mdPath: string;
    jsonlExists: boolean;
    mdExists: boolean;
  }> {
    return request('/api/openclaw/indexer/status');
  },

  async rebuildTaskIndexMarkdown(): Promise<{
    ok: boolean;
    count: number;
    mdPath: string;
    jsonlPath: string;
    message: string;
  }> {
    return request('/api/openclaw/indexer/rebuild-md', {
      method: 'POST',
    });
  },

  async getTaskIndexRecords(limit: number = 20): Promise<{
    ok: boolean;
    total: number;
    records: Array<{
      timestamp: string;
      taskId: string;
      taskName: string;
      taskStatus: string;
      runId: string;
      runStatus: string;
      startedAt: string | null;
      endedAt: string | null;
      durationMs: number | null;
      riskLevel: string;
      agentType: string | null;
      modelUsed: string | null;
      checkpointId: string | null;
      rollbackStatus: string | null;
      healthCheckStatus: string | null;
      tags: string[];
      outputSummary: string | null;
    }>;
    message?: string;
  }> {
    return request(`/api/openclaw/indexer/records?limit=${encodeURIComponent(String(limit))}`);
  },

  // ---- Handoff ----
  async generateDeterministicHandoff(): Promise<{
    ok: boolean;
    path: string;
    message: string;
  }> {
    return request('/api/openclaw/handoff/generate', {
      method: 'POST',
    });
  },

  // ---- System Schedules（系統排程）----
  async getSystemSchedules(): Promise<{
    ok: boolean;
    count: number;
    data: import('@/types').SystemSchedule[];
  }> {
    return request('/api/system-schedules');
  },

  // ---- Reviews（小蔡發想審核）----
  async listReviews(): Promise<import('@/types').Review[]> {
    return request('/api/openclaw/reviews');
  },

  async updateReview(
    reviewId: string,
    patch: Partial<import('@/types').Review>
  ): Promise<import('@/types').Review | null> {
    return request(`/api/openclaw/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'PATCH',
      body: patch,
    });
  },

  async deleteReview(reviewId: string): Promise<void> {
    await request(`/api/openclaw/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'DELETE',
    });
  },

  async getTasksByReviewId(reviewId: string): Promise<import('@/types').Task[]> {
    return request(`/api/openclaw/reviews/${encodeURIComponent(reviewId)}/tasks`);
  },

};
