# Auto-Executor Critical Diagnosis & Analysis Report
Generated at: Sun Mar  1 16:08:45 CST 2026
Status: P0 緊急重新診斷
---
## 1. Route Definition Check
### Route file: /Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts
```typescript
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
import { fadpScanTask } from './federation.js';
import { validateTaskForGate } from '../taskCompliance.js';
import { classifyTaskRisk, type DispatchRiskLevel } from '../riskClassifier.js';
import { AgentSelector, AgentExecutor } from '../executor-agents.js';
import {
  sendTelegramMessage,
  notifyTaskSuccess,
  notifyTaskFailure,
} from '../utils/telegram.js';
import {
  circuitBreakerCheck,
  circuitBreakerSuccess,
  circuitBreakerFailure,
  circuitBreakerReset,
  configureCircuitBreaker,
  getGovernanceStatus,
  attemptAutoRollback,
  validateAcceptanceCriteria,
  recordAgentSuccess,
  recordAgentFailure,
} from '../governanceEngine.js';

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
  pollIntervalMs: 15000,
  maxTasksPerMinute: 3,
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

// ─── 並發鎖：防止多個 poll 同時執行 executeNextPendingTask ───
let executorLocked = false;

// 主人已親自批准的 critical 任務 ID，下一次 poll 時直接執行，不再走派工審核
const approvedCriticalTaskIds = new Set<string>();
const autoExecutorExecHistoryMs: number[] = [];
// AI分析 類任務限頻：每小時最多 5 個，避免量產低價值分析報告
const analysisTaskExecTimestamps: number[] = [];

// 記錄目前正在執行中的任務 ID（用於 SIGTERM graceful shutdown）
const activeTaskIds = new Set<string>();
let dispatchDigestTimer: NodeJS.Timeout | null = null;

// ─── Done 任務自動清理 ───
// 每 6 小時清理一次超過 7 天的 done/failed 任務
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 6 * 3600_000; // 6 小時
const DONE_RETENTION_DAYS = 7;

async function cleanupStaleDoneTasks(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  if (!hasSupabase() || !supabase) return;

  try {
    const cutoff = new Date(now - DONE_RETENTION_DAYS * 86400_000).toISOString();
    const { data: stale, error: fetchErr } = await supabase
      .from('openclaw_tasks')
      .select('id, title, status')
      .in('status', ['done', 'failed'])
      .lt('updated_at', cutoff);

    if (fetchErr || !stale || stale.length === 0) return;

    const ids = stale.map((t: { id: string }) => t.id);
    const { error: delErr } = await supabase
      .from('openclaw_tasks')
      .delete()
      .in('id', ids);

    if (delErr) {
      log.warn(`[Cleanup] 刪除失敗: ${delErr.message}`);
    } else {
      log.info(`[Cleanup] 自動清理 ${ids.length} 個超過 ${DONE_RETENTION_DAYS} 天的 done/failed 任務`);
    }
  } catch (e) {
    log.warn('[Cleanup] 自動清理異常:', e);
  }
}

// ─── 空閒巡邏（Idle Patrol）───
// AutoExecutor 連續空閒一段時間後，用 Gemini 生成巡邏任務讓系統持續運轉
let consecutiveIdlePolls = 0;
const idlePatrolTimestamps: number[] = []; // 每小時最多 2 次
const IDLE_PATROL_THRESHOLD = 20; // 20 polls × 15s ≈ 5 分鐘
const IDLE_PATROL_HOURLY_LIMIT = 2;

async function triggerIdlePatrol(): Promise<void> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
  if (!GOOGLE_API_KEY) {
    log.warn('[IdlePatrol] 沒有 GOOGLE_API_KEY，跳過巡邏');
    return;
  }

  // 限頻：每小時最多 2 次
  const oneHourAgo = Date.now() - 3600_000;
  while (idlePatrolTimestamps.length > 0 && idlePatrolTimestamps[0] < oneHourAgo) {
    idlePatrolTimestamps.shift();
  }
  if (idlePatrolTimestamps.length >= IDLE_PATROL_HOURLY_LIMIT) {
    log.info(`[IdlePatrol] 本小時已巡邏 ${idlePatrolTimestamps.length} 次，休息`);
    return;
  }

  log.info('[IdlePatrol] 任務板空閒，觸發自主巡邏...');

  // 收集系統狀態給 Gemini 參考
  let taskContext = '';
  try {
    const tasks = await fetchOpenClawTasks();
    const recentDone = tasks
      .filter(t => t.status === 'done')
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
      .slice(0, 10);
    taskContext = recentDone.map(t => `- [done] ${t.name}`).join('\n');
  } catch { /* skip */ }

  const prompt = `你是 OpenClaw 星艦指揮中心的自動巡邏系統。任務板目前是空的。

專案路徑：/Users/sky770825/openclaw任務面版設計
技術棧：React + TypeScript + Vite + Express.js (server/src/)

最近完成的任務：
${taskContext || '（無資料）'}

提出 1-2 個有價值的巡邏任務。優先順序：
1. 掃描 server/src/ 真實程式碼，找具體品質問題（TODO/FIXME、大檔案、deprecated API）
2. 安全掃描（API endpoint 未授權風險、敏感資料暴露）
3. 日誌分析（server.log 的 error/warn 統計）

關鍵要求：
- description 必須包含具體執行步驟（用 grep/find/wc 掃什麼路徑、找什麼關鍵字）
- 不要重複已完成的任務
- 任務必須可以用 bash 腳本在 30 秒內完成

回覆格式（嚴格 JSON array）：
[{"name":"任務名（15字以內）","description":"具體步驟描述（80字以內）"}]

