/**
 * OpenClaw 任務板路由 — /api/openclaw/tasks/*
 * 純 Supabase CRUD，不含 run/execution 邏輯
 *
 * GET    /tasks       — 列出任務（含 in-memory fallback）
 *        ?status=pending|running|done|...         — 篩選任務狀態
 *        ?owner=小蔡                              — 篩選任務擁有者
 *        ?priority=3                              — 篩選最低優先級（priority >= N）
 *        ?tags=feature,bug                        — 篩選標籤（逗號分隔，任一匹配即可）
 *        ?search=登入                             — 任務名稱/描述文字搜尋
 *        ?sort=hot|rising|controversial|top|new  — Moltbook Feed 排名算法排序
 *        ?timeFilter=hour|day|week|month|year|all — Top 模式的時間過濾
 *        ?limit=20          — 每頁數量（1-100，預設 20）
 *        ?cursor=t1234567   — 游標分頁：從此 task ID 之後開始
 *        ?offset=40         — 偏移分頁：跳過前 N 筆
 *        ?fields=id,name,status  — Progressive Disclosure：只回傳指定欄位（輕量回應）
 *        ?fields=summary         — 速記：id,name,status,priority,owner,tags,createdAt
 *        ※ 未帶 limit/cursor/offset 時回傳全部（向後相容）
 *        ※ 未帶 fields 時回傳完整物件（向後相容）
 *        ※ 篩選在排序之前套用：取得全部 → 篩選 → 排序 → 分頁 → fields 投影 → 回傳
 * GET    /tasks/:id/full — 完整任務詳情（含 rankingScore、age、activityHistory）
 * POST   /tasks       — 新增任務
 * PATCH  /tasks/:id   — 更新任務
 * DELETE /tasks/:id   — 刪除任務
 */

import { Router } from 'express';
import { createLogger } from '../logger.js';
import { hasSupabase, supabase } from '../supabase.js';
import {
  fetchOpenClawTasks,
  upsertOpenClawTask,
} from '../openclawSupabase.js';
import {
  openClawTaskToTask,
  taskToOpenClawTask,
} from '../openclawMapper.js';
import { tasks } from '../store.js';
import type { Task } from '../types.js';
import { scanTaskPayload } from '../promptGuard.js';
import { rankTasks, isValidSortMode } from '../utils/task-ranking.js';
import type { RankingSortMode } from '../utils/task-ranking.js';
import {
  getCachedFeed,
  setCachedFeed,
  invalidateFeedCache,
  buildCacheKey,
  getDefaultTTL,
} from '../utils/feed-cache.js';

const log = createLogger('openclaw-tasks-route');

export const openclawTasksRouter = Router();

/** OpenClaw raw status → 前端看板 status 映射 */
const OC_STATUS_TO_BOARD: Record<string, string> = {
  queued: 'ready',           // 待執行
  in_progress: 'running',    // 執行中
  done: 'done',              // 完成
  pending_review: 'review',  // 等待審核
  needs_review: 'review',    // 需要審核（別名）
  blocked: 'blocked',        // 卡住
  failed: 'done',            // 失敗（歸入 done，透過 qualityGrade 區分）
  retrying: 'running',       // 重試中
  cancelled: 'done',         // 已取消
  timeout: 'done',           // 逾時
};

// ── Progressive Disclosure: fields 投影 ─────────────────────

/** ?fields=summary 的速記展開：常用輕量欄位 */
const SUMMARY_FIELDS = ['id', 'name', 'status', 'priority', 'owner', 'tags', 'createdAt'];

/**
 * 解析 ?fields= 參數，回傳要保留的欄位陣列。
 * - 未提供 → null（回傳完整物件）
 * - "summary" → SUMMARY_FIELDS
 * - "id,name,status" → ['id','name','status']
 */
function parseFieldsParam(raw: unknown): string[] | null {
  const str = String(raw ?? '').trim();
  if (!str) return null;
  if (str.toLowerCase() === 'summary') return SUMMARY_FIELDS;
  return str.split(',').map((f) => f.trim()).filter(Boolean);
}

/**
 * 將任務物件投影到指定欄位。
 * fields 為 null 時回傳原物件（向後相容）。
 */
function projectFields<T extends Record<string, unknown>>(item: T, fields: string[] | null): Partial<T> | T {
  if (!fields) return item;
  const result: Record<string, unknown> = {};
  for (const key of fields) {
    if (key in item) {
      result[key] = item[key];
    }
  }
  return result as Partial<T>;
}

