/**
 * NEUXA Crew Bots -- Orchestrator-Worker Polling
 * 4 bot active polling + 2 standby (on-demand spawn)
 */

import { createLogger } from '../../logger.js';
import { sendTelegramMessageToChat } from '../../utils/telegram.js';
import { ACTIVE_CREW_BOTS, CREW_BOTS, STANDBY_CREW_BOTS, CREW_GROUP_CHAT_ID } from './crew-config.js';
import type { CrewBotConfig } from './crew-config.js';
import { routeMessage } from './crew-router.js';
import { crewThink, pushHistory } from './crew-think.js';
import { triggerPatrolNow } from './crew-patrol.js';
import { bridgeToDiscord } from '../../discord/discord-bridge.js';
import { isCoolingDown, diagnose, autoRepair, recordFailure, fullCheckup } from './crew-doctor.js';
import { scanInbox, archiveInboxFile, type InboxFile } from './crew-inbox.js';

const log = createLogger('crew-poller');

// ── Interfaces ──

export interface StructuredTask {
  id: string;
  description: string;
  assignedTo: string;  // bot id
  expectedOutput: string;
  context?: string;
  deadline?: number;  // ms timeout
}

export interface DispatchResult {
  totalReplied: number;
  replies: RoundReply[];
}

export interface RoundReply {
  botId: string;
  botName: string;
  reply: string;
}

export interface DispatchOptions {
  targetBots?: string[];
  structured?: boolean;
}

// ── Constants ──

const POLL_INTERVAL_MS = 10_000;           // 10 sec (4 bots is enough)
const GET_UPDATES_TIMEOUT_SEC = 15;
const FETCH_TIMEOUT_MS = 25_000;
const STAGGER_DELAY_MS = 800;
const RESPONSE_DELAY_BASE_MS = 2000;
const RESPONSE_DELAY_RAND_MS = 3000;

const MAX_DISPATCH_ROUNDS = 3;
const ROUND_DELAY_MS = 2000;
const BOT_STAGGER_MS = 1500;
const MIN_REPLY_FOR_CONTINUE = 15;

const HANDOFF_TIMEOUT_MS = 30_000;

// ── State ──

interface BotState {
  offset: number;
  running: boolean;
  consecutiveFailures: number;
}

const botStates = new Map<string, BotState>();

/** message_id -> RoutingDecision (dedup across bots) */
const routingCache = new Map<number, ReturnType<typeof routeMessage>>();
const ROUTING_CACHE_MAX = 200;

/** `${botId}:${messageId}` -> true */
const repliedSet = new Set<string>();

let dispatchRunning = false;

// ── 閉環回傳：收集星群回覆 → 彙整 → 發回主人私訊 ──
interface ReplyCollector {
  messageId: number;
  originalText: string;
  senderName: string;
  expectedBots: string[];
  replies: { botName: string; reply: string }[];
  timer: ReturnType<typeof setTimeout> | null;
}
const replyCollectors = new Map<number, ReplyCollector>();
const COLLECTOR_TIMEOUT_MS = 90_000; // 90 秒等待所有 bot 回覆

/** Track temporarily spawned standby bots so we can stop them */
const standbyPollingStates = new Map<string, BotState>();

// ── Helpers ──

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format crew bot reply as HTML
 */
function formatBotReplyHTML(bot: CrewBotConfig, reply: string): string {
  const now = new Date();
  const twTime = now.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' });
  return `${bot.emoji} <b>${bot.name}</b>(${bot.role}) <i>${twTime}</i>\n\n${reply}`;
}

// ── Standby Bot Spawner ──

/**
 * Spawn a standby bot on-demand, execute a structured task, then stop polling.
 * Used to temporarily bring ashang/ashu online for specific tasks.
 */