只回覆 JSON，不要其他文字。`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!resp.ok) {
      log.warn(`[IdlePatrol] Gemini HTTP ${resp.status}`);
      return;
    }
    const data = await resp.json() as Record<string, unknown>;
    const candidates = (data as Record<string, unknown>).candidates as Array<Record<string, unknown>> | undefined;
    const parts = (candidates?.[0]?.content as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined;
    const text = String(parts?.[0]?.text || '').trim();
    if (!text) {
      log.warn('[IdlePatrol] Gemini 回覆空白');
      return;
    }

    // 提取 JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log.warn(`[IdlePatrol] 無法解析 JSON: ${text.slice(0, 200)}`);
      return;
    }
    const tasks = JSON.parse(jsonMatch[0]) as Array<{ name: string; description: string }>;
    if (!Array.isArray(tasks) || tasks.length === 0) return;

    // 建立任務（最多 3 個）
    const { createTask } = await import('../telegram/action-handlers.js');
    let created = 0;
    for (const t of tasks.slice(0, 3)) {
      if (!t.name || !t.description) continue;
      const result = await createTask(`[巡邏] ${t.name}`, t.description, '達爾');
      log.info(`[IdlePatrol] 建立任務: ${t.name} → ${result}`);
      created++;
    }

    if (created > 0) {
      idlePatrolTimestamps.push(Date.now());
      await sendTelegramMessage(
        `🔭 <b>自主巡邏</b>\n任務板空閒 ${Math.round(consecutiveIdlePolls * 15 / 60)} 分鐘，已自動建立 ${created} 個巡邏任務`,
        { parseMode: 'HTML' }
      );
    }
  } catch (e) {
    log.warn({ err: e }, '[IdlePatrol] 巡邏失敗');
  }
}

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
    pollIntervalMs: 15000,
    maxTasksPerMinute: 3,
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
    text += `\n🟣 <b>等待主人審核：${d.pendingReviews} 個</b>\n`;
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
  // 並發鎖：如果上一個 poll 仍在執行，跳過這次
  if (executorLocked) {
    log.info('[AutoExecutor] 上一個任務仍在執行，跳過本次 poll');
    return;
  }
  executorLocked = true;
  try {
    // 低頻清理：每 6 小時刪除超過 7 天的 done/failed 任務
    await cleanupStaleDoneTasks();

    if (!hasSupabase() || !supabase) {
      log.warn('[AutoExecutor] Supabase 未連線，無法執行任務');
      return;
    }

    // Circuit Breaker gate
    const cbCheck = circuitBreakerCheck();
    if (!cbCheck.allowed) {
      log.info(`[AutoExecutor] 斷路器阻擋: ${cbCheck.reason}`);
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
    // AI分析 類任務限頻檢查（每小時最多 5 個）
    const nowMs = Date.now();
    const oneHourAgo = nowMs - 3600_000;
    while (analysisTaskExecTimestamps.length > 0 && analysisTaskExecTimestamps[0] < oneHourAgo) {
      analysisTaskExecTimestamps.shift();
    }
    const analysisQuotaFull = analysisTaskExecTimestamps.length >= 5;

    const pendingTasks = ocTasks
      .map(openClawTaskToTask)
      .filter((t) => {
        if (t.status !== 'ready') return false;
        // 跳過指派給主人的任務 — 需要主人本人處理
        if (t.owner === '主人') return false;
        // 跳過標記為 manual-only 的任務（需人工執行，不交給 auto-executor）
        if (t.tags?.includes('manual-only')) return false;
        // AI分析 類任務限頻：每小時最多 5 個
        if (analysisQuotaFull && /\[AI分析\]/i.test(t.name || '')) {
          return false;
        }
        // In dispatch mode, skip strict gate validation (no runCommands/agent needed for dispatch)
        if (autoExecutorState.dispatchMode) return true;
        return validateTaskForGate(t, 'ready').ok;
      })
      .sort((a, b) => (a.priority || 3) - (b.priority || 3));

    if (pendingTasks.length === 0) {
      consecutiveIdlePolls++;
      if (consecutiveIdlePolls >= IDLE_PATROL_THRESHOLD) {
        log.info(`[AutoExecutor] 連續空閒 ${consecutiveIdlePolls} 次 (${Math.round(consecutiveIdlePolls * 15 / 60)} 分鐘)，觸發自主巡邏`);
        await triggerIdlePatrol();
        consecutiveIdlePolls = 0; // 巡邏後重新計數
      } else {
        log.info('[AutoExecutor] 沒有待執行的任務');
      }
      return;
    }
    consecutiveIdlePolls = 0; // 有任務就重置

    // Dispatch gate: 在 dispatch mode 下，找到第一個「可執行」的任務
    // critical 且未批准的任務會加入待審佇列後跳過，繼續找下一個
    let task = pendingTasks[0];
    if (autoExecutorState.dispatchMode) {
      for (const candidate of pendingTasks) {
        const riskLevel = classifyTaskRisk(candidate);
        const bossApproved = approvedCriticalTaskIds.has(candidate.id);
        if (riskLevel === 'critical' && !bossApproved) {
          // 加入待審佇列（避免重複加入），然後跳過
          const alreadyPending = autoExecutorState.pendingReviews.some((r) => r.taskId === candidate.id);
          if (!alreadyPending) {
            autoExecutorState.pendingReviews.push({
              taskId: candidate.id,
              taskName: candidate.name || '未命名任務',
              riskLevel,
              reason: '高風險任務需要主人審核',
              queuedAt: new Date().toISOString(),
            });
            await upsertOpenClawTask({ id: candidate.id, status: 'pending_review' as never });
            await sendTelegramMessage(
              `🟣 <b>高風險任務等待審核</b>\n\n` +
              `<b>任務：</b>${candidate.name}\n` +
              `<b>風險：</b>critical（需主人親自確認）\n` +
              `<b>說明：</b>${(candidate.description || '無').slice(0, 200)}`,
              { parseMode: 'HTML' }
            );
            log.info(`[AutoDispatch] 🟣 任務「${candidate.name}」需主人審核，已排入待審佇列，繼續找下一個`);
            autoExecutorState.recentExecutions.push({
              taskId: candidate.id,
              taskName: candidate.name || '',
              riskLevel,
              status: 'pending_review',
              executedAt: new Date().toISOString(),
              agentType: 'pending',
              summary: '等待主人審核',
            });
          } else {
            log.info(`[AutoDispatch] 🟣 任務「${candidate.name}」已在待審佇列，跳過繼續找下一個`);
          }
          continue; // 跳過這個，繼續找
        }
        // 這個任務可以執行，選它
        task = candidate;
        break;
      }

      // 如果所有任務都是 critical 待審，沒有可執行的
      if (autoExecutorState.pendingReviews.some((r) => r.taskId === task.id) &&
          classifyTaskRisk(task) === 'critical' && !approvedCriticalTaskIds.has(task.id)) {
        log.info('[AutoDispatch] 所有任務都在待審佇列，等待主人審核');
        return;
      }
    }

    log.info(`[AutoExecutor] 執行任務: ${task.name} (${task.id})`);

    // Dispatch gate (remaining risk level handling)
    if (autoExecutorState.dispatchMode) {
      const riskLevel = classifyTaskRisk(task);
      const bossApproved = approvedCriticalTaskIds.has(task.id);

      if (riskLevel === 'critical' && !bossApproved) {
        // 已在上方處理，不應到達此處
        return;
      }

      if (bossApproved) {
        log.info(`[AutoDispatch] ✅ 任務「${task.name}」已獲主人批准，跳過風險派工，直接執行`);
        // 注意：不在這裡 delete，等到 upsertOpenClawTask('in_progress') 完成後再 delete
        // 避免競爭條件：delete 後但 upsert 前，另一個 poll 又把它加回 pendingReviews
      } else if (riskLevel === 'medium') {
        log.info(`[AutoDispatch] 🔴 中風險任務「${task.name}」，Claude 審慎執行`);
      } else if (riskLevel === 'low') {
        log.info(`[AutoDispatch] 🟡 低風險任務「${task.name}」，Claude 審核執行`);
      } else {
        log.info(`[AutoDispatch] 🟢 安全任務「${task.name}」，自動批准`);
      }
    }

    // FADP 惡意任務注入掃描（在執行前檢查）
    try {
      const fadpResult = await fadpScanTask(task);
      if (fadpResult.isMalicious) {
        log.warn(`[AutoExecutor] 🚫 FADP 阻擋惡意任務「${task.name}」: ${fadpResult.reason}`);
        await upsertOpenClawTask({ id: task.id, status: 'blocked' as never });
        return;
      }
    } catch {
      // FADP 掃描失敗不阻塞正常任務執行
    }

    const agentType = AgentSelector.selectAgent(task);

    // 記錄 AI分析 類任務的執行時間（限頻用）
    if (/\[AI分析\]/i.test(task.name || '')) {
      analysisTaskExecTimestamps.push(Date.now());
    }

    await upsertOpenClawTask({ id: task.id, status: 'in_progress' });
    // 確保 Supabase 已設為 in_progress 後，才從批准 set 移除（避免競爭條件）
    approvedCriticalTaskIds.delete(task.id);
    // 記錄為 active，SIGTERM 時可回滾
    activeTaskIds.add(task.id);

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
      const quality = result.quality;
      const qualityInfo = quality
        ? { grade: quality.grade, score: quality.score, passed: quality.passed, reason: quality.reason }
        : { grade: 'N/A', score: 0, passed: false, reason: 'no quality data' };

      await supabase
        .from('openclaw_runs')
        .update({
          status: result.success ? 'success' : 'failed',
          ended_at: new Date().toISOString(),
          duration_ms: result.durationMs,
          output_summary: (result.output || '').slice(0, 4000),
          input_summary: JSON.stringify({ agentType, modelUsed: result.modelUsed, exitCode: result.exitCode, quality: qualityInfo }),
          steps: [
            { name: 'generate_script', status: 'success', startedAt: run.started_at, endedAt: new Date().toISOString() },
            { name: 'execute_script', status: result.success ? 'success' : 'failed', startedAt: run.started_at, endedAt: new Date().toISOString(), message: (result.output || '').slice(0, 500) },
            { name: 'quality_gate', status: quality?.passed ? 'success' : 'failed', startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), message: `${qualityInfo.grade} (${qualityInfo.score}/100): ${qualityInfo.reason}` },
          ],
        })
        .eq('id', runId);

      // ── 品質閘門：不及格 → 不標 done ──
      if (quality && !quality.passed) {
        log.warn(`[QualityGate] ❌ 任務「${task.name}」品質不及格: ${quality.grade} (${quality.score}分) — ${quality.reason}`);
        await supabase
          .from('openclaw_runs')
          .update({
            status: 'failed',
            error: { message: `品質閘門: ${quality.grade} (${quality.score}分)`, code: 'QUALITY_GATE_FAILED', checks: quality.checks },
          })
          .eq('id', runId);
        activeTaskIds.delete(task.id);
        // 不及格也寫入品質分數到 result JSON
        const failResult = JSON.stringify({ output: '', quality: { grade: quality.grade, score: quality.score, passed: false, reason: quality.reason } });
        await supabase.from('openclaw_tasks').update({ result: failResult }).eq('id', task.id);
        await upsertOpenClawTask({ id: task.id, status: 'needs_review' as never, progress: 50 });
        recordAgentFailure(agentType || 'auto', false);
        await circuitBreakerFailure();
        await sendTelegramMessage(
          `⚠️ <b>品質閘門擋下</b>\n\n` +
          `<b>任務：</b>${task.name}\n` +
          `<b>評分：</b>${quality.grade} (${quality.score}/100)\n` +
          `<b>原因：</b>${quality.reason}\n\n` +
          `任務已改為 needs_review，等主人決定`,
          { parseMode: 'HTML' }
        );
        return;
      }

      // Acceptance validation（原有的驗收條件檢查，保留）
      const acceptance = await validateAcceptanceCriteria(task, result.output || '');
      if (acceptance.validated && !acceptance.passed) {
        await supabase
          .from('openclaw_runs')
          .update({
            status: 'failed',
            ended_at: new Date().toISOString(),
            error: { message: '驗收條件未通過', code: 'ACCEPTANCE_FAILED' },
          })
          .eq('id', runId);
        activeTaskIds.delete(task.id);
        await upsertOpenClawTask({ id: task.id, status: 'ready', progress: 0 });
        recordAgentFailure(agentType || 'auto', false);
        await circuitBreakerFailure();
        log.warn(`[AutoExecutor] 任務驗收未通過: ${task.name}`);
        return;
      }

      // result 必填驗證（保留）
      if (!result.output || result.output.trim() === '') {
        log.warn(`[AutoExecutor] 任務「${task.name}」完成但無 result 輸出，改標記為 needs_review`);
        await supabase
          .from('openclaw_runs')
          .update({
            status: 'failed',
            ended_at: new Date().toISOString(),
            error: { message: '任務完成但無 result 輸出', code: 'NO_RESULT_OUTPUT' },
          })
          .eq('id', runId);
        activeTaskIds.delete(task.id);
        await upsertOpenClawTask({ id: task.id, status: 'needs_review' as never, progress: 99 });
        recordAgentFailure(agentType || 'auto', false);
        await circuitBreakerFailure();
        return;
      }

      // 寫入 result 欄位（結構化執行結果 + 品質評分）
      const structuredResult = {
        output: (result.output || '').slice(0, 1200),
        exitCode: result.exitCode,
        modelUsed: result.modelUsed || 'unknown',
        hasArtifacts: (result.output || '').includes('=== Artifacts'),
        quality: qualityInfo,
      };
      await supabase
        .from('openclaw_tasks')
        .update({
          result: JSON.stringify(structuredResult).slice(0, 2000),
        })
        .eq('id', task.id);
      activeTaskIds.delete(task.id);
      await upsertOpenClawTask({ id: task.id, status: 'done', progress: 100 });

      // Governance: success tracking
      circuitBreakerSuccess();
      recordAgentSuccess(agentType || 'auto');

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
          summary: (result.output || '').replace(/\n+/g, ' ').trim().slice(0, 150),
        });
        if (autoExecutorState.recentExecutions.length > 20) {
          autoExecutorState.recentExecutions = autoExecutorState.recentExecutions.slice(-20);
        }
      }

      await notifyTaskSuccess(task.name, task.id, runId, result.durationMs);
      log.info(`[AutoExecutor] 任務完成: ${task.name}`);
    } catch (execError) {
      const errorMsg = String(execError);

      // Governance: attempt auto-rollback
      const rollback = await attemptAutoRollback(task, errorMsg);

      await supabase
        .from('openclaw_runs')
        .update({
          status: 'failed',
          ended_at: new Date().toISOString(),
          error: {
            message: errorMsg,
            code: 'EXECUTION_FAILED',
            rollbackAttempted: rollback.attempted,
            rollbackSuccess: rollback.success,
          },
        })
        .eq('id', runId);

      activeTaskIds.delete(task.id);
      await upsertOpenClawTask({ id: task.id, status: 'ready', progress: 0 });
      await notifyTaskFailure(task.name, task.id, runId, errorMsg, 0);
      log.error(`[AutoExecutor] 任務失敗: ${task.name}`, execError);

      // Governance: failure tracking
      recordAgentFailure(agentType || 'auto', rollback.attempted);
      await circuitBreakerFailure();

      autoExecutorExecHistoryMs.push(Date.now());

      if (autoExecutorState.dispatchMode) {
        autoExecutorState.recentExecutions.push({
          taskId: task.id,
          taskName: task.name || '',
          riskLevel: classifyTaskRisk(task),
          status: 'failed',
          executedAt: new Date().toISOString(),
          agentType: agentType || 'auto',
          summary: errorMsg.replace(/\n+/g, ' ').trim().slice(0, 150),
        });
        if (autoExecutorState.recentExecutions.length > 20) {
          autoExecutorState.recentExecutions = autoExecutorState.recentExecutions.slice(-20);
        }
      }
    }
  } catch (e) {
    log.error('[AutoExecutor] 執行任務時發生錯誤:', e);
  } finally {
    executorLocked = false;
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
      '🚀 <b>自動派工模式已開啟</b>\n\nClaude 接管指揮權，Agent 向 Claude 報告\n紫燈任務將暫存等主人審核',
      { parseMode: 'HTML' }
    );
  }

  if (!autoExecutorState.dispatchMode && wasOn) {
    autoExecutorState.dispatchStartedAt = null;
    stopDispatchDigestTimer();
    await sendDispatchDigest();
    await sendTelegramMessage(
      '⏸️ <b>自動派工模式已關閉</b>\n\nAgent 直接向主人報告',
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
    // 記錄為主人已批准，下一次 poll 時跳過 critical 派工閘，直接執行
    approvedCriticalTaskIds.add(taskId);
    await upsertOpenClawTask({ id: taskId, status: 'ready' });
    autoExecutorState.pendingReviews.splice(idx, 1);
    await sendTelegramMessage(
      `✅ 主人已批准任務：<b>${review.taskName}</b>\n任務將由 auto-executor 直接執行`,
      { parseMode: 'HTML' }
    );
    return res.json({ ok: true, taskId, decision: 'approved' });
  }

  // rejected
  await upsertOpenClawTask({ id: taskId, status: 'done' });
  autoExecutorState.pendingReviews.splice(idx, 1);
  await sendTelegramMessage(
    `❌ 主人已拒絕任務：<b>${review.taskName}</b>`,
    { parseMode: 'HTML' }
  );
  res.json({ ok: true, taskId, decision: 'rejected' });
});

// ─── Governance API ───

autoExecutorRouter.get('/governance/status', (_req, res) => {
  res.json({ ok: true, ...getGovernanceStatus() });
});

autoExecutorRouter.post('/governance/circuit-breaker/reset', (_req, res) => {
  circuitBreakerReset();
  res.json({ ok: true, message: '斷路器已重置', ...getGovernanceStatus() });
});

autoExecutorRouter.post('/governance/circuit-breaker/config', (req, res) => {
  const { failureThreshold, cooldownMs, halfOpenAllowance } = req.body || {};
  const patch: Record<string, number> = {};
  if (typeof failureThreshold === 'number' && failureThreshold >= 1) patch.failureThreshold = failureThreshold;
  if (typeof cooldownMs === 'number' && cooldownMs >= 10000) patch.cooldownMs = cooldownMs;
  if (typeof halfOpenAllowance === 'number' && halfOpenAllowance >= 1) patch.halfOpenAllowance = halfOpenAllowance;
  configureCircuitBreaker(patch);
  res.json({ ok: true, message: '斷路器配置已更新', ...getGovernanceStatus() });
});

// ─── Recent executions (for frontend dashboard) ───

autoExecutorRouter.get('/auto-executor/recent', (_req, res) => {
  res.json({
    ok: true,
    isRunning: autoExecutorState.isRunning,
    dispatchMode: autoExecutorState.dispatchMode,
    totalExecutedToday: autoExecutorState.totalExecutedToday,
    lastExecutedAt: autoExecutorState.lastExecutedAt,
    recentExecutions: autoExecutorState.recentExecutions.slice(-10),
    pendingReviews: autoExecutorState.pendingReviews.slice(-5),
  });
});

// ─── Exports for server bootstrap ───

export {
  autoExecutorState,
  activeTaskIds,
  startAutoExecutor,
  stopAutoExecutor,
  loadAutoExecutorDiskState,
  saveAutoExecutorDiskState,
  startDispatchDigestTimer,
  stopDispatchDigestTimer,
};

export default autoExecutorRouter;
```
## 2. API Mounting Check (index.ts / app.ts)
### Main app file: /Users/sky770825/openclaw任務面版設計/server/src/index.ts
Relevant mount points (searching for 'auto-executor' or 'api'):
```typescript
/**
 * OpenClaw 後端 API
 * 實作 docs/API-INTEGRATION.md 規格，供中控台接上後「立即執行」打此服務
 * OpenClaw v4 板：/api/openclaw/* 寫入 Supabase
 */
import './preload-dotenv.js';
import { createLogger } from './logger.js';
import { startTelegramStopPoll, triggerHeartbeat } from './telegram/index.js';
import path from 'path';
--
  startAutoExecutor,
  stopAutoExecutor,
  loadAutoExecutorDiskState,
  saveAutoExecutorDiskState,
  startDispatchDigestTimer,
} from './routes/auto-executor.js';
// === 新增：房源文案 API 路由 (P3 任務) ===
import propertyApiRouter from './routes/property-api.js';
import { proxyRouter } from './routes/proxy.js';
import {
  hasN8n,
--
// 使用新的认证中间件
app.use('/api', authMiddleware);

// 挂载路由模块
app.use('/api/tasks', tasksRouter);
app.use('/api/openclaw/projects', projectsRouter);
app.use('/api/openclaw', autoExecutorRouter);
app.use('/api/openclaw', memoryRouter);
app.use('/api/openclaw/tasks', openclawTasksRouter);
app.use('/api/openclaw/reviews', openclawReviewsRouter);
app.use('/api/openclaw', openclawDataRouter);
app.use('/api/openclaw/insights', insightsRouter);
// === 新增：房源文案 API 路由 (P3 任務) ===
app.use('/api/tools', propertyApiRouter);
// API Key 安全代理（proxy_fetch action + HTTP endpoint）
app.use('/api/proxy', proxyRouter);
// FADP 聯盟協防協議路由（/api/federation/*，部分端點不需 auth，內部使用 x-fadp-key）
--

// OpenClaw 任務 CRUD 已遷移至 routes/openclaw-tasks.ts
// 以下保留需要 index.ts 本地函數（createRun/simulateExecution）的執行路由

// OpenClaw 執行任務（與 /api/tasks/:id/run 相同邏輯；有 Supabase 時寫入 openclaw_runs）
app.post('/api/openclaw/tasks/:id/run', async (req, res) => {
  const task = await getTaskForRun(req.params.id);
  if (!task)
    return res.status(404).json({ message: 'Task not found' });
  let run = createRun(task);
  if (hasSupabase()) {
--
  simulateExecution(run.id);
  res.status(201).json(run);
});

// 自動化：執行第一個 queued 任務（供 cron / n8n 呼叫）
app.post('/api/openclaw/run-next', async (_req, res) => {
  const result = await executeNextQueuedTask();
  if (!result.ok) return res.status(result.status).json({ ok: false, message: result.message });
  res.status(201).json({ run: result.run, taskId: result.taskId });
});

// OpenClaw reviews CRUD 已遷移至 routes/openclaw-reviews.ts

// ─── 紅色警戒 ─────────────────────────────────────────────

/** 達爾觸發紅色警戒：建立警報 + block 任務 + Telegram 通知 */
app.post('/api/openclaw/red-alert', async (req, res) => {
  try {
    const { taskId, title, description, severity, category } = req.body as {
      taskId?: string;
      title?: string;
      description?: string;
--
    res.status(500).json({ message: 'Failed to trigger red alert' });
  }
});

/** 主人解除紅色警戒：review approved + 任務恢復 queued */
app.post('/api/openclaw/red-alert/:reviewId/resolve', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { taskId } = req.body as { taskId?: string };
    if (!taskId) return res.status(400).json({ message: 'taskId 必填' });

--
const PROPOSAL_CAT_EMOJI: Record<string, string> = {
  commercial: '💼', system: '⚙️', tool: '🔧', risk: '🛡️', creative: '💡',
};

/** 達爾提案：建立提案 review + Telegram 通知主人 */
app.post('/api/openclaw/proposal', async (req, res) => {
  try {
    const { title, category, background, idea, goal, risk } = req.body as {
      title?: string;
      category?: string;
      background?: string;
--
    res.status(500).json({ message: 'Failed to submit proposal' });
  }
});

/** 主人審核提案：批准 / 駁回 / 批准+轉任務 */
app.post('/api/openclaw/proposal/:reviewId/decide', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { decision, note } = req.body as { decision?: string; note?: string };
    if (!decision || !['approved', 'rejected', 'task'].includes(decision)) {
      return res.status(400).json({ message: 'decision 必填（approved / rejected / task）' });
--
});

// automations CRUD + evolution-log + ui-actions 已遷移至 routes/openclaw-data.ts
// 保留 automations/:id/run — 因依賴執行引擎（executeNextQueuedTask 等）

app.post('/api/openclaw/automations/:id/run', async (req, res) => {
  try {
    const list = await fetchOpenClawAutomations();
    const automation = list.find((a) => a.id === req.params.id);
    if (!automation) return res.status(404).json({ ok: false, message: 'Automation not found' });

--
  } catch (e) {
    res.status(500).json({ ok: false, message: 'Failed to run automation' });
  }
});

app.post('/api/openclaw/command', async (req, res) => {
  try {
    const body = req.body as {
      sessionId?: string;
      from?: string;
      command?: {
--
    await saveSharedState(updated, executionStatus === 'failed' ? 'failed' : executionStatus === 'paused' ? 'paused' : executionStatus === 'completed' ? 'completed' : 'active');
    await appendCommandLog(sessionId, from, safeJsonObject(command as unknown));

    res.json({ ok: true, next });
  } catch (e) {
    log.error('[OpenClaw] POST /api/openclaw/command error:', e);
    res.status(500).json({ ok: false, message: 'Failed to process command' });
  }
});

app.post('/api/openclaw/interrupt', async (req, res) => {
  try {
    const body = req.body as {
      sessionId?: string;
      from?: string;
      reason?: string;
--
      });
    }

    res.status(201).json({ ok: true, interruptId, deadline, options });
  } catch (e) {
    log.error('[OpenClaw] POST /api/openclaw/interrupt error:', e);
    res.status(500).json({ ok: false, message: 'Failed to create interrupt' });
  }
});

app.post('/api/openclaw/resume', async (req, res) => {
  try {
    const body = req.body as {
      sessionId?: string;
      interruptId?: string;
      decision?: AgentDecision;
--
          feedback: feedback ?? null,
        },
      },
    });
  } catch (e) {
    log.error('[OpenClaw] POST /api/openclaw/resume error:', e);
    res.status(500).json({ ok: false, message: 'Failed to resume session' });
  }
});

// ---- Agent Protocol 查詢端點 ----

// 取得單一 Session（SharedState + DB 狀態）
app.get('/api/openclaw/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    // SharedState（記憶體 or Supabase shared_state）
    const state = await getSharedState(sessionId);

--
      status: meta?.status ?? 'active',
      sharedState: state,
      meta,
    });
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/sessions/:id error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch session' });
  }
});

// 取得 Session 的 Command 日誌
app.get('/api/openclaw/sessions/:id/commands', async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (hasSupabase() && supabase) {
      const { data, error } = await supabase
        .from('openclaw_commands')
--
      );
    }
    // 無 Supabase 時僅回空陣列（Command 僅寫入 DB）
    return res.json([]);
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/sessions/:id/commands error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch commands' });
  }
});

// 取得 Session 的 Interrupt 記錄
app.get('/api/openclaw/sessions/:id/interrupts', async (req, res) => {
  try {
    const sessionId = req.params.id;
    if (hasSupabase() && supabase) {
      const { data, error } = await supabase
        .from('openclaw_interrupts')
--
        resolvedAt: row.resolvedAt,
      });
    }
    return res.json(rows);
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/sessions/:id/interrupts error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch interrupts' });
  }
});

// ---- Board Config（中控板單一資料源，供多任務板同步）----
--
    { id: 'n4', name: '告警推送 Pipeline', status: 'active', trigger: 'Supabase Realtime', nodes: 5, execs: 34, lastExec: '09:15', desc: '監聽 critical 等級審核項目，即時推送 Telegram + Email 告警' },
    { id: 'n5', name: 'API Rate Limiter', status: 'draft', trigger: 'Webhook', nodes: 4, execs: 0, lastExec: '—', desc: '對外部 API 呼叫進行速率限制，防止 token 超支' },
  ] as const,
};

app.get('/api/openclaw/board-config', async (_req, res) => {
  try {
    let n8nFlows: Array<{ id: string; name: string; status: string; trigger: string; nodes: number; execs: number; lastExec: string; desc: string }>;
    if (hasN8n()) {
      try {
        const workflows = await listWorkflows(false);
--
      securityLayers: BOARD_CONFIG.securityLayers,
      rbacMatrix: BOARD_CONFIG.rbacMatrix,
      plugins: BOARD_CONFIG.plugins,
    });
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/board-config error:', e);
    res.status(500).json({ message: 'Failed to fetch board config' });
  }
});

app.get('/api/openclaw/board-health', async (_req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const supabaseConnected = hasSupabase();
    const n8nConfigured = hasN8n();

--
        alerts: alerts.length,
      },
      notes,
    });
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/board-health error:', e);
    res.status(500).json({ ok: false, message: 'Failed to fetch board health' });
  }
});

// ---- Shield Deck / Protection summary ----
--
        .limit(50);
      recentLogs = (logs ?? []) as typeof recentLogs;
      blockedToday = recentLogs.length;
    }

    // auto-executor 中目前 running 的任務數（危險指標）
    let runningTasks = 0;
    if (hasSupabase() && supabase) {
      const { data: tasks } = await supabase.from('openclaw_tasks').select('id').eq('status','in_progress');
      runningTasks = (tasks ?? []).length;
    }
--
};

const wakeReports: WakeReport[] = [];

// POST — 前端甦醒時寫入
app.post('/api/openclaw/wake-report', async (req, res) => {
  try {
    const body = req.body || {};
    const report: WakeReport = {
      id: `wake-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ts: new Date().toISOString(),
