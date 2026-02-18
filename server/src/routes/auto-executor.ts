/**
 * AutoExecutor + Auto Dispatch API
 *
 * GET    /api/openclaw/auto-executor/status
 * POST   /api/openclaw/auto-executor/start
 * POST   /api/openclaw/auto-executor/stop
 * GET    /api/openclaw/dispatch/status
 * POST   /api/openclaw/dispatch/toggle
 * POST   /api/openclaw/dispatch/review/:taskId
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../logger.js';
import { hasSupabase, supabase } from '../supabase.js';
import {
  fetchOpenClawTasks,
  upsertOpenClawTask,
  fetchOpenClawRuns,
  insertOpenClawRun,
} from '../openclawSupabase.js';
import { openClawTaskToTask } from '../openclawMapper.js';
import { validateTaskForGate } from '../taskCompliance.js';
import { classifyTaskRisk, type DispatchRiskLevel } from '../riskClassifier.js';
import { AgentSelector, AgentExecutor } from '../executor-agents.js';
import {
  sendTelegramMessage,
  notifyTaskSuccess,
  notifyTaskFailure,
} from '../utils/telegram.js';

const log = createLogger('auto-executor');

// ─── Types ───

interface DispatchExecution {
  taskId: string;
  taskName: string;
  riskLevel: DispatchRiskLevel;
  status: 'success' | 'failed' | 'pending_review';
  executedAt: string;
  agentType: string;
  summary: string;
}

interface DispatchPendingReview {
  taskId: string;
  taskName: string;
  riskLevel: DispatchRiskLevel;
  reason: string;
  queuedAt: string;
}

interface AutoExecutorState {
  isRunning: boolean;
  pollIntervalMs: number;
  maxTasksPerMinute: number;
  lastPollAt: string | null;
  lastExecutedTaskId: string | null;
  lastExecutedAt: string | null;
  totalExecutedToday: number;
  nextPollAt: string | null;
  dispatchMode: boolean;
  dispatchStartedAt: string | null;
  lastDigestAt: string | null;
  digestIntervalMs: number;
  recentExecutions: DispatchExecution[];
  pendingReviews: DispatchPendingReview[];
}

type AutoExecutorDiskState = {
  enabled: boolean;
  pollIntervalMs: number;
  maxTasksPerMinute: number;
  updatedAt: string;
  dispatchMode?: boolean;
  digestIntervalMs?: number;
};

// ─── State ───

const autoExecutorState: AutoExecutorState = {
  isRunning: false,
  pollIntervalMs: 10000,
  maxTasksPerMinute: 1,
  lastPollAt: null,
  lastExecutedTaskId: null,
  lastExecutedAt: null,
  totalExecutedToday: 0,
  nextPollAt: null,
  dispatchMode: false,
  dispatchStartedAt: null,
  lastDigestAt: null,
  digestIntervalMs: 1800000,
  recentExecutions: [],
  pendingReviews: [],
};

let autoExecutorInterval: NodeJS.Timeout | null = null;
const autoExecutorExecHistoryMs: number[] = [];
let dispatchDigestTimer: NodeJS.Timeout | null = null;

// ─── Helpers ───

function repoRootPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // routes/ -> src/ -> server/ -> repo root
  return path.resolve(here, '..', '..', '..');
}

function autoExecutorStatePath(): string {
  return path.resolve(repoRootPath(), 'auto-executor-state.json');
}

function loadAutoExecutorDiskState(): AutoExecutorDiskState {
  const p = autoExecutorStatePath();
  const fallback: AutoExecutorDiskState = {
    enabled: false,
    pollIntervalMs: 10000,
    maxTasksPerMinute: 1,
    updatedAt: new Date().toISOString(),
  };
  try {
    if (!fs.existsSync(p)) return fallback;
    const raw = fs.readFileSync(p, 'utf8');
    const j = JSON.parse(raw) as Partial<AutoExecutorDiskState>;
    return {
      enabled: Boolean(j.enabled),
      pollIntervalMs: typeof j.pollIntervalMs === 'number' && j.pollIntervalMs >= 5000 ? j.pollIntervalMs : fallback.pollIntervalMs,
      maxTasksPerMinute: typeof j.maxTasksPerMinute === 'number' && j.maxTasksPerMinute >= 1 ? j.maxTasksPerMinute : fallback.maxTasksPerMinute,
      updatedAt: typeof j.updatedAt === 'string' && j.updatedAt ? j.updatedAt : fallback.updatedAt,
      dispatchMode: j.dispatchMode,
      digestIntervalMs: j.digestIntervalMs,
    };
  } catch (e) {
    log.warn('[AutoExecutor] Failed to load disk state:', e);
    return fallback;
  }
}

function saveAutoExecutorDiskState(patch: Partial<AutoExecutorDiskState>): void {
  const p = autoExecutorStatePath();
  const cur = loadAutoExecutorDiskState();
  const next: AutoExecutorDiskState = {
    ...cur,
    ...patch,
    pollIntervalMs:
      typeof patch.pollIntervalMs === 'number' && patch.pollIntervalMs >= 5000
        ? patch.pollIntervalMs
        : cur.pollIntervalMs,
    maxTasksPerMinute:
      typeof patch.maxTasksPerMinute === 'number' && patch.maxTasksPerMinute >= 1
        ? patch.maxTasksPerMinute
        : cur.maxTasksPerMinute,
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(p, JSON.stringify(next, null, 2) + '\n', 'utf8');
  } catch (e) {
    log.warn('[AutoExecutor] Failed to save disk state:', e);
  }
}

// ─── Dispatch Digest ───

function startDispatchDigestTimer(): void {
  stopDispatchDigestTimer();
  dispatchDigestTimer = setInterval(async () => {
    await sendDispatchDigest();
  }, autoExecutorState.digestIntervalMs);
}

function stopDispatchDigestTimer(): void {
  if (dispatchDigestTimer) {
    clearInterval(dispatchDigestTimer);
    dispatchDigestTimer = null;
  }
}

function generateDispatchDigest() {
  const since = autoExecutorState.lastDigestAt || autoExecutorState.dispatchStartedAt || new Date().toISOString();
  const recent = autoExecutorState.recentExecutions.filter((e) => e.executedAt > since);
  return {
    period: `${since.slice(11, 16)} ~ ${new Date().toISOString().slice(11, 16)}`,
    totalExecuted: recent.length,
    successes: recent.filter((e) => e.status === 'success').length,
    failures: recent.filter((e) => e.status === 'failed').length,
    pendingReviews: autoExecutorState.pendingReviews.length,
    tasks: recent.map((e) => ({
      name: e.taskName,
      risk: e.riskLevel,
      status: e.status,
      summary: (e.summary || '').slice(0, 200),
    })),
  };
}

async function sendDispatchDigest(): Promise<void> {
  const d = generateDispatchDigest();
  if (d.totalExecuted === 0 && d.pendingReviews === 0) return;

  const riskEmoji: Record<string, string> = { none: '🟢', low: '🟡', medium: '🔴', critical: '🟣' };
  const statusEmoji: Record<string, string> = { success: '✅', failed: '❌', pending_review: '⏳' };

  let text = `📋 <b>自動派工摘要</b>\n`;
  text += `<b>期間：</b>${d.period}\n`;
  text += `<b>已執行：</b>${d.totalExecuted} 個任務\n`;
  text += `<b>成功：</b>${d.successes}  <b>失敗：</b>${d.failures}\n`;
  if (d.pendingReviews > 0) {
    text += `\n🟣 <b>等待老蔡審核：${d.pendingReviews} 個</b>\n`;
  }
  if (d.tasks.length > 0) {
    text += `\n<b>任務明細：</b>\n`;
    for (const t of d.tasks.slice(0, 10)) {
      text += `${riskEmoji[t.risk] || '⚪'} ${t.name} → ${statusEmoji[t.status] || '?'}\n`;
      if (t.summary && t.status === 'failed') {
        text += `   └ ${t.summary.slice(0, 100)}\n`;
      }
    }
  }

  autoExecutorState.lastDigestAt = new Date().toISOString();
  await sendTelegramMessage(text, { parseMode: 'HTML' });
}

// ─── Core execution logic ───

async function executeNextPendingTask(): Promise<void> {
  try {
    if (!hasSupabase() || !supabase) {
      log.warn('[AutoExecutor] Supabase 未連線，無法執行任務');
      return;
    }

    // Rate-limit
    {
      const now = Date.now();
      const windowStart = now - 60_000;
      while (autoExecutorExecHistoryMs.length > 0 && autoExecutorExecHistoryMs[0] < windowStart) {
        autoExecutorExecHistoryMs.shift();
      }
      if (autoExecutorExecHistoryMs.length >= autoExecutorState.maxTasksPerMinute) {
        log.info(
          `[AutoExecutor] Rate limited: ${autoExecutorExecHistoryMs.length}/${autoExecutorState.maxTasksPerMinute} tasks in last 60s`
        );
        return;
      }
    }

    const ocTasks = await fetchOpenClawTasks();
    const pendingTasks = ocTasks
      .map(openClawTaskToTask)
      .filter((t) => t.status === 'ready' && validateTaskForGate(t, 'ready').ok)
      .sort((a, b) => (a.priority || 3) - (b.priority || 3));

    if (pendingTasks.length === 0) {
      log.info('[AutoExecutor] 沒有待執行的任務');
      return;
    }

    const task = pendingTasks[0];
    log.info(`[AutoExecutor] 執行任務: ${task.name} (${task.id})`);

    // Dispatch gate
    if (autoExecutorState.dispatchMode) {
      const riskLevel = classifyTaskRisk(task);

      if (riskLevel === 'critical') {
        autoExecutorState.pendingReviews.push({
          taskId: task.id,
          taskName: task.name || '未命名任務',
          riskLevel,
          reason: '高風險任務需要老蔡審核',
          queuedAt: new Date().toISOString(),
        });
        await upsertOpenClawTask({ id: task.id, status: 'in_progress' });
        await sendTelegramMessage(
          `🟣 <b>高風險任務等待審核</b>\n\n` +
          `<b>任務：</b>${task.name}\n` +
          `<b>風險：</b>critical（需老蔡親自確認）\n` +
          `<b>說明：</b>${(task.description || '無').slice(0, 200)}`,
          { parseMode: 'HTML' }
        );
        log.info(`[AutoDispatch] 🟣 任務「${task.name}」需老蔡審核，已排入待審佇列`);
        autoExecutorState.recentExecutions.push({
          taskId: task.id,
          taskName: task.name || '',
          riskLevel,
          status: 'pending_review',
          executedAt: new Date().toISOString(),
          agentType: 'pending',
          summary: '等待老蔡審核',
        });
        return;
      }

      if (riskLevel === 'medium') {
        log.info(`[AutoDispatch] 🔴 中風險任務「${task.name}」，Claude 審慎執行`);
      } else if (riskLevel === 'low') {
        log.info(`[AutoDispatch] 🟡 低風險任務「${task.name}」，Claude 審核執行`);
      } else {
        log.info(`[AutoDispatch] 🟢 安全任務「${task.name}」，自動批准`);
      }
    }

    const agentType = AgentSelector.selectAgent(task);

    await upsertOpenClawTask({ id: task.id, status: 'in_progress' });

    const { data: run } = await supabase
      .from('openclaw_runs')
      .insert({
        task_id: task.id,
        task_name: task.name,
        status: 'running',
        started_at: new Date().toISOString(),
        steps: [{ name: 'started', status: 'running', startedAt: new Date().toISOString() }],
      })
      .select()
      .single();

    if (!run) {
      log.error('[AutoExecutor] 無法建立 run 記錄');
      return;
    }

    const runId: string = run.id;

    try {
      const result = await AgentExecutor.execute(task, agentType);

      await supabase
        .from('openclaw_runs')
        .update({
          status: 'success',
          ended_at: new Date().toISOString(),
          duration_ms: result.durationMs,
          output_summary: result.output || '',
          steps: [
            { name: 'started', status: 'success', startedAt: run.started_at, endedAt: new Date().toISOString() },
            { name: 'execute', status: 'success', startedAt: run.started_at, endedAt: new Date().toISOString(), message: result.output },
          ],
        })
        .eq('id', runId);

      await upsertOpenClawTask({ id: task.id, status: 'done', progress: 100 });

      autoExecutorExecHistoryMs.push(Date.now());
      autoExecutorState.totalExecutedToday++;
      autoExecutorState.lastExecutedTaskId = task.id;
      autoExecutorState.lastExecutedAt = new Date().toISOString();

      if (autoExecutorState.dispatchMode) {
        autoExecutorState.recentExecutions.push({
          taskId: task.id,
          taskName: task.name || '',
          riskLevel: classifyTaskRisk(task),
          status: 'success',
          executedAt: new Date().toISOString(),
          agentType: agentType || 'auto',
          summary: (result.output || '').slice(0, 300),
        });
        if (autoExecutorState.recentExecutions.length > 100) {
          autoExecutorState.recentExecutions = autoExecutorState.recentExecutions.slice(-100);
        }
      }

      await notifyTaskSuccess(task.name, task.id, runId, result.durationMs);
      log.info(`[AutoExecutor] 任務完成: ${task.name}`);
    } catch (execError) {
      await supabase
        .from('openclaw_runs')
        .update({
          status: 'failed',
          ended_at: new Date().toISOString(),
          error: { message: String(execError), code: 'EXECUTION_FAILED' },
        })
        .eq('id', runId);

      await upsertOpenClawTask({ id: task.id, status: 'queued', progress: 0 });
      await notifyTaskFailure(task.name, task.id, runId, String(execError), 0);
      log.error(`[AutoExecutor] 任務失敗: ${task.name}`, execError);
      autoExecutorExecHistoryMs.push(Date.now());

      if (autoExecutorState.dispatchMode) {
        autoExecutorState.recentExecutions.push({
          taskId: task.id,
          taskName: task.name || '',
          riskLevel: classifyTaskRisk(task),
          status: 'failed',
          executedAt: new Date().toISOString(),
          agentType: agentType || 'auto',
          summary: String(execError).slice(0, 300),
        });
        if (autoExecutorState.recentExecutions.length > 100) {
          autoExecutorState.recentExecutions = autoExecutorState.recentExecutions.slice(-100);
        }
      }
    }
  } catch (e) {
    log.error('[AutoExecutor] 執行任務時發生錯誤:', e);
  }
}

// ─── Start / Stop ───

function startAutoExecutor(pollIntervalMs: number = 10000, maxTasksPerMinute: number = 1): void {
  if (autoExecutorInterval) {
    clearInterval(autoExecutorInterval);
  }

  autoExecutorState.isRunning = true;
  autoExecutorState.pollIntervalMs = pollIntervalMs;
  autoExecutorState.maxTasksPerMinute = Math.max(1, Math.floor(maxTasksPerMinute || 1));
  autoExecutorState.nextPollAt = new Date(Date.now() + pollIntervalMs).toISOString();

  executeNextPendingTask();

  autoExecutorInterval = setInterval(async () => {
    autoExecutorState.lastPollAt = new Date().toISOString();
    autoExecutorState.nextPollAt = new Date(Date.now() + pollIntervalMs).toISOString();
    await executeNextPendingTask();
  }, pollIntervalMs);

  log.info(
    `[AutoExecutor] 已啟動，輪詢間隔: ${pollIntervalMs}ms, maxTasksPerMinute: ${autoExecutorState.maxTasksPerMinute}`
  );
}

function stopAutoExecutor(): void {
  if (autoExecutorInterval) {
    clearInterval(autoExecutorInterval);
    autoExecutorInterval = null;
  }
  autoExecutorState.isRunning = false;
  autoExecutorState.nextPollAt = null;
  log.info('[AutoExecutor] 已停止');
}

// ─── Router ───

export const autoExecutorRouter = Router();

autoExecutorRouter.get('/auto-executor/status', (_req, res) => {
  res.json({ ok: true, ...autoExecutorState });
});

autoExecutorRouter.post('/auto-executor/start', (req, res) => {
  const { pollIntervalMs, maxTasksPerMinute } = req.body || {};
  const interval = pollIntervalMs || 10000;
  const maxTpm = maxTasksPerMinute || autoExecutorState.maxTasksPerMinute || 1;

  if (interval < 5000) {
    return res.status(400).json({ ok: false, message: '輪詢間隔不能小於 5000ms' });
  }

  startAutoExecutor(interval, maxTpm);
  saveAutoExecutorDiskState({ enabled: true, pollIntervalMs: interval, maxTasksPerMinute: maxTpm });
  res.json({ ok: true, message: 'AutoExecutor 已啟動', ...autoExecutorState });
});

autoExecutorRouter.post('/auto-executor/stop', (_req, res) => {
  stopAutoExecutor();
  saveAutoExecutorDiskState({ enabled: false });
  res.json({ ok: true, message: 'AutoExecutor 已停止', ...autoExecutorState });
});

autoExecutorRouter.get('/dispatch/status', (_req, res) => {
  res.json({
    ok: true,
    dispatchMode: autoExecutorState.dispatchMode,
    dispatchStartedAt: autoExecutorState.dispatchStartedAt,
    isRunning: autoExecutorState.isRunning,
    pendingReviewCount: autoExecutorState.pendingReviews.length,
    pendingReviews: autoExecutorState.pendingReviews,
    recentExecutionCount: autoExecutorState.recentExecutions.length,
    recentExecutions: autoExecutorState.recentExecutions.slice(-20),
    lastDigestAt: autoExecutorState.lastDigestAt,
    digestIntervalMs: autoExecutorState.digestIntervalMs,
  });
});

autoExecutorRouter.post('/dispatch/toggle', async (req, res) => {
  const { enabled, digestIntervalMs } = req.body || {};
  const wasOn = autoExecutorState.dispatchMode;
  autoExecutorState.dispatchMode = enabled !== undefined ? Boolean(enabled) : !autoExecutorState.dispatchMode;

  if (autoExecutorState.dispatchMode && !wasOn) {
    autoExecutorState.dispatchStartedAt = new Date().toISOString();
    autoExecutorState.recentExecutions = [];
    autoExecutorState.pendingReviews = [];
    autoExecutorState.lastDigestAt = null;
    if (!autoExecutorState.isRunning) {
      startAutoExecutor(autoExecutorState.pollIntervalMs, autoExecutorState.maxTasksPerMinute);
      saveAutoExecutorDiskState({ enabled: true });
    }
    startDispatchDigestTimer();
    await sendTelegramMessage(
      '🚀 <b>自動派工模式已開啟</b>\n\nClaude 接管指揮權，Agent 向 Claude 報告\n紫燈任務將暫存等老蔡審核',
      { parseMode: 'HTML' }
    );
  }

  if (!autoExecutorState.dispatchMode && wasOn) {
    autoExecutorState.dispatchStartedAt = null;
    stopDispatchDigestTimer();
    await sendDispatchDigest();
    await sendTelegramMessage(
      '⏸️ <b>自動派工模式已關閉</b>\n\nAgent 直接向老蔡報告',
      { parseMode: 'HTML' }
    );
  }

  if (digestIntervalMs && typeof digestIntervalMs === 'number' && digestIntervalMs >= 60000) {
    autoExecutorState.digestIntervalMs = digestIntervalMs;
    if (autoExecutorState.dispatchMode) {
      startDispatchDigestTimer();
    }
  }

  saveAutoExecutorDiskState({
    dispatchMode: autoExecutorState.dispatchMode,
    digestIntervalMs: autoExecutorState.digestIntervalMs,
  });

  res.json({
    ok: true,
    dispatchMode: autoExecutorState.dispatchMode,
    message: autoExecutorState.dispatchMode ? '自動派工已開啟' : '自動派工已關閉',
  });
});

autoExecutorRouter.post('/dispatch/review/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { decision } = req.body || {};

  const idx = autoExecutorState.pendingReviews.findIndex((r) => r.taskId === taskId);
  if (idx === -1) {
    return res.status(404).json({ ok: false, message: '找不到待審核任務' });
  }

  const review = autoExecutorState.pendingReviews[idx];

  if (decision === 'approved') {
    await upsertOpenClawTask({ id: taskId, status: 'queued' });
    autoExecutorState.pendingReviews.splice(idx, 1);
    await sendTelegramMessage(
      `✅ 老蔡已批准任務：<b>${review.taskName}</b>\n任務將由 auto-executor 執行`,
      { parseMode: 'HTML' }
    );
    return res.json({ ok: true, taskId, decision: 'approved' });
  }

  // rejected
  await upsertOpenClawTask({ id: taskId, status: 'done' });
  autoExecutorState.pendingReviews.splice(idx, 1);
  await sendTelegramMessage(
    `❌ 老蔡已拒絕任務：<b>${review.taskName}</b>`,
    { parseMode: 'HTML' }
  );
  res.json({ ok: true, taskId, decision: 'rejected' });
});

// ─── Exports for server bootstrap ───

export {
  autoExecutorState,
  startAutoExecutor,
  stopAutoExecutor,
  loadAutoExecutorDiskState,
  saveAutoExecutorDiskState,
  startDispatchDigestTimer,
  stopDispatchDigestTimer,
};

export default autoExecutorRouter;
