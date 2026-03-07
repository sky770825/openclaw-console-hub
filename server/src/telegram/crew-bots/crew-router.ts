/**
 * NEUXA 星群 Crew Bots — 意圖路由 + Orchestrator 模式
 * 從關鍵字路由升級為意圖分析，精準派給 1-2 個最相關的 bot
 */

import { ACTIVE_CREW_BOTS, CREW_BOT_USERNAMES, SYSTEM_BOT_USERNAMES } from './crew-config.js';
import type { CrewBotConfig } from './crew-config.js';

/** 管理員 username（享有與小蔡相同的低門檻 + 全員集合權限） */
const ADMIN_USERNAMES = new Set(['gousmaaa', 'sky770825']);

export interface RoutingDecision {
  respondingBots: Array<{ botId: string; score: number }>;
  filtered: boolean;
  filterReason?: string;
}

export interface HandoffResult {
  primary: CrewBotConfig;
  secondary?: CrewBotConfig;
}

/** 每個 bot 最後回覆時間（冷卻用） */
const lastResponseTime = new Map<string, number>();

/** 全局回覆計數（滑動窗口限速） */
const globalResponses: number[] = [];

const COOLDOWN_MS = 30_000;          // 同一 bot 30 秒冷卻
const GLOBAL_LIMIT_PER_MIN = 12;     // 全局每分鐘最多 12 次
const GLOBAL_WINDOW_MS = 60_000;

// ─── 意圖分類 ───────────────────────────────────────────

interface IntentSignal {
  domain: CrewBotConfig['domain'];
  weight: number;
}

/** 意圖關鍵字 → domain 映射（比 per-bot keyword 更高層） */
const INTENT_PATTERNS: Array<{ patterns: RegExp; domain: CrewBotConfig['domain']; weight: number }> = [
  // engineering
  { patterns: /\b(bug|fix|code|deploy|build|error|crash|500|404|timeout|重構|refactor|程式|代碼|編譯|架構|debug|除錯|安全|security|效能|技術債)\b/i, domain: 'engineering', weight: 5 },
  // intelligence
  { patterns: /\b(研究|調研|爬網|情報|知識|索引|搜尋|log|日誌|異常|初篩|趨勢|競品|research|analysis|trend|論文|文獻)\b/i, domain: 'intelligence', weight: 5 },
  // data
  { patterns: /\b(數據|資料|data|sql|查詢|query|統計|chart|csv|metrics|監控|supabase|報表|數字|指標|dashboard|儀表板|洞察|insight)\b/i, domain: 'data', weight: 5 },
  // strategy
  { patterns: /\b(策略|計畫|規劃|路線圖|roadmap|風險|優先|排序|資源|里程碑|OKR|KPI|決策|方案|任務拆解|分工|排程|瓶頸|進度|協調)\b/i, domain: 'strategy', weight: 5 },
  // business
  { patterns: /\b(自動化|automation|n8n|zapier|make|workflow|訂閱|subscription|saas|工具|效率|流程|整合|商業|business|ROI|990|房|租|業務|webhook)\b/i, domain: 'business', weight: 5 },
  // operations
  { patterns: /\b(整理|文件|記錄|提醒|截止|報告|日報|週報|摘要|總結|備忘|memo|通知|安排|記憶|筆記|歸檔|知識管理)\b/i, domain: 'operations', weight: 5 },
];

/** [TASK] 前綴的結構化任務標記 → domain 映射 */
const TASK_TAG_DOMAIN: Record<string, CrewBotConfig['domain']> = {
  engineering: 'engineering',
  eng: 'engineering',
  intel: 'intelligence',
  intelligence: 'intelligence',
  research: 'intelligence',
  data: 'data',
  analytics: 'data',
  strategy: 'strategy',
  plan: 'strategy',
  business: 'business',
  biz: 'business',
  ops: 'operations',
  operations: 'operations',
  secretary: 'operations',
};

/**
 * 分析文本意圖，返回按 domain 分組的權重
 */
function analyzeIntent(text: string): Map<CrewBotConfig['domain'], number> {
  const domainScores = new Map<CrewBotConfig['domain'], number>();

  for (const { patterns, domain, weight } of INTENT_PATTERNS) {
    const matches = text.match(new RegExp(patterns.source, 'gi'));
    if (matches) {
      const current = domainScores.get(domain) || 0;
      // 多個關鍵字命中 → 累加（但遞減：第1個+5, 第2個+3, 第3個+2...）
      const bonus = matches.length >= 3 ? weight + 3 + 2 :
                    matches.length >= 2 ? weight + 3 :
                    weight;
      domainScores.set(domain, current + bonus);
    }
  }

  return domainScores;
}

/**
 * 解析 [TASK] 前綴的結構化任務標記
 * 格式：[TASK:domain] 或 [TASK domain]
 * 返回匹配的 domain，無標記返回 null
 */
