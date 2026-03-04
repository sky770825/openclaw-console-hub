/**
 * NEUXA 星群 — 巡邏機制（手動觸發）
 * 自動巡邏預設關閉，群組喊「巡邏」「報到」才觸發
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

interface PatrolTask {
  botId: string;
  prompt: string;
  lastRun: number;
}

const patrolTasks: PatrolTask[] = [
  {
    botId: 'ayan',
    prompt: '你的回覆必須包含以下 action JSON（直接複製貼上，不要改）：\n\n' +
      '{"action":"run_script","command":"tail -50 ~/.openclaw/automation/logs/taskboard.log | grep -i -E \\"error|warn|fail|crash\\" | tail -10"}\n\n' +
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

/**
 * 啟動巡邏系統（僅註冊，不自動排程）
 * 自動巡邏已關閉，改為手動觸發（群組喊「巡邏」）
 */
export function startCrewPatrol(): void {
  if (!CREW_GROUP_CHAT_ID) {
    log.warn('[CrewPatrol] 無 CREW_GROUP_CHAT_ID，跳過巡邏');
    return;
  }
  log.info('[CrewPatrol] 巡邏系統就緒（手動觸發模式，群組喊「巡邏」觸發）');
}

/**
 * 停止所有巡邏（相容舊介面）
 */
export function stopCrewPatrol(): void {
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

  log.info(`[CrewPatrol] 手動觸發巡邏，${tasks.length} 個 bot 出動`);

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
