/**
 * OpenClaw 後端 API
 * 實作 docs/API-INTEGRATION.md 規格，供中控台接上後「立即執行」打此服務
 * OpenClaw v4 板：/api/openclaw/* 寫入 Supabase
 */
import dotenv from 'dotenv';
import path from 'path';
import { spawn, execSync } from 'child_process';
// .env 在專案根目錄（從 server/ 執行用 ../.env，從根目錄用 .env）
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import express from 'express';
import cors from 'cors';
import { tasks, runs, alerts } from './store.js';
import { runSeed } from './seed.js';
import type { Task, Run, Alert } from './types.js';
import {
  fetchOpenClawTasks,
  upsertOpenClawTask,
  fetchOpenClawReviews,
  upsertOpenClawReview,
  seedOpenClawReviewsIfEmpty,
  fetchOpenClawAutomations,
  upsertOpenClawAutomation,
  fetchOpenClawEvolutionLog,
  insertOpenClawEvolutionLog,
  fetchOpenClawAuditLogs,
  fetchOpenClawUIActions,
} from './openclawSupabase.js';
import { hasSupabase, supabase } from './supabase.js';
import {
  openClawTaskToTask,
  taskToOpenClawTask,
  openClawReviewToAlert,
  evolutionLogToRun,
  evolutionLogToLogEntry,
} from './openclawMapper.js';
import {
  hasN8n,
  listWorkflows,
  triggerWebhook,
  healthCheck as n8nHealthCheck,
} from './n8nClient.js';

runSeed();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const PORT = Number(process.env.PORT) || 3001;

// ---- Tasks ----
app.get('/api/tasks', async (_req, res) => {
  if (hasSupabase()) {
    const ocTasks = await fetchOpenClawTasks();
    const mapped = ocTasks.map(openClawTaskToTask);
    return res.json(mapped);
  }
  res.json(tasks);
});

app.get('/api/tasks/:id', async (req, res) => {
  if (hasSupabase()) {
    const ocTasks = await fetchOpenClawTasks();
    const oc = ocTasks.find((x) => x.id === req.params.id);
    if (!oc) return res.status(404).json({ message: 'Task not found' });
    return res.json(openClawTaskToTask(oc));
  }
  const t = tasks.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ message: 'Task not found' });
  res.json(t);
});

app.patch('/api/tasks/:id', async (req, res) => {
  if (hasSupabase()) {
    const ocTasks = await fetchOpenClawTasks();
    const oc = ocTasks.find((x) => x.id === req.params.id);
    if (!oc) return res.status(404).json({ message: 'Task not found' });
    const merged = { ...oc, ...taskToOpenClawTask({ ...req.body, id: req.params.id }) };
    const updated = await upsertOpenClawTask(merged);
    if (!updated) return res.status(500).json({ message: 'Failed to update task' });
    return res.json(openClawTaskToTask(updated));
  }
  const idx = tasks.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Task not found' });
  const now = new Date().toISOString();
  tasks[idx] = { ...tasks[idx], ...req.body, updatedAt: now };
  res.json(tasks[idx]);
});

app.post('/api/tasks', async (req, res) => {
  const body = req.body as Partial<Task> & { id?: string };
  if (hasSupabase()) {
    const id = body.id ?? `t${Date.now()}`;
    const oc = {
      id,
      title: body.name ?? '新任務',
      thought: body.description ?? '',
      status: 'queued',
      cat: (body.tags?.[0] as string) ?? 'feature',
      progress: 0,
      subs: [],
    };
    const created = await upsertOpenClawTask(oc);
    if (!created) return res.status(500).json({ message: 'Failed to create task' });
    return res.status(201).json(openClawTaskToTask(created));
  }
  const now = new Date().toISOString();
  const newTask: Task = {
    ...body,
    id: body.id ?? `task-${Date.now()}`,
    name: body.name ?? '新任務',
    description: body.description ?? '',
    status: body.status ?? 'draft',
    tags: body.tags ?? [],
    owner: body.owner ?? '',
    priority: (body.priority as Task['priority']) ?? 3,
    scheduleType: body.scheduleType ?? 'manual',
    createdAt: now,
    updatedAt: now,
  };
  tasks.unshift(newTask);
  res.status(201).json(newTask);
});

