/**
 * NEUXA 星群醫生 — 自動偵測卡死 / 故障 / 異常，並修復
 *
 * 功能：
 * 1. 卡死偵測：bot 超過 N 秒沒回覆 → 判斷原因
 * 2. 故障分類：timeout / empty reply / API error / circuit break
 * 3. 自動修復：重試(降級模型) / 跳過 / 通知主人
 * 4. 健康報告：定期匯總各 bot 的健康狀態
 */

import { createLogger } from '../../logger.js';
import { sendTelegramMessageToChat } from '../../utils/telegram.js';
import { ACTIVE_CREW_BOTS, STANDBY_CREW_BOTS, CREW_BOTS, CREW_GROUP_CHAT_ID } from './crew-config.js';
import type { CrewBotConfig } from './crew-config.js';

const log = createLogger('crew-doctor');

// ── 健康紀錄 ──

interface BotHealthRecord {
  botId: string;
  /** 最近一次成功回覆的時間戳 */
  lastSuccessAt: number;
  /** 最近一次失敗的時間戳 */
  lastFailAt: number;
  /** 連續失敗次數 */
  consecutiveFails: number;
  /** 累計成功 */
  totalSuccess: number;
  /** 累計失敗 */
  totalFail: number;
  /** 最近一次失敗原因 */
  lastFailReason: FailReason;
  /** 平均回覆時間 (ms) */
  avgResponseMs: number;
  /** 回覆時間的樣本（最近 10 次） */
  responseTimes: number[];
}

export type FailReason =
  | 'none'
  | 'timeout'          // AI 呼叫超時
  | 'empty_reply'      // AI 回覆為空
  | 'api_error'        // Gemini/Claude API 錯誤
  | 'circuit_break'    // Claude CLI 熔斷
  | 'send_fail'        // Telegram 發送失敗
  | 'unknown';

export interface DiagnosisResult {
  botId: string;
  botName: string;
  issue: FailReason;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: RepairAction;
  detail: string;
}

export type RepairAction =
  | 'retry_same'       // 原模型重試
  | 'retry_downgrade'  // 降級模型重試
  | 'skip'             // 跳過這個 bot
  | 'cooldown'         // 冷卻一段時間再說
  | 'notify_owner'     // 通知主人
  | 'restart_polling';  // 重啟 polling

// ── Standby Bot 簡要健康紀錄 ──

interface StandbyHealthRecord {
  botId: string;
  /** 最近一次被啟用的時間戳 */
  lastActivatedAt: number;
  /** 累計啟用次數 */
  totalActivations: number;
  /** 最近一次錯誤訊息 */
  lastError: string | null;
}

// ── 健康資料庫（記憶體內） ──

const healthDB = new Map<string, BotHealthRecord>();
const standbyHealthDB = new Map<string, StandbyHealthRecord>();

function getHealth(botId: string): BotHealthRecord {
  if (!healthDB.has(botId)) {
    healthDB.set(botId, {
      botId,
      lastSuccessAt: 0,
      lastFailAt: 0,
      consecutiveFails: 0,
      totalSuccess: 0,
      totalFail: 0,
      lastFailReason: 'none',
      avgResponseMs: 0,
      responseTimes: [],
    });
  }
  return healthDB.get(botId)!;
}

function getStandbyHealth(botId: string): StandbyHealthRecord {
  if (!standbyHealthDB.has(botId)) {
    standbyHealthDB.set(botId, {
      botId,
      lastActivatedAt: 0,
      totalActivations: 0,
      lastError: null,
    });
  }
  return standbyHealthDB.get(botId)!;
}

/** 記錄 standby bot 被啟用 */
export function recordStandbyActivation(botId: string): void {
  const s = getStandbyHealth(botId);
  s.lastActivatedAt = Date.now();
  s.totalActivations++;
  s.lastError = null;
  log.info(`[CrewDoctor] Standby bot ${botId} 啟用 (total: ${s.totalActivations})`);
}

/** 記錄 standby bot 錯誤 */
export function recordStandbyError(botId: string, error: string): void {
  const s = getStandbyHealth(botId);
  s.lastError = error;
  log.warn(`[CrewDoctor] Standby bot ${botId} 錯誤: ${error}`);
}

