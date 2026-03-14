// openclawSupabase.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' as string }); // 確保載入 .env.local

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables!');
  // process.exit(1); // 不直接退出，讓應用程式可以繼續運行，但相關功能會受限
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: false,
  },
});

export const supabaseServiceRole = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
  auth: {
    persistSession: false,
  },
});

// ── 類型定義（供其他模組使用）──

export interface OpenClawTask {
  id?: string; name: string; status: string; priority?: number; owner?: string;
  description?: string; result?: string; created_at?: string; updated_at?: string;
  from_review_id?: string; tags?: string[];
  title?: string; thought?: string; cat?: string; progress?: number;
  auto?: boolean; subs?: { t: string; d: boolean }[];
  fromR?: string;
  [key: string]: unknown;
}

export interface OpenClawReview {
  id?: string; title: string; status: string; content?: string;
  created_at?: string; updated_at?: string;
  desc?: string; pri?: string; type?: string; reasoning?: string; src?: string;
  [key: string]: unknown;
}

export interface OpenClawProject {
  id?: string; name: string; description?: string; status?: string;
  created_at?: string; updated_at?: string; [key: string]: unknown;
}

export interface OpenClawMemory {
  id?: string; key: string; value: string; category?: string;
  created_at?: string; updated_at?: string; [key: string]: unknown;
}

export interface EvolutionLogRow {
  id?: string; event_type: string; event_data?: Record<string, unknown>;
  created_at?: string;
  tag?: string; t?: string; x?: string; c?: string;
  [key: string]: unknown;
}

export interface OpenClawRunRow {
  id?: string; task_id: string; status: string; output?: string;
  started_at?: string; finished_at?: string;
  task_name?: string; ended_at?: string; duration_ms?: number;
  input_summary?: string; output_summary?: string;
  steps?: unknown;
  [key: string]: unknown;
}

// ── Supabase CRUD 函數 ──

const TABLE_TASKS = 'openclaw_tasks';
const TABLE_REVIEWS = 'openclaw_reviews';
const TABLE_AUTOMATIONS = 'openclaw_automations';
const TABLE_EVOLUTION = 'openclaw_evolution_log';
const TABLE_RUNS = 'openclaw_runs';
const TABLE_AUDIT = 'openclaw_audit_logs';
const TABLE_MEMORY = 'openclaw_memory';
const TABLE_PROJECTS = 'openclaw_projects';
const TABLE_UI_ACTIONS = 'openclaw_ui_actions';

// Tasks
export async function fetchOpenClawTasks(): Promise<OpenClawTask[]> {
  const { data } = await supabaseServiceRole.from(TABLE_TASKS).select('*').order('created_at', { ascending: false });
  return (data ?? []) as OpenClawTask[];
}
export async function fetchOpenClawTaskById(id: string): Promise<OpenClawTask | null> {
  const { data } = await supabaseServiceRole.from(TABLE_TASKS).select('*').eq('id', id).single();
  return (data ?? null) as OpenClawTask | null;
}
export async function upsertOpenClawTask(task: Partial<OpenClawTask>): Promise<OpenClawTask | null> {
  // 如果有 id 且只更新部分欄位，用 update 而不是 upsert（避免覆蓋其他欄位為 null）
  if (task.id && Object.keys(task).length < 5) {
    const { id, ...updates } = task;
    const { data, error } = await supabaseServiceRole.from(TABLE_TASKS).update(updates as Record<string, unknown>).eq('id', id).select().single();
    if (error) {
      console.error(`[upsertOpenClawTask] update failed for ${id}:`, error.message);
    }
    return (data ?? null) as OpenClawTask | null;
  }
  const { data, error } = await supabaseServiceRole.from(TABLE_TASKS).upsert(task as Record<string, unknown>).select().single();
  if (error) {
    console.error(`[upsertOpenClawTask] upsert failed:`, error.message);
  }
  return (data ?? null) as OpenClawTask | null;
}
export async function fetchOpenClawTasksByFromReviewId(reviewId: string): Promise<OpenClawTask[]> {
  const { data } = await supabaseServiceRole.from(TABLE_TASKS).select('*').eq('from_review_id', reviewId);
  return (data ?? []) as OpenClawTask[];
}

// Reviews
export async function fetchOpenClawReviews(): Promise<OpenClawReview[]> {
  const { data } = await supabaseServiceRole.from(TABLE_REVIEWS).select('*').order('created_at', { ascending: false });
  return (data ?? []) as OpenClawReview[];
}
export async function upsertOpenClawReview(review: Partial<OpenClawReview>): Promise<OpenClawReview | null> {
  const { data } = await supabaseServiceRole.from(TABLE_REVIEWS).upsert(review as Record<string, unknown>).select().single();
  return (data ?? null) as OpenClawReview | null;
}
export async function deleteOpenClawReview(id: string): Promise<void> {
  await supabaseServiceRole.from(TABLE_REVIEWS).delete().eq('id', id);
}
export async function seedOpenClawReviewsIfEmpty(): Promise<void> {
  const { count } = await supabaseServiceRole.from(TABLE_REVIEWS).select('*', { count: 'exact', head: true });
  if ((count ?? 0) === 0) {
    console.log('[openclawSupabase] Reviews table is empty, seeding skipped (no seed data).');
  }
}

// Automations
export async function fetchOpenClawAutomations(): Promise<Record<string, unknown>[]> {
  const { data } = await supabaseServiceRole.from(TABLE_AUTOMATIONS).select('*').order('created_at', { ascending: false });
  return (data ?? []) as Record<string, unknown>[];
}
export async function upsertOpenClawAutomation(auto: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const { data } = await supabaseServiceRole.from(TABLE_AUTOMATIONS).upsert(auto).select().single();
  return (data ?? null) as Record<string, unknown> | null;
}

