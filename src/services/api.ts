/**
 * API 統一入口
 * - 有 VITE_API_BASE_URL 時使用真實後端（apiClient）
 * - 否則使用 localStorage + seed（mock）
 */
import { dataConfig } from './config';
import {
  loadTasks,
  saveTasks,
  loadRuns,
  saveRuns,
  loadAlerts,
  saveAlerts,
} from './seed';
import type { Task, Run, Alert } from '@/types';
import { apiClient } from './apiClient';
import { DOMAIN_OPTIONS } from '@/data/domains';

function newRunId(): string {
  return `R-${Date.now()}`;
}

const mockApi = {
  // ---- Tasks ----
  async listTasks(): Promise<Task[]> {
    return loadTasks();
  },

  async createTask(
    task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Task> {
    const tasks = loadTasks();
    const newTask: Task = {
      ...task,
      id: `task-${String(tasks.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    saveTasks(tasks);
    return newTask;
  },

  async getTask(taskId: string): Promise<Task | null> {
    const t = loadTasks().find((x) => x.id === taskId);
    return t ?? null;
  },

  async updateTask(taskId: string, patch: Partial<Task>): Promise<Task | null> {
    const tasks = loadTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    const updated: Task = {
      ...tasks[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    tasks[idx] = updated;
    saveTasks(tasks);
    return updated;
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const tasks = loadTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;
    tasks.splice(idx, 1);
    saveTasks(tasks);
    return true;
  },

  async batchDeleteTasks(ids: string[]): Promise<void> {
    const tasks = loadTasks();
    const filtered = tasks.filter((t) => !ids.includes(t.id));
    saveTasks(filtered);
  },

  // ---- Runs ----
  async listRuns(): Promise<Run[]> {
    return loadRuns();
  },

  async getRun(runId: string): Promise<Run | null> {
    return loadRuns().find((r) => r.id === runId) ?? null;
  },

  async getRunsByTask(taskId: string): Promise<Run[]> {
    return loadRuns().filter((r) => r.taskId === taskId);
  },

  async addRun(run: Run): Promise<Run> {
    const runs = loadRuns();
    runs.unshift(run);
    saveRuns(runs);
    return run;
  },

  async updateRun(runId: string, patch: Partial<Run>): Promise<Run | null> {
    const runs = loadRuns();
    const idx = runs.findIndex((r) => r.id === runId);
    if (idx === -1) return null;
    const updated: Run = { ...runs[idx], ...patch };
    runs[idx] = updated;
    saveRuns(runs);
    return updated;
  },

  async runNow(taskId: string): Promise<Run> {
    const tasks = loadTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const now = new Date().toISOString();
    const run: Run = {
      id: newRunId(),
      taskId: task.id,
      taskName: task.name,
      status: 'queued',
      agentType: task.agent?.type ?? 'openclaw',
      startedAt: now,
      endedAt: null,
      durationMs: null,
      inputSummary: `{"source":"ui","taskId":"${taskId}"}`,
      outputSummary: '',
      steps: [
        { name: 'queued', status: 'success', startedAt: now, endedAt: now },
        {
          name: 'started',
          status: 'running',
          startedAt: now,
          message: 'Runner pending…',
        },
      ],
    };

    await mockApi.addRun(run);
    await mockApi.updateTask(taskId, {
      lastRunStatus: 'queued',
      lastRunAt: run.startedAt,
    });

    // Mock：約 1.2 秒後模擬執行完成，讓輪詢能收到 success、toast 顯示「執行完成」
    const runId = run.id;
    setTimeout(() => {
      const endAt = new Date().toISOString();
      const durationMs = 1200;
      mockApi.updateRun(runId, {
        status: 'success',
        endedAt: endAt,
        durationMs,
        steps: [
          run.steps[0],
          {
            ...run.steps[1],
            status: 'success',
            endedAt: endAt,
          },
        ],
      });
      mockApi.updateTask(taskId, {
        lastRunStatus: 'success',
      });
    }, 1200);

    return run;
  },

  async rerun(runId: string): Promise<Run> {
    const old = await mockApi.getRun(runId);
    if (!old) throw new Error('Run not found');
    return mockApi.runNow(old.taskId);
  },

  // ---- Alerts ----
  async listAlerts(): Promise<Alert[]> {
    return loadAlerts();
  },

  async updateAlert(
    alertId: string,
    patch: Partial<Alert>
  ): Promise<Alert | null> {
    const alerts = loadAlerts();
    const idx = alerts.findIndex((a) => a.id === alertId);
    if (idx === -1) return null;

    const updated: Alert = { ...alerts[idx], ...patch };
    alerts[idx] = updated;
    saveAlerts(alerts);
    return updated;
  },
};

let _apiFallbackWarned = false;
/** 是否啟用 mock fallback（讀取操作失敗時可用，寫入操作應禁用） */
const _allowMockFallbackByEnv =
  typeof import.meta !== 'undefined' &&
  String(import.meta.env?.VITE_API_ALLOW_MOCK_FALLBACK ?? '').toLowerCase() === 'true';
let _mockFallbackEnabled = !dataConfig.apiBaseUrl || _allowMockFallbackByEnv;

type ApiSyncState = {
  mode: 'backend' | 'mock';
  lastError: string | null;
  lastUpdatedAt: string;
};

let _apiSyncState: ApiSyncState = {
  mode: dataConfig.apiBaseUrl ? 'backend' : 'mock',
  lastError: null,
  lastUpdatedAt: new Date().toISOString(),
};

/** 啟用/禁用 mock fallback */
export function setMockFallback(enabled: boolean) {
  _mockFallbackEnabled = enabled;
}

/** 取得目前資料同步狀態（供 UI 顯示資料來源） */
export function getApiSyncState(): ApiSyncState {
  return { ..._apiSyncState };
}

/** 後端請求失敗時改用 mock，避免頁面報錯
 * 注意：寫入操作（update/delete）失敗時不應 fallback，以免覆蓋用戶變更
 */
function withMockFallback<T>(
  apiCall: () => Promise<T>,
  mockCall: () => Promise<T>,
  options?: { fallbackOnError?: boolean }
): Promise<T> {
  const shouldFallback = options?.fallbackOnError !== false && _mockFallbackEnabled;
  if (!dataConfig.apiBaseUrl) {
    _apiSyncState = {
      mode: 'mock',
      lastError: null,
      lastUpdatedAt: new Date().toISOString(),
    };
    return mockCall();
  }
  return apiCall()
    .then((data) => {
      _apiSyncState = {
        mode: 'backend',
        lastError: null,
        lastUpdatedAt: new Date().toISOString(),
      };
      return data;
    })
    .catch((err) => {
    if (!shouldFallback) throw err;
    if (!_apiFallbackWarned) {
      _apiFallbackWarned = true;
      console.warn(
        '[API] 後端無法連線，改用 mock 資料。若需接後端，請確認 VITE_API_BASE_URL 正確且後端已啟動。'
      );
    }
    _apiSyncState = {
      mode: 'mock',
      lastError: err instanceof Error ? err.message : String(err),
      lastUpdatedAt: new Date().toISOString(),
    };
    return mockCall();
    });
}

// 請求去重緩存（僅用於讀取操作）
const requestCache = new Map<string, Promise<unknown>>();

/** 去重包裝器：相同請求在進行中時返回現有 promise */
function dedupeRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key) as Promise<T>;
  }
  
  const promise = requestFn().finally(() => {
    requestCache.delete(key);
  });
  
  requestCache.set(key, promise);
  return promise;
}

/** 有設定後端網址時用 apiClient，失敗則 fallback mock（僅讀取操作） */
export const api = dataConfig.apiBaseUrl
  ? {
      // 讀取操作：允許 fallback 到 mock + 去重
      listTasks: () =>
        dedupeRequest('listTasks', () =>
          withMockFallback(() => apiClient.listTasks(), () => mockApi.listTasks())
        ),
      getTask: (id: string) =>
        dedupeRequest(`getTask:${id}`, () =>
          withMockFallback(
            () => apiClient.getTask(id),
            () => mockApi.getTask(id)
          )
        ),
      listRuns: () =>
        dedupeRequest('listRuns', () =>
          withMockFallback(() => apiClient.listRuns(), () => mockApi.listRuns())
        ),
      getRun: (id: string) =>
        dedupeRequest(`getRun:${id}`, () =>
          withMockFallback(
            () => apiClient.getRun(id),
            () => mockApi.getRun(id)
          )
        ),
      getRunsByTask: (taskId: string) =>
        dedupeRequest(`getRunsByTask:${taskId}`, () =>
          withMockFallback(
            () => apiClient.getRunsByTask(taskId),
            () => mockApi.getRunsByTask(taskId)
          )
        ),
      listAlerts: () =>
        dedupeRequest('listAlerts', () =>
          withMockFallback(
            () => apiClient.listAlerts(),
            () => mockApi.listAlerts()
          )
        ),
      // 寫入操作：不允許 fallback + 不去重，失敗時拋出錯誤
      createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
        apiClient.createTask(task),
      updateTask: (id: string, patch: Partial<Task>) =>
        apiClient.updateTask(id, patch),
      deleteTask: (id: string) => apiClient.deleteTask(id),
      batchDeleteTasks: (ids: string[]) => apiClient.batchDeleteTasks(ids),
      runNow: (taskId: string) => apiClient.runNow(taskId),
      rerun: (runId: string) => apiClient.rerun(runId),
      updateAlert: (id: string, patch: Partial<Alert>) =>
        apiClient.updateAlert(id, patch),
    }
  : mockApi;

/** 強制從後端重新載入任務列表（不允許 fallback 到 mock）
 * 用於寫入操作後的刷新，確保看到最新資料
 */
export async function forceRefreshTasks(): Promise<Task[]> {
  if (!dataConfig.apiBaseUrl) {
    // 無後端設定時，還是回傳 mock 資料
    return mockApi.listTasks();
  }
  // 直接呼叫 apiClient，不使用 fallback
  // 添加 cache-busting 避免瀏覽器快取
  const tasks = await apiClient.listTasks();
  // 驗證返回數據有效性
  if (!Array.isArray(tasks)) {
    throw new Error('後端返回無效的任務列表格式');
  }
  return tasks;
}

/** 相容既有呼叫：有後端時也走 api，資料一致 */
export const getTasks = () => api.listTasks();
export const getTask = (id: string) =>
  api.getTask(id).then((t) => t ?? undefined);
export const updateTask = (
  id: string,
  updates: Partial<Task>
) => api.updateTask(id, updates).then((t) => t ?? undefined);
export const deleteTask = (id: string) => api.deleteTask(id);
export const batchDeleteTasks = (ids: string[]) => api.batchDeleteTasks(ids);
export const createTask = (
  task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
) => api.createTask(task);

export const getRuns = () => api.listRuns();
export const getRun = (id: string) =>
  api.getRun(id).then((r) => r ?? undefined);
export const getRunsByTask = (taskId: string) => api.getRunsByTask(taskId);
export const triggerRun = (taskId: string) => api.runNow(taskId);

export const getAlerts = () => api.listAlerts();
export const updateAlertStatus = (id: string, status: Alert['status']) =>
  api.updateAlert(id, { status }).then((a) => a ?? undefined);
export const getLogs = dataConfig.apiBaseUrl
  ? () =>
      withMockFallback(
        () => apiClient.getLogs(),
        () => import('./logs').then((m) => m.getLogs())
      )
  : () => import('./logs').then((m) => m.getLogs());

export const getAuditLogs = dataConfig.apiBaseUrl
  ? () =>
      withMockFallback(
        () => apiClient.getAuditLogs(),
        () => import('./audit').then((m) => m.getAuditLogs())
      )
  : () => import('./audit').then((m) => m.getAuditLogs());
export { getCurrentUser } from './user';

/** 儀表板統計：有後端時從 /api/stats 取得（OpenClaw 對接），否則用本地 seed */
export const getDashboardStats = dataConfig.apiBaseUrl
  ? () =>
      withMockFallback(
        () => apiClient.getStats(),
        () => import('./stats').then((m) => m.getDashboardStats())
      )
  : () => import('./stats').then((m) => m.getDashboardStats());

// ---- Domains / Compliance ----
export const getDomains = dataConfig.apiBaseUrl
  ? () => apiClient.getDomains()
  : async () => ({
      ok: true,
      domains: DOMAIN_OPTIONS.map((d) => ({
        slug: d.slug,
        label: d.label,
        keywords: d.keywords,
      })),
    });

// ---- System Schedules（系統排程）----
/** 取得 OpenClaw 系統排程（cron jobs） */
export const getSystemSchedules = dataConfig.apiBaseUrl
  ? () =>
      withMockFallback(
        () => apiClient.getSystemSchedules().then((res) => res.data),
        () => Promise.resolve([] as import('@/types').SystemSchedule[])
      )
  : () => Promise.resolve([] as import('@/types').SystemSchedule[]);

// ---- AutoExecutor API ----
/** 取得自動執行器狀態 */
export const getAutoExecutorStatus = dataConfig.apiBaseUrl
  ? () => apiClient.getAutoExecutorStatus()
  : async () => ({
      ok: false,
      isRunning: false,
      pollIntervalMs: 10000,
      maxTasksPerMinute: 1,
      lastPollAt: null,
      lastExecutedTaskId: null,
      lastExecutedAt: null,
      totalExecutedToday: 0,
      nextPollAt: null,
    });

// ---- Maintenance ----
export const reconcileMaintenance = dataConfig.apiBaseUrl
  ? () => apiClient.reconcileMaintenance()
  : async () => ({
      ok: true,
      scanned: 0,
      fixedToReady: 0,
      fixedToDone: 0,
      fixedToRunning: 0,
      details: [],
    });

/** 啟動自動執行器 */
export const startAutoExecutor = dataConfig.apiBaseUrl
  ? (pollIntervalMs?: number, maxTasksPerMinute?: number) => apiClient.startAutoExecutor(pollIntervalMs, maxTasksPerMinute)
  : async () => ({ ok: false, message: 'Mock 模式不支援自動執行', isRunning: false, pollIntervalMs: 10000, maxTasksPerMinute: 1, lastPollAt: null, lastExecutedTaskId: null, lastExecutedAt: null, totalExecutedToday: 0, nextPollAt: null });

/** 停止自動執行器 */
export const stopAutoExecutor = dataConfig.apiBaseUrl
  ? () => apiClient.stopAutoExecutor()
  : async () => ({ ok: false, message: 'Mock 模式不支援自動執行', isRunning: false, pollIntervalMs: 10000, maxTasksPerMinute: 1, lastPollAt: null, lastExecutedTaskId: null, lastExecutedAt: null, totalExecutedToday: 0, nextPollAt: null });

// ---- Telegram (Ops) ----
export const telegramForceTest = dataConfig.apiBaseUrl
  ? () => apiClient.telegramForceTest()
  : async () => ({ ok: false, description: 'Mock 模式不支援 Telegram 測試' });

// ---- Task Indexer ----
export const getTaskIndexerStatus = dataConfig.apiBaseUrl
  ? () => apiClient.getTaskIndexerStatus()
  : async () => ({
      ok: false,
      dir: '(mock)',
      jsonlPath: '(mock)',
      mdPath: '(mock)',
      jsonlExists: false,
      mdExists: false,
    });

export const rebuildTaskIndexMarkdown = dataConfig.apiBaseUrl
  ? () => apiClient.rebuildTaskIndexMarkdown()
  : async () => ({
      ok: false,
      count: 0,
      mdPath: '(mock)',
      jsonlPath: '(mock)',
      message: 'Mock 模式不支援索引重建',
    });

export const getTaskIndexRecords = dataConfig.apiBaseUrl
  ? (limit: number = 20) => apiClient.getTaskIndexRecords(limit)
  : async () => ({ ok: false, total: 0, records: [] });

export const generateDeterministicHandoff = dataConfig.apiBaseUrl
  ? () => apiClient.generateDeterministicHandoff()
  : async () => ({ ok: false, path: '(mock)', message: 'Mock 模式不支援 handoff' });

// ---- Reviews（小蔡發想審核）----
import type { Review } from '@/types';

/** 取得發想審核列表 */
export const listReviews = dataConfig.apiBaseUrl
  ? () => apiClient.listReviews()
  : async (): Promise<Review[]> => {
      // Mock 模式：從 localStorage 讀取
      const stored = localStorage.getItem('mock_reviews');
      if (stored) return JSON.parse(stored);
      // 預設 mock 資料
      const defaultReviews: Review[] = [
        {
          id: 'idea-001',
          number: 1,
          title: 'Token 消耗優化策略',
          summary: '發現 5 個高 Token 情境：連續錯誤重試、重複搜尋、大段代碼複製等，提出搜尋快取、指數退避、Context 壓縮等解決方案。',
          filePath: 'docs/xiaocai-ideas/pending/idea-001-token-optimization.md',
          status: 'pending',
          createdAt: '2026-02-11',
          tags: ['optimization', 'token', 'performance']
        }
      ];
      localStorage.setItem('mock_reviews', JSON.stringify(defaultReviews));
      return defaultReviews;
    };

/** 更新發想審核狀態 */
export const updateReview = dataConfig.apiBaseUrl
  ? (id: string, patch: Partial<Review>) => apiClient.updateReview(id, patch)
  : async (id: string, patch: Partial<Review>): Promise<Review | null> => {
      // Mock 模式：更新 localStorage
      const reviews = await listReviews();
      const idx = reviews.findIndex(r => r.id === id);
      if (idx === -1) return null;
      
      const updated: Review = {
        ...reviews[idx],
        ...patch,
        reviewedAt: new Date().toISOString().split('T')[0]
      };
      reviews[idx] = updated;
      localStorage.setItem('mock_reviews', JSON.stringify(reviews));
      return updated;
    };

/** 刪除發想審核（需後端支援） */
export const deleteReview = dataConfig.apiBaseUrl
  ? (id: string) => apiClient.deleteReview(id)
  : async (id: string): Promise<void> => {
      const reviews = await listReviews();
      const filtered = reviews.filter(r => r.id !== id);
      localStorage.setItem('mock_reviews', JSON.stringify(filtered));
    };

/** 取得此發想轉出的任務列表 */
export const getTasksByReviewId = dataConfig.apiBaseUrl
  ? (reviewId: string) => apiClient.getTasksByReviewId(reviewId)
  : async (): Promise<import('@/types').Task[]> => [];
