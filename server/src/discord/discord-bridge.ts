/**
 * Telegram ↔ Discord 雙向同步橋
 *
 * 運作方式：
 * 1. Telegram 的蝦蝦回覆 → 自動轉發到對應 Discord 頻道
 * 2. Discord 發訊息 → 路由到對應蝦蝦 → 回覆在 Discord + 轉發 Telegram
 * 3. 防重複機制避免無限迴圈
 */

import { createLogger } from '../logger.js';
import {
  DISCORD_CHANNEL_MAP,
  BOT_TO_DISCORD_CHANNEL,
  DISCORD_COMMAND_CENTER,
  DISCORD_TASK_REPORT,
  DISCORD_ALERT,
  BOT_EMOJI,
} from './discord-config.js';
import { sendDiscordMessage } from './discord-rest.js';
import type { DiscordMessage } from './discord-gateway.js';

const log = createLogger('discord-bridge');

// ─── 防重複（Dedup） ───

const recentBridged = new Map<string, number>();
const DEDUP_TTL_MS = 60_000;

function fingerprint(botId: string, content: string): string {
  return `${botId}:${content.slice(0, 100)}`;
}

function isDuplicate(fp: string): boolean {
  const ts = recentBridged.get(fp);
  if (!ts) return false;
  return Date.now() - ts < DEDUP_TTL_MS;
}

function markBridged(fp: string): void {
  recentBridged.set(fp, Date.now());
}

// 定期清理
setInterval(() => {
  const now = Date.now();
  for (const [fp, ts] of recentBridged) {
    if (now - ts > DEDUP_TTL_MS) recentBridged.delete(fp);
  }
}, 30_000);

// ─── Telegram → Discord（蝦蝦回覆轉發） ───

/**
 * 把 Telegram 蝦蝦的回覆轉發到對應 Discord 頻道
 * 在 crew-poller 發完 Telegram 訊息後呼叫
 */
export async function bridgeToDiscord(botId: string, message: string, source: 'telegram' | 'patrol' | 'alert' = 'telegram'): Promise<void> {
  const fp = fingerprint(botId, message);
  if (isDuplicate(fp)) return;
  markBridged(fp);

  const emoji = BOT_EMOJI[botId] || `🤖 ${botId}`;

  // 決定目標頻道
  let channelId: string | undefined;

  if (source === 'alert') {
    channelId = DISCORD_ALERT;
  } else if (source === 'patrol') {
    channelId = DISCORD_TASK_REPORT;
  } else {
    channelId = BOT_TO_DISCORD_CHANNEL[botId] || DISCORD_COMMAND_CENTER;
  }

  if (!channelId) return;

  await sendDiscordMessage(channelId, message, { prefix: `**${emoji}** (from Telegram)` }).catch(err => {
    log.error({ err, botId, channelId }, '[Bridge] T→D failed');
  });
}

// ─── Discord → 蝦蝦（Discord 訊息路由） ───

/** crewThink 函數的型別（由外部注入，避免循環依賴） */
type ThinkFn = (botId: string, text: string, senderName: string) => Promise<string>;
let thinkFn: ThinkFn | null = null;

/** 註冊 AI 思考函數（在 index.ts 啟動時注入） */
export function registerThinkFn(fn: ThinkFn): void {
  thinkFn = fn;
}

/**
 * 處理 Discord 訊息
 * 由 discord-gateway 的 MESSAGE_CREATE 事件觸發
 */
export async function handleDiscordMessage(msg: DiscordMessage): Promise<void> {
  // 1. 忽略 bot 自己的訊息（防迴圈）
  if (msg.author.bot) return;

  // 2. 忽略空訊息
  if (!msg.content?.trim()) return;

  // 3. 檢查防重複
  const fp = fingerprint('discord-in', msg.content);
  if (isDuplicate(fp)) return;
  markBridged(fp);

  log.info(`[Bridge] Discord msg from=${msg.author.username} ch=${msg.channelId} text="${msg.content.slice(0, 50)}"`);

  // 4. 查找對應的 bot
  const mapping = DISCORD_CHANNEL_MAP[msg.channelId];

  // 指揮中心 → 達爾
  const isCommandCenter = msg.channelId === DISCORD_COMMAND_CENTER;

  if (!mapping && !isCommandCenter) {
    // 未知頻道，不處理
    return;
  }

  const botId = mapping?.botId || 'xiaocai';

  // 5. 呼叫 AI 思考
  if (!thinkFn) {
    log.warn('[Bridge] thinkFn not registered, cannot process Discord message');
    return;
  }

  try {
    const reply = await thinkFn(botId, msg.content, msg.author.username);
    if (!reply?.trim()) return;

    const emoji = BOT_EMOJI[botId] || `🤖 ${botId}`;

    // 6. 回覆到 Discord
    const replyFp = fingerprint(botId, reply);
    markBridged(replyFp);  // 標記防重複，避免 T→D 橋再轉一次
    await sendDiscordMessage(msg.channelId, reply, { prefix: `**${emoji}**` });

    log.info(`[Bridge] Discord reply sent, bot=${botId} len=${reply.length}`);
  } catch (err) {
    log.error({ err, botId }, '[Bridge] Discord think failed');
    await sendDiscordMessage(msg.channelId, `❌ 處理失敗，請稍後再試`).catch(() => {});
  }
}
