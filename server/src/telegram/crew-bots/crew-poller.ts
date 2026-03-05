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
import { triggerPatrolNow } from './crew-patrol.js';

const log = createLogger('crew-poller');

/**
 * 格式化 crew bot 回覆為 HTML（專業排版）
 * 格式：emoji <b>名字</b>（角色）\n回覆內容
 */
function formatBotReplyHTML(bot: CrewBotConfig, reply: string): string {
  // 台灣時區時間戳
  const now = new Date();
  const twTime = now.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' });
  return `${bot.emoji} <b>${bot.name}</b>（${bot.role}）<i>${twTime}</i>\n\n${reply}`;
}

const POLL_INTERVAL_MS = 6000;          // 每 6 秒 poll 一次（省資源）
const GET_UPDATES_TIMEOUT_SEC = 15;     // Telegram long polling timeout
const FETCH_TIMEOUT_MS = 25_000;        // fetch 超時
const STAGGER_DELAY_MS = 800;           // bot 之間交錯啟動
const RESPONSE_DELAY_BASE_MS = 2000;    // 回覆延遲基底
const RESPONSE_DELAY_RAND_MS = 3000;    // 額外隨機延遲

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

const MAX_DISPATCH_ROUNDS = 3;           // 最多 3 輪對話
const ROUND_DELAY_MS = 2000;              // 輪次間隔
const BOT_STAGGER_MS = 1500;              // 同輪 bot 之間間隔
const MIN_REPLY_FOR_CONTINUE = 15;        // 回覆少於 15 字視為收斂
let dispatchRunning = false;              // 防並發

/**
 * 內部調度 — 小蔡(bot)發訊息後，直接觸發 crew bots 多輪對話
 * 繞過 Telegram getUpdates（Forum 群組 bot→bot 訊息不推送）
 *
 * 流程：小蔡發話 → crew bots 第 1 輪回覆 → 匯總 → 有追問/互動再 dispatch 第 2 輪 → 最多 3 輪
 */
export interface DispatchResult {
  totalReplied: number;
  replies: RoundReply[];
}

export async function dispatchToCrewBots(text: string, senderName: string = '小蔡'): Promise<DispatchResult> {
  if (!CREW_GROUP_CHAT_ID) return { totalReplied: 0, replies: [] };
  if (dispatchRunning) {
    log.warn('[CrewDispatch] 已有調度在跑，跳過');
    return { totalReplied: 0, replies: [] };
  }

  const decision = routeMessage(text, 'xiaoji_cai_bot', true);
  log.info(`[CrewDispatch] R1 text="${text.slice(0, 50)}" filtered=${decision.filtered} reason=${decision.filterReason || 'none'} bots=${decision.respondingBots.map(b => b.botId).join(',') || 'none'}`);

  if (decision.filtered || decision.respondingBots.length === 0) return { totalReplied: 0, replies: [] };

  dispatchRunning = true;
  const chatId = Number(CREW_GROUP_CHAT_ID);
  let totalReplied = 0;
  const allReplies: RoundReply[] = [];

  try {
    // 記錄發起者的訊息
    pushHistory({ role: 'user', text, fromName: senderName, timestamp: Date.now() });

    // ── 第 1 輪：所有被路由的 bot 回覆 ──
    const round1Replies = await executeRound(decision.respondingBots.map(b => b.botId), text, senderName, chatId, 1);
    totalReplied += round1Replies.length;
    allReplies.push(...round1Replies);

    if (round1Replies.length === 0) return { totalReplied, replies: allReplies };

    // ── 後續輪次：檢測互動需求 ──
    const repliedBotIds = new Set(round1Replies.map(r => r.botId));
    let prevReplies = round1Replies;

    for (let round = 2; round <= MAX_DISPATCH_ROUNDS; round++) {
      await sleep(ROUND_DELAY_MS);

      // 匯總上一輪回覆，找出需要繼續的 bot
      const nextBots = detectFollowUp(prevReplies, repliedBotIds);
      if (nextBots.length === 0) {
        log.info(`[CrewDispatch] R${round} 對話收斂，結束`);
        break;
      }

      log.info(`[CrewDispatch] R${round} 繼續: ${nextBots.join(',')}`);

      // 匯總上輪回覆作為上下文
      const summary = prevReplies.map(r => `[${r.botName}] ${r.reply}`).join('\n');
      const followUpText = `（接續討論）\n${summary}\n\n請針對以上回覆補充你的看法，或回應同事的觀點。如果沒有要補充的，回覆「沒有補充」即可。`;

      const roundReplies = await executeRound(nextBots, followUpText, '系統', chatId, round);
      totalReplied += roundReplies.length;
      allReplies.push(...roundReplies);

      // 收斂偵測：全部回覆都太短 → 結束
      const allShort = roundReplies.every(r => r.reply.length < MIN_REPLY_FOR_CONTINUE || r.reply.includes('沒有補充'));
      if (allShort || roundReplies.length === 0) {
        log.info(`[CrewDispatch] R${round} 回覆收斂（短回覆/沒有補充），結束`);
        break;
      }

      for (const r of roundReplies) repliedBotIds.add(r.botId);
      prevReplies = roundReplies;
    }
  } finally {
    dispatchRunning = false;
  }

  return { totalReplied, replies: allReplies };
}

