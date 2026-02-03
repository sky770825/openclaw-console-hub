/**
 * API 統一入口（mock implementation）
 * Tasks / Runs / Alerts 改由 localStorage 提供（seed）
 */
import {
  loadTasks,
  saveTasks,
  loadRuns,
  saveRuns,
  loadAlerts,
  saveAlerts,
} from './seed';
import type { Task, Run, Alert } from '@/types';

function newRunId(): string {
  return `R-${Date.now()}`;
}

export const api = {
  // ---- Tasks ----
  async listTasks(): Promise<Task[]> {
    return loadTasks();
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

  // ---- Runs ----
  async listRuns(): Promise<Run[]> {
    return loadRuns();
  },

  async getRun(runId: string): Promise<Run | null> {
    return loadRuns().find((r) => r.id === runId) ?? null;
  },

  async addRun(run: Run): Promise<Run> {
    const runs = loadRuns();
    runs.unshift(run);
    saveRuns(runs);
    return run;
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

    await api.addRun(run);
    await api.updateTask(taskId, {
      lastRunStatus: 'queued',
      lastRunAt: run.startedAt,
    });

    return run;
  },

  async rerun(runId: string): Promise<Run> {
    const old = await api.getRun(runId);
    if (!old) throw new Error('Run not found');
    return api.runNow(old.taskId);
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

/** 相容既有呼叫 */
export {
  getTasks,
  getTask,
  createTask,
  updateTask,
} from './tasks';
export {
  getRuns,
  getRun,
  getRunsByTask,
  triggerRun,
} from './runs';
export { getAlerts, updateAlertStatus } from './alerts';
export { getLogs } from './logs';
export { getAuditLogs } from './audit';
export { getCurrentUser } from './user';
export { getDashboardStats } from './stats';
