/**
 * 提示詞防護 — 子 Agent / 任務描述注入攻擊偵測
 * 在任務建立與執行前掃描 name / description / runCommands，命中 BLOCK 規則則拒絕
 */

import { createLogger } from './logger.js';

const log = createLogger('promptGuard');

export type PromptGuardAction = 'BLOCK' | 'REDACT' | 'FLAG';

export interface PromptGuardRule {
  id: string;
  name: string;
  pattern: RegExp | string;
  action: PromptGuardAction;
}

export interface PromptGuardHit {
  action: PromptGuardAction;
  ruleId: string;
  ruleName: string;
}

// 與前端 AIDeck 提示詞防護頁一致的 6 條規則
const RULES: PromptGuardRule[] = [
  { id: 'PG-001', name: '注入攻擊偵測', pattern: /ignore\s+previous\s+instructions|ignore\s+all\s+above|disregard\s+instructions/i, action: 'BLOCK' },
  { id: 'PG-002', name: '角色扮演越獄', pattern: /pretend\s+you\s+are|DAN\s+mode|jailbreak|越獄|扮演\s*成\s*(?:另一個|不受限)/i, action: 'BLOCK' },
  { id: 'PG-003', name: '機密資料滲漏', pattern: /(?:API[_\s]?key|token|secret|password|credential)\s*[=:]\s*[\w-]+/i, action: 'REDACT' },
  { id: 'PG-004', name: '惡意指令執行', pattern: /rm\s+-rf\s+\/|sudo\s+rm|DROP\s+TABLE|DELETE\s+FROM\s+\w+\s*;|format\s+c:|mkfs\.|:(){\s*:\|:&\s*};/i, action: 'BLOCK' },
  { id: 'PG-005', name: '身份偽冒', pattern: /I\s+am\s+the\s+admin|I\s+am\s+(?:your\s+)?(?:boss|owner)|(?:我是|我即)\s*(?:管理員|老闆|擁有者)/i, action: 'FLAG' },
  { id: 'PG-006', name: 'FADP 惡意任務注入', pattern: /eval\s*\(|new\s+Function\s*\(|subprocess\.(?:call|run)|os\.system\s*\(|exec\s*\(|child_process/i, action: 'BLOCK' },
];

// 今日攔截次數與最近觸發記錄（記憶體，重啟歸零）
const stats = {
  blockedToday: 0,
  blockedTotal: 0,
  lastBlocks: [] as { ruleId: string; ruleName: string; at: string }[],
  maxLastBlocks: 50,
};
let lastDate = new Date().toDateString();

function ensureDateReset(): void {
  const today = new Date().toDateString();
  if (today !== lastDate) {
    lastDate = today;
    stats.blockedToday = 0;
  }
}

function recordBlock(ruleId: string, ruleName: string): void {
  ensureDateReset();
  stats.blockedToday++;
  stats.blockedTotal++;
  stats.lastBlocks.unshift({
    ruleId,
    ruleName,
    at: new Date().toISOString(),
  });
  if (stats.lastBlocks.length > stats.maxLastBlocks) {
    stats.lastBlocks = stats.lastBlocks.slice(0, stats.maxLastBlocks);
  }
}

/**
 * 掃描一段文字是否命中任一防護規則
 * @param text 要掃描的內容（任務 name + description + runCommands 等）
 * @returns 若命中則回傳 { action, ruleId, ruleName }，否則 null
 */
export function scanPrompt(text: string): PromptGuardHit | null {
  if (!text || typeof text !== 'string') return null;
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  for (const rule of RULES) {
    const pattern = rule.pattern;
    const matched =
      typeof pattern === 'string'
        ? normalized.toLowerCase().includes(pattern.toLowerCase())
        : pattern.test(normalized);
    if (matched) {
      log.warn({ ruleId: rule.id, ruleName: rule.name, action: rule.action }, 'Prompt guard hit');
      if (rule.action === 'BLOCK') {
        recordBlock(rule.id, rule.name);
      }
      return { action: rule.action, ruleId: rule.id, ruleName: rule.name };
    }
  }
  return null;
}

/**
 * 掃描任務相關文字（name + description + runCommands），任一 BLOCK 即回傳 hit
 */
export function scanTaskPayload(payload: {
  name?: string;
  description?: string;
  runCommands?: string[];
  title?: string;
}): PromptGuardHit | null {
  const parts: string[] = [
    payload.name ?? '',
    payload.title ?? '',
    payload.description ?? '',
    Array.isArray(payload.runCommands) ? payload.runCommands.join('\n') : '',
  ];
  const text = parts.join('\n').trim();
  return scanPrompt(text);
}

/**
 * 取得防護統計（供 API 與前端顯示）
 */
export function getPromptGuardStats(): {
  blockedToday: number;
  blockedTotal: number;
  lastBlocks: { ruleId: string; ruleName: string; at: string }[];
  rulesCount: number;
} {
  ensureDateReset();
  return {
    blockedToday: stats.blockedToday,
    blockedTotal: stats.blockedTotal,
    lastBlocks: [...stats.lastBlocks],
    rulesCount: RULES.length,
  };
}

/**
 * 取得規則列表（與前端展示一致）
 */
export function getPromptGuardRules(): { id: string; name: string; action: PromptGuardAction }[] {
  return RULES.map((r) => ({ id: r.id, name: r.name, action: r.action }));
}
