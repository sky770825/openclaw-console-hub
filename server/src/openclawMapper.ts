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

const META_MARKER = '<!--OC_META:';
const META_SUFFIX = '-->';
const VALID_OPENCLAW_CATS = new Set(['feature', 'bugfix', 'learn', 'improve']);

function normalizeOpenClawCat(raw?: string): string {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return 'feature';
  if (VALID_OPENCLAW_CATS.has(value)) return value;
  if (value.includes('bug') || value.includes('fix') || value.includes('錯誤') || value.includes('修復')) return 'bugfix';
  if (value.includes('learn') || value.includes('study') || value.includes('research') || value.includes('學習')) return 'learn';
  if (value.includes('perf') || value.includes('opt') || value.includes('stability') || value.includes('improve') || value.includes('優化')) return 'improve';
  return 'feature';
}

type TaskThoughtMeta = Partial<Pick<
  Task,
  | 'owner'
  | 'priority'
  | 'scheduleType'
  | 'scheduleExpr'
  | 'tags'
  | 'taskType'
  | 'complexity'
  | 'riskLevel'
  | 'deadline'
  | 'reviewer'
  | 'rollbackPlan'
  | 'acceptanceCriteria'
  | 'evidenceLinks'
  | 'summary'
  | 'nextSteps'
  | 'reporterTarget'
  | 'projectPath'
  | 'runPath'
  | 'idempotencyKey'
  | 'deliverables'
  | 'runCommands'
  | 'modelPolicy'
  | 'allowPaid'
  | 'executionProvider'
  | 'modelConfig'
>>;

function parseAgentType(raw: unknown): Task['agent'] | undefined {
  if (raw !== 'cursor' && raw !== 'codex' && raw !== 'openclaw' && raw !== 'auto') {
    return undefined;
  }
  return { type: raw };
}

function parseThought(thought?: string): { description: string; meta: TaskThoughtMeta } {
  if (!thought) return { description: '', meta: {} };
  const start = thought.lastIndexOf(META_MARKER);
  if (start < 0) return { description: thought, meta: {} };

  const end = thought.indexOf(META_SUFFIX, start);
  if (end < 0) return { description: thought, meta: {} };

  const desc = thought.slice(0, start).trimEnd();
  const rawJson = thought.slice(start + META_MARKER.length, end).trim();
  try {
    const parsed = JSON.parse(rawJson) as TaskThoughtMeta;
    return { description: desc, meta: parsed ?? {} };
  } catch {
    return { description: thought, meta: {} };
  }
}

function buildThought(description: string, meta: TaskThoughtMeta): string {
  const cleanDescription = description?.trim() ?? '';
  const compactMeta: TaskThoughtMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    (compactMeta as Record<string, unknown>)[key] = value;
  }
  if (Object.keys(compactMeta).length === 0) return cleanDescription;
  return `${cleanDescription}\n\n${META_MARKER}${JSON.stringify(compactMeta)}${META_SUFFIX}`;
}

export function openClawTaskToTask(oc: OpenClawTask): Task {
  const now = new Date().toISOString();
  const { description, meta } = parseThought(oc.thought);
  // 如果 title 为空，使用 id 作为备用显示
  const taskName = oc.title?.trim() || `任務-${oc.id.slice(-6)}`;
  const t: Task = {
    id: oc.id,
    name: taskName,
    description,
    status: OC_TO_TASK_STATUS[oc.status] ?? 'ready',
    tags: meta.tags && meta.tags.length > 0 ? meta.tags.filter((x): x is string => Boolean(x)) : (oc.cat ? [oc.cat] : []),
    owner: meta.owner ?? 'OpenClaw',
    priority: meta.priority ?? 3,
    scheduleType: meta.scheduleType ?? 'manual',
    scheduleExpr: meta.scheduleExpr,
    lastRunStatus: oc.progress >= 100 ? 'success' : undefined,
    lastRunAt: undefined,
    taskType: meta.taskType,
    complexity: meta.complexity,
    riskLevel: meta.riskLevel,
    deadline: meta.deadline,
    reviewer: meta.reviewer,
    rollbackPlan: meta.rollbackPlan,
    acceptanceCriteria: meta.acceptanceCriteria,
    evidenceLinks: meta.evidenceLinks,
    summary: meta.summary,
    nextSteps: meta.nextSteps,
    reporterTarget: meta.reporterTarget,
    projectPath: meta.projectPath,
    runPath: meta.runPath,
    idempotencyKey: meta.idempotencyKey,
    deliverables: meta.deliverables,
    runCommands: meta.runCommands,
    modelPolicy: meta.modelPolicy,
    agent: parseAgentType((meta as Record<string, unknown>).agentType),
    modelConfig: meta.modelConfig,
    allowPaid: meta.allowPaid,
    executionProvider: meta.executionProvider,
    updatedAt: now,
    createdAt: now,
    fromReviewId: oc.fromR ?? undefined,
  };

  return t;
}

