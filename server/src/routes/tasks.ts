/**
 * 任务相关路由
 * GET    /api/tasks - 列出所有任务
 * GET    /api/tasks/:id - 获取单个任务
 * POST   /api/tasks - 创建任务
 * PATCH  /api/tasks/:id - 更新任务
 * DELETE /api/tasks/:id - 删除任务
 * POST   /api/tasks/:taskId/run - 运行任务
 */

import { createLogger } from '../logger.js';
import { Router } from 'express';
import { validateBody } from '../middlewares/validate.js';

const log = createLogger('tasks-route');
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

// DELETE /api/tasks/batch - 批次刪除任務
tasksRouter.delete('/batch', async (req, res) => {
  const { ids } = req.body as { ids?: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids must be a non-empty array' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ message: 'Maximum 100 tasks per batch' });
  }
  if (hasSupabase() && supabase) {
    const { error } = await supabase
      .from('openclaw_tasks')
      .delete()
      .in('id', ids);
    if (error) {
      log.error({ err: error }, '[BatchDelete] Supabase error');
      return res.status(500).json({ message: error.message });
    }
    return res.status(204).send();
  }
  // In-memory fallback
  const idSet = new Set(ids);
  const before = tasks.length;
  for (let i = tasks.length - 1; i >= 0; i--) {
    if (idSet.has(tasks[i].id)) tasks.splice(i, 1);
  }
  const deleted = before - tasks.length;
  return res.status(204).send();
});

// DELETE /api/tasks/:id - 刪除單個任務
tasksRouter.delete('/:id', async (req, res) => {
  if (hasSupabase() && supabase) {
    const ocTasks = await fetchOpenClawTasks();
    const oc = ocTasks.find((x) => x.id === req.params.id);
    if (!oc) return res.status(404).json({ message: 'Task not found' });
    const { error } = await supabase.from('openclaw_tasks').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ message: 'Failed to delete task' });
    return res.status(204).send();
  }
  const idx = tasks.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Task not found' });
  tasks.splice(idx, 1);
  res.status(204).send();
});

// Note: POST, PATCH, /progress 等路由仍在 index.ts 中（依賴 domain tagging、gate validation 等）

export default tasksRouter;
