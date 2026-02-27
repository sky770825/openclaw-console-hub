#!/usr/bin/env node
/**
 * ContextGuard CLI - 供 bash 腳本呼叫的 Node 入口
 * 命令: optimize | report | config
 */

import { getMonitorResult, loadConfig, getThresholds } from "./monitor.js";
import { getOptimizationSuggestions } from "./optimizer.js";
import { runReport } from "./reporter.js";

const args = process.argv.slice(2);
const cmd = args[0];
const flag = args[1];

function print(msg: string): void {
  process.stdout.write(msg + "\n");
}

function cmdOptimize(): void {
  const result = getMonitorResult();
  const suggestions = getOptimizationSuggestions(result);

  if (result.main) {
    print(`Context 使用率: ${result.main.usagePercent}% (${result.main.key})`);
    print("");
  }
  for (const s of suggestions) {
    const icon = s.level === "critical" ? "🔴" : s.level === "warn" ? "⚠️" : "ℹ️";
    print(`${icon} ${s.message}`);
    if (s.action) print(`   → ${s.action}`);
  }
}

function cmdReport(): void {
  const mode = flag === "--weekly" ? "weekly" : "daily";
  const report = runReport(mode);
  print(report);
}

function cmdConfig(): void {
  const config = loadConfig();
  const thresholds = getThresholds();
  print("當前配置 (閾值):");
  print(`  warn: ${thresholds.warn}%`);
  print(`  critical: ${thresholds.critical}%`);
  print(`  autoCompact: ${thresholds.autoCompact}%`);
  print("");
  print("完整配置檔路徑: " + (process.env.HOME || process.env.USERPROFILE || "") + "/.openclaw/contextguard.json");
  print("");
  print("完整 JSON:");
  print(JSON.stringify(config, null, 2));
}

switch (cmd) {
  case "optimize":
    cmdOptimize();
    break;
  case "report":
    cmdReport();
    break;
  case "config":
    cmdConfig();
    break;
  default:
    print("用法: contextguard-cli <optimize|report|config> [--daily|--weekly]");
    process.exit(1);
}