/** 取得所有 standby bot 的簡要狀態 */
export function getStandbyStatus(): Array<StandbyHealthRecord & { botName: string; emoji: string }> {
  return STANDBY_CREW_BOTS.map(bot => {
    const s = getStandbyHealth(bot.id);
    return { ...s, botName: bot.name, emoji: bot.emoji };
  });
}

// ── 記錄事件 ──

/** 記錄成功回覆 */
export function recordSuccess(botId: string, responseMs: number): void {
  const h = getHealth(botId);
  h.lastSuccessAt = Date.now();
  h.consecutiveFails = 0;
  h.totalSuccess++;
  h.lastFailReason = 'none';

  // 更新平均回覆時間（滑動窗口 10 次）
  h.responseTimes.push(responseMs);
  if (h.responseTimes.length > 10) h.responseTimes.shift();
  h.avgResponseMs = Math.round(h.responseTimes.reduce((a, b) => a + b, 0) / h.responseTimes.length);
}

/** 記錄失敗 */
export function recordFailure(botId: string, reason: FailReason): void {
  const h = getHealth(botId);
  h.lastFailAt = Date.now();
  h.consecutiveFails++;
  h.totalFail++;
  h.lastFailReason = reason;

  log.warn(`[CrewDoctor] ${botId} 故障紀錄: reason=${reason} consecutiveFails=${h.consecutiveFails}`);
}

// ── 診斷 ──

/** 診斷單個 bot 的健康狀態 */
export function diagnose(botId: string): DiagnosisResult | null {
  const h = getHealth(botId);
  const bot = CREW_BOTS.find(b => b.id === botId);
  if (!bot) return null;

  // 沒有故障
  if (h.consecutiveFails === 0 && h.lastFailReason === 'none') return null;

  const result: DiagnosisResult = {
    botId,
    botName: bot.name,
    issue: h.lastFailReason,
    severity: 'low',
    suggestion: 'retry_same',
    detail: '',
  };

  // 根據連續失敗次數 + 原因判斷嚴重程度
  if (h.consecutiveFails >= 5) {
    result.severity = 'critical';
    result.suggestion = 'notify_owner';
    result.detail = `${bot.emoji} ${bot.name} 連續失敗 ${h.consecutiveFails} 次（${h.lastFailReason}），需要人工介入`;
  } else if (h.consecutiveFails >= 3) {
    result.severity = 'high';
    result.suggestion = 'cooldown';
    result.detail = `${bot.emoji} ${bot.name} 連續失敗 ${h.consecutiveFails} 次（${h.lastFailReason}），冷卻 5 分鐘`;
  } else if (h.consecutiveFails >= 1) {
    // 根據原因給不同建議
    switch (h.lastFailReason) {
      case 'timeout':
        result.severity = 'medium';
        result.suggestion = 'retry_downgrade';
        result.detail = `${bot.emoji} ${bot.name} 超時 → 降級模型重試`;
        break;
      case 'empty_reply':
        result.severity = 'medium';
        result.suggestion = 'retry_downgrade';
        result.detail = `${bot.emoji} ${bot.name} 空回覆 → 降級模型重試`;
        break;
      case 'circuit_break':
        result.severity = 'medium';
        result.suggestion = 'retry_downgrade';
        result.detail = `${bot.emoji} ${bot.name} Claude 熔斷 → 直接用 Gemini`;
        break;
      case 'api_error':
        result.severity = 'medium';
        result.suggestion = 'retry_downgrade';
        result.detail = `${bot.emoji} ${bot.name} API 錯誤 → 換模型重試`;
        break;
      case 'send_fail':
        result.severity = 'low';
        result.suggestion = 'retry_same';
        result.detail = `${bot.emoji} ${bot.name} Telegram 發送失敗 → 重試`;
        break;
      default:
        result.severity = 'low';
        result.suggestion = 'retry_same';
        result.detail = `${bot.emoji} ${bot.name} 未知錯誤 → 重試`;
    }
  }

  return result;
}

/** 診斷所有 active bot（standby bot 不做定期診斷） */
export function diagnoseAll(): DiagnosisResult[] {
  const results: DiagnosisResult[] = [];
  for (const bot of ACTIVE_CREW_BOTS) {
    const d = diagnose(bot.id);
    if (d) results.push(d);
  }
  return results;
}

// ── 修復動作 ──

