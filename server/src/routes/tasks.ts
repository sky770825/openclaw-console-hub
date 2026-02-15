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

// Note: POST, PATCH, DELETE 等其他路由将在后续逐步迁移
// 目前这些路由仍在 index.ts 中,避免一次性改动过大

export default tasksRouter;
