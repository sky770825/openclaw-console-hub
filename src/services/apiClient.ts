/**
 * 真實後端 API 客戶端
 * 當 config.dataConfig.apiBaseUrl 有值時，api.ts 會改用此 client
 * 含 timeout、retry，避免長時間操作異常中斷
 */
import { dataConfig } from './config';
import type { Task, Run, Alert } from '@/types';

const base = dataConfig.apiBaseUrl.replace(/\/$/, '');
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
        throw new Error(msg || `HTTP ${res.status}`);
      }
      if (res.status === 204) return undefined as T;
      if (!contentType.includes('application/json')) {
        throw new Error(
          'API 回傳非 JSON。請確認 VITE_API_BASE_URL 指向後端 API（如 http://localhost:3001），而非前端網址。'
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
  throw (lastErr ?? new Error('Request failed'));
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
    try {
      return await request<Task>(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        body: patch,
      });
    } catch {
      return null;
    }
  },

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await request<void>(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
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
  }> {
    return request('/api/stats');
  },
};