export async function spawnStandbyBot(botId: string, task: StructuredTask): Promise<string> {
  const bot = STANDBY_CREW_BOTS.find(b => b.id === botId) || CREW_BOTS.find(b => b.id === botId);
  if (!bot) {
    log.warn(`[SpawnStandby] Bot ${botId} not found`);
    return `[error] bot ${botId} not found`;
  }
  if (!bot.token) {
    log.warn(`[SpawnStandby] Bot ${botId} has no token`);
    return `[error] bot ${botId} has no token`;
  }

  log.info(`[SpawnStandby] Spawning ${bot.emoji} ${bot.name} for task: ${task.id}`);

  const timeout = task.deadline || HANDOFF_TIMEOUT_MS;

  // Build prompt from structured task
  const prompt = [
    `[Structured Task ${task.id}]`,
    `Description: ${task.description}`,
    `Expected Output: ${task.expectedOutput}`,
    task.context ? `Context: ${task.context}` : '',
  ].filter(Boolean).join('\n');

  try {
    const result = await Promise.race([
      crewThink(bot, prompt, 'orchestrator', 'full'),
      sleep(timeout).then(() => ({ reply: '[timeout]', rawReply: '[timeout]', actionResults: [] as string[] })),
    ]);

    const reply = result.reply || '[no reply]';
    const rawReply = result.rawReply || reply;

    // If we have a group chat, send the result there (HTML version)
    if (CREW_GROUP_CHAT_ID && reply !== '[timeout]' && reply !== '[no reply]') {
      const chatId = Number(CREW_GROUP_CHAT_ID);
      const htmlMsg = formatBotReplyHTML(bot, `[Task ${task.id}]\n${reply}`);
      await sendTelegramMessageToChat(chatId, htmlMsg, {
        token: bot.token,
        silent: true,
        parseMode: 'HTML',
      }).catch(() => {});
    }

    log.info(`[SpawnStandby] ${bot.emoji} ${bot.name} completed task ${task.id} (len=${reply.length})`);
    return rawReply;  // 回傳原始文字，避免呼叫方再次格式化造成雙重跳脫

  } catch (err) {
    log.error({ err }, `[SpawnStandby] ${bot.name} task ${task.id} failed`);
    return `[error] ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Handoff ──

/**
 * Handoff mode: send a message directly to a specific bot and wait for reply.
 * Works for both active and standby bots.
 * Timeout: 30 seconds.
 */
export async function handoffToBot(botId: string, message: string, context?: string): Promise<string> {
  const bot = CREW_BOTS.find(b => b.id === botId);
  if (!bot) {
    log.warn(`[Handoff] Bot ${botId} not found`);
    return `[error] bot ${botId} not found`;
  }
  if (!bot.token) {
    log.warn(`[Handoff] Bot ${botId} has no token`);
    return `[error] bot ${botId} has no token`;
  }

  log.info(`[Handoff] -> ${bot.emoji} ${bot.name}: "${message.slice(0, 60)}"`);

  const prompt = context ? `[Context] ${context}\n\n${message}` : message;

  try {
    const result = await Promise.race([
      crewThink(bot, prompt, 'orchestrator'),
      sleep(HANDOFF_TIMEOUT_MS).then(() => ({ reply: '[timeout]', rawReply: '[timeout]', actionResults: [] as string[] })),
    ]);

    const reply = result.reply || '[no reply]';
    const rawReply = result.rawReply || reply; // 原始 markdown，防 HTML 污染 history

    // Record to history（用原始文字，避免 HTML 標籤污染 AI 上下文）
    pushHistory({ role: 'model', text: rawReply, fromName: bot.name, timestamp: Date.now() });

    log.info(`[Handoff] ${bot.emoji} ${bot.name} replied (len=${reply.length})`);
    return rawReply;

  } catch (err) {
    log.error({ err }, `[Handoff] ${bot.name} failed`);
    return `[error] ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Dispatch (Orchestrator Mode) ──

/**
 * Orchestrator dispatch: route tasks to specific bots, collect results, verify, report.
 *
 * Options:
 * - targetBots: only dispatch to these bot IDs (skip routing)
 * - structured: use structured task format
 *
 * If targetBots is provided, only those bots receive the message.
 * Otherwise, routing decides who responds.
 */
export async function dispatchToCrewBots(
  text: string,
  senderName: string = 'xiaocai',
  options?: DispatchOptions,
): Promise<DispatchResult> {
  if (!CREW_GROUP_CHAT_ID) return { totalReplied: 0, replies: [] };
  if (dispatchRunning) {
    log.warn('[CrewDispatch] Already running, skip');
    return { totalReplied: 0, replies: [] };
  }

  // Determine which bots should respond
  let respondingBotIds: string[];

  if (options?.targetBots && options.targetBots.length > 0) {
    // Orchestrator mode: only dispatch to specified bots
    respondingBotIds = options.targetBots;
    log.info(`[CrewDispatch] Orchestrator mode: target=${respondingBotIds.join(',')}`);
  } else {
    // Routing mode: let router decide
    const decision = routeMessage(text, 'xiaoji_cai_bot', true);
    log.info(`[CrewDispatch] R1 text="${text.slice(0, 50)}" filtered=${decision.filtered} reason=${decision.filterReason || 'none'} bots=${decision.respondingBots.map(b => b.botId).join(',') || 'none'}`);

    if (decision.filtered || decision.respondingBots.length === 0) return { totalReplied: 0, replies: [] };
    respondingBotIds = decision.respondingBots.map(b => b.botId);
  }

  dispatchRunning = true;
  const chatId = Number(CREW_GROUP_CHAT_ID);
  let totalReplied = 0;
  const allReplies: RoundReply[] = [];

  try {
    pushHistory({ role: 'user', text, fromName: senderName, timestamp: Date.now() });

    // -- Round 1: targeted bots respond --
    const round1Replies = await executeRound(respondingBotIds, text, senderName, chatId, 1);
    totalReplied += round1Replies.length;
    allReplies.push(...round1Replies);

    if (round1Replies.length === 0) return { totalReplied, replies: allReplies };

    // -- Subsequent rounds: detect follow-up needs --
    const repliedBotIds = new Set(round1Replies.map(r => r.botId));
    let prevReplies = round1Replies;

    for (let round = 2; round <= MAX_DISPATCH_ROUNDS; round++) {
      await sleep(ROUND_DELAY_MS);

      const nextBots = detectFollowUp(prevReplies, repliedBotIds);
      if (nextBots.length === 0) {
        log.info(`[CrewDispatch] R${round} converged, done`);
        break;
      }

      log.info(`[CrewDispatch] R${round} continue: ${nextBots.join(',')}`);

      const summary = prevReplies.map(r => `[${r.botName}] ${r.reply}`).join('\n');
      const followUpText = `(follow-up)\n${summary}\n\nPlease add your perspective or respond to your colleagues. If nothing to add, reply "no comment".`;

      const roundReplies = await executeRound(nextBots, followUpText, 'system', chatId, round);
      totalReplied += roundReplies.length;
      allReplies.push(...roundReplies);

      const allShort = roundReplies.every(r => r.reply.length < MIN_REPLY_FOR_CONTINUE || r.reply.includes('no comment') || r.reply.includes('没有补充'));
      if (allShort || roundReplies.length === 0) {
        log.info(`[CrewDispatch] R${round} converged (short replies), done`);
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

// ── Round Execution ──

/** Execute one round: all bots think in parallel, stagger sends for natural feel */
async function executeRound(
  botIds: string[],
  text: string,
  senderName: string,
  chatId: number,
  round: number,
): Promise<RoundReply[]> {
  const replies: RoundReply[] = [];

  // Resolve bot IDs: look in all bots (active + standby)
  const bots = botIds
    .map(id => CREW_BOTS.find(b => b.id === id))
    .filter((b): b is CrewBotConfig => !!b?.token);

  if (bots.length === 0) return replies;

  // Filter cooling-down bots
  const activeBots = bots.filter(bot => {
    if (isCoolingDown(bot.id)) {
      log.info(`[CrewDispatch] R${round} ${bot.emoji} ${bot.name} cooling down, skip`);
      return false;
    }
    return true;
  });
  if (activeBots.length === 0) return replies;

  let sendCount = 0;
  const thinkPromises = activeBots.map(async (bot) => {
    try {
      const result = await crewThink(bot, text, senderName);
      const reply = result.reply;           // HTML 格式，僅供直接發 Telegram
      const rawReply = result.rawReply ?? result.reply ?? ''; // 原始 markdown，供 history + xiaocai
      if (reply && !reply.includes('no comment') && !reply.includes('没有补充')) {
        if (sendCount > 0) await sleep(BOT_STAGGER_MS + Math.random() * 1500);
        sendCount++;
        const htmlMsg = formatBotReplyHTML(bot, reply);
        await sendTelegramMessageToChat(chatId, htmlMsg, { token: bot.token, silent: true, parseMode: 'HTML' });
        bridgeToDiscord(bot.id, rawReply).catch(() => {});
        pushHistory({ role: 'model', text: rawReply, fromName: bot.name, timestamp: Date.now() });
        replies.push({ botId: bot.id, botName: bot.name, reply: rawReply });
        log.info(`[CrewDispatch] R${round} ${bot.emoji} ${bot.name} replied (len=${reply.length}, actions=${result.actionResults.length})`);

        // Auto-handoff detection
        detectAndHandoff(reply, bot, chatId).catch(() => {});
      } else {
        const diag = diagnose(bot.id);
        if (diag) {
          log.warn(`[CrewDoctor] R${round} ${bot.emoji} ${bot.name} diagnosis: ${diag.detail}`);
          autoRepair(diag).catch(() => {});
        }
      }
    } catch (err) {
      log.error({ err }, `[CrewDispatch] R${round} ${bot.name} reply failed`);
      recordFailure(bot.id, 'unknown');
      const diag = diagnose(bot.id);
      if (diag) autoRepair(diag).catch(() => {});
    }
  });

  await Promise.all(thinkPromises);
  return replies;
}

// ── Follow-Up Detection ──

/** Detect which bots should continue in the next round */
function detectFollowUp(prevReplies: RoundReply[], alreadyReplied: Set<string>): string[] {
  const nextBots: string[] = [];
  const allText = prevReplies.map(r => r.reply).join(' ').toLowerCase();

  // Only check active bots for follow-up (standby bots need explicit spawn)
  for (const bot of ACTIVE_CREW_BOTS) {
    if (!bot.token) continue;
    const wasMentioned = allText.includes(bot.name) || allText.includes(`@${bot.username.toLowerCase()}`);
    const selfReplied = prevReplies.some(r => r.botId === bot.id);

    if (wasMentioned && !selfReplied) {
      nextBots.push(bot.id);
    } else if (wasMentioned && selfReplied) {
      nextBots.push(bot.id);
    }
  }

  if (nextBots.length === 0) {
    const hasQuestion = allText.includes('?') || allText.includes('?');
    if (!hasQuestion) return [];

    for (const bot of ACTIVE_CREW_BOTS) {
      if (!bot.token) continue;
      if (!alreadyReplied.has(bot.id)) {
        const hasRelevance = bot.expertiseKeywords.some(kw => allText.includes(kw.toLowerCase()));
        if (hasRelevance) nextBots.push(bot.id);
      }
      if (nextBots.length >= 2) break;
    }
  }

  return nextBots;
}

// ── Auto-Handoff Detection ──

/**
 * Detect if a reply mentions another crew bot -> auto handoff (max 1)
 */
async function detectAndHandoff(
  reply: string,
  originalBot: CrewBotConfig,
  chatId: number,
): Promise<void> {
  try {
    const mentionedBot = CREW_BOTS.find(
      b => b.id !== originalBot.id && b.token && reply.includes(b.name),
    );
    if (!mentionedBot) return;

    log.info(`[CrewHandoff] ${originalBot.emoji} ${originalBot.name} mentioned ${mentionedBot.emoji} ${mentionedBot.name}, auto handoff`);

    await sleep(2000 + Math.random() * 1000);

    const handoffPrompt = `[${originalBot.name} handoff] ${reply}`;
    const result = await crewThink(mentionedBot, handoffPrompt, originalBot.name);
    const handoffReply = result.reply;
    const handoffRaw = result.rawReply ?? handoffReply ?? '';

    if (handoffReply) {
      const htmlMsg = formatBotReplyHTML(mentionedBot, handoffReply);
      await sendTelegramMessageToChat(chatId, htmlMsg, {
        token: mentionedBot.token,
        silent: true,
        parseMode: 'HTML',
      });
      pushHistory({
        role: 'model',
        text: handoffRaw,
        fromName: mentionedBot.name,
        timestamp: Date.now(),
      });
      log.info(`[CrewHandoff] ${mentionedBot.emoji} ${mentionedBot.name} took over (len=${handoffReply.length}, actions=${result.actionResults.length})`);
    }
  } catch (err) {
    log.error({ err }, `[CrewHandoff] ${originalBot.name} -> handoff failed`);
  }
}

// ── Polling Lifecycle ──

/**
 * Start polling for ACTIVE crew bots only (4 bots).
 * Standby bots (ashang/ashu) are NOT polled; use spawnStandbyBot() or handoffToBot() instead.
 */
export function startCrewPolling(): void {
  if (!CREW_GROUP_CHAT_ID) {
    log.warn('[CrewPoller] No CREW_GROUP_CHAT_ID, skip');
    return;
  }

  const activeBots = ACTIVE_CREW_BOTS.filter(b => b.token);
  if (activeBots.length === 0) {
    log.warn('[CrewPoller] No active crew bots with token, skip');
    return;
  }

  log.info(`[CrewPoller] Starting ${activeBots.length} active bots (standby: ${STANDBY_CREW_BOTS.map(b => b.name).join(',')}), group ${CREW_GROUP_CHAT_ID}`);

  for (let i = 0; i < activeBots.length; i++) {
    const bot = activeBots[i];
    const state: BotState = { offset: 0, running: true, consecutiveFailures: 0 };
    botStates.set(bot.id, state);

    const delay = i * STAGGER_DELAY_MS;
    setTimeout(() => {
      fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook?drop_pending_updates=true`)
        .catch(() => {})
        .finally(() => {
          log.info(`[CrewPoller] ${bot.emoji} ${bot.name} (@${bot.username}) polling started`);
          botLoop(bot);
        });
    }, delay);
  }
}

/**
 * Stop all crew bot polling (active + any spawned standby)
 */
export function stopCrewPolling(): void {
  for (const [id, state] of botStates) {
    state.running = false;
  }
  botStates.clear();

  // Also stop any temporarily spawned standby bots
  for (const [id, state] of standbyPollingStates) {
    state.running = false;
  }
  standbyPollingStates.clear();

  log.info('[CrewPoller] All crew bots stopped');
}

// ── Inbox Scanning ──

const INBOX_SCAN_INTERVAL_MS = 30_000;
const lastInboxScan = new Map<string, number>();
const inboxProcessing = new Set<string>();

/**
 * Single bot polling loop
 */
function botLoop(bot: CrewBotConfig): void {
  const state = botStates.get(bot.id);
  if (!state?.running) return;

  // Inbox scan (every 30s)
  const now = Date.now();
  const lastScan = lastInboxScan.get(bot.id) || 0;
  if (now - lastScan >= INBOX_SCAN_INTERVAL_MS && !inboxProcessing.has(bot.id) && !isCoolingDown(bot.id)) {
    lastInboxScan.set(bot.id, now);
    processInbox(bot).catch(err => log.error({ err }, `[CrewInbox] ${bot.name} inbox failed`));
  }

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
 * Process inbox files: scan -> crewThink -> send to group -> archive
 * Max 2 per cycle to avoid blocking polling
 */
async function processInbox(bot: CrewBotConfig): Promise<void> {
  if (!bot.token || !CREW_GROUP_CHAT_ID) return;

  const items = scanInbox(bot.id);
  if (items.length === 0) return;

  inboxProcessing.add(bot.id);
  const chatId = Number(CREW_GROUP_CHAT_ID);

  try {
    const toProcess = items.slice(0, 2);
    log.info(`[CrewInbox] ${bot.emoji} ${bot.name} found ${items.length} inbox, processing ${toProcess.length}`);

    for (const item of toProcess) {
      try {
        const inboxPrompt = [
          `inbox task (from ${item.fromBot}, ${TYPE_LABELS[item.type] || 'unknown'}, P${item.priority})`,
          '',
          `File: ${item.fileName}`,
          'Content:',
          item.content.length > 2000 ? item.content.slice(0, 2000) + '\n...(truncated)' : item.content,
          '',
          'Execute accordingly and give a brief conclusion.',
        ].join('\n');

        const result = await crewThink(bot, inboxPrompt, item.fromBot, 'full');
        const { reply, rawReply: rawR, actionResults } = result;
        const rawReply = rawR ?? reply ?? '';  // 原始文字，防 HTML 污染 history

        if (reply && reply.length > 5) {
          const msgLines = [
            `${bot.emoji} <b>${bot.name}</b> (inbox)`,
            `From <b>${item.fromBot}</b> - ${TYPE_LABELS[item.type] || 'message'}`,
            '',
            ...(actionResults.length > 0 ? [
              `<b>Actions (${actionResults.length})</b>`,
              ...actionResults.slice(0, 3).map(ar => {
                const t = ar.length > 200 ? ar.slice(0, 200) + '...' : ar;
                return `  - ${t}`;
              }),
              '',
            ] : []),
            reply,
          ];
          const msg = msgLines.join('\n');
          const truncated = msg.length > 3900 ? msg.slice(0, 3900) + '\n...(truncated)' : msg;

          await sendTelegramMessageToChat(chatId, truncated, {
            token: bot.token,
            silent: true,
            parseMode: 'HTML',
          });

          pushHistory({
            role: 'model',
            text: `[inbox<-${item.fromBot}] ${rawReply}`,
            fromName: bot.name,
            timestamp: Date.now(),
          });

          log.info(`[CrewInbox] ${bot.emoji} ${bot.name} processed ${item.fileName}`);
        }

        archiveInboxFile(item);

      } catch (err) {
        log.error({ err }, `[CrewInbox] ${bot.name} failed on ${item.fileName}`);
      }
    }
  } finally {
    inboxProcessing.delete(bot.id);
  }
}

const TYPE_LABELS: Record<string, string> = {
  alert: 'alert',
  task: 'task',
  data: 'data',
  req: 'request',
  report: 'report',
};

// ── Single Poll ──

/**
 * Single poll: getUpdates -> route -> think -> reply
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
          chat: { id: number; type?: string };
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

      // Only process group messages
      if (String(msg.chat.id) !== CREW_GROUP_CHAT_ID) continue;

      const messageId = msg.message_id;
      const replyKey = `${bot.id}:${messageId}`;

      if (repliedSet.has(replyKey)) continue;

      // Patrol trigger detection
      const PATROL_KEYWORDS = ['patrol', 'system check', 'health check'];
      if (PATROL_KEYWORDS.some(kw => msg.text!.includes(kw)) && !routingCache.has(messageId)) {
        routingCache.set(messageId, { respondingBots: [], filtered: true, filterReason: 'patrol triggered' });
        repliedSet.add(replyKey);
        log.info(`[CrewPoller] Patrol command detected from=${msg.from!.username} text="${msg.text!.slice(0, 30)}"`);
        triggerPatrolNow().catch(err => log.error({ err }, '[CrewPoller] Patrol trigger failed'));
        continue;
      }

      // Route decision (once per message, cached for other bots)
      if (!routingCache.has(messageId)) {
        const decision = routeMessage(
          msg.text,
          msg.from.username || '',
          msg.from.is_bot || false,
          {
            chatId: String(msg.chat.id),
            chatType: msg.chat.type as 'private' | 'group' | 'supergroup',
            senderId: String(msg.from.id),
          },
        );
        routingCache.set(messageId, decision);
        log.info(`[CrewPoller] Route msg=${messageId} from=${msg.from.username || msg.from.first_name} is_bot=${msg.from.is_bot} text="${msg.text.slice(0, 50)}" filtered=${decision.filtered} reason=${decision.filterReason || 'none'} bots=${decision.respondingBots.map(b => b.botId).join(',') || 'none'}`);

        if (!decision.filtered) {
          pushHistory({
            role: 'user',
            text: msg.text,
            fromName: msg.from.first_name || msg.from.username || 'user',
            timestamp: Date.now(),
          });

          // 閉環回傳：非 bot 用戶在群組發話 → 啟動回覆收集器
          if (!msg.from.is_bot && decision.respondingBots.length > 0) {
            startReplyCollector(
              messageId,
              msg.text,
              msg.from.first_name || msg.from.username || 'user',
              decision.respondingBots.map(b => b.botId),
            );
          }
        }

        // Cache cleanup
        if (routingCache.size > ROUTING_CACHE_MAX) {
          const keys = [...routingCache.keys()];
          for (let i = 0; i < keys.length - 100; i++) routingCache.delete(keys[i]);
        }
        if (repliedSet.size > 500) repliedSet.clear();
      }

      const decision = routingCache.get(messageId)!;
      if (decision.filtered) continue;

      const shouldRespond = decision.respondingBots.some(b => b.botId === bot.id);
      if (!shouldRespond) continue;

      repliedSet.add(replyKey);

      const delay = RESPONSE_DELAY_BASE_MS + Math.random() * RESPONSE_DELAY_RAND_MS;
      const senderName = msg.from.first_name || msg.from.username || 'user';
      const chatId = msg.chat.id;
      const text = msg.text;

      setTimeout(async () => {
        try {
          const result = await crewThink(bot, text, senderName);
          const reply = result.reply;
          const rawReply = result.rawReply ?? reply ?? '';
          if (reply) {
            const htmlMsg = formatBotReplyHTML(bot, reply);
            await sendTelegramMessageToChat(chatId, htmlMsg, {
              token: bot.token,
              silent: true,
              parseMode: 'HTML',
            });
            bridgeToDiscord(bot.id, rawReply).catch(() => {});
            pushHistory({
              role: 'model',
              text: rawReply,
              fromName: bot.name,
              timestamp: Date.now(),
            });
            log.info(`[CrewPoller] ${bot.emoji} ${bot.name} replied (msg=${messageId}, actions=${result.actionResults.length})`);

            // 閉環回傳：收集回覆（用原始文字，避免 xiaocai 再次格式化時雙重跳脫）
            collectReplyForOwner(messageId, bot.name, rawReply);

            detectAndHandoff(reply, bot, chatId).catch(() => {});
          }
        } catch (err) {
          log.error({ err }, `[CrewPoller] ${bot.name} reply failed`);
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

// ── 閉環回傳：星群結果自動彙整回傳主人 ──

function startReplyCollector(messageId: number, originalText: string, senderName: string, expectedBotIds: string[]): void {
  if (replyCollectors.has(messageId)) return;

  const collector: ReplyCollector = {
    messageId,
    originalText,
    senderName,
    expectedBots: expectedBotIds,
    replies: [],
    timer: setTimeout(() => {
      flushCollector(messageId).catch(err =>
        log.error({ err }, `[CrewClosedLoop] flush timeout failed msg=${messageId}`)
      );
    }, COLLECTOR_TIMEOUT_MS),
  };

  replyCollectors.set(messageId, collector);
  log.info(`[CrewClosedLoop] 啟動回覆收集器 msg=${messageId} expecting=${expectedBotIds.join(',')}`);
}

function collectReplyForOwner(messageId: number, botName: string, reply: string): void {
  const collector = replyCollectors.get(messageId);
  if (!collector) return;

  collector.replies.push({ botName, reply });

  // 所有預期的 bot 都回覆了 → 立即 flush
  const repliedBotNames = new Set(collector.replies.map(r => r.botName));
  const allBots = ACTIVE_CREW_BOTS.filter(b => collector.expectedBots.includes(b.id));
  const allReplied = allBots.every(b => repliedBotNames.has(b.name));

  if (allReplied) {
    if (collector.timer) clearTimeout(collector.timer);
    // 延遲 3 秒，等可能的 follow-up 回合
    collector.timer = setTimeout(() => {
      flushCollector(messageId).catch(err =>
        log.error({ err }, `[CrewClosedLoop] flush failed msg=${messageId}`)
      );
    }, 3000);
  }
}

async function flushCollector(messageId: number): Promise<void> {
  const collector = replyCollectors.get(messageId);
  if (!collector) return;
  replyCollectors.delete(messageId);
  if (collector.timer) clearTimeout(collector.timer);

  if (collector.replies.length === 0) return;

  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID?.trim();
  const xiaocaiToken = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim();
  if (!ownerChatId || !xiaocaiToken) {
    log.warn('[CrewClosedLoop] 缺少 OWNER_CHAT_ID 或 XIAOCAI_BOT_TOKEN，無法回傳');
    return;
  }

  log.info(`[CrewClosedLoop] 彙整 ${collector.replies.length} 個回覆，回傳老蔡`);

  // 用 Gemini Flash 彙整
  const crewResults = collector.replies.map(r => `【${r.botName}】：${r.reply}`).join('\n\n');
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();

  let summary = '';
  if (GOOGLE_API_KEY) {
    try {
      const prompt = `你是達爾，主人的CEO指揮官。主人在蝦蝦團隊說了：「${collector.originalText}」

蝦蝦團隊各成員的回覆：
${crewResults}

請用繁體中文整合以上內容，給主人一份精簡的總結報告。格式：
1. 開頭一句話總結
2. 各成員重點（用 bullet points）
3. 結論/建議行動

不要重複原文，用你自己的話整合。簡潔有力。`;

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1500 },
          }),
          signal: AbortSignal.timeout(30000),
        }
      );
      if (resp.ok) {
        const data = await resp.json() as any;
        summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      }
    } catch (e) {
      log.warn({ err: e }, '[CrewClosedLoop] Gemini 彙整失敗');
    }
  }

  // fallback：沒有 Gemini 就直接拼接
  if (!summary) {
    summary = `主人，蝦蝦團隊 ${collector.replies.length} 個成員回覆了你的「${collector.originalText.slice(0, 30)}」：\n\n${collector.replies.map(r => `• ${r.botName}：${r.reply.slice(0, 200)}`).join('\n')}`;
  }

  // 截斷避免 Telegram 4096 限制
  if (summary.length > 3900) {
    summary = summary.slice(0, 3900) + '\n...（已截斷）';
  }

  const finalMsg = `🚀 【星群協作報告】\n\n${summary}`;

  try {
    await sendTelegramMessageToChat(Number(ownerChatId), finalMsg, { token: xiaocaiToken });
    log.info(`[CrewClosedLoop] ✅ 已回傳老蔡私訊 (len=${finalMsg.length})`);
  } catch (e) {
    log.error({ err: e }, '[CrewClosedLoop] 發送老蔡私訊失敗');
  }
}

