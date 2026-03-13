#!/usr/bin/env node
/**
 * token-audit.mjs — OpenClaw Token 用量審計與預估工具
 *
 * 讀取 ~/.openclaw/logs/server.log，解析 LLM 呼叫紀錄，
 * 按模型 / 用途分類統計 token 使用量並估算成本。
 *
 * Usage:
 *   node token-audit.mjs [--last 24h|7d|30d] [--json|--table] [--log <path>]
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ─── CLI 參數解析 ───────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}
const hasFlag = (name) => args.includes(name);

const LOG_PATH = getArg('--log', join(homedir(), '.openclaw/logs/server.log'));
const TIME_RANGE = getArg('--last', '24h');
const FORMAT = hasFlag('--json') ? 'json' : 'table';

// ─── 時間範圍換算 ──────────────────────────────────────────────
function parseRange(range) {
  const m = range.match(/^(\d+)(h|d)$/);
  if (!m) { console.error(`Invalid --last value: ${range}`); process.exit(1); }
  const val = Number(m[1]);
  const unit = m[2];
  return unit === 'h' ? val * 3600_000 : val * 86400_000;
}

const rangeMs = parseRange(TIME_RANGE);
const cutoff = Date.now() - rangeMs;

// ─── 模型定價 (USD per 1M tokens, 2025-Q4 公開定價) ────────────
const PRICING = {
  'gemini-2.5-flash':       { input: 0.15,  output: 0.60 },
  'gemini-2.0-flash':       { input: 0.10,  output: 0.40 },
  'gemini-1.5-flash':       { input: 0.075, output: 0.30 },
  'gemini-1.5-pro':         { input: 3.50,  output: 10.50 },
  'gemini-2.5-pro':         { input: 1.25,  output: 10.00 },
  'claude-opus-cli':        { input: 15.00, output: 75.00 },
  'claude-3.5-sonnet':      { input: 3.00,  output: 15.00 },
  'claude-3-haiku':         { input: 0.25,  output: 1.25 },
  'claude-sonnet-4':        { input: 3.00,  output: 15.00 },
  'claude-opus-4':          { input: 15.00, output: 75.00 },
  'gpt-4o':                 { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':            { input: 0.15,  output: 0.60 },
  'deepseek-r1':            { input: 0.55,  output: 2.19 },
  'deepseek-v3':            { input: 0.27,  output: 1.10 },
  'mistral-7b':             { input: 0.00,  output: 0.00 },  // 本地模型
  'deepseek-r1-7b':         { input: 0.00,  output: 0.00 },  // 本地模型
};

// 每字元大約等於多少 token（中英混合保守估計）
const CHARS_PER_TOKEN = 2.5;

// ─── 用途分類規則 ──────────────────────────────────────────────
function classifyPurpose(msg, prevLines) {
  if (/\[Heartbeat\]/.test(msg))                   return 'heartbeat';
  if (/\[QualityGate-AI\]/.test(msg))              return 'sub-agent';
  if (/\[ScriptGen\]/.test(msg))                   return 'sub-agent';
  if (/\[IndexFile\]/.test(msg))                   return 'sub-agent';
  if (/\[AutoExecutor\]/.test(msg))                return 'cron';
  if (/\[AutoDispatch\]/.test(msg))                return 'cron';
  if (/\[CrewPatrol\]/.test(msg))                  return 'cron';
  if (/\[StandbyScheduler\]/.test(msg))            return 'cron';
  if (/\[XiaocaiBot\] recv/.test(msg))             return 'conversation';
  if (/\[XiaocaiAI\].*model=/.test(msg))           return 'conversation';
  if (/\[NEUXA-Action\]/.test(msg))                return 'sub-agent';
  return 'other';
}

// ─── 日誌解析 ──────────────────────────────────────────────────
if (!existsSync(LOG_PATH)) {
  console.error(`Log file not found: ${LOG_PATH}`);
  process.exit(1);
}

const raw = readFileSync(LOG_PATH, 'utf-8');
const lines = raw.split('\n').filter(Boolean);

// 統計容器
const stats = {
  // model -> { calls, inputChars, outputChars, inputTokensEst, outputTokensEst }
};
const purposeStats = {
  // purpose -> { calls, inputTokensEst, outputTokensEst }
};
let totalCalls = 0;
let skippedOutOfRange = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let entry;
  try { entry = JSON.parse(line); } catch { continue; }

  // 時間過濾
  if (entry.time < cutoff) { skippedOutOfRange++; continue; }

  const msg = entry.msg || '';

  // ── 1. XiaocaiAI 呼叫（含 model 和 replyLen）──
  const aiMatch = msg.match(/\[XiaocaiAI\] model=(\S+)\s+finishReason=\S+\s+replyLen=(\d+)/);
  if (aiMatch) {
    const model = aiMatch[1];
    const replyLen = parseInt(aiMatch[2], 10);

    // 用前幾行找 system prompt 大小（靈魂核心）
    let systemChars = 0;
    for (let j = Math.max(0, i - 5); j < i; j++) {
      const prev = lines[j];
      const sysMatch = prev.match(/靈魂核心已載入 ~(\d+) 字/);
      if (sysMatch) { systemChars = parseInt(sysMatch[1], 10); break; }
    }

    // 估算 input：system prompt + 使用者訊息（假設平均 200 字）
    const inputChars = systemChars + 200;
    const outputChars = replyLen;
    const inputTokens = Math.ceil(inputChars / CHARS_PER_TOKEN);
    const outputTokens = Math.ceil(outputChars / CHARS_PER_TOKEN);

    if (!stats[model]) stats[model] = { calls: 0, inputChars: 0, outputChars: 0, inputTokensEst: 0, outputTokensEst: 0 };
    stats[model].calls++;
    stats[model].inputChars += inputChars;
    stats[model].outputChars += outputChars;
    stats[model].inputTokensEst += inputTokens;
    stats[model].outputTokensEst += outputTokens;

    // 用途分類 — 回頭找觸發來源
    let purpose = 'conversation';
    for (let j = Math.max(0, i - 8); j < i; j++) {
      try {
        const prev = JSON.parse(lines[j]);
        if (/\[Heartbeat\].*心跳觸發/.test(prev.msg)) { purpose = 'heartbeat'; break; }
        if (/\[Heartbeat\].*step=/.test(prev.msg)) { purpose = 'heartbeat'; break; }
      } catch {}
    }

    if (!purposeStats[purpose]) purposeStats[purpose] = { calls: 0, inputTokensEst: 0, outputTokensEst: 0 };
    purposeStats[purpose].calls++;
    purposeStats[purpose].inputTokensEst += inputTokens;
    purposeStats[purpose].outputTokensEst += outputTokens;
    totalCalls++;
    continue;
  }

  // ── 2. QualityGate-AI 呼叫 ──
  const qgMatch = msg.match(/\[QualityGate-AI\] (\S+) 審查/);
  if (qgMatch) {
    const model = qgMatch[1];
    // QualityGate 通常 input ~2000 字（任務描述+結果），output ~200 字
    const inputTokens = Math.ceil(2000 / CHARS_PER_TOKEN);
    const outputTokens = Math.ceil(200 / CHARS_PER_TOKEN);

    if (!stats[model]) stats[model] = { calls: 0, inputChars: 0, outputChars: 0, inputTokensEst: 0, outputTokensEst: 0 };
    stats[model].calls++;
    stats[model].inputChars += 2000;
    stats[model].outputChars += 200;
    stats[model].inputTokensEst += inputTokens;
    stats[model].outputTokensEst += outputTokens;

    if (!purposeStats['sub-agent']) purposeStats['sub-agent'] = { calls: 0, inputTokensEst: 0, outputTokensEst: 0 };
    purposeStats['sub-agent'].calls++;
    purposeStats['sub-agent'].inputTokensEst += inputTokens;
    purposeStats['sub-agent'].outputTokensEst += outputTokens;
    totalCalls++;
    continue;
  }

  // ── 3. ScriptGen 呼叫（隱含一次 LLM call） ──
  const sgMatch = msg.match(/\[ScriptGen\] 任務「(.+?)」/);
  if (sgMatch) {
    const model = 'gemini-2.5-flash'; // 預設 ScriptGen 使用的模型
    const inputTokens = Math.ceil(3000 / CHARS_PER_TOKEN);
    const outputTokens = Math.ceil(1500 / CHARS_PER_TOKEN);

    if (!stats[model]) stats[model] = { calls: 0, inputChars: 0, outputChars: 0, inputTokensEst: 0, outputTokensEst: 0 };
    stats[model].calls++;
    stats[model].inputChars += 3000;
    stats[model].outputChars += 1500;
    stats[model].inputTokensEst += inputTokens;
    stats[model].outputTokensEst += outputTokens;

    if (!purposeStats['sub-agent']) purposeStats['sub-agent'] = { calls: 0, inputTokensEst: 0, outputTokensEst: 0 };
    purposeStats['sub-agent'].calls++;
    purposeStats['sub-agent'].inputTokensEst += inputTokens;
    purposeStats['sub-agent'].outputTokensEst += outputTokens;
    totalCalls++;
    continue;
  }

  // ── 4. IndexFile（embedding / summarization） ──
  const idxMatch = msg.match(/\[IndexFile\] summary chunk for/);
  if (idxMatch) {
    const model = 'gemini-2.5-flash';
    const inputTokens = Math.ceil(1500 / CHARS_PER_TOKEN);
    const outputTokens = Math.ceil(300 / CHARS_PER_TOKEN);

    if (!stats[model]) stats[model] = { calls: 0, inputChars: 0, outputChars: 0, inputTokensEst: 0, outputTokensEst: 0 };
    stats[model].calls++;
    stats[model].inputChars += 1500;
    stats[model].outputChars += 300;
    stats[model].inputTokensEst += inputTokens;
    stats[model].outputTokensEst += outputTokens;

    if (!purposeStats['sub-agent']) purposeStats['sub-agent'] = { calls: 0, inputTokensEst: 0, outputTokensEst: 0 };
    purposeStats['sub-agent'].calls++;
    purposeStats['sub-agent'].inputTokensEst += inputTokens;
    purposeStats['sub-agent'].outputTokensEst += outputTokens;
    totalCalls++;
    continue;
  }
}

// ─── 成本計算 ──────────────────────────────────────────────────
function estimateCost(model, inputTokens, outputTokens) {
  const p = PRICING[model] || PRICING['gemini-2.5-flash']; // fallback
  const inputCost = (inputTokens / 1_000_000) * p.input;
  const outputCost = (outputTokens / 1_000_000) * p.output;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}

// ─── 輸出 ─────────────────────────────────────────────────────
const report = {
  generated: new Date().toISOString(),
  timeRange: TIME_RANGE,
  cutoffTime: new Date(cutoff).toISOString(),
  logFile: LOG_PATH,
  totalLLMCalls: totalCalls,
  linesScanned: lines.length,
  linesSkippedOutOfRange: skippedOutOfRange,
  byModel: {},
  byPurpose: {},
  totalEstimatedCost: 0,
};

let grandTotalCost = 0;

for (const [model, s] of Object.entries(stats)) {
  const cost = estimateCost(model, s.inputTokensEst, s.outputTokensEst);
  report.byModel[model] = {
    calls: s.calls,
    inputTokensEst: s.inputTokensEst,
    outputTokensEst: s.outputTokensEst,
    totalTokensEst: s.inputTokensEst + s.outputTokensEst,
    costUSD: {
      input: +cost.inputCost.toFixed(6),
      output: +cost.outputCost.toFixed(6),
      total: +cost.totalCost.toFixed(6),
    },
  };
  grandTotalCost += cost.totalCost;
}

for (const [purpose, s] of Object.entries(purposeStats)) {
  report.byPurpose[purpose] = {
    calls: s.calls,
    inputTokensEst: s.inputTokensEst,
    outputTokensEst: s.outputTokensEst,
    totalTokensEst: s.inputTokensEst + s.outputTokensEst,
  };
}

report.totalEstimatedCost = +grandTotalCost.toFixed(6);

// ─── 格式化輸出 ────────────────────────────────────────────────
if (FORMAT === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  // Table format
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           OpenClaw Token 用量審計報告                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  產生時間:  ${report.generated.padEnd(47)}║`);
  console.log(`║  時間範圍:  最近 ${TIME_RANGE.padEnd(43)}║`);
  console.log(`║  日誌檔案:  ${LOG_PATH.length > 47 ? '...' + LOG_PATH.slice(-44) : LOG_PATH.padEnd(47)}║`);
  console.log(`║  掃描行數:  ${String(lines.length).padEnd(47)}║`);
  console.log(`║  LLM 呼叫:  ${String(totalCalls).padEnd(46)}║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  [ 按模型統計 ]                                             ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const modelEntries = Object.entries(report.byModel).sort((a, b) => b[1].totalTokensEst - a[1].totalTokensEst);
  if (modelEntries.length === 0) {
    console.log('║  (無 LLM 呼叫紀錄)                                          ║');
  }
  for (const [model, d] of modelEntries) {
    console.log(`║  ${model.padEnd(58)}║`);
    console.log(`║    呼叫次數: ${String(d.calls).padEnd(46)}║`);
    console.log(`║    Input tokens (估):  ${String(d.inputTokensEst).padEnd(36)}║`);
    console.log(`║    Output tokens (估): ${String(d.outputTokensEst).padEnd(36)}║`);
    console.log(`║    合計 tokens (估):   ${String(d.totalTokensEst).padEnd(36)}║`);
    console.log(`║    成本 (USD):         $${d.costUSD.total.toFixed(4).padEnd(34)}║`);
    console.log('║                                                              ║');
  }

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  [ 按用途統計 ]                                             ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const purposeEntries = Object.entries(report.byPurpose).sort((a, b) => b[1].totalTokensEst - a[1].totalTokensEst);
  if (purposeEntries.length === 0) {
    console.log('║  (無紀錄)                                                    ║');
  }
  const purposeLabels = {
    heartbeat: 'Heartbeat (心跳)',
    cron: 'Cron (定時任務)',
    conversation: 'Conversation (對話)',
    'sub-agent': 'Sub-Agent (子代理)',
    other: 'Other (其他)',
  };
  for (const [purpose, d] of purposeEntries) {
    const label = purposeLabels[purpose] || purpose;
    console.log(`║  ${label.padEnd(58)}║`);
    console.log(`║    呼叫次數: ${String(d.calls).padEnd(46)}║`);
    console.log(`║    合計 tokens (估): ${String(d.totalTokensEst).padEnd(38)}║`);
    console.log('║                                                              ║');
  }

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  總估算成本:  $${grandTotalCost.toFixed(4)} USD${' '.repeat(Math.max(0, 40 - grandTotalCost.toFixed(4).length))}║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  注意: token 數為估計值 (chars / 2.5)，實際可能有 ±30% 誤差  ║');
  console.log('║  建議搭配 API provider dashboard 截圖進行校準               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}