function parseTaskTag(text: string): CrewBotConfig['domain'] | null {
  const match = text.match(/^\[TASK[:\s](\w+)\]/i);
  if (!match) return null;
  const tag = match[1].toLowerCase();
  return TASK_TAG_DOMAIN[tag] || null;
}

// ─── 評分引擎 ──────────────────────────────────────────

/**
 * 對單個 bot 計算綜合得分
 * 結合：直接點名(+10)、意圖domain匹配(+domainScore)、關鍵字細粒度(+1~3)
 */
function scoreBot(bot: CrewBotConfig, text: string, intentScores: Map<CrewBotConfig['domain'], number>): number {
  const lowerText = text.toLowerCase();
  let score = 0;

  // 1. 直接點名（最高優先）
  if (lowerText.includes(bot.name) || lowerText.includes(`@${bot.username.toLowerCase()}`)) {
    score += 10;
  }

  // 2. 意圖 domain 匹配
  const domainScore = intentScores.get(bot.domain) || 0;
  score += domainScore;

  // 3. 細粒度關鍵字（補充 domain 層級抓不到的精確匹配）
  for (const kw of bot.expertiseKeywords) {
    const kwLower = kw.toLowerCase();
    if (lowerText.includes(kwLower)) {
      const wordBoundary = new RegExp(`(?:^|[\\s,;.!?])${escapeRegex(kwLower)}(?:$|[\\s,;.!?])`, 'i');
      score += wordBoundary.test(text) ? 2 : 1;
    }
  }

  return score;
}

// ─── 公開 API ───────────────────────────────────────────

/**
 * selectBestBot — Orchestrator 模式用
 * 對所有 ACTIVE bot 評分，返回最匹配的單個 bot
 */
export function selectBestBot(text: string): CrewBotConfig | null {
  if (!text || text.trim().length < 2) return null;

  const intentScores = analyzeIntent(text);

  // [TASK] 標記直接匹配
  const taskDomain = parseTaskTag(text);
  if (taskDomain) {
    const match = ACTIVE_CREW_BOTS.find(b => b.domain === taskDomain);
    if (match) return match;
  }

  let bestBot: CrewBotConfig | null = null;
  let bestScore = 0;

  for (const bot of ACTIVE_CREW_BOTS) {
    const score = scoreBot(bot, text, intentScores);
    if (score > bestScore) {
      bestScore = score;
      bestBot = bot;
    }
  }

  return bestScore >= 2 ? bestBot : null;
}

/**
 * routeAsHandoff — 指揮官 handoff 模式
 * primary：主要處理的 bot
 * secondary：可選的輔助 bot（只在跨領域時才有）
 */
