/**
 * OpenClaw v4 板資料 — 讀寫 Supabase
 * 表：openclaw_tasks, openclaw_reviews, openclaw_automations
 */
import { supabase, hasSupabase } from './supabase.js';

// 與 openclaw-cursor.jsx 一致的型別
export interface OpenClawTask {
  id: string;
  title: string;
  cat: string;
  status: string;
  progress: number;
  auto: boolean;
  fromR?: string;
  subs: { t: string; d: boolean }[];
  thought?: string;
}

export interface OpenClawReview {
  id: string;
  title: string;
  type: string;
  desc: string;
  src: string;
  pri: string;
  status: string;
  reasoning?: string;
  date?: string;
  created_at?: string;
}

export interface OpenClawAutomation {
  id: string;
  name: string;
  cron: string;
  active: boolean;
  chain: string[];
  health: number;
  runs: number;
  lastRun: string;
}

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

function mapTask(row: Record<string, unknown>): OpenClawTask {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    cat: String(row.cat ?? 'feature'),
    status: String(row.status ?? 'queued'),
    progress: Number(row.progress ?? 0),
    auto: Boolean(row.auto),
    fromR: row.from_review_id ? String(row.from_review_id) : undefined,
    subs: Array.isArray(row.subs) ? (row.subs as { t: string; d: boolean }[]) : [],
    thought: row.thought ? String(row.thought) : undefined,
  };
}

function mapReview(row: Record<string, unknown>): OpenClawReview {
  const updated = row.updated_at ? new Date(String(row.updated_at)) : new Date();
  const date = `${String(updated.getMonth() + 1).padStart(2, '0')}-${String(updated.getDate()).padStart(2, '0')}`;
  const created_at = row.created_at ? String(row.created_at) : undefined;
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    type: String(row.type ?? 'tool'),
    desc: String(row.description ?? ''),
    src: String(row.src ?? ''),
    pri: String(row.pri ?? 'medium'),
    status: String(row.status ?? 'pending'),
    reasoning: row.reasoning ? String(row.reasoning) : undefined,
    date,
    created_at,
  };
}

function mapAutomation(row: Record<string, unknown>): OpenClawAutomation {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    cron: String(row.cron ?? ''),
    active: Boolean(row.active),
    chain: Array.isArray(row.chain) ? (row.chain as string[]) : [],
    health: Number(row.health ?? 100),
    runs: Number(row.runs ?? 0),
    lastRun: String(row.last_run ?? ''),
  };
}

export async function fetchOpenClawTasks(): Promise<OpenClawTask[]> {
  if (!hasSupabase() || !supabase) return [];
  const { data, error } = await supabase.from('openclaw_tasks').select('*').order('updated_at', { ascending: false });
  if (error) {
    console.error('[OpenClaw] fetch tasks error:', error.message);
    return [];
  }
  return (data ?? []).map(mapTask);
}

/** 依 ID 取得單一任務，較 fetchOpenClawTasks 快，適合 run 等單筆查詢 */
export async function fetchOpenClawTaskById(taskId: string): Promise<OpenClawTask | null> {
  if (!hasSupabase() || !supabase) return null;
  const { data, error } = await supabase.from('openclaw_tasks').select('*').eq('id', taskId).single();
  if (error || !data) return null;
  return mapTask(data as Record<string, unknown>);
}