/**
 * 對陣列或分頁結果套用 fields 投影。
 * 同時處理陣列和 { tasks, pagination } 兩種結構。
 */
function applyFieldsProjection(data: unknown, fields: string[] | null): unknown {
  if (!fields) return data;

  if (Array.isArray(data)) {
    return data.map((item) => projectFields(item as Record<string, unknown>, fields));
  }

  // 分頁結構：{ tasks: [...], pagination: {...} }
  if (data && typeof data === 'object' && 'tasks' in data && Array.isArray((data as any).tasks)) {
    return {
      ...(data as any),
      tasks: (data as any).tasks.map((item: Record<string, unknown>) => projectFields(item, fields)),
    };
  }

  return data;
}

// ── 排名分數計算（用於 /:id/full 端點）─────────────────────

/**
 * 計算單一任務在指定排序模式下的分數。
 * 移植自 task-ranking.ts 的公式，避免為單一任務建立完整排序流程。
 */
function computeRankingScore(task: Record<string, unknown>, mode: RankingSortMode, now: number): number {
  const priority = typeof task.priority === 'number' && task.priority >= 1 && task.priority <= 5
    ? task.priority
    : 3;

  const createdIso = (task.createdAt ?? task.created_at) as string | undefined;
  const createdMs = createdIso ? new Date(createdIso).getTime() : NaN;
  const ageHours = Number.isNaN(createdMs) ? 0.1 : Math.max((now - createdMs) / (1000 * 60 * 60), 0.1);

  switch (mode) {
    case 'hot': {
      const votes = priority - 3;
      const absVotes = Math.abs(votes);
      const sign = votes > 0 ? 1 : votes < 0 ? -1 : 0;
      return Math.log10(Math.max(absVotes, 1)) * sign + ageHours / 12.5;
    }
    case 'rising':
      return (priority + 1) / Math.pow(ageHours, 1.5);
    case 'controversial': {
      const up = priority;
      const down = 6 - priority;
      const total = up + down;
      if (total === 0) return 0;
      return total * (1 - Math.abs(up - down) / total);
    }
    case 'best': {
      const up = priority;
      const status = String(task.status ?? '');
      const failedStatuses = ['failed', 'cancelled', 'canceled', 'error'];
      const down = failedStatuses.includes(status) ? 6 - priority : 0;
      const n = up + down;
      if (n === 0) return 0;
      const z = 1.96;
      const p = up / n;
      const left = p + (z * z) / (2 * n);
      const right = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
      const under = 1 + (z * z) / n;
      return (left - right) / under;
    }
    case 'top':
      return priority;
    case 'new':
      return Number.isNaN(createdMs) ? 0 : createdMs;
    default:
      return 0;
  }
}

/** 映射 OpenClaw task 到前端看板格式 */
function mapToBoard(oc: any) {
  const mapped = openClawTaskToTask(oc);
  // 從 result JSON 解析品質分數
  let qualityScore: number | null = null;
  let qualityGrade: string | null = null;
  if (oc.result) {
    try {
      const r = JSON.parse(oc.result);
      if (r.quality) {
        qualityScore = r.quality.score ?? null;
        qualityGrade = r.quality.grade ?? null;
      }
    } catch { /* not JSON */ }
  }
  return {
    ...mapped,
    // 用映射後的 status（ready/running/done），讓 Kanban 欄位正確對應
    status: OC_STATUS_TO_BOARD[oc.status] ?? mapped.status,
    title: oc.title,
    subs: oc.subs ?? [],
    progress: oc.progress,
    cat: oc.cat,
    thought: oc.thought,
    from_review_id: oc.fromR ?? null,
    result: oc.result ?? undefined,
    qualityScore,
    qualityGrade,
  };
}

/**
 * 分頁輔助函式
 * 若 request 帶有 limit/cursor/offset 任一參數，回傳 { tasks, pagination } 結構。
 * 否則回傳原始陣列（向後相容）。
 */
