/**
 * NEUXA 星群 — 巡邏機制（心跳開關版）
 * 手動觸發：群組喊「巡邏」「報到」
 * 自動心跳：API 開關 on/off，預設關閉，間隔可調
 *
 * 阿研：掃 log 異常
 * 阿數：查 metrics / 任務統計
 * 阿秘：整理待辦摘要
 */

import { createLogger } from '../../logger.js';
import { sendTelegramMessageToChat } from '../../utils/telegram.js';
import { CREW_BOTS, CREW_GROUP_CHAT_ID } from './crew-config.js';
import { crewThink, pushHistory, type CrewThinkResult } from './crew-think.js';

const log = createLogger('crew-patrol');

// ── 心跳狀態 ──
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatEnabled = false;
let heartbeatIntervalMs = 30 * 60 * 1000; // 預設 30 分鐘
let heartbeatBusy = false;
let lastHeartbeatAt = 0;
let heartbeatCount = 0;

interface PatrolTask {
  botId: string;
  prompt: string;
  lastRun: number;
}

const patrolTasks: PatrolTask[] = [
  {
    botId: 'ayan',
    prompt: '你的回覆必須包含以下 action JSON（直接複製貼上，不要改）：\n\n' +
      '{"action":"run_script","command":"tail -50 ~/.openclaw/logs/server.log | grep -i -E \\"error|warn|fail|crash\\" | tail -10"}\n\n' +
      '拿到結果後，分析有無異常。有異常就報告嚴重程度，沒異常就說「巡邏完畢，系統正常」。',
    lastRun: 0,
  },
  {
    botId: 'ashu',
    prompt: '你的回覆必須包含以下 action JSON（直接複製貼上，不要改）：\n\n' +
      '{"action":"query_supabase","table":"openclaw_tasks","select":"status","filters":[],"limit":200}\n' +
      '{"action":"run_script","command":"curl -s http://localhost:3011/api/health"}\n\n' +
      '拿到結果後，彙整：任務統計（各狀態幾個）+ 系統健康。',
    lastRun: 0,
  },
  {
    botId: 'ami',
    prompt: '你的回覆必須包含以下 action JSON（直接複製貼上，不要改）：\n\n' +
      '{"action":"query_supabase","table":"openclaw_tasks","select":"name,status,priority,owner","filters":[{"column":"status","op":"in","value":"pending,queued,running"}],"limit":20}\n\n' +
      '拿到結果後，整理簡短清單：高優先 / 進行中 / 待處理。',
    lastRun: 0,
  },
];

// ── 心跳開關 API ──

/** 取得心跳狀態 */
export function getHeartbeatStatus() {
  return {
    enabled: heartbeatEnabled,
    intervalMs: heartbeatIntervalMs,
    intervalMin: Math.round(heartbeatIntervalMs / 60000),
    busy: heartbeatBusy,
    lastHeartbeatAt: lastHeartbeatAt ? new Date(lastHeartbeatAt).toISOString() : null,
    heartbeatCount,
  };
}

/** 開啟心跳（可選間隔，單位分鐘） */
export function enableHeartbeat(intervalMin?: number): { ok: boolean; message: string } {
  if (!CREW_GROUP_CHAT_ID) {
    return { ok: false, message: '無 CREW_GROUP_CHAT_ID，無法啟動心跳' };
  }

  if (intervalMin && intervalMin >= 5) {
    heartbeatIntervalMs = intervalMin * 60 * 1000;
  }

  // 清除舊 timer
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  heartbeatEnabled = true;
  heartbeatTimer = setInterval(() => {
    heartbeatTick().catch(err => log.error({ err }, '[CrewHeartbeat] tick 失敗'));
  }, heartbeatIntervalMs);

  log.info(`[CrewHeartbeat] 🫀 心跳已開啟，間隔 ${Math.round(heartbeatIntervalMs / 60000)} 分鐘`);
  return { ok: true, message: `心跳已開啟，間隔 ${Math.round(heartbeatIntervalMs / 60000)} 分鐘` };
}

/** 關閉心跳 */
export function disableHeartbeat(): { ok: boolean; message: string } {
  heartbeatEnabled = false;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  log.info('[CrewHeartbeat] 💤 心跳已關閉');
  return { ok: true, message: '心跳已關閉' };
}