--
      }).catch(err => log.warn('[OpenClaw] wake n8n webhook failed:', err));
    }

    res.json({ ok: true, id: report.id });
  } catch (e) {
    log.error('[OpenClaw] POST /api/openclaw/wake-report error:', e);
    res.status(500).json({ ok: false, message: 'Failed to save wake report' });
  }
});

// GET — CLI / 外部讀取甦醒報告
app.get('/api/openclaw/wake-report', async (_req, res) => {
  try {
    // 優先從 Supabase 讀
    if (hasSupabase()) {
      try {
        const { data } = await supabase!.from('openclaw_wake_reports')
--
        }
      } catch { /* fallback to in-memory */ }
    }
    res.json({ ok: true, source: 'memory', reports: wakeReports.slice(0, 20) });
  } catch (e) {
    log.error('[OpenClaw] GET /api/openclaw/wake-report error:', e);
    res.status(500).json({ ok: false, reports: [] });
  }
});

// PATCH — 標記已處理
app.patch('/api/openclaw/wake-report/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const report = wakeReports.find(r => r.id === id);
    if (report) {
      report.resolved = true;
--
    res.status(500).json({ ok: false });
  }
});

// ---- Daily Report ----
app.get('/api/openclaw/daily-report', async (req, res) => {
  try {
    const sendTg = req.query.notify === '1';
    const today = new Date().toISOString().slice(0, 10);

    // 統計任務
--

function writeDeputyState(state: Record<string, unknown>): void {
  fs.writeFileSync(DEPUTY_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

app.get('/api/openclaw/deputy/status', (_req, res) => {
  const state = readDeputyState();
  let lastRun: Record<string, unknown> = {};
  try {
    lastRun = JSON.parse(fs.readFileSync(DEPUTY_LAST_FILE, 'utf8'));
  } catch { /* no last run */ }
  res.json({ ok: true, ...state, lastRun });
});

app.post('/api/openclaw/deputy/toggle', async (req, res) => {
  try {
    const state = readDeputyState();
    const body = req.body || {};
    const newEnabled = typeof body.enabled === 'boolean' ? body.enabled : !state.enabled;

--
    log.error('[OpenClaw] deputy toggle error:', e);
    res.status(500).json({ ok: false, message: 'Failed to toggle deputy mode' });
  }
});

app.post('/api/openclaw/deputy/run-now', async (_req, res) => {
  try {
    const scriptPath = path.join(repoRootPath(), 'scripts', 'openclaw-deputy.sh');
    if (!fs.existsSync(scriptPath)) {
      res.status(404).json({ ok: false, message: 'deputy script not found' });
      return;
--
  }
  lines.push('');
  return lines.join('\n');
}

app.get('/api/openclaw/indexer/status', (_req, res) => {
  const { dir, jsonlPath, mdPath } = resolveTaskIndexPaths();
  res.json({
    ok: true,
    dir,
    jsonlPath,
--
    jsonlExists: fs.existsSync(jsonlPath),
    mdExists: fs.existsSync(mdPath),
  });
});

app.get('/api/openclaw/indexer/records', (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 20));
  const { jsonlPath } = resolveTaskIndexPaths();
  const { total, records } = readJsonlRecords(jsonlPath, limit);
  res.json({ ok: true, total, records });
});

app.post('/api/openclaw/indexer/rebuild-md', async (_req, res) => {
  try {
    const { dir, jsonlPath, mdPath } = resolveTaskIndexPaths();
    fs.mkdirSync(dir, { recursive: true });

    const list = hasSupabase() ? (await fetchOpenClawTasks()).map(openClawTaskToTask) : tasks;
--
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
--
    res.status(500).json({ ok: false, message: '重啟失敗', error: String(e) });
  }
});

// Projects → routes/projects.ts
// AutoExecutor + Dispatch → routes/auto-executor.ts


function repoRootPath(): string {
  // Works both in src and dist:
  // <repo>/server/src/index.ts OR <repo>/server/dist/index.js
--
  return path.resolve(here, '..', '..');
}


// ==================== Maintenance: Reconcile（狀態校正）====================
app.post('/api/openclaw/maintenance/reconcile', async (_req, res) => {
  try {
    if (!hasSupabase()) {
      return res.status(503).json({ message: 'Supabase not connected' });
    }
    const ocTasks = await fetchOpenClawTasks();
--
    return res.status(500).json({ ok: false, message: String(e) });
  }
});

// ─── Activity Log ───
app.get('/api/openclaw/activity-log', (req, res) => {
  const lines = Math.min(Number(req.query.lines) || 20, 100);
  const logPath = path.join(
    process.env.HOME || '/Users/sky770825',
    'Desktop/達爾/🧠核心文件/shared-activity.log',
  );
--
  log.info(`OpenClaw API http://localhost:${PORT}`);
  log.info(`  WebSocket ws://localhost:${PORT}/ws`);
  log.info(`  GET  /api/tasks, /api/tasks/:id, PATCH /api/tasks/:id`);
  log.info(`  GET  /api/runs, /api/runs/:id, POST /api/tasks/:taskId/run, POST /api/runs/:id/rerun`);
  log.info(`  GET  /api/alerts, PATCH /api/alerts/:id`);
  log.info(`  AutoExecutor: GET/POST /api/openclaw/auto-executor/status|start|stop`);
  log.info(`  OpenClaw v4 (Supabase): GET/POST/PATCH /api/openclaw/tasks, /api/openclaw/reviews, /api/openclaw/automations`);
  log.info(`  FADP: GET /api/federation/status|members|attack/events|blocklist`);
  if (hasSupabase()) {
    log.info(`  [Supabase] 已連線 (openclaw_tasks / projects 等將正常運作)`);
  } else {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    log.warn(`  [Supabase] 未連線 → /api/openclaw/* 會回 503。請在專案根目錄 .env 設定 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY 後重啟。`);
    if (!url) log.warn(`    - SUPABASE_URL 未設定`);
    if (!key) log.warn(`    - SUPABASE_SERVICE_ROLE_KEY 未設定`);
  }
  if (isTelegramConfigured()) {
    log.info(`  [Telegram] 已設定，任務開始/完成/失敗/超時通知將發送至 TG`);
```
## 3. Log Evidence Analysis
❌ ERROR: Log file not found at /Users/sky770825/openclaw任務面版設計/taskboard.log
## 4. Task Picking & Status Logic
### Query logic in executor-agents.ts
```typescript
362-echo "" && \
363-echo "=== 🧹 清理超過 7 天的 temp 檔案 ===" && \
364:find /tmp -type f -mtime +7 -delete 2>/dev/null | head -5 && \
365-echo "清理完成" && \
366-echo "" && \
367-echo "✅ 磁碟監控任務完成"`;
368-    } else if (task.name.includes('Ollama') || task.name.includes('ollama')) {
369-      command = `
--
688-    // 2a. 不能包含明確失敗訊息（15 分）
689-    const failurePatterns = [
690:      'verification failed', 'not found', 'no such file', 'cannot find',
691-      'permission denied', 'access denied', 'connection refused',
692-      'health check failed', 'api health check failed',
693-      'failed to connect', 'couldn\'t connect', 'econnrefused',
694-      'command not found', 'no such command', 'syntax error',
695-      'traceback', 'exception', 'errno', 'segfault',
--
783-      });
784-      // 3c. 有具體結論或建議（5 分）
785:      const conclusionPatterns = ['結論', '建議', '推薦', '總結', 'conclusion', 'recommendation', 'summary', 'finding'];
786-      const hasConclusion = conclusionPatterns.some(p => stdoutLower.includes(p));
787-      checks.push({
788-        name: 'analysis_has_conclusion',
789-        passed: hasConclusion,
790-        weight: 5,
--
1029-- WRITABLE workspace directories:
1030-${WRITABLE_WORKSPACE_DIRS.map(d => `  - ${d}`).join('\n')}
1031:- Available tools: bash, curl, node, python3, jq, sed, awk, grep, find
1032-- OS: macOS (Darwin)`;
1033-
1034-      restrictionSection = `RESTRICTIONS — 保護核心資產:
1035-- Do NOT access or modify .env, openclaw.json, sessions.json, config.json (API keys)
1036-- Do NOT access or modify SOUL.md, AWAKENING.md, IDENTITY.md (靈魂文件)
--
1066-  - ${PROJECT_ROOT}/server/package.json (dependencies)
1067-  - ${PROJECT_ROOT}/package.json (frontend dependencies)
1068:- Available tools: bash, curl, node, python3, jq, sed, awk, grep, find, wc
1069-- OS: macOS (Darwin)`;
1070-
1071-      restrictionSection = `HARD RESTRICTIONS — NEVER violate these:
1072-- ONLY READ from ${PROJECT_ROOT}/ — do NOT modify any files there
1073-- Write ALL output files to ${outputDir}/ only
--
1081-1. Start with #!/bin/bash and set -e
1082-2. SCAN THE REAL PROJECT at ${PROJECT_ROOT}/ — not sandbox
1083:3. Use grep, find, wc, jq to extract real data from actual source files
1084-4. Report real numbers: actual file counts, line counts, function counts
1085-5. Write analysis report to ${outputDir}/
1086-6. Print a clear summary at the end with "TASK_COMPLETE:" prefix
1087-7. Include specific file paths and line numbers in your analysis
1088-
--
1100-- Working directory: ${SANDBOX_WORKDIR}
1101-- Output directory: ${outputDir}
1102:- Available tools: bash, curl, node, python3, jq, sed, awk, grep, find
1103-- OS: macOS (Darwin)`;
1104-
1105-      restrictionSection = `HARD RESTRICTIONS — NEVER violate these:
1106-- Write ALL output files to ${outputDir}/ only
1107-- Do NOT access or modify .env files
```
### Status Update occurrences (Potential bug location)
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:        body: JSON.stringify({ status: 'done', progress: 100 }),
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:      await upsertOpenClawTask({ id: task.id, status: 'done', progress: 100 });
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  await upsertOpenClawTask({ id: taskId, status: 'done' });
## 5. Authentication & Permission Check
Auth middleware file not found.

## Preliminary Findings
1. **API 404/Cannot POST**: Highly likely a path mismatch between  and the requested URL. Check if  prefix is missing in .
2. **Ready Tasks Ignored**: Check if  filter excludes tasks based on  or . If  is updating, the loop runs but the query returns 0 tasks.
3. **Incorrect Done Status**: Investigate . If an agent throws an  but the error handler defaults the task to , it will cause the described behavior.
