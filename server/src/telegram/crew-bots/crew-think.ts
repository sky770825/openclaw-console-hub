/**
 * NEUXA 星群 Crew Bots — 輕量 AI 思考
 * 使用 Gemini 2.5 Flash，純聊天無 action 執行
 */

import { createLogger } from '../../logger.js';
import type { CrewBotConfig } from './crew-config.js';
import { CREW_BOTS } from './crew-config.js';

const log = createLogger('crew-think');

const MODEL_ID = 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 1024;
const TEMPERATURE = 0.9;
const TIMEOUT_MS = 30_000;

export interface CrewHistoryEntry {
  role: 'user' | 'model';
  text: string;
  fromName?: string;
  timestamp: number;
}

/** 共享群組對話歷史 */
export const groupHistory: CrewHistoryEntry[] = [];
const MAX_HISTORY = 50;

export function pushHistory(entry: CrewHistoryEntry): void {
  groupHistory.push(entry);
  if (groupHistory.length > MAX_HISTORY) groupHistory.splice(0, groupHistory.length - MAX_HISTORY);
}

/**
 * 輕量 AI 思考 — 給 crew bot 用
 * 回傳回覆文字，失敗回傳 null（靜默不回覆）
 */
export async function crewThink(
  bot: CrewBotConfig,
  userMessage: string,
  senderName: string,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    log.warn('[CrewThink] 無 GOOGLE_API_KEY，跳過');
    return null;
  }

  const systemPrompt = buildCrewPrompt(bot, senderName);

  // 組裝最近對話歷史
  const recent = groupHistory.slice(-10);
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: `收到，我是${bot.name}，${bot.role}。隨時準備好了。` }] },
    ...recent.map(h => ({
      role: h.role === 'model' ? 'model' as const : 'user' as const,
      parts: [{ text: h.fromName ? `[${h.fromName}] ${h.text}` : h.text }],
    })),
    { role: 'user' as const, parts: [{ text: `[${senderName}] ${userMessage}` }] },
  ];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: TEMPERATURE },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      log.error({ status: res.status, detail: detail.slice(0, 300) }, `[CrewThink] ${bot.name} API 失敗`);
      return null;
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim();
    if (!text) return null;

    // 清理 markdown → Telegram 友好格式
    const clean = text
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '*$1*')
      .replace(/^[-*]\s/gm, '• ')
      .replace(/`([^`\n]+)`/g, '$1')
      .trim();

    return clean || null;
  } catch (err) {
    log.error({ err }, `[CrewThink] ${bot.name} 思考失敗`);
    return null;
  }
}

/**
 * 組裝 crew bot 的 system prompt（~600 tokens）
 */
function buildCrewPrompt(bot: CrewBotConfig, senderName: string): string {
  const otherBots = CREW_BOTS
    .filter(b => b.id !== bot.id && b.token)
    .map(b => `${b.name}(${b.role})`)
    .join('、');

  return `你是 ${bot.name}，NEUXA 星群指揮處的${bot.role}。

## 身份
${bot.personality}

## 場景
你正在「NEUXA星群指揮處」Telegram 群組裡，跟老蔡和其他成員討論。
群組裡還有：${otherBots}。
你只在自己專長領域發言，不搶別人的話題。

## 說話方式
${bot.responseStyle}
- 繁體中文口語
- 回覆簡潔，1-5 句話。群組對話不需要長篇大論。
- 不要用 markdown 標題（##）、程式碼區塊
- 不要開頭「好的」「收到」「了解」
- 如果其他成員已經回答得很好，你可以補充一兩句或表示同意
- 直接回覆內容，不要加自己的名字前綴

## 規則
- 你只能聊天討論，沒有執行能力（不能讀寫檔案、跑腳本）
- 遇到需要實際操作的事，建議找小蔡（@xiaoji_cai_bot）
- 不暴露系統內部資訊（API key、密碼、token）
- 對方是：${senderName}`;
}