export function routeAsHandoff(text: string): HandoffResult | null {
  if (!text || text.trim().length < 2) return null;

  const intentScores = analyzeIntent(text);

  // [TASK] 標記直接匹配 → 只有 primary
  const taskDomain = parseTaskTag(text);
  if (taskDomain) {
    const match = ACTIVE_CREW_BOTS.find(b => b.domain === taskDomain);
    if (match) return { primary: match };
  }

  // 對所有 ACTIVE bot 評分
  const scored = ACTIVE_CREW_BOTS
    .map(bot => ({ bot, score: scoreBot(bot, text, intentScores) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0 || scored[0].score < 2) return null;

  const primary = scored[0];
  const result: HandoffResult = { primary: primary.bot };

  // 只在跨領域時才派 secondary：
  // - 第二名分數 >= 4（有足夠相關性）
  // - 第二名和第一名不同 domain（真正跨領域）
  // - 第二名分數至少是第一名的 40%（避免湊數）
  if (scored.length >= 2) {
    const second = scored[1];
    const isCrossDomain = second.bot.domain !== primary.bot.domain;
    const isStrongEnough = second.score >= 4 && second.score >= primary.score * 0.4;
    if (isCrossDomain && isStrongEnough) {
      result.secondary = second.bot;
    }
  }

  return result;
}

/**
 * routeMessage — 向後相容的主路由函數
 * 內部邏輯已升級為意圖路由
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

  // ─── Layer 2: 已知 crew/system bot username 過濾（指揮官例外） ───
  const isXiaocaiCommand = senderIsBot && lowerUsername === 'xiaoji_cai_bot';
  const isAdmin = ADMIN_USERNAMES.has(lowerUsername);
  const isCommander = isXiaocaiCommand || isAdmin;
  if (!isCommander && (CREW_BOT_USERNAMES.has(lowerUsername) || SYSTEM_BOT_USERNAMES.has(lowerUsername))) {
    return { respondingBots: [], filtered: true, filterReason: 'known bot username' };
  }

  // ─── Layer 3: 太短的訊息過濾 ───
  if (!text || text.trim().length < 2) {
    return { respondingBots: [], filtered: true, filterReason: 'too short' };
  }

  const lText = text.toLowerCase();

  // ─── Layer 4: 指令過濾（讓現有 bot 處理） ───
  if (text.startsWith('/')) {
    return { respondingBots: [], filtered: true, filterReason: 'command' };
  }

  // ─── Layer 5: 全局限速（指揮官指令不受限速） ───
  const now = Date.now();
  while (globalResponses.length > 0 && now - globalResponses[0] > GLOBAL_WINDOW_MS) {
    globalResponses.shift();
  }
  if (!isCommander && globalResponses.length >= GLOBAL_LIMIT_PER_MIN) {
    return { respondingBots: [], filtered: true, filterReason: 'global rate limit' };
  }

  // ─── 全員集合關鍵字 ───
  const ALL_HANDS_KEYWORDS = ['各位', '大家', '全員', '所有人', '夥伴們', '請大家', '全體', '在嗎', '每個人', '校準', '回報', '星群'];
  const isAllHands = ALL_HANDS_KEYWORDS.some(kw => lText.includes(kw));

  // ─── 指揮官全員集合 → 只觸發 ACTIVE bots ───
  if (isCommander && isAllHands) {
    const allBots = ACTIVE_CREW_BOTS
      .map(b => ({ botId: b.id, score: 20 }));
    for (const r of allBots) recordResponse(r.botId, now);
    return { respondingBots: allBots, filtered: false };
  }

  // ─── [TASK] 結構化任務標記 → 直接按 domain 匹配 ───
  const taskDomain = parseTaskTag(text);
  if (taskDomain) {
    const matched = ACTIVE_CREW_BOTS.find(b => b.domain === taskDomain);
    if (matched && !isCoolingDown(matched.id, now)) {
      recordResponse(matched.id, now);
      return { respondingBots: [{ botId: matched.id, score: 15 }], filtered: false };
    }
    if (matched) {
      return { respondingBots: [], filtered: true, filterReason: 'task-tagged bot cooling down' };
    }
  }

  // ─── 意圖分析 + 評分 ───
  const intentScores = analyzeIntent(text);
  const scores: Array<{ botId: string; score: number }> = [];

  for (const bot of ACTIVE_CREW_BOTS) {
    const score = scoreBot(bot, text, intentScores);
    scores.push({ botId: bot.id, score });
  }

  scores.sort((a, b) => b.score - a.score);

  // ─── 直接點名 → 所有被點名的 bot 都回 ───
  const directMentions = scores.filter(s => s.score >= 10);
  if (directMentions.length > 0) {
    const responding = directMentions.filter(s => !isCoolingDown(s.botId, now));
    if (responding.length > 0) {
      for (const r of responding) recordResponse(r.botId, now);
      return { respondingBots: responding, filtered: false };
    }
    return { respondingBots: [], filtered: true, filterReason: 'mentioned bot cooling down' };
  }

  // ─── 指揮官意圖路由：只派 1-2 個最相關 bot ───
  if (isCommander) {
    const handoff = routeAsHandoff(text);
    if (handoff) {
      const responding: Array<{ botId: string; score: number }> = [];
      const primaryScore = scores.find(s => s.botId === handoff.primary.id);
      if (primaryScore && !isCoolingDown(handoff.primary.id, now)) {
        responding.push(primaryScore);
      }
      if (handoff.secondary) {
        const secScore = scores.find(s => s.botId === handoff.secondary!.id);
        if (secScore && !isCoolingDown(handoff.secondary.id, now)) {
          responding.push(secScore);
        }
      }
      if (responding.length > 0) {
        for (const r of responding) recordResponse(r.botId, now);
        return { respondingBots: responding, filtered: false };
      }
      return { respondingBots: [], filtered: true, filterReason: 'commander handoff bots cooling down' };
    }
    // 指揮官但無明確意圖 → 不觸發（避免噪音）
    return { respondingBots: [], filtered: true, filterReason: 'no relevant expertise' };
  }

  // ─── 一般用戶「全員集合」→ 最多回 ACTIVE bots（需冷卻檢查） ───
  if (isAllHands) {
    const allBots = ACTIVE_CREW_BOTS
      .filter(b => !isCoolingDown(b.id, now))
      .slice(0, 3)
      .map(b => ({ botId: b.id, score: 15 }));
    if (allBots.length > 0) {
      for (const r of allBots) recordResponse(r.botId, now);
      return { respondingBots: allBots, filtered: false };
    }
  }

  // ─── 一般用戶：門檻從 3 降到 2，只回最高分的 1 個 bot ───
  const scoreThreshold = 2;
  const top = scores[0];
  if (!top || top.score < scoreThreshold) {
    return { respondingBots: [], filtered: true, filterReason: 'no relevant expertise' };
  }

  if (!isCoolingDown(top.botId, now)) {
    recordResponse(top.botId, now);
    return { respondingBots: [top], filtered: false };
  }

  return { respondingBots: [], filtered: true, filterReason: 'responding bots cooling down' };
}

// ─── 內部工具函數 ───────────────────────────────────────

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
