/**
 * OpenClaw ↔ 主應用 型別轉換
 * 讓 /api/tasks、/api/runs、/api/alerts 使用 OpenClaw Supabase 資料
 */
import type { Task, Run, Alert } from './types.js';
import type {
  OpenClawTask,
  OpenClawReview,
  EvolutionLogRow,
} from './openclawSupabase.js';

// openclaw status: queued | in_progress | done
// 主應用 status: draft | ready | running | review | done | blocked
const OC_TO_TASK_STATUS: Record<string, Task['status']> = {
  queued: 'ready',
  in_progress: 'running',
  done: 'done',
};

const TASK_TO_OC_STATUS: Record<string, string> = {
  draft: 'queued',
  ready: 'queued',
  running: 'in_progress',
  review: 'in_progress',
  done: 'done',
  blocked: 'queued',
};

export function openClawTaskToTask(oc: OpenClawTask): Task {
  const now = new Date().toISOString();
  return {
    id: oc.id,
    name: oc.title,
    description: oc.thought ?? '',
    status: OC_TO_TASK_STATUS[oc.status] ?? 'ready',
    tags: [oc.cat],
    owner: 'OpenClaw',
    priority: 3,
    scheduleType: 'manual',
    lastRunStatus: oc.progress >= 100 ? 'success' : undefined,
    lastRunAt: undefined,
    updatedAt: now,
    createdAt: now,
  };
}

export function taskToOpenClawTask(t: Partial<Task> & { id: string }): Partial<OpenClawTask> & { id: string } {
  const status = t.status ? (TASK_TO_OC_STATUS[t.status] ?? 'queued') : 'queued';
  return {
    id: t.id,
    title: t.name ?? '',
    thought: t.description ?? undefined,
    status,
    cat: (t.tags?.[0] as string) ?? 'feature',
    progress: t.status === 'done' ? 100 : 0,
    subs: [],
  };
}

export function openClawReviewToAlert(r: OpenClawReview): Alert {
  const priToSev: Record<string, Alert['severity']> = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
  };
  return {
    id: r.id,
    type: 'task_run_failed',
    severity: priToSev[r.pri] ?? 'medium',
    status: r.status === 'pending' ? 'open' : 'acked',
    createdAt: r.created_at ?? new Date().toISOString(),
    message: `${r.title}: ${r.desc}`,
  };
}

export function evolutionLogToLogEntry(
  row: EvolutionLogRow,
  index: number
): { id: string; timestamp: string; level: 'debug' | 'info' | 'warn' | 'error'; source: string; taskId?: string; message: string } {
  return {
    id: row.id ?? `log-${index}`,
    timestamp: row.created_at ?? new Date().toISOString(),
    level: 'info',
    source: 'OpenClaw',
    taskId: row.tag ?? undefined,
    message: row.x || row.t || row.c || '進化紀錄',
  };
}

export function evolutionLogToRun(row: EvolutionLogRow, index: number): Run {
  const id = row.id ?? `ev-${index}`;
  const startedAt = row.created_at ?? new Date().toISOString();
  return {
    id: String(id),
    taskId: row.tag ?? '',
    taskName: row.x ?? row.t ?? '進化紀錄',
    status: 'success',
    startedAt,
    endedAt: startedAt,
    durationMs: 0,
    inputSummary: '',
    outputSummary: row.c ?? '',
    steps: [
      {
        name: row.t ?? 'evolution',
        status: 'success' as const,
        startedAt,
        endedAt: startedAt,
        message: row.x,
      },
    ],
  };
}
