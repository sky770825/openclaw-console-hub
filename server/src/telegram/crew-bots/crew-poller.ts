/**
 * NEUXA 星群 Crew Bots — 統一 Polling 管理器
 * 6 個 bot 各自獨立 polling，共享路由決策
 */

import { createLogger } from '../../logger.js';
import { sendTelegramMessageToChat } from '../../utils/telegram.js';
import { CREW_BOTS, CREW_GROUP_CHAT_ID } from './crew-config.js';
import type { CrewBotConfig } from './crew-config.js';
import { routeMessage } from './crew-router.js';
import { crewThink, pushHistory } from './crew-think.js';

const log = createLogger('crew-poller');

const POLL_INTERVAL_MS = 3000;          // 每 3 秒 poll 一次
const GET_UPDATES_TIMEOUT_SEC = 15;     // Telegram long polling timeout
const FETCH_TIMEOUT_MS = 25_000;        // fetch 超時
const STAGGER_DELAY_MS = 500;           // bot 之間交錯啟動
const RESPONSE_DELAY_BASE_MS = 3000;    // 回覆延遲基底
const RESPONSE_DELAY_RAND_MS = 2000;    // 額外隨機延遲

interface BotState {
  offset: number;
  running: boolean;
  consecutiveFailures: number;
}

const botStates = new Map<string, BotState>();

/** 訊息去重：message_id → RoutingDecision（防多 bot 重複處理同一條） */
const routingCache = new Map<number, ReturnType<typeof routeMessage>>();
const ROUTING_CACHE_MAX = 200;

/** 已回覆記錄：`${botId}:${messageId}` → true */
const repliedSet = new Set<string>();

/**
 * 啟動所有 crew bot 的 polling
 */
export function startCrewPolling(): void {
  if (!CREW_GROUP_CHAT_ID) {
    log.warn('[CrewPoller] 無 CREW_GROUP_CHAT_ID，跳過啟動');
    return;
  }

  const activeBots = CREW_BOTS.filter(b => b.token);
  if (activeBots.length === 0) {
    log.warn('[CrewPoller] 沒有任何 crew bot 有 token，跳過啟動');
    return;
  }

  log.info(`[CrewPoller] 啟動 ${activeBots.length} 個 crew bots，群組 ${CREW_GROUP_CHAT_ID}`);

  for (let i = 0; i < activeBots.length; i++) {
    const bot = activeBots[i];
    const state: BotState = { offset: 0, running: true, consecutiveFailures: 0 };
    botStates.set(bot.id, state);

    // 交錯啟動：每個 bot 延遲 i * 500ms
    const delay = i * STAGGER_DELAY_MS;
    setTimeout(() => {
      // 先清 webhook，再開始 polling
      fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook?drop_pending_updates=true`)
        .catch(() => {})
        .finally(() => {
          log.info(`[CrewPoller] ${bot.emoji} ${bot.name} (@${bot.username}) polling 已啟動`);
          botLoop(bot);
        });
    }, delay);
  }
}

/**
 * 停止所有 crew bot 的 polling
 */
export function stopCrewPolling(): void {
  for (const [id, state] of botStates) {
    state.running = false;
  }
  botStates.clear();
  log.info('[CrewPoller] 所有 crew bots 已停止');
}

/**
 * 單一 bot 的 polling 迴圈
 */
function botLoop(bot: CrewBotConfig): void {
  const state = botStates.get(bot.id);
  if (!state?.running) return;

  pollBot(bot, state)
    .catch(err => log.error({ err }, `[CrewPoller] ${bot.name} poll error`))
    .finally(() => {
      if (state.running) {
        const delay = state.consecutiveFailures > 0
          ? Math.min(30_000, POLL_INTERVAL_MS * Math.pow(2, Math.min(state.consecutiveFailures, 4)))
          : POLL_INTERVAL_MS;
        setTimeout(() => botLoop(bot), delay);
      }
    });
}

/**
 * 單次 poll：getUpdates → 路由 → 思考 → 回覆
 */
async function pollBot(bot: CrewBotConfig, state: BotState): Promise<void> {
  const url = `https://api.telegram.org/bot${bot.token}/getUpdates?offset=${state.offset}&timeout=${GET_UPDATES_TIMEOUT_SEC}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);

    if (!res.ok) {
      state.consecutiveFailures++;
      if (state.consecutiveFailures <= 2) {
        log.warn(`[CrewPoller] ${bot.name} getUpdates HTTP ${res.status}`);
      }
      return;
    }

    state.consecutiveFailures = 0;
    const json = await res.json() as {
      ok: boolean;
      result: Array<{
        update_id: number;
        message?: {
          message_id: number;
          chat: { id: number };
          from?: { id: number; first_name?: string; username?: string; is_bot?: boolean };
          text?: string;
        };
      }>;
    };

    if (!json.ok || !json.result) return;

    for (const update of json.result) {
      if (update.update_id >= state.offset) state.offset = update.update_id + 1;

      const msg = update.message;
      if (!msg?.text || !msg.from) continue;

      // 只處理群組訊息
      if (String(msg.chat.id) !== CREW_GROUP_CHAT_ID) continue;

      const messageId = msg.message_id;
      const replyKey = `${bot.id}:${messageId}`;

      // 已經回覆過 → 跳過
      if (repliedSet.has(replyKey)) continue;

      // 路由決策（只做一次，其他 bot 查 cache）
      if (!routingCache.has(messageId)) {
        const decision = routeMessage(
          msg.text,
          msg.from.username || '',
          msg.from.is_bot || false,
        );
        routingCache.set(messageId, decision);

        // 記錄到群組歷史
        if (!decision.filtered) {
          pushHistory({
            role: 'user',
            text: msg.text,
            fromName: msg.from.first_name || msg.from.username || '用戶',
            timestamp: Date.now(),
          });
        }

        // 清理過舊的 cache
        if (routingCache.size > ROUTING_CACHE_MAX) {
          const keys = [...routingCache.keys()];
          for (let i = 0; i < keys.length - 100; i++) routingCache.delete(keys[i]);
        }
        // 清理 repliedSet
        if (repliedSet.size > 500) repliedSet.clear();
      }

      const decision = routingCache.get(messageId)!;
      if (decision.filtered) continue;

      // 這個 bot 該不該回？
      const shouldRespond = decision.respondingBots.some(b => b.botId === bot.id);
      if (!shouldRespond) continue;

      // 標記已回覆
      repliedSet.add(replyKey);

      // 延遲回覆（自然感）
      const delay = RESPONSE_DELAY_BASE_MS + Math.random() * RESPONSE_DELAY_RAND_MS;
      const senderName = msg.from.first_name || msg.from.username || '用戶';
      const chatId = msg.chat.id;
      const text = msg.text;

      setTimeout(async () => {
        try {
          const reply = await crewThink(bot, text, senderName);
          if (reply) {
            await sendTelegramMessageToChat(chatId, reply, {
              token: bot.token,
              silent: true,
            });
            // 記錄 bot 回覆到歷史
            pushHistory({
              role: 'model',
              text: reply,
              fromName: bot.name,
              timestamp: Date.now(),
            });
            log.info(`[CrewPoller] ${bot.emoji} ${bot.name} 回覆了 (msg=${messageId})`);
          }
        } catch (err) {
          log.error({ err }, `[CrewPoller] ${bot.name} 回覆失敗`);
        }
      }, delay);
    }
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') return;
    state.consecutiveFailures++;
    throw err;
  }
}
