/**
 * OpenClaw ↔ 主應用 型別轉換
 * 讓 /api/tasks、/api/runs、/api/alerts 使用 OpenClaw Supabase 資料
 */
import type { Task, Run, Alert } from './types.js';
import type {
  OpenClawTask,
  OpenClawReview,
  EvolutionLogRow,
  OpenClawRunRow,
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
  // 如果 title 为空，使用 id 作为备用显示
  const taskName = oc.title?.trim() || `任務-${oc.id.slice(-6)}`;
  return {
    id: oc.id,
    name: taskName,
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
    auto: false,
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
  const taskName = row.x ?? row.t ?? '進化紀錄';
  const context = row.c ?? '';
  
  // 构建有意义的输入摘要
  const inputSummary = JSON.stringify({
    source: 'evolution_log',
    tag: row.tag,
    type: row.t,
    timestamp: startedAt,
  });
  
  // 构建有意义的输出摘要（优先使用 context，否则生成默认信息）
  const outputSummary = context || `[${taskName}] 完成於 ${new Date(startedAt).toLocaleString('zh-TW')}`;
  
  return {
    id: String(id),
    taskId: row.tag ?? '',
    taskName,
    status: 'success',
    startedAt,
    endedAt: startedAt,
    durationMs: 0,
    inputSummary,
    outputSummary,
    steps: [
      {
        name: row.t ?? 'evolution',
        status: 'success' as const,
        startedAt,
        endedAt: startedAt,
        message: row.x || context || '執行完成',
      },
    ],
  };
}

/** openclaw_runs 表列 → Run（給 GET /api/runs 用） */
export function openClawRunToRun(row: OpenClawRunRow): Run {
  const steps = Array.isArray(row.steps) ? (row.steps as Run['steps']) : [
    { name: 'run', status: (row.status === 'success' ? 'success' : row.status === 'failed' ? 'failed' : 'running') as Run['steps'][0]['status'], startedAt: row.started_at, endedAt: row.ended_at ?? undefined, message: row.output_summary || '執行完成' },
  ];
  
  // 处理空白的 input/output summary
  const inputSummary = row.input_summary || JSON.stringify({
    source: 'openclaw_runs',
    taskId: row.task_id,
    startedAt: row.started_at,
  });
  
  const outputSummary = row.output_summary || (row.status === 'success' 
    ? `✅ 任務「${row.task_name}」執行成功`
    : row.status === 'failed'
    ? `❌ 任務「${row.task_name}」執行失敗`
    : `⏳ 任務「${row.task_name}」執行中...`);
  
  return {
    id: row.id,
    taskId: row.task_id,
    taskName: row.task_name,
    status: (row.status === 'queued' ? 'queued' : row.status === 'running' ? 'running' : row.status === 'failed' ? 'failed' : row.status === 'cancelled' ? 'cancelled' : 'success') as Run['status'],
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
    durationMs: row.duration_ms ?? null,
    inputSummary,
    outputSummary,
    steps,
  };
}