export async function upsertOpenClawTask(task: Partial<OpenClawTask> & { id: string }): Promise<OpenClawTask | null> {
  if (!hasSupabase() || !supabase) return null;
  // IMPORTANT: This function is used by runtime state sync (e.g. setTaskExecutionState).
  // If we blindly default missing fields to "", we can accidentally wipe existing task data.
  // Merge with existing row first to keep updates safe and idempotent.
  const prev = await fetchOpenClawTaskById(task.id).catch(() => null);
  const row = {
    id: task.id,
    title: task.title ?? prev?.title ?? '',
    cat: normalizeOpenClawCat(task.cat ?? prev?.cat ?? 'feature'),
    status: task.status ?? prev?.status ?? 'queued',
    progress: task.progress ?? prev?.progress ?? 0,
    auto: task.auto ?? prev?.auto ?? false,
    from_review_id: task.fromR ?? prev?.fromR ?? null,
    subs: task.subs ?? prev?.subs ?? [],
    thought: task.thought ?? prev?.thought ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('openclaw_tasks').upsert(row, { onConflict: 'id' }).select().single();
  if (error) {
    console.error('[OpenClaw] upsert task error:', error.message);
    return null;
  }
  return mapTask(data as Record<string, unknown>);
}

export async function fetchOpenClawReviews(): Promise<OpenClawReview[]> {
  if (!hasSupabase() || !supabase) return [];
  const { data, error } = await supabase.from('openclaw_reviews').select('*').order('updated_at', { ascending: false });
  if (error) {
    console.error('[OpenClaw] fetch reviews error:', error.message);
    return [];
  }
  return (data ?? []).map(mapReview);
}

export async function upsertOpenClawReview(review: Partial<OpenClawReview> & { id: string }): Promise<OpenClawReview | null> {
  if (!hasSupabase() || !supabase) return null;
  const row = {
    id: review.id,
    title: review.title ?? '',
    type: review.type ?? 'tool',
    description: review.desc ?? '',
    src: review.src ?? '',
    pri: review.pri ?? 'medium',
    status: review.status ?? 'pending',
    reasoning: review.reasoning ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('openclaw_reviews').upsert(row, { onConflict: 'id' }).select().single();
  if (error) {
    console.error('[OpenClaw] upsert review error:', error.message);
    return null;
  }
  return mapReview(data as Record<string, unknown>);
}

/** 刪除發想審核 */
export async function deleteOpenClawReview(reviewId: string): Promise<boolean> {
  if (!hasSupabase() || !supabase) return false;
  const { error } = await supabase.from('openclaw_reviews').delete().eq('id', reviewId);
  if (error) {
    console.error('[OpenClaw] delete review error:', error.message);
    return false;
  }
  return true;
}

/** 依 from_review_id 取得任務（發想審核轉出的任務） */
export async function fetchOpenClawTasksByFromReviewId(reviewId: string): Promise<OpenClawTask[]> {
  if (!hasSupabase() || !supabase) return [];
  const { data, error } = await supabase
    .from('openclaw_tasks')
    .select('*')
    .eq('from_review_id', reviewId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[OpenClaw] fetch tasks by from_review_id error:', error.message);
    return [];
  }
  return (data ?? []).map(mapTask);
}

export async function fetchOpenClawAutomations(): Promise<OpenClawAutomation[]> {
  if (!hasSupabase() || !supabase) return [];
  const { data, error } = await supabase.from('openclaw_automations').select('*').order('name');
  if (error) {
    console.error('[OpenClaw] fetch automations error:', error.message);
    return [];
  }
  return (data ?? []).map(mapAutomation);
}

export async function upsertOpenClawAutomation(a: Partial<OpenClawAutomation> & { id: string }): Promise<OpenClawAutomation | null> {
  if (!hasSupabase() || !supabase) return null;
  const row = {
    id: a.id,
    name: a.name ?? '',
    cron: a.cron ?? '',
    active: a.active ?? true,
    chain: a.chain ?? [],
    health: a.health ?? 100,
    runs: a.runs ?? 0,
    last_run: a.lastRun ?? '',
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('openclaw_automations').upsert(row, { onConflict: 'id' }).select().single();
  if (error) {
    console.error('[OpenClaw] upsert automation error:', error.message);
    return null;
  }
  return mapAutomation(data as Record<string, unknown>);
}

const SEED_AUTOMATIONS: (Partial<OpenClawAutomation> & { id: string })[] = [
  { id: 'a1', name: '安全掃描', cron: '0 */6 * * *', active: true, chain: ['程式碼分析', '漏洞掃描', '靜態檢測'], health: 94, runs: 128, lastRun: '2026-02-13 01:30' },
  { id: 'a2', name: '套件更新', cron: '0 3 * * 1', active: true, chain: ['自動升版', '單元測試', '金絲雀部署'], health: 91, runs: 52, lastRun: '2026-02-10 03:00' },
  { id: 'a3', name: '效能基線', cron: '30 2 * * *', active: false, chain: ['Lighthouse', '壓力測試', '出報告'], health: 88, runs: 77, lastRun: '2026-02-11 02:30' },
  { id: 'a4', name: '發行紀錄', cron: '0 18 * * 5', active: true, chain: ['蒐集 PR', 'AI 摘要', '發佈'], health: 96, runs: 39, lastRun: '2026-02-07 18:00' },
];

export async function seedOpenClawAutomationsIfEmpty(): Promise<boolean> {
  if (!hasSupabase() || !supabase) return false;
  const existing = await fetchOpenClawAutomations();
  if (existing.length > 0) return false;
  for (const a of SEED_AUTOMATIONS) {
    const ok = await upsertOpenClawAutomation(a);
    if (!ok) {
      console.warn('[OpenClaw] seed automation failed:', a.id);
    }
  }
  console.log('[OpenClaw] seeded automations:', SEED_AUTOMATIONS.length);
  return true;
}

export interface OpenClawEvolutionLog {
  id?: string;
  t: string;
  x: string;
  c?: string;
  tag?: string;
  tc?: string;
}

export interface EvolutionLogRow extends OpenClawEvolutionLog {
  id?: string;
  created_at?: string;
}

export async function fetchOpenClawEvolutionLog(): Promise<EvolutionLogRow[]> {
  if (!hasSupabase() || !supabase) return [];
  const { data, error } = await supabase.from('openclaw_evolution_log').select('id, t, x, c, tag, tc, created_at').order('created_at', { ascending: false }).limit(100);
  if (error) {
    console.error('[OpenClaw] fetch evolution_log error:', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id ? String(row.id) : undefined,
    t: String(row.t ?? ''),
    x: String(row.x ?? ''),
    c: row.c ? String(row.c) : undefined,
    tag: row.tag ? String(row.tag) : undefined,
    tc: row.tc ? String(row.tc) : undefined,
    created_at: row.created_at ? String(row.created_at) : undefined,
  }));
}

export async function insertOpenClawEvolutionLog(e: OpenClawEvolutionLog): Promise<boolean> {
  if (!hasSupabase() || !supabase) return false;
  const { error } = await supabase.from('openclaw_evolution_log').insert({
    t: e.t,
    x: e.x,
    c: e.c ?? null,
    tag: e.tag ?? null,
    tc: e.tc ?? null,
  });
  if (error) {
    console.error('[OpenClaw] insert evolution_log error:', error.message);
    return false;
  }
  return true;
}

/** 執行紀錄：openclaw_runs 表 */
export interface OpenClawRunRow {
  id: string;
  task_id: string;
  task_name: string;
  status: string;
  started_at: string;
  ended_at?: string | null;
  duration_ms?: number | null;
  input_summary?: string | null;
  output_summary?: string | null;
  steps?: unknown;
  created_at?: string;
}

// Supabase table `openclaw_runs` enforces a status CHECK constraint.
// Keep a defensive mapping here so runtime code can use richer internal statuses
// (e.g. timeout/retrying) without breaking DB writes.
function coerceRunStatusForDb(status: string): string {
  const s = String(status ?? '').trim().toLowerCase();
  if (!s) return 'queued';
  if (s === 'timeout') return 'failed';
  if (s === 'retrying') return 'running';
  if (s === 'queued' || s === 'running' || s === 'success' || s === 'failed' || s === 'cancelled') return s;
  return 'failed';
}

export async function insertOpenClawRun(payload: {
  task_id: string;
  task_name: string;
  status?: string;
  started_at?: string;
  input_summary?: string | null;
  steps?: unknown;
}): Promise<OpenClawRunRow | null> {
  if (!hasSupabase() || !supabase) return null;
  const started = payload.started_at ?? new Date().toISOString();
  const { data, error } = await supabase
    .from('openclaw_runs')
    .insert({
      task_id: payload.task_id,
      task_name: payload.task_name,
      status: coerceRunStatusForDb(payload.status ?? 'queued'),
      started_at: started,
      input_summary: payload.input_summary ?? null,
      steps: Array.isArray(payload.steps) ? payload.steps : [],
    })
    .select('id, task_id, task_name, status, started_at, ended_at, duration_ms, input_summary, output_summary, steps, created_at')
    .single();
  if (error) {
    console.error('[OpenClaw] insert openclaw_runs error:', error.message);
    return null;
  }
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    task_id: String(row.task_id),
    task_name: String(row.task_name),
    status: String(row.status),
    started_at: String(row.started_at),
    ended_at: row.ended_at ? String(row.ended_at) : null,
    duration_ms: row.duration_ms != null ? Number(row.duration_ms) : null,
    input_summary: row.input_summary ? String(row.input_summary) : null,
    output_summary: row.output_summary ? String(row.output_summary) : null,
    steps: row.steps,
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

export async function updateOpenClawRun(
  runId: string,
  updates: { status?: string; ended_at?: string; duration_ms?: number; input_summary?: string; output_summary?: string; steps?: unknown }
): Promise<boolean> {
  if (!hasSupabase() || !supabase) return false;
  const body: Record<string, unknown> = {};
  if (updates.status != null) body.status = coerceRunStatusForDb(updates.status);
  if (updates.ended_at != null) body.ended_at = updates.ended_at;
  if (updates.duration_ms != null) body.duration_ms = updates.duration_ms;
  if (updates.input_summary != null) body.input_summary = updates.input_summary;
  if (updates.output_summary != null) body.output_summary = updates.output_summary;
  if (updates.steps != null) body.steps = updates.steps;
  const { error } = await supabase.from('openclaw_runs').update(body).eq('id', runId);
  if (error) {
    console.error('[OpenClaw] update openclaw_runs error:', error.message);
    return false;
  }
  return true;
}

export async function fetchOpenClawRuns(limit = 100, taskId?: string): Promise<OpenClawRunRow[]> {
  if (!hasSupabase() || !supabase) return [];
  let q = supabase
    .from('openclaw_runs')
    .select('id, task_id, task_name, status, started_at, ended_at, duration_ms, input_summary, output_summary, steps, created_at')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (taskId) q = q.eq('task_id', taskId);
  const { data, error } = await q;
  if (error) {
    console.error('[OpenClaw] fetch openclaw_runs error:', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => mapOpenClawRunRow(row));
}

function mapOpenClawRunRow(row: Record<string, unknown>): OpenClawRunRow {
  return {
    id: String(row.id),
    task_id: String(row.task_id),
    task_name: String(row.task_name),
    status: String(row.status),
    started_at: String(row.started_at),
    ended_at: row.ended_at ? String(row.ended_at) : null,
    duration_ms: row.duration_ms != null ? Number(row.duration_ms) : null,
    input_summary: row.input_summary ? String(row.input_summary) : null,
    output_summary: row.output_summary ? String(row.output_summary) : null,
    steps: row.steps,
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

export async function fetchOpenClawRunById(runId: string): Promise<OpenClawRunRow | null> {
  if (!hasSupabase() || !supabase) return null;
  const { data, error } = await supabase
    .from('openclaw_runs')
    .select('id, task_id, task_name, status, started_at, ended_at, duration_ms, input_summary, output_summary, steps, created_at')
    .eq('id', runId)
    .single();
  if (error || !data) return null;
  return mapOpenClawRunRow(data as Record<string, unknown>);
}

export interface OpenClawUIAction {
  id: string;
  action_code: string;
  selector: string;
  label?: string;
  category?: string;
  api_path?: string;
  n8n_webhook_url?: string;
}

export async function fetchOpenClawAuditLogs(): Promise<{ id: string; action: string; resource?: string; resource_id?: string; user_id?: string; created_at?: string; diff?: unknown }[]> {
  if (!hasSupabase() || !supabase) return [];
  const { data, error } = await supabase.from('openclaw_audit_logs').select('id, action, resource, resource_id, user_id, created_at, diff').order('created_at', { ascending: false }).limit(100);
  if (error) {
    console.error('[OpenClaw] fetch audit_logs error:', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    action: String(row.action ?? ''),
    resource: row.resource ? String(row.resource) : undefined,
    resource_id: row.resource_id ? String(row.resource_id) : undefined,
    user_id: row.user_id ? String(row.user_id) : undefined,
    created_at: row.created_at ? String(row.created_at) : undefined,
    diff: row.diff,
  }));
}

/** 與 openclaw-cursor.jsx 一致的預設 reviews / tasks / automations，表空時 seed 用 */
const SEED_REVIEWS: (Partial<OpenClawReview> & { id: string })[] = [
  { id: 'r1', title: 'Bun v1.2 Runtime 遷移', type: 'tool', desc: '冷啟動 3x 提升', src: '技術雷達', pri: 'high', status: 'pending', reasoning: '偵測到 Bun v1.2 發布。對比 Node.js 18：冷啟動 320ms→95ms、HTTP throughput +47%。遷移風險中等（6/10），需驗證 native addon 相容性。建議先在 staging PoC。' },
  { id: 'r2', title: 'Worker Thread 記憶體洩漏', type: 'issue', desc: '高併發下記憶體異常增長', src: '自動監控', pri: 'critical', status: 'pending', reasoning: '監控偵測 Worker Pool >500 req/s 時記憶體線性增長 ~12MB/min。Heap snapshot 定位到 EventEmitter listener 未解綁（callback 閉包持有 Buffer ref）。需 hotfix。' },
  { id: 'r3', title: 'Zod v4 驗證框架', type: 'skill', desc: '強型別 + tree-shake 8KB', src: '社群', pri: 'medium', status: 'pending', reasoning: '現有 23 個 API 路由各自手寫驗證。Zod v4 可統一邏輯、產出 TS 型別、bundle 僅 +8KB。ROI 高。' },
  { id: 'r4', title: 'WebSocket 指數退避', type: 'issue', desc: '避免重連雪崩', src: '日誌分析', pri: 'high', status: 'approved', reasoning: '斷線後同時重連造成伺服器過載。設計 exponential backoff + jitter 方案。' },
  { id: 'r5', title: 'Drizzle ORM', type: 'learn', desc: 'TS 原生 ORM，效能 2.4x Prisma', src: '知識庫', pri: 'medium', status: 'approved', reasoning: 'Drizzle 完全 edge-compatible、查詢效能高、型別安全。值得投入學習。' },
];

/** 表空時 seed 預設 reviews，確保批准/駁回會持久化 */
export async function seedOpenClawReviewsIfEmpty(): Promise<boolean> {
  if (!hasSupabase() || !supabase) return false;
  const existing = await fetchOpenClawReviews();
  if (existing.length > 0) return false;
  for (const r of SEED_REVIEWS) {
    const ok = await upsertOpenClawReview(r);
    if (!ok) {
      console.warn('[OpenClaw] seed review failed:', r.id);
    }
  }
  console.log('[OpenClaw] seeded reviews:', SEED_REVIEWS.length);
  return true;
}

export async function fetchOpenClawUIActions(): Promise<OpenClawUIAction[]> {
  if (!hasSupabase() || !supabase) return [];
  const { data, error } = await supabase.from('openclaw_ui_actions').select('*').order('action_code');
  if (error) {
    console.error('[OpenClaw] fetch ui_actions error:', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    action_code: String(row.action_code ?? ''),
    selector: String(row.selector ?? ''),
    label: row.label ? String(row.label) : undefined,
    category: row.category ? String(row.category) : undefined,
    api_path: row.api_path ? String(row.api_path) : undefined,
    n8n_webhook_url: row.n8n_webhook_url ? String(row.n8n_webhook_url) : undefined,
  }));
}

// ==================== Projects 專案製作 ====================

export interface OpenClawProjectPhase {
  id: string;
  name: string;
  done: boolean;
  assigneeAgent?: string;
}

export interface OpenClawProject {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'in_progress' | 'done' | 'paused';
  progress: number;
  phases: OpenClawProjectPhase[];
  notes: string;
  assigneeAgent?: string;
  assigneeLabel?: string;
  deadline?: string;
  priority?: number;
  tags?: string[];
  deliverablesSummary?: string;
  linkedTaskIds?: string[];
  updatedAt: string;
  createdAt: string;
}

export async function fetchOpenClawProjects(): Promise<OpenClawProject[]> {
  if (!hasSupabase() || !supabase) return [];
  const { data: projects, error } = await supabase
    .from('openclaw_projects')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[OpenClaw] fetch projects error:', error.message);
    return [];
  }
  // 同時讀取 phases
  const { data: phases, error: phasesError } = await supabase
    .from('openclaw_project_phases')
    .select('*')
    .order('sort_order', { ascending: true });
  if (phasesError) {
    console.error('[OpenClaw] fetch phases error:', phasesError.message);
  }
  const phasesByProject = new Map<string, OpenClawProjectPhase[]>();
  for (const ph of (phases ?? [])) {
    const pid = String(ph.project_id);
    if (!phasesByProject.has(pid)) phasesByProject.set(pid, []);
    phasesByProject.get(pid)!.push({
      id: String(ph.id),
      name: String(ph.name ?? ''),
      done: Boolean(ph.done),
      assigneeAgent: ph.assignee_agent ? String(ph.assignee_agent) : undefined,
    });
  }
  return (projects ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    status: String(row.status ?? 'planning') as OpenClawProject['status'],
    progress: Number(row.progress ?? 0),
    phases: phasesByProject.get(String(row.id)) ?? [],
    notes: String(row.notes ?? ''),
    assigneeAgent: row.assignee_agent ? String(row.assignee_agent) : undefined,
    assigneeLabel: row.assignee_label ? String(row.assignee_label) : undefined,
    deadline: row.deadline ? String(row.deadline).slice(0, 10) : undefined,
    priority: row.priority != null ? Number(row.priority) : undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : undefined,
    deliverablesSummary: row.deliverables_summary ? String(row.deliverables_summary) : undefined,
    linkedTaskIds: Array.isArray(row.linked_task_ids) ? (row.linked_task_ids as string[]) : undefined,
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }));
}

export async function upsertOpenClawProject(project: Partial<OpenClawProject> & { id: string }): Promise<OpenClawProject | null> {
  if (!hasSupabase() || !supabase) return null;
  const now = new Date().toISOString();
  // 只放有明確值的欄位，避免 PATCH 時把未傳的欄位覆蓋成空字串
  const payload: Record<string, unknown> = { id: project.id, updated_at: now };
  if (project.title !== undefined) payload.title = project.title;
  if (project.description !== undefined) payload.description = project.description;
  if (project.status !== undefined) payload.status = project.status;
  if (project.progress !== undefined) payload.progress = project.progress;
  if (project.notes !== undefined) payload.notes = project.notes;
  if (project.createdAt !== undefined) payload.created_at = project.createdAt;
  const { data, error } = await supabase.from('openclaw_projects').upsert(payload).select().single();
  if (error) {
    console.error('[OpenClaw] upsert project error:', error.message);
    return null;
  }
  // 處理 phases
  if (project.phases && project.phases.length > 0) {
    // 先刪除舊 phases
    await supabase.from('openclaw_project_phases').delete().eq('project_id', project.id);
    // 插入新 phases
    const phaseRows = project.phases.map((ph, idx) => ({
      id: ph.id || `ph-${Date.now()}-${idx}`,
      project_id: project.id,
      name: ph.name,
      done: ph.done,
      sort_order: idx,
      assignee_agent: ph.assigneeAgent ?? null,
      updated_at: now,
      created_at: now,
    }));
    const { error: phError } = await supabase.from('openclaw_project_phases').insert(phaseRows);
    if (phError) {
      console.error('[OpenClaw] insert phases error:', phError.message);
    }
  }
  return fetchOpenClawProjects().then(list => list.find(p => p.id === project.id) ?? null);
}

export async function deleteOpenClawProject(id: string): Promise<boolean> {
  if (!hasSupabase() || !supabase) return false;
  const { error } = await supabase.from('openclaw_projects').delete().eq('id', id);
  if (error) {
    console.error('[OpenClaw] delete project error:', error.message);
    return false;
  }
  return true;
}

// ========== 小蔡發想審核 (XiaoCai Ideas) ==========

export interface XiaoCaiIdea {
  id: string;
  number: number;
  title: string;
  summary: string;
  file_path: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  review_note?: string;
  tags: string[];
}

function mapXiaoCaiIdea(row: Record<string, unknown>): XiaoCaiIdea {
  return {
    id: String(row.id),
    number: Number(row.number ?? 0),
    title: String(row.title ?? ''),
    summary: String(row.summary ?? ''),
    file_path: String(row.file_path ?? ''),
    status: (row.status as 'pending' | 'approved' | 'rejected') ?? 'pending',
    created_at: String(row.created_at ?? new Date().toISOString()),
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : undefined,
    review_note: row.review_note ? String(row.review_note) : undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
  };
}

export async function fetchXiaoCaiIdeas(): Promise<XiaoCaiIdea[]> {
  if (!hasSupabase() || !supabase) return [];
  const { data, error } = await supabase
    .from('xiaocai_ideas')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[OpenClaw] fetch xiaocai ideas error:', error.message);
    return [];
  }
  return (data ?? []).map(mapXiaoCaiIdea);
}