function paginateResult(items: unknown[], req: import('express').Request): unknown {
  const rawLimit = req.query.limit;
  const rawCursor = req.query.cursor;
  const rawOffset = req.query.offset;
  const hasPagination =
    rawLimit !== undefined || rawCursor !== undefined || rawOffset !== undefined;

  if (!hasPagination) {
    // 無分頁參數 → 回傳全部陣列（向後相容）
    return items;
  }

  const total = items.length;

  // 解析 limit：預設 20，範圍 1-100
  let limit = 20;
  if (rawLimit !== undefined) {
    const parsed = parseInt(String(rawLimit), 10);
    if (!isNaN(parsed)) {
      limit = Math.max(1, Math.min(100, parsed));
    }
  }

  let startIndex = 0;

  if (rawCursor !== undefined && String(rawCursor).length > 0) {
    // 游標分頁：找到 cursor 所指的 task，從它的下一筆開始
    const cursorId = String(rawCursor);
    const cursorIndex = items.findIndex((t: any) => t.id === cursorId);
    if (cursorIndex === -1) {
      // cursor 指向不存在的 ID → 從頭開始（容錯）
      startIndex = 0;
    } else {
      startIndex = cursorIndex + 1;
    }
  } else if (rawOffset !== undefined) {
    // 偏移分頁
    const parsed = parseInt(String(rawOffset), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      startIndex = Math.min(parsed, total);
    }
  }

  const page = items.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < total;
  const nextCursor =
    hasMore && page.length > 0 ? (page[page.length - 1] as any).id : null;

  return {
    tasks: page,
    pagination: {
      total,
      limit,
      hasMore,
      ...(nextCursor != null && { nextCursor }),
    },
  };
}

// ── GET /api/openclaw/tasks/:id/full — 完整任務詳情 ─────────
// 必須定義在 GET '/' 和 PATCH '/:id' 之前，避免 Express 路由衝突
openclawTasksRouter.get('/:id/full', async (req, res) => {
  try {
    if (!hasSupabase()) {
      log.error('[OpenClaw] GET /tasks/:id/full: Supabase not connected');
      return res.status(503).json({ message: 'Supabase not connected' });
    }

    const ocTasks = await fetchOpenClawTasks();
    const oc = ocTasks.find((x) => x.id === req.params.id);
    if (!oc) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const full = mapToBoard(oc as any);
    const now = Date.now();
    const rec = full as Record<string, unknown>;

    // ── 計算 age（距離建立時間的小時數）──
    const createdIso = rec.createdAt ?? rec.created_at;
    let ageHours: number | null = null;
    if (typeof createdIso === 'string') {
      const createdMs = new Date(createdIso).getTime();
      if (!Number.isNaN(createdMs)) {
        ageHours = Math.round(((now - createdMs) / (1000 * 60 * 60)) * 100) / 100;
      }
    }

    // ── 計算 rankingScore（如果提供了 ?sort= 參數）──
    const sortMode = String(req.query.sort ?? '').toLowerCase();
    let rankingScore: number | null = null;
    if (sortMode && isValidSortMode(sortMode)) {
      rankingScore = computeRankingScore(rec, sortMode as RankingSortMode, now);
    }

    // ── 組裝 activityHistory ──
    const updatedIso = rec.updatedAt ?? rec.updated_at;
    const activityHistory: { event: string; timestamp: string }[] = [];
    if (typeof createdIso === 'string') {
      activityHistory.push({ event: 'created', timestamp: createdIso });
    }
    if (typeof updatedIso === 'string' && updatedIso !== createdIso) {
      activityHistory.push({ event: 'updated', timestamp: updatedIso as string });
    }

    const response = {
      ...full,
      _detail: 'full',
      _computed: {
        ageHours,
        rankingScore,
        rankingSortMode: rankingScore !== null ? sortMode : undefined,
        activityHistory,
      },
    };

    log.info(`[OpenClaw] GET /tasks/${req.params.id}/full: returned full detail`);
    res.json(response);
  } catch (e) {
    log.error('[OpenClaw] GET /tasks/:id/full error:', e);
    res.status(500).json({ message: 'Failed to fetch task detail' });
  }
});