export interface RoundReply {
  botId: string;
  botName: string;
  reply: string;
}

/** 執行一輪：所有 bot 並行思考，按完成順序交錯發送（自然感） */
async function executeRound(
  botIds: string[],
  text: string,
  senderName: string,
  chatId: number,
  round: number,
): Promise<RoundReply[]> {
  const replies: RoundReply[] = [];
  const bots = botIds.map(id => CREW_BOTS.find(b => b.id === id)).filter((b): b is typeof CREW_BOTS[number] => !!b?.token);

  if (bots.length === 0) return replies;

  // 所有 bot 並行思考（不再串行等待，速度提升 N 倍）
  let sendCount = 0;
  const thinkPromises = bots.map(async (bot) => {
    try {
      const result = await crewThink(bot, text, senderName);
      const reply = result.reply;
      if (reply && !reply.includes('沒有補充')) {
        // 交錯發送（自然感：第一個立刻發，後續間隔 1.5-3 秒）
        if (sendCount > 0) await sleep(BOT_STAGGER_MS + Math.random() * 1500);
        sendCount++;
        const htmlMsg = formatBotReplyHTML(bot, reply);
        await sendTelegramMessageToChat(chatId, htmlMsg, { token: bot.token, silent: true, parseMode: 'HTML' });
        pushHistory({ role: 'model', text: reply, fromName: bot.name, timestamp: Date.now() });
        replies.push({ botId: bot.id, botName: bot.name, reply });
        log.info(`[CrewDispatch] R${round} ${bot.emoji} ${bot.name} 回覆了 (len=${reply.length}, actions=${result.actionResults.length})`);

        // 轉交偵測：回覆中提到其他 bot → 自動 handoff
        detectAndHandoff(reply, bot, chatId).catch(() => {});
      }
    } catch (err) {
      log.error({ err }, `[CrewDispatch] R${round} ${bot.name} 回覆失敗`);
    }
  });

  await Promise.all(thinkPromises);
  return replies;
}