export function taskToOpenClawTask(t: Partial<Task> & { id: string }): Partial<OpenClawTask> & { id: string } {
  const status = t.status ? (TASK_TO_OC_STATUS[t.status] ?? 'queued') : 'queued';
  const thought = buildThought(t.description ?? '', {
    owner: t.owner,
    priority: t.priority,
    scheduleType: t.scheduleType,
    scheduleExpr: t.scheduleExpr,
    tags: t.tags,
    taskType: t.taskType,
    complexity: t.complexity,
    riskLevel: t.riskLevel,
    deadline: t.deadline,
    reviewer: t.reviewer,
    rollbackPlan: t.rollbackPlan,
    acceptanceCriteria: t.acceptanceCriteria,
    evidenceLinks: t.evidenceLinks,
    summary: t.summary,
    nextSteps: t.nextSteps,
    reporterTarget: t.reporterTarget,
    projectPath: t.projectPath,
    runPath: t.runPath,
    idempotencyKey: t.idempotencyKey,
    deliverables: t.deliverables,
    runCommands: t.runCommands,
    modelPolicy: t.modelPolicy,
    modelConfig: t.modelConfig,
    allowPaid: t.allowPaid,
    executionProvider: t.executionProvider,
    ...(t.agent?.type ? { agentType: t.agent.type } : {}),
  });
  return {
    id: t.id,
    title: t.name ?? '',
    thought: thought || undefined,
    status,
    cat: normalizeOpenClawCat(t.tags?.[0] as string | undefined),
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

  let agentType: Run['agentType'] | undefined;
  let modelUsed: Run['modelUsed'] | undefined;
  let tokenUsage: Run['tokenUsage'] | undefined;
  let costUsd: Run['costUsd'] | undefined;
  try {
    const parsed = JSON.parse(inputSummary);
    const candidate = (parsed as Record<string, unknown>)?.agentType;
    const modelCandidate = (parsed as Record<string, unknown>)?.modelUsed;
    const tokenCandidate = (parsed as Record<string, unknown>)?.tokenUsage as Record<string, unknown> | undefined;
    const costCandidate = (parsed as Record<string, unknown>)?.costUsd;
    if (candidate === 'cursor' || candidate === 'codex' || candidate === 'openclaw' || candidate === 'auto') {
      agentType = candidate;
    }
    if (typeof modelCandidate === 'string' && modelCandidate.trim()) {
      modelUsed = modelCandidate;
    }
    if (
      tokenCandidate &&
      typeof tokenCandidate.input === 'number' &&
      typeof tokenCandidate.output === 'number' &&
      typeof tokenCandidate.total === 'number'
    ) {
      tokenUsage = {
        input: tokenCandidate.input,
        output: tokenCandidate.output,
        total: tokenCandidate.total,
        estimated: Boolean(tokenCandidate.estimated),
      };
    }
    if (typeof costCandidate === 'number') {
      costUsd = costCandidate;
    } else if (costCandidate === null) {
      costUsd = null;
    }
  } catch {
    // ignore malformed input_summary
  }
  
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
    agentType,
    modelUsed,
    tokenUsage,
    costUsd,
  };
}
