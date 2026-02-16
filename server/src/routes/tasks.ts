/**
 * 任务相关路由
 * GET    /api/tasks - 列出所有任务
 * GET    /api/tasks/:id - 获取单个任务
 * POST   /api/tasks - 创建任务
 * PATCH  /api/tasks/:id - 更新任务
 * DELETE /api/tasks/:id - 删除任务
 * POST   /api/tasks/:taskId/run - 运行任务
 */

import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';
import {
  createTaskSchema,
  updateTaskSchema,
  runTaskSchema,
} from '../validation/schemas.js';
import { hasSupabase, supabase } from '../supabase.js';
import {
  fetchOpenClawTasks,
  upsertOpenClawTask,
} from '../openclawSupabase.js';
import {
  openClawTaskToTask,
  taskToOpenClawTask,
} from '../openclawMapper.js';
import { validateTaskForGate } from '../taskCompliance.js';
import { tasks } from '../store.js';
import type { Task } from '../types.js';

export const tasksRouter = Router();

// GET /api/tasks - 列出所有任务
tasksRouter.get('/', async (_req, res) => {
  if (hasSupabase()) {
    const ocTasks = await fetchOpenClawTasks();
    const mapped = ocTasks.map(openClawTaskToTask);
    return res.json(mapped);
  }
  res.json(tasks);
});

// GET /api/tasks/audit - 任務空/無用審計（必須在 /:id 之前）
tasksRouter.get('/audit', async (_req, res) => {
  const list = hasSupabase()
    ? (await fetchOpenClawTasks().catch(() => [])).map(openClawTaskToTask)
    : [...tasks];
  const emptyName = list.filter((t) => !t.name?.trim() || /^任務-|^placeholder|^test$|^TEMP|^tmp$/i.test(t.name.trim()));
  const emptyDesc = list.filter((t) => !t.description?.trim() || t.description.trim().length < 30);
  const placeholderTitle = list.filter((t) => /^任務-[a-zA-Z0-9_-]{4,}$/.test(t.name?.trim() ?? ''));
  const hasNeedsMeta = list.filter((t) => (t.tags ?? []).some((tag) => /needs-meta|noncompliant/i.test(String(tag))));
  const readyButNoncompliant = list.filter((t) => {
    if (t.status !== 'ready') return false;
    const gate = validateTaskForGate(t, 'ready');
    return !gate.ok;
  });
  const combined = new Set([
    ...emptyName.map((x) => x.id),
    ...emptyDesc.map((x) => x.id),
    ...placeholderTitle.map((x) => x.id),
    ...hasNeedsMeta.map((x) => x.id),
  ]);
  const sample = list
    .filter((t) => combined.has(t.id))
    .slice(0, 15)
    .map((t) => ({ id: t.id, name: t.name, status: t.status, tags: t.tags }));
  res.json({
    ok: true,
    total: list.length,
    emptyOrUseless: {
      count: combined.size,
      byCriteria: {
        emptyName: emptyName.length,
        emptyOrTinyDesc: emptyDesc.length,
        placeholderTitle: placeholderTitle.length,
        hasNeedsMeta: hasNeedsMeta.length,
        readyButNoncompliant: readyButNoncompliant.length,
      },
      sample,
    },
  });
});

// GET /api/tasks/compliance - 任務合規檢查（必須在 /:id 之前）
tasksRouter.get('/compliance', async (_req, res) => {
  const list = hasSupabase()
    ? (await fetchOpenClawTasks().catch(() => [])).map(openClawTaskToTask)
    : [...tasks];
  let ready = 0;
  let compliantReady = 0;
  const sample: { id: string; name: string; missing: string[] }[] = [];
  for (const t of list) {
    if (t.status !== 'ready') continue;
    ready++;
    const gate = validateTaskForGate(t, 'ready');
    if (gate.ok) {
      compliantReady++;
    } else if (sample.length < 10) {
      sample.push({ id: t.id, name: t.name, missing: gate.missing });
    }
  }
  res.json({
    ok: true,
    total: list.length,
    ready,
    compliantReady,
    noncompliantReady: ready - compliantReady,
    sample,
  });
});

// GET /api/tasks/:id - 获取单个任务
tasksRouter.get('/:id', async (req, res) => {
  if (hasSupabase()) {
    const ocTasks = await fetchOpenClawTasks();
    const oc = ocTasks.find((x) => x.id === req.params.id);
    if (!oc) return res.status(404).json({ message: 'Task not found' });
    return res.json(openClawTaskToTask(oc));
  }
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.json(task);
});

// Note: POST, PATCH, DELETE 等其他路由将在后续逐步迁移
// 目前这些路由仍在 index.ts 中,避免一次性改动过大

export default tasksRouter;
