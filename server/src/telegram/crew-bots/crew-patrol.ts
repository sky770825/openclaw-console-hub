/**
 * NEUXA 星群 — 主動巡邏機制
 * crew bots 定期執行職責相關的巡邏任務，不等群組訊息
 *
 * 阿研：每 60 分鐘掃 log 異常
 * 阿數：每 60 分鐘查 metrics / 任務統計
 * 阿秘：每 120 分鐘整理待辦摘要
 */

import { createLogger } from '../../logger.js';
import { sendTelegramMessageToChat } from '../../utils/telegram.js';
import { CREW_BOTS, CREW_GROUP_CHAT_ID } from './crew-config.js';
import { crewThink, pushHistory, type CrewThinkResult } from './crew-think.js';

const log = createLogger('crew-patrol');

interface PatrolTask {
  botId: string;
  intervalMs: number;
  prompt: string;
  lastRun: number;
  timerId?: ReturnType<typeof setTimeout>;
}

const patrolTasks: PatrolTask[] = [
  {
    botId: 'ayan',
    intervalMs: 60 * 60 * 1000, // 60 分鐘
    prompt: '【巡邏任務】請主動掃描系統 log，用 action 執行：\n' +
      '1. {"action":"run_script","command":"tail -50 ~/.openclaw/automation/logs/taskboard.log | grep -i -E \\"error|warn|fail|crash\\" | tail -10"}\n' +
      '2. 分析結果，如果有異常就彙整報告，標記嚴重程度\n' +
      '3. 沒有異常就簡短回「巡邏完畢，系統正常」\n' +
      '不要只說「我來查」，直接執行上面的 action。',
    lastRun: 0,
  },
  {
    botId: 'ashu',
    intervalMs: 60 * 60 * 1000, // 60 分鐘
    prompt: '【巡邏任務】請主動檢查系統指標，用 action 執行：\n' +
      '1. {"action":"query_supabase","table":"openclaw_tasks","select":"status,count","filters":[],"limit":100}\n' +
      '2. {"action":"run_script","command":"curl -s http://localhost:3011/api/health"}\n' +
      '3. 彙整：任務統計（pending/running/done/error 各幾個）+ 系統健康狀態\n' +
      '直接執行，不要問要不要查。',
    lastRun: 0,
  },
  {
    botId: 'ami',
    intervalMs: 120 * 60 * 1000, // 120 分鐘
    prompt: '【巡邏任務】請主動整理待辦事項摘要，用 action 執行：\n' +
      '1. {"action":"query_supabase","table":"openclaw_tasks","select":"name,status,priority,owner","filters":[{"column":"status","op":"in","value":"pending,queued,running"}],"limit":20}\n' +
      '2. 整理成簡短清單：高優先 / 進行中 / 待處理，提醒老蔡注意的事項\n' +
      '直接查直接報告。',
    lastRun: 0,
  },
];

/**
 * 啟動主動巡邏
 */
export function startCrewPatrol(): void {
  if (!CREW_GROUP_CHAT_ID) {
    log.warn('[CrewPatrol] 無 CREW_GROUP_CHAT_ID，跳過巡邏');
    return;
  }

  const activeBots = new Set(CREW_BOTS.filter(b => b.token).map(b => b.id));

  for (const task of patrolTasks) {
    if (!activeBots.has(task.botId)) {
      log.info(`[CrewPatrol] ${task.botId} 無 token，跳過巡邏`);
      continue;
    }

    // 首次巡邏延遲 5 分鐘（等系統穩定）
    const initialDelay = 5 * 60 * 1000 + Math.random() * 60 * 1000;
    schedulePatrol(task, initialDelay);
    log.info(`[CrewPatrol] ${task.botId} 巡邏已排程，間隔 ${task.intervalMs / 60000} 分鐘`);
  }
}

/**
 * 停止所有巡邏
 */
export function stopCrewPatrol(): void {
  for (const task of patrolTasks) {
    if (task.timerId) {
      clearTimeout(task.timerId);
      task.timerId = undefined;
    }
  }
  log.info('[CrewPatrol] 所有巡邏已停止');
}

function schedulePatrol(task: PatrolTask, delayMs: number): void {
  task.timerId = setTimeout(async () => {
    await executePatrol(task);
    // 下一次巡邏（加隨機偏移避免同時觸發）
    const jitter = Math.random() * 5 * 60 * 1000; // 0~5 分鐘隨機
    schedulePatrol(task, task.intervalMs + jitter);
  }, delayMs);
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

    // 組合訊息：action 執行結果 + 文字回覆
    const parts: string[] = [];

    if (actionResults.length > 0) {
      parts.push(`📋 執行動作 (${actionResults.length})：`);
      for (const ar of actionResults) {
        // 截斷過長的單條結果
        parts.push(ar.length > 300 ? ar.slice(0, 300) + '...' : ar);
      }
    }

    if (reply && reply.length > 5) {
      parts.push(`\n💬 結論：${reply}`);
    }

    if (parts.length > 0) {
      const msg = `🔄 ${bot.name}巡邏報告：\n${parts.join('\n')}`;
      // 截斷避免 Telegram 4096 字元限制
      const truncated = msg.length > 3900 ? msg.slice(0, 3900) + '\n...（已截斷）' : msg;
      await sendTelegramMessageToChat(chatId, truncated, {
        token: bot.token,
        silent: true,
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