app.delete('/api/tasks/:id', async (req, res) => {
  if (hasSupabase() && supabase) {
    const ocTasks = await fetchOpenClawTasks();
    const oc = ocTasks.find((x) => x.id === req.params.id);
    if (!oc) return res.status(404).json({ message: 'Task not found' });
    await supabase.from('openclaw_tasks').delete().eq('id', req.params.id);
    return res.status(204).send();
  }
  const idx = tasks.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Task not found' });
  tasks.splice(idx, 1);
  res.status(204).send();
});

// ---- Runs ----
app.get('/api/runs', async (req, res) => {
  if (hasSupabase()) {
    const evLog = await fetchOpenClawEvolutionLog();
    const mapped = evLog.map((row, i) => evolutionLogToRun(row, i));
    const taskId = req.query.taskId as string | undefined;
    const list = taskId ? mapped.filter((r) => r.taskId === taskId) : mapped;
    return res.json(list);
  }
  const taskId = req.query.taskId as string | undefined;
  const list = taskId
    ? runs.filter((r) => r.taskId === taskId)
    : [...runs];
  res.json(list);
});

app.get('/api/runs/:id', async (req, res) => {
  if (hasSupabase()) {
    const evLog = await fetchOpenClawEvolutionLog();
    const row = evLog.find((r) => String(r.id) === req.params.id);
    if (!row) return res.status(404).json({ message: 'Run not found' });
    const idx = evLog.indexOf(row);
    return res.json(evolutionLogToRun(row, idx));
  }
  const r = runs.find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ message: 'Run not found' });
  res.json(r);
});

function createRun(task: Task): Run {
  const now = new Date().toISOString();
  const run: Run = {
    id: `R-${Date.now()}`,
    taskId: task.id,
    taskName: task.name,
    status: 'queued',
    startedAt: now,
    endedAt: null,
    durationMs: null,
    inputSummary: JSON.stringify({ source: 'api', taskId: task.id }),
    outputSummary: '',
    steps: [
      { name: 'queued', status: 'success', startedAt: now, endedAt: now },
      {
        name: 'started',
        status: 'running',
        startedAt: now,
        message: '後端已接收，模擬執行中…',
      },
    ],
  };
  return run;
}

/** 模擬執行：先 queued，延遲後改 running 再 success */
function simulateExecution(runId: string) {
  const run = runs.find((r) => r.id === runId);
  if (!run) return;
  const now = new Date().toISOString();
  run.status = 'running';
  run.steps[1] = {
    ...run.steps[1],
    status: 'running',
    message: '後端模擬執行中…',
  };
  setTimeout(() => {
    const end = new Date().toISOString();
    run.status = 'success';
    run.endedAt = end;
    run.durationMs = Math.round(
      new Date(end).getTime() - new Date(run.startedAt).getTime()
    );
    run.steps[1] = {
      ...run.steps[1],
      status: 'success',
      endedAt: end,
      message: '模擬完成',
    };
    run.steps.push({
      name: 'done',
      status: 'success',
      startedAt: end,
      endedAt: end,
      message: 'OpenClaw 後端模擬執行成功',
    });
  }, 1500);
}

app.post('/api/tasks/:taskId/run', async (req, res) => {
  const task = await getTaskForRun(req.params.taskId);
  if (!task)
    return res.status(404).json({ message: 'Task not found' });
  const run = createRun(task);
  runs.unshift(run);
  const now = run.startedAt;
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    tasks[idx].lastRunStatus = 'queued';
    tasks[idx].lastRunAt = now;
    tasks[idx].updatedAt = now;
  }
  simulateExecution(run.id);
  res.status(201).json(run);
});

