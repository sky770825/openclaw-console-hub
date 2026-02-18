/**
 * 種子資料：預設為空，只保留你真正要用的任務
 * （原先 T-01..T-15 為專案示範用，已移除）
 */
import { createLogger } from './logger.js';
import { tasks, runs, alerts } from './store.js';
import type { Task, Run, Alert } from './types.js';

const log = createLogger('seed');

const now = () => new Date().toISOString();

const seedTasks: Task[] = [];

const seedRuns: Run[] = [];

const seedAlerts: Alert[] = [];

export function runSeed() {
  tasks.length = 0;
  runs.length = 0;
  alerts.length = 0;
  tasks.push(...seedTasks);
  runs.push(...seedRuns);
  alerts.push(...seedAlerts);
  log.info('[seed] tasks=%d runs=%d alerts=%d', tasks.length, runs.length, alerts.length);
}
