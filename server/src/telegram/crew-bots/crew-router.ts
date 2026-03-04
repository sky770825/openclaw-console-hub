/**
 * NEUXA 星群 Crew Bots — 智慧路由
 * 判斷每條群組訊息該由哪 1-2 個 bot 回覆
 */

import { CREW_BOTS, CREW_BOT_USERNAMES, SYSTEM_BOT_USERNAMES } from './crew-config.js';
import type { CrewBotConfig } from './crew-config.js';

export interface RoutingDecision {
  respondingBots: Array<{ botId: string; score: number }>;
  filtered: boolean;
  filterReason?: string;
}

/** 每個 bot 最後回覆時間（冷卻用） */
const lastResponseTime = new Map<string, number>();

/** 全局回覆計數（滑動窗口限速） */
const globalResponses: number[] = [];

const COOLDOWN_MS = 30_000;          // 同一 bot 30 秒冷卻
const GLOBAL_LIMIT_PER_MIN = 12;     // 全局每分鐘最多 12 次（支援多人點名）
const GLOBAL_WINDOW_MS = 60_000;

/**
 * 判斷一條訊息該由哪些 crew bot 回覆
 */
export function routeMessage(
  text: string,
  senderUsername: string,
  senderIsBot: boolean,
): RoutingDecision {
  const lowerUsername = (senderUsername || '').toLowerCase();

  // ─── Layer 1: Bot 訊息過濾（小蔡 + 匿名管理員例外） ───
  const ALLOWED_BOT_USERNAMES = new Set(['xiaoji_cai_bot', 'groupanonymousbot']);
  if (senderIsBot && !ALLOWED_BOT_USERNAMES.has(lowerUsername)) {
    return { respondingBots: [], filtered: true, filterReason: 'bot message' };
  }

  // ─── Layer 2: 已知 crew/system bot username 過濾（小蔡指揮官例外） ───
  const isXiaocaiCommand = senderIsBot && lowerUsername === 'xiaoji_cai_bot';
  if (!isXiaocaiCommand && (CREW_BOT_USERNAMES.has(lowerUsername) || SYSTEM_BOT_USERNAMES.has(lowerUsername))) {
    return { respondingBots: [], filtered: true, filterReason: 'known bot username' };
  }

  // ─── Layer 3: 太短的訊息過濾 ───
  if (!text || text.trim().length < 2) {
    return { respondingBots: [], filtered: true, filterReason: 'too short' };
  }

  // ─── Layer 3.5: 指揮官模式標記 ───
  const lText = text.toLowerCase();
  // 注意：不再過濾提到「小蔡」的訊息 — Forum 群組小蔡走私訊通道，不搶 crew bots

  // ─── Layer 4: 指令過濾（讓現有 bot 處理） ───
  if (text.startsWith('/')) {
    return { respondingBots: [], filtered: true, filterReason: 'command' };
  }

  // ─── Layer 5: 全局限速（指揮官指令不受限速） ───
  const now = Date.now();
  while (globalResponses.length > 0 && now - globalResponses[0] > GLOBAL_WINDOW_MS) {
    globalResponses.shift();
  }
  if (!isXiaocaiCommand && globalResponses.length >= GLOBAL_LIMIT_PER_MIN) {
    return { respondingBots: [], filtered: true, filterReason: 'global rate limit' };
  }

  // ─── 指揮官全員集合 — 小蔡發的訊息含「各位」「大家」「全員」→ 所有 bot 回覆 ───
  if (isXiaocaiCommand) {
    const ALL_HANDS_KEYWORDS = ['各位', '大家', '全員', '所有人', '夥伴們', '請大家', '全體'];
    const isAllHands = ALL_HANDS_KEYWORDS.some(kw => lText.includes(kw));

    if (isAllHands) {
      const allBots = CREW_BOTS
        .filter(b => b.token)
        .map(b => ({ botId: b.id, score: 20 }));
      for (const r of allBots) recordResponse(r.botId, now);
      return { respondingBots: allBots, filtered: false };
    }
  }

  // ─── 關鍵字計分 ───
  const lowerText = text.toLowerCase();
  const scores: Array<{ botId: string; score: number }> = [];

  for (const bot of CREW_BOTS) {
    if (!bot.token) continue; // 沒 token 的 bot 跳過
    let score = 0;

    // 直接點名（最高優先）
    if (lowerText.includes(bot.name) || lowerText.includes(`@${bot.username.toLowerCase()}`)) {
      score += 10;
    }

    // 專長關鍵字匹配
    for (const kw of bot.expertiseKeywords) {
      const kwLower = kw.toLowerCase();
      if (lowerText.includes(kwLower)) {
        // 精確匹配（獨立詞）+3，子字串 +1
        const wordBoundary = new RegExp(`(?:^|[\\s,;.!?])${escapeRegex(kwLower)}(?:$|[\\s,;.!?])`, 'i');
        score += wordBoundary.test(text) ? 3 : 1;
      }
    }

    scores.push({ botId: bot.id, score });
  }

  // ─── 選擇回覆的 bot ───
  scores.sort((a, b) => b.score - a.score);

  // 被直接點名 → 所有被點名的 bot 都回（點名多人各自回）
  const directMentions = scores.filter(s => s.score >= 10);
  if (directMentions.length > 0) {
    const responding = directMentions
      .filter(s => !isCoolingDown(s.botId, now));
    if (responding.length > 0) {
      for (const r of responding) recordResponse(r.botId, now);
      return { respondingBots: responding, filtered: false };
    }
    return { respondingBots: [], filtered: true, filterReason: 'mentioned bot cooling down' };
  }

  // 指揮官指令門檻降低：score >= 2 就回；一般訊息 score >= 5
  // 指揮官模式允許多個 bot 回覆（score >= 2 的都回）
  const scoreThreshold = isXiaocaiCommand ? 2 : 5;
  const top = scores[0];
  if (!top || top.score < scoreThreshold) {
    return { respondingBots: [], filtered: true, filterReason: 'no relevant expertise' };
  }

  const responding: Array<{ botId: string; score: number }> = [];
  if (isXiaocaiCommand) {
    // 指揮官模式：所有過門檻的 bot 都回
    for (const s of scores) {
      if (s.score >= scoreThreshold && !isCoolingDown(s.botId, now)) {
        responding.push(s);
      }
    }
  } else if (!isCoolingDown(top.botId, now)) {
    responding.push(top);
  }

  if (responding.length > 0) {
    for (const r of responding) recordResponse(r.botId, now);
    return { respondingBots: responding, filtered: false };
  }

  return { respondingBots: [], filtered: true, filterReason: 'responding bots cooling down' };
}

function isCoolingDown(botId: string, now: number): boolean {
  const last = lastResponseTime.get(botId) || 0;
  return (now - last) < COOLDOWN_MS;
}

function recordResponse(botId: string, now: number): void {
  lastResponseTime.set(botId, now);
  globalResponses.push(now);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