/** 心跳 tick — 自動觸發巡邏 */
async function heartbeatTick(): Promise<void> {
  if (heartbeatBusy) {
    log.info('[CrewHeartbeat] 上一次心跳還在跑，跳過');
    return;
  }

  heartbeatBusy = true;
  heartbeatCount++;
  lastHeartbeatAt = Date.now();
  log.info(`[CrewHeartbeat] 🫀 心跳 #${heartbeatCount} 觸發巡邏`);

  try {
    await triggerPatrolNow();
  } finally {
    heartbeatBusy = false;
  }
}

// ── 原有功能 ──

/**
 * 啟動巡邏系統（僅註冊，心跳預設關閉）
 */
export function startCrewPatrol(): void {
  if (!CREW_GROUP_CHAT_ID) {
    log.warn('[CrewPatrol] 無 CREW_GROUP_CHAT_ID，跳過巡邏');
    return;
  }
  log.info('[CrewPatrol] 巡邏系統就緒（手動觸發 + 心跳開關模式）');
}

/**
 * 停止所有巡邏 + 心跳
 */
export function stopCrewPatrol(): void {
  disableHeartbeat();
  log.info('[CrewPatrol] 巡邏系統已停止');
}

/**
 * 手動觸發所有巡邏任務（群組喊「巡邏」時呼叫）
 */
export async function triggerPatrolNow(): Promise<void> {
  const activeBots = new Set(CREW_BOTS.filter(b => b.token).map(b => b.id));
  const tasks = patrolTasks.filter(t => activeBots.has(t.botId));

  if (tasks.length === 0) {
    log.warn('[CrewPatrol] 無可用巡邏 bot');
    return;
  }

  log.info(`[CrewPatrol] 巡邏觸發，${tasks.length} 個 bot 出動`);

  // 並行執行所有巡邏
  await Promise.allSettled(tasks.map(t => executePatrol(t)));
}

async function executePatrol(task: PatrolTask): Promise<void> {
  const bot = CREW_BOTS.find(b => b.id === task.botId);
  if (!bot?.token) return;

  const chatId = Number(CREW_GROUP_CHAT_ID);
  task.lastRun = Date.now();

  try {
    log.info(`[CrewPatrol] ${bot.emoji} ${bot.name} 開始巡邏`);

    const result: CrewThinkResult = await crewThink(bot, task.prompt, '系統巡邏', 'full');
    const { reply, actionResults } = result;

    // 組合訊息：action 執行結果 + 文字回覆（HTML 格式）
    const hasParts = actionResults.length > 0 || (reply && reply.length > 5);

    if (hasParts) {
      const msgLines = [
        `${bot.emoji} <b>${bot.name}巡邏報告</b>`,
        `⏰ ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })}`,
        ``,
        ...(actionResults.length > 0 ? [
          `<b>📋 執行動作 (${actionResults.length})</b>`,
          ...actionResults.map(ar => {
            const truncated = ar.length > 300 ? ar.slice(0, 300) + '...' : ar;
            return `  • ${truncated}`;
          }),
        ] : []),
        ...(reply && reply.length > 5 ? [
          ``,
          `<b>💬 結論</b>`,
          reply,
        ] : []),
      ];
      const msg = msgLines.join('\n');
      // 截斷避免 Telegram 4096 字元限制
      const truncated = msg.length > 3900 ? msg.slice(0, 3900) + '\n...（已截斷）' : msg;
      await sendTelegramMessageToChat(chatId, truncated, {
        token: bot.token,
        silent: true,
        parseMode: 'HTML',
      });
      pushHistory({
        role: 'model',
        text: `[巡邏] ${reply || '(僅執行動作)'}`,
        fromName: bot.name,
        timestamp: Date.now(),
      });
      log.info(`[CrewPatrol] ${bot.emoji} ${bot.name} 巡邏完成，actions=${actionResults.length}，已發群組`);
    } else {
      log.warn(`[CrewPatrol] ${bot.emoji} ${bot.name} 巡邏完成但無任何產出（未執行 action 也無回覆）`);
    }
  } catch (err) {
    log.error({ err }, `[CrewPatrol] ${bot.name} 巡邏失敗`);
  }
}
