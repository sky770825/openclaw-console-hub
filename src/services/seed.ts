import { seedTasks } from '@/data/seedTasks';
import { seedRuns, seedAlerts } from '@/data/seedRunsAlerts';
import type { Task, Run, Alert } from '@/types';

const TASKS_KEY = 'openclaw:tasks';
const RUNS_KEY = 'openclaw:runs';
const ALERTS_KEY = 'openclaw:alerts';
const SEEDED_KEY = 'openclaw:seeded:v2';

/**
 * 初始化資料，只執行一次。
 * 想重灌：刪掉 localStorage 的 SEEDED_KEY（或整個 openclaw:*）。
 *
 * 快速重灌（測 seed 常用）：在瀏覽器 console 執行：
 * Object.keys(localStorage).filter(k=>k.startsWith("openclaw:")).forEach(k=>localStorage.removeItem(k));
 * location.reload();
 */
export function seedOpenClawIfNeeded() {
  const seeded = localStorage.getItem(SEEDED_KEY);
  if (seeded === 'true') return;

  if (!localStorage.getItem(TASKS_KEY)) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(seedTasks));
  }
  if (!localStorage.getItem(RUNS_KEY)) {
    localStorage.setItem(RUNS_KEY, JSON.stringify(seedRuns));
  }
  if (!localStorage.getItem(ALERTS_KEY)) {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(seedAlerts));
  }

  localStorage.setItem(SEEDED_KEY, 'true');
}

// ---- load/save helpers ----
export function loadTasks(): Task[] {
  return safeParse<Task[]>(localStorage.getItem(TASKS_KEY), []);
}
export function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function loadRuns(): Run[] {
  return safeParse<Run[]>(localStorage.getItem(RUNS_KEY), []);
}
export function saveRuns(runs: Run[]) {
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
}

export function loadAlerts(): Alert[] {
  return safeParse<Alert[]>(localStorage.getItem(ALERTS_KEY), []);
}
export function saveAlerts(alerts: Alert[]) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