export async function upsertXiaoCaiIdea(idea: Partial<XiaoCaiIdea> & { id: string }): Promise<XiaoCaiIdea | null> {
  if (!hasSupabase() || !supabase) return null;
  
  // 先讀取現有資料（如果是更新操作）
  const { data: existing } = await supabase
    .from('xiaocai_ideas')
    .select('*')
    .eq('id', idea.id)
    .single();
  
  // 合併資料：優先使用傳入的值，否則使用現有值
  const row: Record<string, unknown> = {
    id: idea.id,
    title: idea.title ?? existing?.title ?? '',
    summary: idea.summary ?? existing?.summary ?? '',
    file_path: idea.file_path ?? existing?.file_path ?? '',
    status: idea.status ?? existing?.status ?? 'pending',
    tags: idea.tags ?? existing?.tags ?? [],
    review_note: idea.review_note ?? existing?.review_note ?? null,
    reviewed_at: idea.reviewed_at ?? existing?.reviewed_at ?? null,
    updated_at: new Date().toISOString(),
  };
  
  const { data, error } = await supabase
    .from('xiaocai_ideas')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) {
    console.error('[OpenClaw] upsert xiaocai idea error:', error.message);
    return null;
  }
  return mapXiaoCaiIdea(data as Record<string, unknown>);
}

export async function seedXiaoCaiIdeasIfEmpty(): Promise<void> {
  if (!hasSupabase() || !supabase) return;
  const { count, error } = await supabase
    .from('xiaocai_ideas')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('[OpenClaw] check xiaocai ideas error:', error.message);
    return;
  }
  if (count && count > 0) return;
  
  // 插入預設資料
  const defaultIdeas: Partial<XiaoCaiIdea>[] = [
    {
      id: 'idea-001',
      number: 1,
      title: 'Token 消耗優化策略',
      summary: '發現 5 個高 Token 情境：連續錯誤重試、重複搜尋、大段代碼複製等，提出搜尋快取、指數退避、Context 壓縮等解決方案。',
      file_path: 'docs/xiaocai-ideas/pending/idea-001-token-optimization.md',
      status: 'pending',
      tags: ['optimization', 'token', 'performance'],
    },
  ];
  
  for (const idea of defaultIdeas) {
    await upsertXiaoCaiIdea(idea as XiaoCaiIdea & { id: string });
  }
  console.log('[OpenClaw] seeded default xiaocai ideas');
}
