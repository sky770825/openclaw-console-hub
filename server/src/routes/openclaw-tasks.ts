/**
 * OpenClaw 任務板路由 — /api/openclaw/tasks/*
 * 純 Supabase CRUD，不含 run/execution 邏輯
 *
 * GET    /tasks       — 列出任務（含 in-memory fallback）
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

// GET /api/openclaw/tasks
openclawTasksRouter.get('/', async (_req, res) => {
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
    const mapped = (data ?? []).map((oc) => mapToBoard(oc as any));
    res.json(mapped);
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
    return res.status(204).send();
  } catch (e) {
    log.error('[OpenClaw] DELETE /tasks error:', e);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

export default openclawTasksRouter;
