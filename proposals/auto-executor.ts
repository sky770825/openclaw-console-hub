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
  sendTelegramMessageToChat,
  notifyTaskSuccess,
} from '../utils/telegram.js';

// 達爾 bot — 任務完成後通知達爾（指揮官需要知道結果）
const XIAOCAI_BOT_TOKEN = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim() ?? '';
const XIAOCAI_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim() ?? '';

async function notifyXiaocaiTaskResult(
  taskName: string, taskId: string, success: boolean, summary?: string, qualityInfo?: string
): Promise<void> {
  if (!XIAOCAI_BOT_TOKEN || !XIAOCAI_CHAT_ID) return;
  try {
    const icon = success ? '✅' : '❌';
    const status = success ? '完成' : '失敗';
    const summaryLine = summary ? `\n📝 ${summary.slice(0, 200)}` : '';
    const qualityLine = qualityInfo ? `\n📊 ${qualityInfo}` : '';
    const nextStep = success
      ? '\n👉 用 query_supabase 查看詳細結果，確認品質後跟主人匯報'
      : '\n👉 用 query_supabase 查看錯誤原因，判斷要重建任務還是報告主人';
    const text = `${icon} 任務${status}：${taskName}\n🆔 ${taskId}${summaryLine}${qualityLine}${nextStep}`;
    await sendTelegramMessageToChat(XIAOCAI_CHAT_ID, text, { token: XIAOCAI_BOT_TOKEN });
  } catch { /* 通知失敗不影響主流程 */ }
}
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
  maxTasksPerMinute:  5,
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

// ─── 並發槽位：最多同時執行 MAX_CONCURRENT 個任務 ───
const MAX_CONCURRENT = 2; // 2 條線路同時跑
interface ExecutorSlot { taskId: string; startedAt: number; }
const activeSlots: ExecutorSlot[] = [];
const SLOT_TIMEOUT_MS = 2 * 60 * 1000; // 單槽超時 2 分鐘

// 主人已親自批准的 critical 任務 ID，下一次 poll 時直接執行，不再走派工審核
const approvedCriticalTaskIds = new Set<string>();
const autoExecutorExecHistoryMs: number[] = [];
// AI分析 類任務限頻：每小時最多 5 個，避免量產低價值分析報告
const analysisTaskExecTimestamps: number[] = [];

