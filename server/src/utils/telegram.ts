/**
 * Telegram 通知工具
 * 用於發送任務執行通知
 * 若未設定 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID，會自動略過發送。
 */

import { createLogger } from '../logger.js';
import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const log = createLogger('telegram-util');

const GROUP_CHAT_LOG = process.env.HOME + '/.openclaw/workspace/reports/group_chat_log.md';

// ─── 訊息分段（學自 Discord extension 的 chunking 策略） ───
const TELEGRAM_CHUNK_LIMIT = 3900;  // Telegram 上限 4096，留 buffer

/**
 * 智慧分段：在段落/換行處切割，不暴力截斷
 * 學自 Discord extension 的 textChunkLimit + chunker 設計
 */
function chunkMessage(text: string, limit = TELEGRAM_CHUNK_LIMIT): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }

    // 優先在段落邊界（雙換行）切割
    let splitAt = remaining.lastIndexOf('\n\n', limit);
    // 其次在換行處切割
    if (splitAt < limit * 0.3) splitAt = remaining.lastIndexOf('\n', limit);
    // 最後在空白處切割
    if (splitAt < limit * 0.3) splitAt = remaining.lastIndexOf(' ', limit);
    // 都找不到就硬切
    if (splitAt < limit * 0.3) splitAt = limit;

    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}

/** 把 bot 發出的訊息也記進 group_chat_log.md */
function logBotMessage(chatId: number | string, text: string, token: string) {
  try {
    // 從 token 反查 bot 名稱（支援 BOT_TOKEN + CREW_*_TOKEN）
    const botNames: Record<string, string> = {};
    const envKeys = Object.keys(process.env).filter(k => k.includes('TOKEN') && k.startsWith('TELEGRAM'));
    for (const k of envKeys) {
      const name = k.replace(/_TOKEN$/, '').replace(/^TELEGRAM_(CREW_)?/, '').toLowerCase();
      if (process.env[k]?.trim()) botNames[process.env[k]!.trim()] = name;
    }
    const botName = botNames[token] || 'unknown_bot';
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const line = `[${ts}] [BOT:${botName}] → chat ${chatId}: ${text.slice(0, 500)}\n`;
    mkdirSync(dirname(GROUP_CHAT_LOG), { recursive: true });
    appendFileSync(GROUP_CHAT_LOG, line, 'utf-8');
  } catch { /* 不影響主流程 */ }
}

/**
 * 清理非 UTF-8 / Telegram 不接受的字元
 * - 移除孤立 surrogate pairs（\uD800-\uDFFF）
 * - 移除 C0/C1 控制字元（保留 \t \n \r）
 * - 防止 Telegram 400 "strings must be encoded in UTF-8"
 */
function sanitizeUtf8(text: string): string {
  return text
    .replace(/[\uD800-\uDFFF]/g, '')                             // 孤立 surrogate
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u0080-\uFFFF]/g, '');     // 非法控制字元
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();
const TELEGRAM_GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID?.trim();
const TELEGRAM_GROUP_BOT_TOKEN = process.env.TELEGRAM_GROUP_BOT_TOKEN?.trim();

/** 是否已設定 Telegram（後端啟動時檢查用） */
export function isTelegramConfigured(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

let telegramConfigLogged = false;
function logTelegramConfigOnce(): void {
  if (telegramConfigLogged) return;
  telegramConfigLogged = true;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    log.warn('[Telegram] 未設定 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID，通知將不發送。請在 .env 設定。');
  }
}

/**
 * 發送 Telegram 訊息
 */
export async function sendTelegramMessage(
  text: string,
  options: {
    silent?: boolean;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  } = {}
): Promise<void> {
  logTelegramConfigOnce();
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return;
  }
  try {
    const safeText = sanitizeUtf8(text);
    const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: safeText,
        disable_notification: options.silent ?? false,
        ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      log.error({ status: res.status, detail }, '[Telegram] send failed');
    }
    // 群推已移除 — n8n 負責群組回報，不需要重複推送
  } catch (error) {
    log.error({ err: error }, '[Telegram] Failed to send message');
  }
}

/**
 * 發送 Telegram 訊息到指定 chat（控制 bot / inline keyboard 用）
 * - token: 預設會使用 TELEGRAM_CONTROL_BOT_TOKEN，其次 TELEGRAM_BOT_TOKEN
 * - replyMarkup: Telegram reply_markup (e.g. inline_keyboard)
 */