// GET /api/openclaw/tasks
// 支持 ?sort=hot|rising|controversial|top|new 排名排序
// 支持 ?timeFilter=hour|day|week|month|year|all（僅對 sort=top 生效）
// 支持 ?limit=20&cursor=t123 游標分頁 / ?limit=20&offset=0 偏移分頁
// 支持 ?fields=id,name,status 或 ?fields=summary（Progressive Disclosure）
openclawTasksRouter.get('/', async (req, res) => {
  try {
    if (!hasSupabase()) {
      log.error('[OpenClaw] GET /tasks: Supabase not connected');
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    let data = await fetchOpenClawTasks();
    // 若 Supabase 空，fallback 到 in-memory
    if ((!data || data.length === 0) && tasks.length > 0) {
      data = tasks.map((t) => ({
        id: t.id,
        name: t.name,
        title: t.name,
        cat: (t.tags?.[0] as string) ?? 'feature',
        status: t.status === 'done' ? 'done' : t.status === 'running' ? 'in_progress' : 'queued',
        progress: t.status === 'done' ? 100 : 0,
        auto: false,
        from_review_id: undefined,
        subs: [] as { t: string; d: boolean }[],
        thought: t.description,
      }));
    }
    let mapped = (data ?? []).map((oc) => mapToBoard(oc as any));

    // ── 篩選（filter before sort）──────────────────────────
    const totalBeforeFilter = mapped.length;

    // ?status=running  — 精確匹配 board status（支援原始 OpenClaw status 也一併對映）
    const filterStatus = String(req.query.status ?? '').trim().toLowerCase();
    if (filterStatus) {
      // 允許用戶傳入 board status 或 OpenClaw raw status
      const boardEquiv = OC_STATUS_TO_BOARD[filterStatus] ?? filterStatus;
      mapped = mapped.filter((t) => {
        const ts = String((t as Record<string, unknown>).status ?? '').toLowerCase();
        return ts === filterStatus || ts === boardEquiv;
      });
    }

    // ?owner=小蔡  — 大小寫不敏感子字串匹配
    const filterOwner = String(req.query.owner ?? '').trim();
    if (filterOwner) {
      const ownerLower = filterOwner.toLowerCase();
      mapped = mapped.filter((t) => {
        const taskOwner = String((t as Record<string, unknown>).owner ?? '').toLowerCase();
        return taskOwner.includes(ownerLower);
      });
    }

    // ?priority=3  — 回傳 priority >= N 的任務
    const filterPriority = Number(req.query.priority);
    if (!Number.isNaN(filterPriority) && filterPriority > 0) {
      mapped = mapped.filter((t) => {
        const p = Number((t as Record<string, unknown>).priority ?? 0);
        return p >= filterPriority;
      });
    }

    // ?tags=feature,bug  — 逗號分隔，任務的 tags 陣列中任一標籤匹配即保留
    const filterTags = String(req.query.tags ?? '').trim();
    if (filterTags) {
      const wantedTags = filterTags.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (wantedTags.length > 0) {
        mapped = mapped.filter((t) => {
          const taskTags: string[] = Array.isArray((t as Record<string, unknown>).tags) ? ((t as Record<string, unknown>).tags as string[]) : [];
          return taskTags.some((tag) => wantedTags.includes(String(tag).toLowerCase()));
        });
      }
    }

    // ?search=登入  — 名稱（name/title）或描述（description/thought）包含關鍵字（大小寫不敏感）
    const filterSearch = String(req.query.search ?? '').trim();
    if (filterSearch) {
      const needle = filterSearch.toLowerCase();
      mapped = mapped.filter((t) => {
        const rec = t as Record<string, unknown>;
        const name = String(rec.name ?? '').toLowerCase();
        const title = String(rec.title ?? '').toLowerCase();
        const desc = String(rec.description ?? '').toLowerCase();
        const thought = String(rec.thought ?? '').toLowerCase();
        return name.includes(needle) || title.includes(needle) || desc.includes(needle) || thought.includes(needle);
      });
    }

    const filtered = totalBeforeFilter !== mapped.length;
    if (filtered) {
      log.info(`[OpenClaw] GET /tasks: filtered ${totalBeforeFilter} → ${mapped.length} tasks`);
    }

    // ── 排名排序（含 feed cache）──────────────────────────
    const sortMode = String(req.query.sort ?? '').toLowerCase();
    if (sortMode && isValidSortMode(sortMode)) {
      const timeFilter = String(req.query.timeFilter ?? 'all').toLowerCase();

      // 建構快取鍵（包含所有篩選參數）
      const cacheKey = buildCacheKey({
        sort: sortMode,
        timeFilter,
        status: filterStatus || undefined,
        owner: filterOwner || undefined,
        priority: filterPriority > 0 ? String(filterPriority) : undefined,
        tags: filterTags || undefined,
        search: filterSearch || undefined,
      });

      // 嘗試取得快取
      const cached = getCachedFeed<unknown[]>(cacheKey);
      if (cached) {
        log.info(`[OpenClaw] GET /tasks: cache HIT for "${sortMode}", ${cached.length} tasks`);
        const fields = parseFieldsParam(req.query.fields);
        const paginated = paginateResult(cached, req);
        return res.json(applyFieldsProjection(paginated, fields));
      }

      // Cache miss — 執行排序
      rankTasks(mapped, sortMode as RankingSortMode, { timeFilter });
      log.info(`[OpenClaw] GET /tasks: sorted by "${sortMode}"${sortMode === 'top' ? ` (timeFilter=${timeFilter})` : ''}, ${mapped.length} tasks`);

      // 寫入快取
      const ttl = getDefaultTTL(sortMode as RankingSortMode);
      setCachedFeed(cacheKey, mapped, ttl);
    }

    // ── 分頁 → fields 投影 → 回傳 ──────────────────────────
    const fields = parseFieldsParam(req.query.fields);
    const paginated = paginateResult(mapped, req);
    if (fields) {
      log.info(`[OpenClaw] GET /tasks: fields projection [${fields.join(',')}]`);
    }
    res.json(applyFieldsProjection(paginated, fields));
  } catch (e) {
    log.error('[OpenClaw] GET /tasks error:', e);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// POST /api/openclaw/tasks
openclawTasksRouter.post('/', async (req, res) => {
  try {
    if (!hasSupabase()) {
      log.error('[OpenClaw] POST /tasks: Supabase not connected');
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const body = req.body as Partial<Task> & {
      id?: string;
      subs?: { t: string; d: boolean }[];
      title?: string;
      fromR?: string;
      from_review_id?: string;
    };

    const q = (req.query ?? {}) as Record<string, unknown>;
    const allowStub = String(q.allowStub ?? '') === '1';
    const maybeTitle = String(body.name ?? body.title ?? '').trim();
    const maybeDesc = String(body.description ?? '').trim();
    const hasAnyComplianceField =
      typeof body.projectPath === 'string' ||
      typeof body.rollbackPlan === 'string' ||
      Array.isArray(body.acceptanceCriteria) ||
      Array.isArray(body.deliverables) ||
      Array.isArray(body.runCommands) ||
      typeof body.modelPolicy === 'string' ||
      typeof body.executionProvider === 'string' ||
      typeof body.allowPaid === 'boolean' ||
      typeof body.riskLevel === 'string' ||
      body.agent?.type != null;
    const looksLikeStub = !hasAnyComplianceField;
    const looksLikeEmptyCard =
      (maybeTitle.length === 0 || maybeTitle === '新任務') &&
      maybeDesc.length === 0 &&
      (!Array.isArray(body.subs) || body.subs.length === 0);

    if (!allowStub && looksLikeStub) {
      if (looksLikeEmptyCard) {
        return res.status(204).send();
      }
      return res.status(400).json({
        message:
          'Stub task creation is disabled. Please create tasks via /api/tasks with full metadata, or call this endpoint with ?allowStub=1.',
      });
    }

    // 提示詞防護：掃描任務內容，命中 BLOCK 規則則拒絕建立
    const promptGuardHit = scanTaskPayload({
      name: maybeTitle,
      title: body.title as string | undefined,
      description: maybeDesc,
      runCommands: Array.isArray(body.runCommands) ? body.runCommands : undefined,
    });
    if (promptGuardHit?.action === 'BLOCK') {
      log.warn({ ruleId: promptGuardHit.ruleId, ruleName: promptGuardHit.ruleName }, 'Task rejected by prompt guard');
      return res.status(400).json({
        message: `提示詞防護攔截：${promptGuardHit.ruleName}（${promptGuardHit.ruleId}）`,
        code: 'PROMPT_GUARD_BLOCK',
        ruleId: promptGuardHit.ruleId,
      });
    }

    const id = body.id ?? `t${Date.now()}`;
    const fromR = body.fromR ?? body.from_review_id ?? null;
    const ocPayload = {
      ...taskToOpenClawTask({
        id,
        name: body.name ?? body.title ?? '新任務',
        description: body.description ?? '',
        status: (body.status ?? 'draft') as Task['status'],
        tags: body.tags ?? ['feature'],
        agent: body.agent,
        owner: body.owner,
        priority: body.priority,
        projectPath: body.projectPath,
        rollbackPlan: body.rollbackPlan,
        acceptanceCriteria: body.acceptanceCriteria,
        deliverables: body.deliverables,
        runCommands: body.runCommands,
        modelPolicy: body.modelPolicy,
        executionProvider: body.executionProvider,
        allowPaid: body.allowPaid,
        riskLevel: body.riskLevel,
      }),
      title: body.title ?? body.name ?? '新任務',
      subs: Array.isArray(body.subs) ? body.subs : [],
      ...(fromR != null && { fromR }),
    };
    const task = await upsertOpenClawTask(ocPayload);
    if (!task) {
      log.error('[OpenClaw] POST /tasks: upsert failed');
      return res.status(500).json({ message: 'Failed to save task' });
    }
    // 新增任務 → 清除 feed 快取
    invalidateFeedCache();
    res.status(201).json({
      ...openClawTaskToTask(task),
      title: task.title,
      subs: task.subs ?? [],
      progress: task.progress,
      cat: task.cat,
      thought: task.thought,
      from_review_id: task.fromR ?? null,
    });
  } catch (e) {
    log.error('[OpenClaw] POST /tasks error:', e);
    res.status(500).json({ message: 'Failed to save task' });
  }
});

// PATCH /api/openclaw/tasks/:id
openclawTasksRouter.patch('/:id', async (req, res) => {
  try {
    if (!hasSupabase()) {
      log.error('[OpenClaw] PATCH /tasks: Supabase not connected');
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const ocTasks = await fetchOpenClawTasks();
    const existing = ocTasks.find((x) => x.id === req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const body = req.body as Partial<Task> & { subs?: { t: string; d: boolean }[]; title?: string };
    const currentTask = openClawTaskToTask(existing);
    const updatedTask: Task = {
      ...currentTask,
      ...body,
      id: req.params.id,
    };
    const ocPayload = {
      ...taskToOpenClawTask(updatedTask),
      title: body.title ?? existing.title,
      subs: Array.isArray(body.subs) ? body.subs : existing.subs,
    };
    const task = await upsertOpenClawTask(ocPayload);
    if (!task) {
      log.error('[OpenClaw] PATCH /tasks: upsert failed');
      return res.status(500).json({ message: 'Failed to update task' });
    }
    // 更新任務 → 清除 feed 快取
    invalidateFeedCache();
    res.json({
      ...openClawTaskToTask(task),
      title: task.title,
      subs: task.subs ?? [],
      progress: task.progress,
      cat: task.cat,
      thought: task.thought,
      from_review_id: task.fromR ?? null,
    });
  } catch (e) {
    log.error('[OpenClaw] PATCH /tasks error:', e);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// POST /api/openclaw/tasks/archive-done — 批次刪除所有 done 任務
openclawTasksRouter.post('/archive-done', async (_req, res) => {
  try {
    if (!hasSupabase() || !supabase) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    // 先計數
    const { data: doneList } = await supabase
      .from('openclaw_tasks')
      .select('id')
      .eq('status', 'done');
    const count = doneList?.length ?? 0;
    if (count === 0) {
      return res.json({ archived: 0 });
    }
    // 批次刪除
    const { error } = await supabase
      .from('openclaw_tasks')
      .delete()
      .eq('status', 'done');
    if (error) {
      log.error('[OpenClaw] archive-done error:', error.message);
      return res.status(500).json({ message: error.message });
    }
    log.info(`[OpenClaw] Deleted ${count} done tasks`);
    // 批次刪除 → 清除 feed 快取
    invalidateFeedCache();
    res.json({ archived: count });
  } catch (e) {
    log.error('[OpenClaw] archive-done error:', e);
    res.status(500).json({ message: 'Failed to archive tasks' });
  }
});

// DELETE /api/openclaw/tasks/:id
openclawTasksRouter.delete('/:id', async (req, res) => {
  try {
    if (!hasSupabase() || !supabase) {
      log.error('[OpenClaw] DELETE /tasks: Supabase not connected');
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const { error } = await supabase.from('openclaw_tasks').delete().eq('id', req.params.id);
    if (error) {
      log.error('[OpenClaw] DELETE /tasks error:', error.message);
      return res.status(500).json({ message: 'Failed to delete task' });
    }
    // 刪除任務 → 清除 feed 快取
    invalidateFeedCache();
    return res.status(204).send();
  } catch (e) {
    log.error('[OpenClaw] DELETE /tasks error:', e);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

export default openclawTasksRouter;