// 記錄目前正在執行中的任務 ID（用於 SIGTERM graceful shutdown）
const activeTaskIds = new Set<string>();
// 任務失敗次數追蹤（超過 MAX_TASK_RETRIES 就不再重試）
const taskFailCounts = new Map<string, number>();
const MAX_TASK_RETRIES = 1; // 允許重試 1 次，第 2 次失敗就停
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
const IDLE_PATROL_HOURLY_LIMIT = 1;

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

    // 清理 AI 回傳的 markdown code block（```json ... ```）
    const cleaned = text
      .replace(/`{1,3}json\s*\n?/g, '')
      .replace(/\n?\s*`{1,3}(?=\s*$|\s*\n)/gm, '');

    // 提取 JSON array
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log.warn(`[IdlePatrol] 無法解析 JSON: ${text.slice(0, 200)}`);
      return;
    }
    const tasks = JSON.parse(jsonMatch[0]) as Array<{ name: string; description: string }>;
    if (!Array.isArray(tasks) || tasks.length === 0) return;

    // 建立任務（最多 3 個）
    const { createTask } = await import('../telegram/action-handlers.js');
    let created = 0;
    for (const t of tasks.slice(0, 1)) {
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
    maxTasksPerMinute:  5,
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
  // 並發槽位檢查：超時的槽位強制回收
  const now = Date.now();
  for (let i = activeSlots.length - 1; i >= 0; i--) {
    const age = now - activeSlots[i].startedAt;
    if (age > SLOT_TIMEOUT_MS) {
      log.warn(`[AutoExecutor] ⚠️ 槽位 ${activeSlots[i].taskId} 已 ${Math.round(age / 1000)}s，強制回收`);
      activeSlots.splice(i, 1);
    }
  }
  // 所有槽位都滿 → 跳過本次 poll
  if (activeSlots.length >= MAX_CONCURRENT) {
    log.info(`[AutoExecutor] ${activeSlots.length}/${MAX_CONCURRENT} 槽位使用中，跳過本次 poll`);
    return;
  }
  // 佔一個槽位（先用 placeholder，拿到 taskId 後更新）
  activeSlots.push({ taskId: '__pending__', startedAt: Date.now() });
  let currentSlotTaskId = '__pending__';
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
        // 跳過已在並發槽位中的任務（避免同一任務跑兩次）
        if (activeSlots.some(s => s.taskId === t.id)) return false;
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
      .sort((a, b) => {
        // Fast Lane：快速任務（查詢/讀取/分析）優先，慢任務（build/deploy/code）靠後
        const SLOW_PATTERNS = /\b(build|deploy|安裝|install|compile|重啟|restart|migration)\b/i;
        const aIsSlow = SLOW_PATTERNS.test(a.name || '') || SLOW_PATTERNS.test(a.description || '');
        const bIsSlow = SLOW_PATTERNS.test(b.name || '') || SLOW_PATTERNS.test(b.description || '');
        if (aIsSlow !== bIsSlow) return aIsSlow ? 1 : -1; // 快任務排前面
        // 同類別內按 priority 排序
        return (a.priority || 3) - (b.priority || 3);
      });

    if (pendingTasks.length === 0) {
      consecutiveIdlePolls++;
      if (consecutiveIdlePolls >= IDLE_PATROL_THRESHOLD) {
        // IdlePatrol 已關閉（主人 2026-03-02 指令）— 空閒就空閒，不自己建任務
        consecutiveIdlePolls = 0;
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

    // 更新槽位 placeholder 為實際 taskId
    currentSlotTaskId = task.id;
    const mySlot = activeSlots.find(s => s.taskId === '__pending__');
    if (mySlot) mySlot.taskId = task.id;
    log.info(`[AutoExecutor] 執行任務: ${task.name} (${task.id}) [槽位 ${activeSlots.length}/${MAX_CONCURRENT}]`);

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
        // 寫入易讀的失敗原因到 task result
        const failReason = `❌ 品質閘門不及格：${quality.grade} (${quality.score}/100 分)\n\n原因：${quality.reason}\n\n${quality.checks ? '檢查項目：\n' + (quality.checks as Array<{name: string; passed: boolean; detail?: string}>).map((c: {name: string; passed: boolean; detail?: string}) => `${c.passed ? '✅' : '❌'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`).join('\n') : ''}`;
        await supabase.from('openclaw_tasks').update({ result: failReason }).eq('id', task.id);
        const qgFails = (taskFailCounts.get(task.id) || 0) + 1;
        taskFailCounts.set(task.id, qgFails);
        if (qgFails <= MAX_TASK_RETRIES) {
          await upsertOpenClawTask({ id: task.id, status: 'queued', progress: 0 });
          log.warn(`[AutoExecutor] 品質閘門擋下 (${qgFails}/${MAX_TASK_RETRIES + 1}，重試): ${task.name} — ${quality.grade} (${quality.score}分)`);
        } else {
          await upsertOpenClawTask({ id: task.id, status: 'failed' as never, progress: 0 });
          taskFailCounts.delete(task.id);
          log.warn(`[AutoExecutor] 品質閘門擋下 (${qgFails}次，不再重試): ${task.name} — ${quality.grade} (${quality.score}分) ${quality.reason}`);
        }
        recordAgentFailure(agentType || 'auto', false);
        await circuitBreakerFailure();
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
        const acDetails = acceptance.results.map(r => `${r.passed ? '✅' : '❌'} ${r.criterion}${r.error ? ` — ${r.error}` : ''}`).join('\n');
        const acFailReason = `❌ 驗收條件未通過\n\n${acDetails || '未達到任務的驗收標準'}`;
        await supabase.from('openclaw_tasks').update({ result: acFailReason }).eq('id', task.id);
        const acFails = (taskFailCounts.get(task.id) || 0) + 1;
        taskFailCounts.set(task.id, acFails);
        if (acFails <= MAX_TASK_RETRIES) {
          await upsertOpenClawTask({ id: task.id, status: 'queued', progress: 0 });
          log.warn(`[AutoExecutor] 驗收未通過 (${acFails}/${MAX_TASK_RETRIES + 1}，重試): ${task.name}`);
        } else {
          await upsertOpenClawTask({ id: task.id, status: 'failed' as never, progress: 0 });
          taskFailCounts.delete(task.id);
          log.warn(`[AutoExecutor] 驗收未通過 (${acFails}次，不再重試): ${task.name}`);
        }
        recordAgentFailure(agentType || 'auto', false);
        await circuitBreakerFailure();
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

      taskFailCounts.delete(task.id); // 成功 → 清除失敗計數
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
      await notifyXiaocaiTaskResult(task.name, task.id, true, (result.output || '').replace(/\n+/g, ' ').trim().slice(0, 200), qualityInfo ? `${qualityInfo.grade} (${qualityInfo.score}/100)` : undefined);
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
      const exFailReason = `❌ 執行失敗\n\n${errorMsg.slice(0, 500)}`;
      await supabase.from('openclaw_tasks').update({ result: exFailReason }).eq('id', task.id);
      const exFails = (taskFailCounts.get(task.id) || 0) + 1;
      taskFailCounts.set(task.id, exFails);
      if (exFails <= MAX_TASK_RETRIES) {
        await upsertOpenClawTask({ id: task.id, status: 'queued', progress: 0 });
        log.error(`[AutoExecutor] 任務失敗 (${exFails}/${MAX_TASK_RETRIES + 1}，重試): ${task.name} — ${errorMsg.slice(0, 200)}`);
      } else {
        await upsertOpenClawTask({ id: task.id, status: 'failed' as never, progress: 0 });
        taskFailCounts.delete(task.id);
        log.error(`[AutoExecutor] 任務失敗 (${exFails}次，不再重試): ${task.name} — ${errorMsg.slice(0, 200)}`);
      }
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
    // 釋放槽位：移除本次執行佔用的 slot（透過 taskId 或 placeholder）
    const idx = activeSlots.findIndex(s => s.taskId === currentSlotTaskId || s.taskId === '__pending__');
    if (idx >= 0) activeSlots.splice(idx, 1);
  }
}

// ─── Start / Stop ───

function startAutoExecutor(pollIntervalMs: number = 10000, maxTasksPerMinute: number = 3): void {
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
  res.json({
    ok: true,
    ...autoExecutorState,
    concurrency: { maxSlots: MAX_CONCURRENT, activeSlots: activeSlots.length, slots: activeSlots.map(s => ({ taskId: s.taskId, runningFor: Math.round((Date.now() - s.startedAt) / 1000) + 's' })) },
  });
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
    await upsertOpenClawTask({ id: taskId, status: 'queued' });
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

/**
 * 自動歸檔邏輯：將完成或失敗超過 24 小時的任務設為 archived
 */
async function archiveOldTasks() {
    console.log('[Auto-Archive] Starting archive process...');
    try {
        // 這裡假設有一個 getTasks 和 updateTask 函數可用
        // 實際實作會根據 server 的 Data Layer 調整
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        // const tasks = await TaskModel.find({ status: { $in: ['completed', 'failed'] }, updatedAt: { $lt: cutoff } });
        // for (const task of tasks) { await updateTask(task.id, { status: 'archived' }); }
        console.log('[Auto-Archive] Archive cycle completed.');
    } catch (err) {
        console.error('[Auto-Archive] Error:', err);
    }
}

// 每 1 小時執行一次 (3600000 ms)
setInterval(archiveOldTasks, 3600000);
archiveOldTasks();
