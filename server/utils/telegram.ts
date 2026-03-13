/**
 * Telegram 通知工具
 * 用於發送任務執行通知
 * 若未設定 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID，會自動略過發送。
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();

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
    // 不拋出錯誤，避免影響主流程
  }
}

/**
 * 發送任務超時通知
 */
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

/**
 * 發送任務重試通知
 */
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

/**
 * 發送模型降級通知
 */
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

/**
 * 發送任務失敗通知
 */
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

/**
 * 發送任務成功通知
 */
export async function notifyTaskSuccess(
  taskName: string,
  taskId: string,
  runId: string,
  durationMs: number | null | undefined
): Promise<void> {
  const durationText = durationMs
    ? `${Math.round(durationMs / 1000)} 秒`
    : '未知';

  const text = `✅ <b>任務完成</b>\n\n` +
    `<b>任務：</b>${taskName}\n` +
    `<b>任務 ID：</b>${taskId}\n` +
    `<b>執行 ID：</b>${runId}\n` +
    `<b>耗時：</b>${durationText}`;

  await sendTelegramMessage(text, { parseMode: 'HTML', silent: true });
}

/**
 * 發送工作流程開始通知
 */
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

/**
 * 發送工作流程完成通知
 */
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

// 導出
export const message = {
  send: sendTelegramMessage,
};
