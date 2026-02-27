/**
 * ContextGuard - Context 監控核心
 * 取得 openclaw sessions 資料並計算使用率
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const DEFAULT_SESSION = "agent:main:main";

export interface SessionInfo {
  key: string;
  totalTokens: number;
  contextTokens: number;
  model?: string;
  usagePercent: number;
}

export interface MonitorResult {
  main: SessionInfo | null;
  sessions: SessionInfo[];
  usagePercent: number;
  rawJson: Record<string, unknown>;
}

function getConfigPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return `${home}/.openclaw/contextguard.json`;
}

export function loadConfig(): Record<string, unknown> {
  const path = getConfigPath();
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getThresholds(): { warn: number; critical: number; autoCompact: number } {
  const config = loadConfig();
  const t = (config.thresholds as Record<string, number>) || {};
  return {
    warn: t.warn ?? 70,
    critical: t.critical ?? 85,
    autoCompact: t.autoCompact ?? 90,
  };
}

/** 執行 openclaw sessions --json 取得 session 資料 */
export function getSessionData(): Record<string, unknown> {
  const result = spawnSync("openclaw", ["sessions", "--json"], {
    encoding: "utf8",
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    return { sessions: [] };
  }
  try {
    return JSON.parse(result.stdout || "{}") as Record<string, unknown>;
  } catch {
    return { sessions: [] };
  }
}

/** 計算單一 session 使用率 (totalTokens / contextTokens * 100) */
function calcUsagePercent(total: number, context: number): number {
  if (context <= 0) return 0;
  return Math.round((total / context) * 10000) / 100;
}

/** 從 session 列表解析出 MonitorResult */
export function parseMonitorResult(raw: Record<string, unknown>): MonitorResult {
  const sessions = (raw.sessions as unknown[]) || [];
  const list: SessionInfo[] = sessions
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === "object"))
    .map((s) => {
      const total = +(s.totalTokens as number) || 0;
      const context = +(s.contextTokens as number) || 0;
      return {
        key: String(s.key ?? ""),
        totalTokens: total,
        contextTokens: context,
        model: s.model as string | undefined,
        usagePercent: calcUsagePercent(total, context),
      };
    })
    .filter((s) => s.key);

  const main = list.find((s) => s.key === DEFAULT_SESSION) ?? list[0] ?? null;
  const usagePercent = main ? main.usagePercent : 0;

  return {
    main,
    sessions: list,
    usagePercent,
    rawJson: raw,
  };
}

/** 一次取得目前監控狀態 */
export function getMonitorResult(): MonitorResult {
  const raw = getSessionData();
  return parseMonitorResult(raw);
}