export async function sendTelegramMessageToChat(
  chatId: number | string,
  text: string,
  options: {
    token?: string;
    silent?: boolean;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: unknown;
  } = {}
): Promise<void> {
  const token = options.token?.trim() || process.env.TELEGRAM_CONTROL_BOT_TOKEN?.trim() || TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const safeText = sanitizeUtf8(text);
  const chunks = chunkMessage(safeText);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks.length > 1
      ? `${chunks[i]}\n\n📄 (${i + 1}/${chunks.length})`
      : chunks[i];

    try {
      const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          disable_notification: options.silent ?? false,
          ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
          // reply_markup 只在最後一段才附加
          ...(i === chunks.length - 1 && options.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        log.error({ status: res.status, detail: detail.slice(0, 400) }, '[TelegramControl] send failed');
        // HTML 格式錯誤時 fallback 到純文字重發
        if (options.parseMode && (detail.includes("can't parse") || detail.includes('Bad Request'))) {
          log.info('[TelegramControl] HTML parse 失敗，fallback 純文字重發');
          const fallbackRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: chunk.replace(/<[^>]+>/g, ''),  // 移除所有 HTML 標籤
              disable_notification: options.silent ?? false,
            }),
          });
          if (fallbackRes.ok) logBotMessage(chatId, chunks[i], token);
        }
      } else {
        logBotMessage(chatId, chunks[i], token);
      }
    } catch (error) {
      log.error({ err: error }, '[TelegramControl] Failed to send message');
    }

    // 多段之間加小延遲避免 Telegram 限速
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

/**
 * 發送訊息並回傳 message_id（用於後續 editMessageText 串流更新）
 */
export async function sendTelegramMessageAndGetId(
  chatId: number | string,
  text: string,
  options: {
    token?: string;
    silent?: boolean;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  } = {}
): Promise<number | null> {
  const token = options.token?.trim() || process.env.TELEGRAM_CONTROL_BOT_TOKEN?.trim() || TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    const safeText = sanitizeUtf8(text);
    const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: safeText,
        disable_notification: options.silent ?? false,
        ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    const result = data.result as Record<string, unknown> | undefined;
    return (result?.message_id as number) ?? null;
  } catch {
    return null;
  }
}

/**
 * 編輯已發送的訊息（用於串流更新）
 */
export async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  options: {
    token?: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  } = {}
): Promise<boolean> {
  const token = options.token?.trim() || process.env.TELEGRAM_CONTROL_BOT_TOKEN?.trim() || TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const safeText = sanitizeUtf8(text);
    const endpoint = `https://api.telegram.org/bot${token}/editMessageText`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: safeText,
        ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyTaskTimeout(
  taskName: string,
  taskId: string,
  runId: string,
  timeoutMinutes: number
): Promise<void> {
  const text = `⏱️ <b>任務超時</b>\n\n` +
    `<b>任務：</b>${taskName}\n` +
    `<b>任務 ID：</b>${taskId}\n` +
    `<b>執行 ID：</b>${runId}\n` +
    `<b>超時時間：</b>${timeoutMinutes} 分鐘`;
  await sendTelegramMessage(text, { parseMode: 'HTML' });
}

export async function notifyTaskRetry(
  taskName: string,
  taskId: string,
  runId: string,
  currentRetry: number,
  maxRetries: number,
  reason: string
): Promise<void> {
  const text = `🔄 <b>任務重試</b>\n\n` +
    `<b>任務：</b>${taskName}\n` +
    `<b>任務 ID：</b>${taskId}\n` +
    `<b>執行 ID：</b>${runId}\n` +
    `<b>重試次數：</b>${currentRetry}/${maxRetries}\n` +
    `<b>原因：</b>${reason}`;
  await sendTelegramMessage(text, { parseMode: 'HTML' });
}

export async function notifyModelFallback(
  taskName: string,
  taskId: string,
  runId: string,
  from: string,
  to: string
): Promise<void> {
  const text = `⬇️ <b>模型降級</b>\n\n` +
    `<b>任務：</b>${taskName}\n` +
    `<b>任務 ID：</b>${taskId}\n` +
    `<b>執行 ID：</b>${runId}\n` +
    `<b>降級：</b>${from} → ${to}`;
  await sendTelegramMessage(text, { parseMode: 'HTML' });
}

export async function notifyTaskFailure(
  taskName: string,
  taskId: string,
  runId: string,
  error: string,
  retryCount: number
): Promise<void> {
  const truncatedError = error.length > 200 ? error.slice(0, 200) + '...' : error;
  const text = `❌ <b>任務失敗</b>\n\n` +
    `<b>任務：</b>${taskName}\n` +
    `<b>任務 ID：</b>${taskId}\n` +
    `<b>執行 ID：</b>${runId}\n` +
    `<b>重試次數：</b>${retryCount}\n` +
    `<b>錯誤：</b><code>${truncatedError}</code>`;
  await sendTelegramMessage(text, { parseMode: 'HTML' });
}

export async function notifyTaskSuccess(
  taskName: string,
  taskId: string,
  runId: string,
  durationMs: number | null | undefined
): Promise<void> {
  const durationText = durationMs ? `${Math.round(durationMs / 1000)} 秒` : '未知';
  const text = `✅ <b>任務完成</b>\n\n` +
    `<b>任務：</b>${taskName}\n` +
    `<b>任務 ID：</b>${taskId}\n` +
    `<b>執行 ID：</b>${runId}\n` +
    `<b>耗時：</b>${durationText}`;
  await sendTelegramMessage(text, { parseMode: 'HTML', silent: true });
}

export async function notifyWorkflowStart(
  workflowName: string,
  taskCount: number,
  executionMode: string
): Promise<void> {
  const text = `🚀 <b>工作流程開始</b>\n\n` +
    `<b>名稱：</b>${workflowName}\n` +
    `<b>任務數：</b>${taskCount}\n` +
    `<b>執行模式：</b>${executionMode === 'parallel' ? '並行' : '順序'}`;
  await sendTelegramMessage(text, { parseMode: 'HTML' });
}

export async function notifyWorkflowComplete(
  workflowName: string,
  total: number,
  success: number,
  failed: number
): Promise<void> {
  const icon = failed === 0 ? '✅' : failed < total ? '⚠️' : '❌';
  const text = `${icon} <b>工作流程完成</b>\n\n` +
    `<b>名稱：</b>${workflowName}\n` +
    `<b>總任務：</b>${total}\n` +
    `<b>成功：</b>${success}\n` +
    `<b>失敗：</b>${failed}`;
  await sendTelegramMessage(text, { parseMode: 'HTML', silent: failed === 0 });
}

/** 紅色警戒通知 — 帶解決按鈕 */
export async function notifyRedAlert(
  reviewId: string,
  taskId: string,
  title: string,
  description: string,
  severity: 'high' | 'critical'
): Promise<void> {
  const chatId = TELEGRAM_CHAT_ID;
  if (!chatId) return;

  const icon = severity === 'critical' ? '🚨🔴' : '⚠️🟠';
  const truncatedDesc = description.length > 300
    ? description.slice(0, 300) + '...'
    : description;

  const text =
    `${icon} <b>紅色警戒</b>\n\n` +
    `<b>問題：</b>${title}\n` +
    `<b>任務 ID：</b><code>${taskId}</code>\n` +
    `<b>嚴重程度：</b>${severity === 'critical' ? 'CRITICAL' : 'HIGH'}\n\n` +
    `<b>描述：</b>\n${truncatedDesc}\n\n` +
    `<b>狀態：</b> 任務已自動暫停，等待人工處理`;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: '✅ 已修復，恢復任務', callback_data: `alert:resolve:${reviewId}:${taskId}` }],
    ],
  };

  await sendTelegramMessageToChat(chatId, text, { parseMode: 'HTML', replyMarkup });
}