// Evolution Log
export async function fetchOpenClawEvolutionLog(): Promise<EvolutionLogRow[]> {
  const { data } = await supabaseServiceRole.from(TABLE_EVOLUTION).select('*').order('created_at', { ascending: false });
  return (data ?? []) as EvolutionLogRow[];
}
export async function insertOpenClawEvolutionLog(row: Partial<EvolutionLogRow>): Promise<EvolutionLogRow | null> {
  const { data } = await supabaseServiceRole.from(TABLE_EVOLUTION).insert(row as Record<string, unknown>).select().single();
  return (data ?? null) as EvolutionLogRow | null;
}

// Runs
export async function fetchOpenClawRuns(limit?: number, taskId?: string): Promise<OpenClawRunRow[]> {
  let query = supabaseServiceRole.from(TABLE_RUNS).select('*').order('started_at', { ascending: false });
  if (taskId) query = query.eq('task_id', taskId);
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data ?? []) as OpenClawRunRow[];
}
export async function fetchOpenClawRunById(id: string): Promise<OpenClawRunRow | null> {
  const { data } = await supabaseServiceRole.from(TABLE_RUNS).select('*').eq('id', id).single();
  return (data ?? null) as OpenClawRunRow | null;
}
export async function insertOpenClawRun(run: Partial<OpenClawRunRow>): Promise<OpenClawRunRow | null> {
  const { data } = await supabaseServiceRole.from(TABLE_RUNS).insert(run as Record<string, unknown>).select().single();
  return (data ?? null) as OpenClawRunRow | null;
}
export async function updateOpenClawRun(id: string, updates: Partial<OpenClawRunRow>): Promise<OpenClawRunRow | null> {
  const { data } = await supabaseServiceRole.from(TABLE_RUNS).update(updates as Record<string, unknown>).eq('id', id).select().single();
  return (data ?? null) as OpenClawRunRow | null;
}

// Audit Logs
export async function fetchOpenClawAuditLogs(): Promise<Record<string, unknown>[]> {
  const { data } = await supabaseServiceRole.from(TABLE_AUDIT).select('*').order('created_at', { ascending: false }).limit(100);
  return (data ?? []) as Record<string, unknown>[];
}

// Memory
export async function fetchOpenClawMemory(opts?: { type?: string; source?: string; limit?: number; offset?: number }): Promise<OpenClawMemory[]> {
  let query = supabaseServiceRole.from(TABLE_MEMORY).select('*').order('updated_at', { ascending: false });
  if (opts?.type) query = query.eq('category', opts.type);
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
  const { data } = await query;
  return (data ?? []) as OpenClawMemory[];
}
export async function searchOpenClawMemory(query: string, opts?: { type?: string; source?: string; tags?: string[]; limit?: number }): Promise<OpenClawMemory[]> {
  let q = supabaseServiceRole.from(TABLE_MEMORY).select('*').ilike('key', `%${query}%`);
  if (opts?.type) q = q.eq('category', opts.type);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return (data ?? []) as OpenClawMemory[];
}
export async function upsertOpenClawMemory(mem: Partial<OpenClawMemory>): Promise<OpenClawMemory | null> {
  const { data } = await supabaseServiceRole.from(TABLE_MEMORY).upsert(mem as Record<string, unknown>).select().single();
  return (data ?? null) as OpenClawMemory | null;
}
export async function deleteOpenClawMemory(id: string): Promise<void> {
  await supabaseServiceRole.from(TABLE_MEMORY).delete().eq('id', id);
}
export async function getOpenClawMemoryStats(): Promise<{ total: number }> {
  const { count } = await supabaseServiceRole.from(TABLE_MEMORY).select('*', { count: 'exact', head: true });
  return { total: count ?? 0 };
}

// Projects
export async function fetchOpenClawProjects(): Promise<OpenClawProject[]> {
  const { data } = await supabaseServiceRole.from(TABLE_PROJECTS).select('*').order('created_at', { ascending: false });
  return (data ?? []) as OpenClawProject[];
}
export async function upsertOpenClawProject(proj: Partial<OpenClawProject>): Promise<OpenClawProject | null> {
  const { data } = await supabaseServiceRole.from(TABLE_PROJECTS).upsert(proj as Record<string, unknown>).select().single();
  return (data ?? null) as OpenClawProject | null;
}
export async function deleteOpenClawProject(id: string): Promise<void> {
  await supabaseServiceRole.from(TABLE_PROJECTS).delete().eq('id', id);
}

// UI Actions
export async function fetchOpenClawUIActions(): Promise<Record<string, unknown>[]> {
  const { data } = await supabaseServiceRole.from(TABLE_UI_ACTIONS).select('*').order('created_at', { ascending: false }).limit(50);
  return (data ?? []) as Record<string, unknown>[];
}

// 2026-02-28 NEUXA: 新增模型成本記錄功能
export async function recordModelUsage(modelName: string, tokensUsed: number, cost: number, purpose: string) {
  try {
    const { data, error } = await supabaseServiceRole.from('openclaw_audit_logs').insert([
      {
        action: 'MODEL_USAGE',
        resource: modelName,
        diff: {
          tokens: tokensUsed,
          cost: cost,
          purpose: purpose,
          timestamp: new Date().toISOString(),
        },
      },
    ]);
    if (error) {
      console.error('Error recording model usage:', error);
    } else {
      console.log('Model usage recorded:', data);
    }
  } catch (e) {
    console.error('Exception when recording model usage:', e);
  }
}
