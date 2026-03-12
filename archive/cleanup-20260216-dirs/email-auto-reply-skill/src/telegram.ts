import TelegramBot from "node-telegram-bot-api";
import type { Config } from "./types.js";
import type { EmailMessage } from "./types.js";

let bot: TelegramBot | null = null;

function getBot(config: Config): TelegramBot | null {
  if (!config.telegram?.enabled || !config.telegram.botToken) return null;
  if (!bot) bot = new TelegramBot(config.telegram.botToken, { polling: false });
  return bot;
}

/**
 * 發送新郵件摘要到 Telegram
 */
export async function notifyNewEmail(config: Config, email: EmailMessage, analysisSummary: string): Promise<void> {
  const b = getBot(config);
  if (!b || !config.telegram?.chatId) return;

  const snippet = (email.snippet || email.bodyText).slice(0, 150);
  const text = [
    "📬 新郵件摘要",
    "",
    `📌 主旨：${email.subject}`,
    `👤 來自：${email.from}`,
    `📅 ${email.date.toISOString()}`,
    "",
    "📝 內文摘要：",
    snippet + (snippet.length >= 150 ? "…" : ""),
    "",
    "🤖 AI 分析：",
    analysisSummary,
  ].join("\n");

  await b.sendMessage(config.telegram.chatId, text, { disable_web_page_preview: true });
}

/**
 * 發送「已產生回覆草稿」通知（可選）
 */
export async function notifyDraftReady(config: Config, email: EmailMessage, draftPreview: string): Promise<void> {
  const b = getBot(config);
  if (!b || !config.telegram?.chatId) return;

  const preview = draftPreview.slice(0, 300) + (draftPreview.length > 300 ? "…" : "");
  const text = [
    "✉️ 回覆草稿已產生",
    "",
    `主旨：Re: ${email.subject}`,
    "",
    "草稿預覽：",
    preview,
  ].join("\n");

  await b.sendMessage(config.telegram.chatId, text);
}