/** bot 的降級模型映射 */
const DOWNGRADE_MAP: Record<string, string> = {
  'claude-opus': 'gemini-pro',
  'claude-sonnet': 'gemini-pro',
  'claude-haiku': 'gemini-flash',
  'gemini-pro': 'gemini-flash',
  'gemini-flash': 'gemini-flash',  // Flash 已經最低，無法再降
};

/** 取得降級後的模型名稱 */
export function getDowngradeModel(currentModel: string): string {
  return DOWNGRADE_MAP[currentModel] || 'gemini-flash';
}

/** 冷卻中的 bot（botId → 冷卻到什麼時候） */
const cooldownUntil = new Map<string, number>();
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 分鐘

/** 讓 bot 進入冷卻 */
export function setCooldown(botId: string, durationMs: number = COOLDOWN_DURATION_MS): void {
  cooldownUntil.set(botId, Date.now() + durationMs);
  log.info(`[CrewDoctor] ${botId} 進入冷卻 ${Math.round(durationMs / 1000)}s`);
}

/** 檢查 bot 是否在冷卻中 */
export function isCoolingDown(botId: string): boolean {
  const until = cooldownUntil.get(botId);
  if (!until) return false;
  if (Date.now() >= until) {
    cooldownUntil.delete(botId);
    return false;
  }
  return true;
}

// ── 卡死偵測 ──

/** 進行中的思考（botId → 開始時間） */
const thinkingTracker = new Map<string, number>();

/** 標記 bot 開始思考 */
export function markThinkStart(botId: string): void {
  thinkingTracker.set(botId, Date.now());
}

/** 標記 bot 思考結束 */
export function markThinkEnd(botId: string): void {
  thinkingTracker.delete(botId);
}

/** 檢查有沒有 bot 卡死（超過指定秒數還沒回） */
export function detectStuck(thresholdMs: number = 180_000): Array<{ botId: string; stuckMs: number }> {
  const now = Date.now();
  const stuck: Array<{ botId: string; stuckMs: number }> = [];
  for (const [botId, startAt] of thinkingTracker) {
    const elapsed = now - startAt;
    if (elapsed > thresholdMs) {
      stuck.push({ botId, stuckMs: elapsed });
    }
  }
  return stuck;
}

// ── 健康報告 ──

/** 產生全星群健康報告（Telegram HTML 格式） */
export function generateHealthReport(): string {
  const lines: string[] = ['🏥 <b>星群健康報告</b>', ''];

  // ── Active Bots 完整 metrics ──
  lines.push('<b>🟢 Active Bots</b>');
  for (const bot of ACTIVE_CREW_BOTS) {
    const h = getHealth(bot.id);
    const total = h.totalSuccess + h.totalFail;
    const rate = total > 0 ? Math.round((h.totalSuccess / total) * 100) : 100;
    const cooling = isCoolingDown(bot.id);

    const statusEmoji = cooling ? '❄️' :
      h.consecutiveFails >= 3 ? '🔴' :
      h.consecutiveFails >= 1 ? '🟡' : '🟢';

    lines.push(
      `${statusEmoji} ${bot.emoji} <b>${bot.name}</b>` +
      ` | 成功率 ${rate}%` +
      ` (${h.totalSuccess}/${total})` +
      ` | 均速 ${h.avgResponseMs ? Math.round(h.avgResponseMs / 1000) + 's' : '-'}` +
      (h.consecutiveFails > 0 ? ` | ⚠️ 連失${h.consecutiveFails}` : '') +
      (cooling ? ' | ❄️冷卻中' : ''),
    );
  }

  // ── Standby Bots 簡要狀態 ──
  if (STANDBY_CREW_BOTS.length > 0) {
    lines.push('');
    lines.push('<b>💤 Standby Bots</b>');
    for (const bot of STANDBY_CREW_BOTS) {
      const s = getStandbyHealth(bot.id);
      const lastActive = s.lastActivatedAt > 0
        ? `上次啟用 ${Math.round((Date.now() - s.lastActivatedAt) / 60000)}m ago`
        : '從未啟用';
      const errorTag = s.lastError ? ` | ⚠️ ${s.lastError}` : '';
      lines.push(
        `💤 ${bot.emoji} <b>${bot.name}</b>` +
        ` | ${lastActive}` +
        ` | 啟用 ${s.totalActivations} 次` +
        errorTag,
      );
    }
  }

  const stuck = detectStuck();
  if (stuck.length > 0) {
    lines.push('');
    lines.push('<b>⚠️ 卡死偵測</b>');
    for (const s of stuck) {
      const bot = CREW_BOTS.find(b => b.id === s.botId);
      lines.push(`  • ${bot?.emoji || '?'} ${bot?.name || s.botId} 已卡 ${Math.round(s.stuckMs / 1000)}s`);
    }
  }

  return lines.join('\n');
}