app.post('/api/runs/:id/rerun', async (req, res) => {
  const old = runs.find((r) => r.id === req.params.id);
  if (!old) return res.status(404).json({ message: 'Run not found' });
  const task = await getTaskForRun(old.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  const run = createRun(task);
  runs.unshift(run);
  const now = run.startedAt;
  const tidx = tasks.findIndex((t) => t.id === task.id);
  if (tidx !== -1) {
    tasks[tidx].lastRunStatus = 'queued';
    tasks[tidx].lastRunAt = now;
    tasks[tidx].updatedAt = now;
  }
  simulateExecution(run.id);
  res.status(201).json(run);
});

// ---- Alerts ----
app.get('/api/alerts', async (_req, res) => {
  if (hasSupabase()) {
    const reviews = await fetchOpenClawReviews();
    const mapped = reviews.map(openClawReviewToAlert);
    return res.json(mapped);
  }
  res.json(alerts);
});

app.patch('/api/alerts/:id', async (req, res) => {
  if (hasSupabase()) {
    const reviews = await fetchOpenClawReviews();
    const r = reviews.find((a) => a.id === req.params.id);
    if (!r) return res.status(404).json({ message: 'Alert not found' });
    const newStatus = req.body?.status === 'acked' ? 'approved' : req.body?.status === 'open' ? 'pending' : r.status;
    const updated = await upsertOpenClawReview({ ...r, status: newStatus });
    if (!updated) return res.status(500).json({ message: 'Failed to update alert' });
    return res.json(openClawReviewToAlert(updated));
  }
  const idx = alerts.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Alert not found' });
  alerts[idx] = { ...alerts[idx], ...req.body };
  res.json(alerts[idx]);
});

// ---- OpenClaw v4 板（Supabase 持久化）----
// 取得任務（供 run 等使用）：Supabase 或 in-memory fallback
async function getTaskForRun(taskId: string): Promise<Task | null> {
  if (hasSupabase()) {
    const ocTasks = await fetchOpenClawTasks();
    const oc = ocTasks.find((x) => x.id === taskId);
    if (oc) return openClawTaskToTask(oc);
  }
  return tasks.find((t) => t.id === taskId) ?? null;
}

app.get('/api/openclaw/tasks', async (_req, res) => {
  try {
    let data = await fetchOpenClawTasks();
    // 若 Supabase 空，fallback 到 in-memory 任務（讓 OpenClaw 可讀取主應用任務）
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
    res.json(data ?? []);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

app.post('/api/openclaw/tasks', async (req, res) => {
  try {
    const task = await upsertOpenClawTask(req.body);
    if (!task) return res.status(500).json({ message: 'Failed to save task' });
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ message: 'Failed to save task' });
  }
});

app.patch('/api/openclaw/tasks/:id', async (req, res) => {
  try {
    const task = await upsertOpenClawTask({ ...req.body, id: req.params.id });
    if (!task) return res.status(500).json({ message: 'Failed to update task' });
    res.json(task);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update task' });
  }
});

app.delete('/api/openclaw/tasks/:id', async (req, res) => {
  try {
    if (hasSupabase() && supabase) {
      const { error } = await supabase.from('openclaw_tasks').delete().eq('id', req.params.id);
      if (error) return res.status(500).json({ message: 'Failed to delete task' });
      return res.status(204).send();
    }
    const idx = tasks.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Task not found' });
    tasks.splice(idx, 1);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

// OpenClaw 執行任務（與 /api/tasks/:id/run 相同邏輯）
app.post('/api/openclaw/tasks/:id/run', async (req, res) => {
  const task = await getTaskForRun(req.params.id);
  if (!task)
    return res.status(404).json({ message: 'Task not found' });
  const run = createRun(task);
  runs.unshift(run);
  const now = run.startedAt;
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    tasks[idx].lastRunStatus = 'queued';
    tasks[idx].lastRunAt = now;
    tasks[idx].updatedAt = now;
  }
  simulateExecution(run.id);
  res.status(201).json(run);
});

// 自動化：執行第一個 queued 任務（供 cron / n8n 呼叫）
app.post('/api/openclaw/run-next', async (_req, res) => {
  let list: { id: string; status: string }[] = [];
  const ocTasks = await fetchOpenClawTasks().catch(() => []);
  if (ocTasks.length > 0) {
    list = ocTasks;
  } else if (tasks.length > 0) {
    list = tasks.map((t) => ({
      id: t.id,
      status: t.status === 'running' ? 'in_progress' : t.status === 'done' ? 'done' : 'queued',
    }));
  }
  const next = list.find((t) => t.status === 'queued' || t.status === 'ready');
  if (!next) {
    return res.json({ ok: false, message: 'No queued task to run' });
  }
  const task = await getTaskForRun(next.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  const run = createRun(task);
  runs.unshift(run);
  const now = run.startedAt;
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    tasks[idx].lastRunStatus = 'queued';
    tasks[idx].lastRunAt = now;
    tasks[idx].updatedAt = now;
  }
  simulateExecution(run.id);
  res.status(201).json({ run, taskId: task.id });
});

app.get('/api/openclaw/reviews', async (_req, res) => {
  try {
    let data = await fetchOpenClawReviews();
    if (data.length === 0 && hasSupabase()) {
      try {
        await seedOpenClawReviewsIfEmpty();
        data = await fetchOpenClawReviews();
      } catch (_) {
        /* seed 失敗仍回傳 []，不中斷請求 */
      }
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

app.post('/api/openclaw/reviews', async (req, res) => {
  try {
    const review = await upsertOpenClawReview(req.body);
    if (!review) return res.status(500).json({ message: 'Failed to save review' });
    res.status(201).json(review);
  } catch (e) {
    res.status(500).json({ message: 'Failed to save review' });
  }
});

app.patch('/api/openclaw/reviews/:id', async (req, res) => {
  try {
    const review = await upsertOpenClawReview({ ...req.body, id: req.params.id });
    if (!review) return res.status(500).json({ message: 'Failed to update review' });
    res.json(review);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update review' });
  }
});

app.get('/api/openclaw/automations', async (_req, res) => {
  try {
    const data = await fetchOpenClawAutomations();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch automations' });
  }
});

app.post('/api/openclaw/automations', async (req, res) => {
  try {
    const a = await upsertOpenClawAutomation(req.body);
    if (!a) return res.status(500).json({ message: 'Failed to save automation' });
    res.status(201).json(a);
  } catch (e) {
    res.status(500).json({ message: 'Failed to save automation' });
  }
});

app.patch('/api/openclaw/automations/:id', async (req, res) => {
  try {
    const a = await upsertOpenClawAutomation({ ...req.body, id: req.params.id });
    if (!a) return res.status(500).json({ message: 'Failed to update automation' });
    res.json(a);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update automation' });
  }
});

app.get('/api/openclaw/evolution-log', async (_req, res) => {
  try {
    const data = await fetchOpenClawEvolutionLog();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch evolution log' });
  }
});

app.post('/api/openclaw/evolution-log', async (req, res) => {
  try {
    const ok = await insertOpenClawEvolutionLog(req.body);
    if (!ok) return res.status(500).json({ message: 'Failed to insert evolution log' });
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to insert evolution log' });
  }
});

app.get('/api/openclaw/ui-actions', async (_req, res) => {
  try {
    const data = await fetchOpenClawUIActions();
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch ui actions' });
  }
});

// ---- Logs & Audit（與 OpenClaw 對接）----
app.get('/api/logs', async (_req, res) => {
  if (hasSupabase()) {
    const evLog = await fetchOpenClawEvolutionLog();
    const mapped = evLog.map((row, i) => evolutionLogToLogEntry(row, i));
    return res.json(mapped);
  }
  res.json([]);
});

app.get('/api/audit-logs', async (_req, res) => {
  if (hasSupabase()) {
    const rows = await fetchOpenClawAuditLogs();
    const mapped = rows.map((r) => ({
      id: r.id,
      timestamp: r.created_at ?? new Date().toISOString(),
      user: r.user_id ?? 'system',
      action: r.action,
      target: [r.resource, r.resource_id].filter(Boolean).join(' ') || '-',
      details: r.diff ? JSON.stringify(r.diff) : undefined,
    }));
    return res.json(mapped);
  }
  res.json([]);
});

// ---- Stats（儀表板用，與 OpenClaw 資料對接）----
const DAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}
function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

app.get('/api/stats', async (_req, res) => {
  if (hasSupabase()) {
    const [ocTasks, evLog] = await Promise.all([
      fetchOpenClawTasks(),
      fetchOpenClawEvolutionLog(),
    ]);
    const runs = evLog.map((row, i) => evolutionLogToRun(row, i));
    const todayRuns = runs.filter((r) => isToday(r.startedAt)).length;
    const success = runs.filter((r) => r.status === 'success').length;
    const failed = runs.filter((r) => r.status === 'failed').length;
    const completed = success + failed;
    const successRate = completed > 0 ? Math.round((success / completed) * 1000) / 10 : 0;
    const withDuration = runs.filter((r) => r.durationMs != null && r.durationMs > 0);
    const avgDuration =
      withDuration.length > 0
        ? Math.round(withDuration.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / withDuration.length)
        : 0;
    const queueDepth = ocTasks.filter((t) => t.status === 'queued').length;
    const activeTasks = ocTasks.filter((t) => t.status === 'in_progress').length;
    const weeklyTrend: { day: string; success: number; failed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayRuns = runs.filter((r) => dateKey(r.startedAt) === key);
      weeklyTrend.push({
        day: DAY_LABELS[d.getDay()],
        success: dayRuns.filter((r) => r.status === 'success').length,
        failed: dayRuns.filter((r) => r.status === 'failed').length,
      });
    }
    return res.json({
      todayRuns,
      successRate,
      failedRuns: failed,
      avgDuration,
      queueDepth,
      activeTasks,
      weeklyTrend,
    });
  }
  const todayRuns = runs.filter((r) => isToday(r.startedAt)).length;
  const success = runs.filter((r) => r.status === 'success').length;
  const failed = runs.filter((r) => r.status === 'failed').length;
  const completed = success + failed;
  const successRate = completed > 0 ? Math.round((success / completed) * 1000) / 10 : 0;
  const withDuration = runs.filter((r) => r.durationMs != null && r.durationMs > 0);
  const avgDuration =
    withDuration.length > 0
      ? Math.round(withDuration.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / withDuration.length)
      : 0;
  const queueDepth = runs.filter((r) => r.status === 'queued').length;
  const activeTasks = tasks.filter((t) => t.status === 'running').length;
  const weeklyTrend: { day: string; success: number; failed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayRuns = runs.filter((r) => dateKey(r.startedAt) === key);
    weeklyTrend.push({
      day: DAY_LABELS[d.getDay()],
      success: dayRuns.filter((r) => r.status === 'success').length,
      failed: dayRuns.filter((r) => r.status === 'failed').length,
    });
  }
  res.json({
    todayRuns,
    successRate,
    failedRuns: failed,
    avgDuration,
    queueDepth,
    activeTasks,
    weeklyTrend,
  });
});

// ---- n8n（Zeabur）----
app.get('/api/n8n/health', async (_req, res) => {
  try {
    const result = await n8nHealthCheck();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e) });
  }
});

app.get('/api/n8n/workflows', async (req, res) => {
  try {
    if (!hasN8n()) {
      return res.json({ ok: false, message: 'n8n 未設定', data: [] });
    }
    const activeOnly = req.query.active === 'true';
    const workflows = await listWorkflows(activeOnly);
    res.json({ ok: true, data: workflows });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e), data: [] });
  }
});

/** 觸發 n8n Webhook，body 需帶 webhookUrl 或使用 N8N_WEBHOOK_RUN_NEXT 預設 */
app.post('/api/n8n/trigger-webhook', async (req, res) => {
  try {
    const webhookUrl =
      req.body.webhookUrl ||
      process.env.N8N_WEBHOOK_RUN_NEXT;
    if (!webhookUrl) {
      return res.status(400).json({
        ok: false,
        message: '請提供 webhookUrl 或設定 N8N_WEBHOOK_RUN_NEXT',
      });
    }
    const result = await triggerWebhook(webhookUrl, req.body.data);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e) });
  }
});

