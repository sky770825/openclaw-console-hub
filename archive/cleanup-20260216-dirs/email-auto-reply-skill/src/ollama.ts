import type { Config } from "./types.js";
import type { EmailMessage } from "./types.js";

/**
 * 呼叫 Ollama API（/api/chat）進行對話補全
 */
async function ollamaChat(config: Config, prompt: string, system?: string): Promise<string> {
  const url = `${config.ollama.baseUrl.replace(/\/$/, "")}/api/chat`;
  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ollama.model,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama 請求失敗 (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? "").trim();
}

const SYSTEM_ANALYZE = `你是一個郵件助理。根據使用者提供的郵件內容，用簡短中文總結：主旨、寄件者意圖、是否需要回覆、建議回覆要點（1～3 點）。輸出簡潔，每項一行。`;

const SYSTEM_REPLY = `你是一個專業、友善的郵件回覆助理。根據「原始郵件」與「回覆要點」，撰寫一封簡潔的回覆郵件正文（純文字，不要加 Subject/To 等標頭）。
語氣要自然、專業。若原始郵件是英文，可用英文回覆；若是中文則用中文。不要簽名檔，結尾可加簡單致意。`;

/**
 * 分析郵件內容，回傳摘要字串
 */
export async function analyzeEmail(config: Config, email: EmailMessage): Promise<string> {
  const content = `主旨：${email.subject}\n來自：${email.from}\n內文：\n${email.bodyText.slice(0, 3000)}`;
  return ollamaChat(config, content, SYSTEM_ANALYZE);
}

/**
 * 根據原始郵件與分析要點，產生回覆草稿正文
 */
export async function generateReplyDraft(config: Config, email: EmailMessage, analysisSummary: string): Promise<string> {
  const content = `【原始郵件】\n主旨：${email.subject}\n來自：${email.from}\n內文：\n${email.bodyText.slice(0, 3000)}\n\n【分析要點】\n${analysisSummary}`;
  return ollamaChat(config, content, SYSTEM_REPLY);
}