/** 發送健康報告到群組 */
export async function sendHealthReport(): Promise<void> {
  if (!CREW_GROUP_CHAT_ID) return;

  const report = generateHealthReport();

  // 用 active bot 的 token 發
  const senderBot = ACTIVE_CREW_BOTS[0];
  if (!senderBot) return;

  try {
    await sendTelegramMessageToChat(
      Number(CREW_GROUP_CHAT_ID),
      report,
      { token: senderBot.token, silent: true, parseMode: 'HTML' },
    );
    log.info('[CrewDoctor] 健康報告已發送');
  } catch (err) {
    log.error({ err }, '[CrewDoctor] 健康報告發送失敗');
  }
}

// ── 自動修復入口 ──

/**
 * 自動修復：根據診斷結果執行修復動作
 * 回傳 true = 已修復/已處理，false = 需人工介入
 */
export async function autoRepair(diagnosis: DiagnosisResult): Promise<boolean> {
  log.info(`[CrewDoctor] 自動修復: ${diagnosis.botName} severity=${diagnosis.severity} suggestion=${diagnosis.suggestion}`);

  switch (diagnosis.suggestion) {
    case 'retry_same':
    case 'retry_downgrade':
      // 重試由呼叫端（crew-poller）處理，這裡只記錄
      return true;

    case 'cooldown':
      setCooldown(diagnosis.botId);
      return true;

    case 'skip':
      // 跳過，不做任何事
      return true;

    case 'notify_owner': {
      // 通知主人
      if (!CREW_GROUP_CHAT_ID) return false;
      const alertBot = ACTIVE_CREW_BOTS[0];
      if (!alertBot) return false;

      const msg = `🚨 <b>星群醫生告警</b>\n\n${diagnosis.detail}\n\n建議：手動檢查或重啟 server`;
      try {
        await sendTelegramMessageToChat(
          Number(CREW_GROUP_CHAT_ID),
          msg,
          { token: alertBot.token, silent: false, parseMode: 'HTML' },
        );
      } catch {
        // 通知失敗也不影響
      }
      return false; // 需人工介入
    }

    case 'restart_polling':
      // 重啟由外部處理
      return false;

    default:
      return false;
  }
}

// ── 綜合健檢（定期呼叫） ──

/**
 * 完整健康檢查 + 自動修復（僅 Active Bots）
 * Standby bot 不做定期健檢，用 getStandbyStatus() 查詢狀態
 * 回傳：有問題的 bot 列表
 */
export async function fullCheckup(): Promise<DiagnosisResult[]> {
  const issues = diagnoseAll();

  if (issues.length === 0) {
    log.info('[CrewDoctor] 全員健康 ✅');
    return [];
  }

  log.info(`[CrewDoctor] 發現 ${issues.length} 個問題，開始修復`);

  for (const issue of issues) {
    await autoRepair(issue);
  }

  // 如果有 high/critical，發送健康報告
  const serious = issues.filter(i => i.severity === 'high' || i.severity === 'critical');
  if (serious.length > 0) {
    await sendHealthReport();
  }

  return issues;
}

/** 重置某個 bot 的健康紀錄（手動恢復時用） */
export function resetHealth(botId: string): void {
  healthDB.delete(botId);
  cooldownUntil.delete(botId);
  thinkingTracker.delete(botId);
  log.info(`[CrewDoctor] ${botId} 健康紀錄已重置`);
}

/** 取得所有 active bot 的健康狀態 */
export function getAllHealthStatus(): Array<BotHealthRecord & { cooling: boolean }> {
  return ACTIVE_CREW_BOTS.map(bot => {
    const h = getHealth(bot.id);
    return { ...h, cooling: isCoolingDown(bot.id) };
  });
}
