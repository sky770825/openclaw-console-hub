/**
 * ContextGuard - 報告生成器
 * 產生日報 / 週報
 */

import { getMonitorResult, getThresholds, loadConfig } from "./monitor.js";
import type { MonitorResult } from "./monitor.js";

export interface ReportSection {
  title: string;
  lines: string[];
}

function formatTime(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export function buildDailyReport(): string {
  const result = getMonitorResult();
  const t = getThresholds();
  const config = loadConfig();
  const reporting = (config.reporting as Record<string, unknown>) || {};
  const lines: string[] = [];

  lines.push("# ContextGuard 日報告");
  lines.push(`生成時間: ${formatTime()}`);
  lines.push("");

  lines.push("## 主 Session 狀態");
  if (result.main) {
    lines.push(`- Session: ${result.main.key}`);
    lines.push(`- 使用率: ${result.main.usagePercent}%`);
    lines.push(`- Token: ${result.main.totalTokens} / ${result.main.contextTokens}`);
    lines.push(`- 模型: ${result.main.model ?? "N/A"}`);
    if (result.main.usagePercent >= t.critical) {
      lines.push("- 狀態: ⚠️ 超過嚴重閾值，建議執行 checkpoint 或 /new");
    } else if (result.main.usagePercent >= t.warn) {
      lines.push("- 狀態: ⚠️ 超過建議閾值");
    } else {
      lines.push("- 狀態: ✅ 正常");
    }
  } else {
    lines.push("- 無主 session 資料");
  }
  lines.push("");

  lines.push("## 閾值設定");
  lines.push(`- 警告: ${t.warn}%`);
  lines.push(`- 嚴重: ${t.critical}%`);
  lines.push(`- 自動 compact: ${t.autoCompact}%`);
  lines.push("");

  if (result.sessions.length > 1) {
    lines.push("## 其他 Sessions (前 5 筆)");
    result.sessions
      .filter((s) => s.key !== result.main?.key)
      .slice(0, 5)
      .forEach((s) => {
        lines.push(`- ${s.key}: ${s.usagePercent}% (${s.totalTokens}/${s.contextTokens} tokens)`);
      });
    lines.push("");
  }

  if (reporting.channels && Array.isArray(reporting.channels)) {
    lines.push("## 報告通道");
    lines.push(`- ${(reporting.channels as string[]).join(", ")}`);
  }

  return lines.join("\n");
}

export function buildWeeklyReport(): string {
  const daily = buildDailyReport();
  const lines: string[] = [];
  lines.push("# ContextGuard 週報告");
  lines.push(`生成時間: ${formatTime()}`);
  lines.push("");
  lines.push("本週摘要：以目前即時狀態為準。如需歷史趨勢，請整合 automation 日誌。");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(daily);
  return lines.join("\n");
}

export function runReport(mode: "daily" | "weekly"): string {
  return mode === "weekly" ? buildWeeklyReport() : buildDailyReport();
}
