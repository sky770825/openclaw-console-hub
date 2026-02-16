/**
 * Telegram 通知工具
 * 用於發送任務執行通知
 * 若未設定 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID，會自動略過發送。
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();

/** 是否已設定 Telegram（後端啟動時檢查用） */
export function isTelegramConfigured(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

let telegramConfigLogged = false;
function logTelegramConfigOnce(): void {
  if (telegramConfigLogged) return;
  telegramConfigLogged = true;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] 未設定 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID，通知將不發送。請在 .env 設定。');
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
    const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        disable_notification: options.silent ?? false,
        ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[Telegram] send failed:', res.status, detail);
    }
  } catch (error) {
    console.error('[Telegram] Failed to send message:', error);
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
  try {
    const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_notification: options.silent ?? false,
        ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
        ...(options.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[TelegramControl] send failed:', res.status, detail.slice(0, 400));
    }
  } catch (error) {
    console.error('[TelegramControl] Failed to send message:', error);
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
    `⏳ <b>等待老蔡審核</b>`;

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
