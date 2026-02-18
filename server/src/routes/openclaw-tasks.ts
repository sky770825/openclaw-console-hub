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

const log = createLogger('openclaw-tasks-route');

export const openclawTasksRouter = Router();

/** 映射 OpenClaw task 到前端看板格式 */
function mapToBoard(oc: any) {
  return {
    ...openClawTaskToTask(oc),
    status: oc.status ?? 'queued',
    title: oc.title,
    subs: oc.subs ?? [],
    progress: oc.progress,
    cat: oc.cat,
    thought: oc.thought,
    from_review_id: oc.fromR ?? null,
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
        title: t.name,
        cat: (t.tags?.[0] as string) ?? 'feature',
        status: t.status === 'done' ? 'done' : t.status === 'running' ? 'in_progress' : 'queued',
        progress: t.status === 'done' ? 100 : 0,
        auto: false,
        from_review_id: null,
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

    const id = body.id ?? `t${Date.now()}`;
    const fromR = body.fromR ?? body.from_review_id ?? null;
    const ocPayload = {
      ...taskToOpenClawTask({
        id,
        name: body.name ?? body.title ?? '新任務',
        description: body.description ?? '',
        status: body.status ?? 'draft',
        tags: body.tags ?? ['feature'],
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