/** 偵測哪些 bot 需要繼續回覆（被提到 / 有追問 / 相關專長） */
function detectFollowUp(prevReplies: RoundReply[], alreadyReplied: Set<string>): string[] {
  const nextBots: string[] = [];
  const allText = prevReplies.map(r => r.reply).join(' ').toLowerCase();

  for (const bot of CREW_BOTS) {
    if (!bot.token) continue;
    // 已回覆過的 bot 不重複（除非被點名）
    const wasMentioned = allText.includes(bot.name) || allText.includes(`@${bot.username.toLowerCase()}`);
    const selfReplied = prevReplies.some(r => r.botId === bot.id);

    if (wasMentioned && !selfReplied) {
      // 被其他 bot 點名但自己還沒回 → 加入
      nextBots.push(bot.id);
    } else if (wasMentioned && selfReplied) {
      // 被點名且已回過 → 追問情境，可以再回一次
      nextBots.push(bot.id);
    }
  }

  // 如果沒人被點名，看有沒有「？」追問 → 讓最相關的 1-2 個 bot 回
  if (nextBots.length === 0) {
    const hasQuestion = allText.includes('？') || allText.includes('?');
    if (!hasQuestion) return [];

    // 找上一輪沒回的、但有 token 的 bot（輪流參與）
    for (const bot of CREW_BOTS) {
      if (!bot.token) continue;
      if (!alreadyReplied.has(bot.id)) {
        // 檢查專長關鍵字匹配
        const hasRelevance = bot.expertiseKeywords.some(kw => allText.includes(kw.toLowerCase()));
        if (hasRelevance) nextBots.push(bot.id);
      }
      if (nextBots.length >= 2) break;
    }
  }

  return nextBots;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 偵測回覆中是否提到其他 crew bot，如果有則自動轉交
 * 最多轉交 1 個 bot（避免連鎖反應）
 */
async function detectAndHandoff(
  reply: string,
  originalBot: CrewBotConfig,
  chatId: number,
): Promise<void> {
  try {
    // 找出回覆中被提到的其他 bot（排除自己）
    const mentionedBot = CREW_BOTS.find(
      b => b.id !== originalBot.id && b.token && reply.includes(b.name),
    );
    if (!mentionedBot) return;

    log.info(`[CrewHandoff] ${originalBot.emoji} ${originalBot.name} 提到了 ${mentionedBot.emoji} ${mentionedBot.name}，自動轉交`);

    // 延遲 2-3 秒（自然感）
    await sleep(2000 + Math.random() * 1000);

    const handoffPrompt = `[${originalBot.name} 轉交] ${reply}`;
    const result = await crewThink(mentionedBot, handoffPrompt, originalBot.name);
    const handoffReply = result.reply;

    if (handoffReply) {
      const htmlMsg = formatBotReplyHTML(mentionedBot, handoffReply);
      await sendTelegramMessageToChat(chatId, htmlMsg, {
        token: mentionedBot.token,
        silent: true,
        parseMode: 'HTML',
      });
      pushHistory({
        role: 'model',
        text: handoffReply,
        fromName: mentionedBot.name,
        timestamp: Date.now(),
      });
      log.info(`[CrewHandoff] ${mentionedBot.emoji} ${mentionedBot.name} 接手回覆了 (len=${handoffReply.length}, actions=${result.actionResults.length})`);
    }
  } catch (err) {
    log.error({ err }, `[CrewHandoff] ${originalBot.name} → 轉交失敗`);
  }
}

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

      // ─── 巡邏觸發偵測（任何人喊「巡邏」就觸發，只需第一個 bot 執行） ───
      const PATROL_KEYWORDS = ['巡邏', '系統巡檢', '系統檢查'];
      if (PATROL_KEYWORDS.some(kw => msg.text!.includes(kw)) && !routingCache.has(messageId)) {
        routingCache.set(messageId, { respondingBots: [], filtered: true, filterReason: 'patrol triggered' });
        repliedSet.add(replyKey);
        log.info(`[CrewPoller] 偵測到巡邏指令 from=${msg.from!.username} text="${msg.text!.slice(0, 30)}"，觸發手動巡邏`);
        triggerPatrolNow().catch(err => log.error({ err }, '[CrewPoller] 巡邏觸發失敗'));
        continue;
      }

      // 路由決策（只做一次，其他 bot 查 cache）
      if (!routingCache.has(messageId)) {
        const decision = routeMessage(
          msg.text,
          msg.from.username || '',
          msg.from.is_bot || false,
        );
        routingCache.set(messageId, decision);
        log.info(`[CrewPoller] 路由決策 msg=${messageId} from=${msg.from.username || msg.from.first_name} is_bot=${msg.from.is_bot} text="${msg.text.slice(0, 50)}" filtered=${decision.filtered} reason=${decision.filterReason || 'none'} bots=${decision.respondingBots.map(b => b.botId).join(',') || 'none'}`);

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
          const result = await crewThink(bot, text, senderName);
          const reply = result.reply;
          if (reply) {
            const htmlMsg = formatBotReplyHTML(bot, reply);
            await sendTelegramMessageToChat(chatId, htmlMsg, {
              token: bot.token,
              silent: true,
              parseMode: 'HTML',
            });
            // 記錄 bot 回覆到歷史
            pushHistory({
              role: 'model',
              text: reply,
              fromName: bot.name,
              timestamp: Date.now(),
            });
            log.info(`[CrewPoller] ${bot.emoji} ${bot.name} 回覆了 (msg=${messageId}, actions=${result.actionResults.length})`);

            // 轉交偵測：回覆中提到其他 bot → 自動 handoff
            detectAndHandoff(reply, bot, chatId).catch(() => {});
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