/** 發想提案通知 — 帶批准/駁回/轉任務按鈕 */
export async function notifyProposal(
  reviewId: string,
  title: string,
  category: string,
  background: string,
  goal: string,
  risk: string
): Promise<void> {
  const chatId = TELEGRAM_CHAT_ID;
  if (!chatId) return;

  const catEmoji: Record<string, string> = {
    commercial: '💼', system: '⚙️', tool: '🔧', risk: '🛡️', creative: '💡',
  };
  const catLabel: Record<string, string> = {
    commercial: '商業', system: '系統', tool: '工具', risk: '風險', creative: '創意',
  };
  const emoji = catEmoji[category] || '💡';
  const label = catLabel[category] || category;

  const truncBg = background.length > 200 ? background.slice(0, 200) + '...' : background;
  const truncGoal = goal.length > 150 ? goal.slice(0, 150) + '...' : goal;
  const truncRisk = risk.length > 150 ? risk.slice(0, 150) + '...' : risk;

  const text =
    `${emoji} <b>發想提案</b>  [${label}]\n\n` +
    `<b>標題：</b>${title}\n` +
    `<b>提案 ID：</b><code>${reviewId}</code>\n\n` +
    `<b>背景：</b>\n${truncBg}\n\n` +
    (truncGoal ? `<b>目標：</b>\n${truncGoal}\n\n` : '') +
    (truncRisk ? `<b>風險：</b>\n${truncRisk}\n\n` : '') +
    `⏳ <b>等待主人審核</b>`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '✅ 批准', callback_data: `proposal:approve:${reviewId}` },
        { text: '❌ 駁回', callback_data: `proposal:reject:${reviewId}` },
      ],
      [
        { text: '📋 批准+轉任務', callback_data: `proposal:task:${reviewId}` },
      ],
    ],
  };

  await sendTelegramMessageToChat(chatId, text, { parseMode: 'HTML', replyMarkup });
}

export const message = {
  send: sendTelegramMessage,
};
