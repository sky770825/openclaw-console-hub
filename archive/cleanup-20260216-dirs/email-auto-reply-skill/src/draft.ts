import type { Config } from "./types.js";
import type { EmailMessage } from "./types.js";
import { analyzeEmail, generateReplyDraft } from "./ollama.js";
import { notifyNewEmail, notifyDraftReady } from "./telegram.js";
import { sendGmailReply, markGmailRead } from "./gmail.js";

/** 從 From 字串取出 email 位址 */
export function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].trim() : from.trim();
}

export interface ProcessResult {
  email: EmailMessage;
  analysis: string;
  draft: string;
  sent: boolean;
}

/**
 * 處理單一郵件：分析 → 產生草稿 → 可選發送
 */
export async function processOneEmail(
  config: Config,
  email: EmailMessage,
  options: { sendNow?: boolean }
): Promise<ProcessResult> {
  const analysis = await analyzeEmail(config, email);
  const draft = await generateReplyDraft(config, email, analysis);

  if (config.telegram?.enabled) {
    await notifyNewEmail(config, email, analysis).catch((e) => console.warn("Telegram 通知失敗:", e.message));
    await notifyDraftReady(config, email, draft).catch((e) => console.warn("Telegram 草稿通知失敗:", e.message));
  }

  const shouldSend = options.sendNow ?? !config.sendAfterConfirm;
  let sent = false;

  if (shouldSend && config.provider === "gmail") {
    const to = extractEmail(email.from);
    await sendGmailReply(config, to, email.subject, draft, email.messageId);
    await markGmailRead(config, email.id);
    sent = true;
  }

  return { email, analysis, draft, sent };
}