// 重啟 OpenClaw Gateway（由看板點擊觸發）
// 優先使用 openclaw gateway restart（launchd/systemd）；若無服務則 fallback 至 pkill + spawn
app.post('/api/openclaw/restart-gateway', (_req, res) => {
  try {
    try {
      execSync('openclaw gateway restart', { stdio: 'ignore', timeout: 10000 });
      return res.json({ ok: true, message: 'Gateway 已透過 launchd/systemd 重啟' });
    } catch {
      /* 無安裝服務時 fallback */
    }
    try {
      execSync('pkill -f "openclaw gateway"', { stdio: 'ignore' });
    } catch {
      /* 無現有行程時忽略 */
    }
    setTimeout(() => {
      const child = spawn('openclaw', ['gateway', '--port', '18789', '--verbose'], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' },
      });
      child.unref();
    }, 1500);
    res.json({ ok: true, message: 'Gateway 重啟指令已送出（背景啟動）' });
  } catch (e) {
    res.status(500).json({ ok: false, message: '重啟失敗', error: String(e) });
  }
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'openclaw-server' });
});

app.listen(PORT, () => {
  console.log(`OpenClaw API http://localhost:${PORT}`);
  console.log(`  GET  /api/tasks, /api/tasks/:id, PATCH /api/tasks/:id`);
  console.log(`  GET  /api/runs, /api/runs/:id, POST /api/tasks/:taskId/run, POST /api/runs/:id/rerun`);
  console.log(`  GET  /api/alerts, PATCH /api/alerts/:id`);
  console.log(`  OpenClaw v4 (Supabase): GET/POST/PATCH /api/openclaw/tasks, /api/openclaw/reviews, /api/openclaw/automations`);
});
