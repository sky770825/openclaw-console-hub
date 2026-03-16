/**
 * ContextGuard - 優化建議引擎
 * 根據使用率與配置產出優化建議
 */

import {
  getMonitorResult,
  getThresholds,
  loadConfig,
  type MonitorResult,
} from "./monitor.js";

export interface OptimizationSuggestion {
  level: "info" | "warn" | "critical";
  message: string;
  action?: string;
}

export function getOptimizationSuggestions(
  result?: MonitorResult,
  thresholds?: { warn: number; critical: number; autoCompact: number }
): OptimizationSuggestion[] {
  const monitor = result ?? getMonitorResult();
  const t = thresholds ?? getThresholds();
  const suggestions: OptimizationSuggestion[] = [];

  if (!monitor.main) {
    suggestions.push({
      level: "info",
      message: "目前無主 session 資料，請確認 openclaw 已啟動並有活躍 session。",
    });
    return suggestions;
  }

  const usage = monitor.main.usagePercent;

  if (usage >= t.autoCompact) {
    suggestions.push({
      level: "critical",
      message: `Context 使用率 ${usage}% 已達自動 compact 閾值 (${t.autoCompact}%)。`,
      action: "請立即執行 checkpoint 或輸入 /new 開新會話。",
    });
  }
  if (usage >= t.critical && usage < t.autoCompact) {
    suggestions.push({
      level: "critical",
      message: `Context 使用率 ${usage}% 超過嚴重閾值 (${t.critical}%)。`,
      action: "建議執行: ./scripts/checkpoint.sh 或 /new",
    });
  }
  if (usage >= t.warn && usage < t.critical) {
    suggestions.push({
      level: "warn",
      message: `Context 使用率 ${usage}% 超過建議閾值 (${t.warn}%)。`,
      action: "可執行 checkpoint 或適時使用 /new 以維持效能。",
    });
  }
  if (usage > 0 && usage < t.warn) {
    suggestions.push({
      level: "info",
      message: `Context 使用率 ${usage}%，目前正常。`,
    });
  }

  // 優化建議：長訊息摘要等（依 config）
  const config = loadConfig();
  const opt = (config.optimization as Record<string, unknown>) || {};
  const maxLen = Number(opt.maxMessageLength) || 500;
  if (opt.autoSummarize && monitor.main.totalTokens > maxLen * 10) {
    suggestions.push({
      level: "info",
      message: `Token 用量較高 (${monitor.main.totalTokens})，可考慮摘要長訊息或壓縮歷史。`,
      action: "在配置中可設定 maxMessageLength 與 compressHistory。",
    });
  }

  return suggestions;
}
