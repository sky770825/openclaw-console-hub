/**
 * 治理引擎 — Governance Engine
 *
 * 核心功能：
 * 1. Circuit Breaker（斷路器）— 連續失敗 N 次後自動停止執行器
 * 2. Auto-Rollback（自動回滾）— 任務失敗時嘗試執行 rollbackPlan
 * 3. Acceptance Validation（驗收驗證）— 任務完成後自動檢查 acceptanceCriteria
 * 4. Trust Score Tracking（信任分追蹤）— 根據 Agent 執行成功率調整信任分
 */

import { createLogger } from './logger.js';
import { sendTelegramMessage } from './utils/telegram.js';
import { spawn } from 'child_process';
import type { Task } from './types.js';

const log = createLogger('governance');

// ─── Circuit Breaker ───

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** 連續失敗幾次後斷路（預設 3） */
  failureThreshold: number;
  /** 斷路後冷卻時間（ms，預設 5 分鐘） */
  cooldownMs: number;
  /** half-open 時允許放行幾個任務做測試（預設 1） */
  halfOpenAllowance: number;
}

export interface CircuitBreakerState {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureAt: string | null;
  openedAt: string | null;
  /** 冷卻結束時間 */
  cooldownEndsAt: string | null;
  /** half-open 已放行數 */
  halfOpenPassed: number;
  /** 歷史統計 */
  totalTrips: number;
}

const DEFAULT_CB_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  cooldownMs: 5 * 60 * 1000, // 5 分鐘
  halfOpenAllowance: 1,
};

let cbConfig: CircuitBreakerConfig = { ...DEFAULT_CB_CONFIG };

let cbState: CircuitBreakerState = {
  state: 'closed',
  consecutiveFailures: 0,
  lastFailureAt: null,
  openedAt: null,
  cooldownEndsAt: null,
  halfOpenPassed: 0,
  totalTrips: 0,
};

export function getCircuitBreakerState(): CircuitBreakerState {
  // 自動偵測是否冷卻結束 → 進入 half-open
  if (cbState.state === 'open' && cbState.cooldownEndsAt) {
    if (Date.now() >= new Date(cbState.cooldownEndsAt).getTime()) {
      cbState.state = 'half-open';
      cbState.halfOpenPassed = 0;
      log.info('[CircuitBreaker] 冷卻結束，進入 half-open 狀態');
    }
  }
  return { ...cbState };
}

export function configureCircuitBreaker(config: Partial<CircuitBreakerConfig>): void {
  cbConfig = { ...cbConfig, ...config };
  log.info(`[CircuitBreaker] 配置更新: threshold=${cbConfig.failureThreshold}, cooldown=${cbConfig.cooldownMs}ms`);
}

/**
 * 檢查斷路器是否允許執行
 * @returns { allowed: true } 或 { allowed: false, reason: string }
 */
export function circuitBreakerCheck(): { allowed: true } | { allowed: false; reason: string } {
  const state = getCircuitBreakerState();

  if (state.state === 'closed') {
    return { allowed: true };
  }

  if (state.state === 'open') {
    const remaining = state.cooldownEndsAt
      ? Math.max(0, new Date(state.cooldownEndsAt).getTime() - Date.now())
      : 0;
    const remainSec = Math.ceil(remaining / 1000);
    return {
      allowed: false,
      reason: `斷路器已開啟（連續 ${state.consecutiveFailures} 次失敗），冷卻剩餘 ${remainSec}s`,
    };
  }

  // half-open: 放行有限數量做測試
  if (state.state === 'half-open') {
    if (state.halfOpenPassed < cbConfig.halfOpenAllowance) {
      cbState.halfOpenPassed++;
      log.info(`[CircuitBreaker] half-open 放行測試任務 (${cbState.halfOpenPassed}/${cbConfig.halfOpenAllowance})`);
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `斷路器 half-open，已放行 ${state.halfOpenPassed} 個測試任務，等待結果`,
    };
  }

  return { allowed: true };
}

/**
 * 回報任務成功 → 重置斷路器
 */
export function circuitBreakerSuccess(): void {
  if (cbState.state !== 'closed') {
    log.info(`[CircuitBreaker] 任務成功 → 斷路器重置為 closed`);
  }
  cbState.state = 'closed';
  cbState.consecutiveFailures = 0;
  cbState.lastFailureAt = null;
  cbState.openedAt = null;
  cbState.cooldownEndsAt = null;
  cbState.halfOpenPassed = 0;
}

/**
 * 回報任務失敗 → 可能觸發斷路
 */
export async function circuitBreakerFailure(): Promise<void> {
  cbState.consecutiveFailures++;
  cbState.lastFailureAt = new Date().toISOString();

  if (cbState.consecutiveFailures >= cbConfig.failureThreshold && cbState.state !== 'open') {
    cbState.state = 'open';
    cbState.openedAt = new Date().toISOString();
    cbState.cooldownEndsAt = new Date(Date.now() + cbConfig.cooldownMs).toISOString();
    cbState.totalTrips++;

    log.warn(
      `[CircuitBreaker] 🔴 斷路器開啟！連續 ${cbState.consecutiveFailures} 次失敗，冷卻 ${cbConfig.cooldownMs / 1000}s`
    );

    await sendTelegramMessage(
      `🔴 <b>斷路器已觸發</b>\n\n` +
        `連續失敗：${cbState.consecutiveFailures} 次\n` +
        `冷卻時間：${cbConfig.cooldownMs / 1000} 秒\n` +
        `自動執行器已暫停，冷卻後自動恢復\n\n` +
        `累計觸發：${cbState.totalTrips} 次`,
      { parseMode: 'HTML' }
    );
  }
}

/**
 * 手動重置斷路器
 */
export function circuitBreakerReset(): void {
  cbState = {
    state: 'closed',
    consecutiveFailures: 0,
    lastFailureAt: null,
    openedAt: null,
    cooldownEndsAt: null,
    halfOpenPassed: 0,
    totalTrips: cbState.totalTrips, // 保留歷史統計
  };
  log.info('[CircuitBreaker] 手動重置為 closed');
}

// ─── Auto-Rollback ───

export interface RollbackResult {
  attempted: boolean;
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
}

/**
 * 嘗試自動回滾
 * 讀取任務的 rollbackPlan 並執行
 */
export async function attemptAutoRollback(
  task: Task,
  failureContext: string
): Promise<RollbackResult> {
  if (!task.rollbackPlan || task.rollbackPlan.trim().length === 0) {
    log.info(`[Rollback] 任務「${task.name}」無 rollbackPlan，跳過回滾`);
    return { attempted: false, success: false, output: '無 rollbackPlan', durationMs: 0 };
  }

  log.info(`[Rollback] 嘗試回滾任務「${task.name}」...`);

  const startTime = Date.now();

  // 解析 rollbackPlan — 支援純指令或 markdown 格式
  const commands = parseRollbackCommands(task.rollbackPlan);
  if (commands.length === 0) {
    log.info(`[Rollback] rollbackPlan 無可執行指令`);
    return { attempted: false, success: false, output: 'rollbackPlan 無可執行指令', durationMs: 0 };
  }

  const combinedCommand = commands.join(' && ');
  log.info(`[Rollback] 執行回滾指令: ${combinedCommand.slice(0, 200)}`);

  try {
    const result = await executeCommand(combinedCommand, 60000); // 回滾超時 60 秒
    const durationMs = Date.now() - startTime;

    if (result.success) {
      log.info(`[Rollback] ✅ 回滾成功: ${task.name}`);
      await sendTelegramMessage(
        `🔄 <b>自動回滾成功</b>\n\n` +
          `任務：${task.name}\n` +
          `失敗原因：${failureContext.slice(0, 200)}\n` +
          `回滾耗時：${durationMs}ms\n` +
          `回滾結果：${result.output.slice(0, 300)}`,
        { parseMode: 'HTML' }
      );
    } else {
      log.error(`[Rollback] ❌ 回滾失敗: ${task.name} — ${result.error}`);
      await sendTelegramMessage(
        `❌ <b>自動回滾失敗</b>\n\n` +
          `任務：${task.name}\n` +
          `原始失敗：${failureContext.slice(0, 150)}\n` +
          `回滾錯誤：${(result.error || '').slice(0, 200)}\n\n` +
          `⚠️ 需要人工介入`,
        { parseMode: 'HTML' }
      );
    }

    return {
      attempted: true,
      success: result.success,
      output: result.output,
      error: result.error,
      durationMs,
    };
  } catch (e) {
    const durationMs = Date.now() - startTime;
    log.error(`[Rollback] 回滾過程異常: ${e}`);
    return {
      attempted: true,
      success: false,
      output: '',
      error: String(e),
      durationMs,
    };
  }
}

/**
 * 從 rollbackPlan 文字中解析可執行指令
 * 支援格式：
 *   1. 純指令（每行一個）
 *   2. Markdown code block：```bash\n...\n```
 *   3. 行首 $ 或 > 的指令
 */
function parseRollbackCommands(plan: string): string[] {
  const lines = plan.split('\n').map((l) => l.trim()).filter(Boolean);
  const commands: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // code block 開始/結束
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      // code block 內的每行都是指令
      if (line.length > 0 && !line.startsWith('#') && !line.startsWith('//')) {
        commands.push(line);
      }
      continue;
    }

    // $ 或 > 開頭的行
    if (line.startsWith('$') || line.startsWith('>')) {
      commands.push(line.slice(1).trim());
      continue;
    }

    // 純指令判斷：包含常見 CLI 關鍵字
    const cmdPatterns = /^(git |npm |yarn |pnpm |curl |mv |cp |rm |mkdir |cd |docker |kubectl )/i;
    if (cmdPatterns.test(line)) {
      commands.push(line);
    }
  }

  return commands;
}

function executeCommand(
  command: string,
  timeoutMs: number
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', command], {
      cwd: process.cwd(),
      env: { ...process.env },
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        success: false,
        output,
        error: `回滾指令超時 (${timeoutMs}ms)`,
      });
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0,
        output,
        error: code !== 0 ? (errorOutput || `exit code ${code}`) : undefined,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        output,
        error: err.message,
      });
    });
  });
}

// ─── Acceptance Validation ───

export interface AcceptanceResult {
  validated: boolean;
  passed: boolean;
  results: AcceptanceCriterionResult[];
}

export interface AcceptanceCriterionResult {
  criterion: string;
  passed: boolean;
  output: string;
  error?: string;
}

/**
 * 自動驗證驗收條件
 * 支援：
 *   - 可執行指令（exit code 0 = pass）
 *   - 檔案存在檢查（file:path/to/file）
 *   - HTTP 健康檢查（http:url → 2xx = pass）
 */
export async function validateAcceptanceCriteria(
  task: Task,
  executionOutput: string
): Promise<AcceptanceResult> {
  const criteria = task.acceptanceCriteria;
  if (!criteria || criteria.length === 0) {
    return { validated: false, passed: true, results: [] };
  }

  log.info(`[Acceptance] 驗證 ${criteria.length} 個驗收條件: ${task.name}`);
  const results: AcceptanceCriterionResult[] = [];

  for (const criterion of criteria) {
    const trimmed = criterion.trim();

    // file: 前綴 — 檢查檔案是否存在
    if (trimmed.startsWith('file:')) {
      const filePath = trimmed.slice(5).trim();
      const result = await executeCommand(`test -f "${filePath}" || test -d "${filePath}"`, 5000);
      results.push({
        criterion: trimmed,
        passed: result.success,
        output: result.success ? '檔案存在' : '檔案不存在',
        error: result.error,
      });
      continue;
    }

    // http: 或 https: 前綴 — 健康檢查
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const result = await executeCommand(
        `curl -sf -o /dev/null -w "%{http_code}" "${trimmed}"`,
        10000
      );
      const httpCode = result.output.trim();
      const passed = httpCode.startsWith('2');
      results.push({
        criterion: trimmed,
        passed,
        output: `HTTP ${httpCode}`,
        error: passed ? undefined : `HTTP ${httpCode}`,
      });
      continue;
    }

    // cmd: 前綴或可執行指令 — 執行並以 exit code 判斷
    const cmd = trimmed.startsWith('cmd:') ? trimmed.slice(4).trim() : null;
    if (cmd) {
      const result = await executeCommand(cmd, 30000);
      results.push({
        criterion: trimmed,
        passed: result.success,
        output: result.output.slice(0, 500),
        error: result.error,
      });
      continue;
    }

    // 純文字描述 — 無法自動驗證，標記為 manual
    results.push({
      criterion: trimmed,
      passed: true, // 無法自動驗證的條件預設通過，需人工確認
      output: '[手動驗證] 無法自動判斷，需人工確認',
    });
  }

  const allPassed = results.every((r) => r.passed);

  if (!allPassed) {
    const failed = results.filter((r) => !r.passed);
    log.warn(`[Acceptance] ❌ ${failed.length}/${results.length} 個驗收條件未通過: ${task.name}`);
    await sendTelegramMessage(
      `⚠️ <b>驗收未通過</b>\n\n` +
        `任務：${task.name}\n` +
        `通過：${results.length - failed.length}/${results.length}\n\n` +
        `未通過：\n` +
        failed.map((f) => `❌ ${f.criterion}\n   └ ${f.error || f.output}`).join('\n'),
      { parseMode: 'HTML' }
    );
  } else {
    log.info(`[Acceptance] ✅ 全部 ${results.length} 個驗收條件通過: ${task.name}`);
  }

  return { validated: true, passed: allPassed, results };
}

// ─── Trust Score Tracking ───

export interface AgentTrustProfile {
  agentType: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  rollbackCount: number;
  /** 信任分 0-100（基於成功率 + 回滾率加權） */
  trustScore: number;
  lastExecutionAt: string | null;
  /** 連續成功次數 */
  consecutiveSuccesses: number;
  /** 最高連續成功 */
  maxConsecutiveSuccesses: number;
}

const trustProfiles: Map<string, AgentTrustProfile> = new Map();

function ensureProfile(agentType: string): AgentTrustProfile {
  if (!trustProfiles.has(agentType)) {
    trustProfiles.set(agentType, {
      agentType,
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      rollbackCount: 0,
      trustScore: 50, // 初始中立分數
      lastExecutionAt: null,
      consecutiveSuccesses: 0,
      maxConsecutiveSuccesses: 0,
    });
  }
  return trustProfiles.get(agentType)!;
}

function recalcTrustScore(profile: AgentTrustProfile): number {
  if (profile.totalExecutions === 0) return 50;

  const successRate = profile.successCount / profile.totalExecutions;
  const rollbackPenalty = profile.rollbackCount / Math.max(1, profile.failureCount);
  const streakBonus = Math.min(10, profile.consecutiveSuccesses * 2);

  // 信任分 = 成功率 * 70 + (1 - 回滾率) * 20 + 連續成功獎勵 (max 10)
  const score = successRate * 70 + (1 - rollbackPenalty) * 20 + streakBonus;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function recordAgentSuccess(agentType: string): void {
  const p = ensureProfile(agentType);
  p.totalExecutions++;
  p.successCount++;
  p.consecutiveSuccesses++;
  if (p.consecutiveSuccesses > p.maxConsecutiveSuccesses) {
    p.maxConsecutiveSuccesses = p.consecutiveSuccesses;
  }
  p.lastExecutionAt = new Date().toISOString();
  p.trustScore = recalcTrustScore(p);
}

export function recordAgentFailure(agentType: string, rolledBack: boolean): void {
  const p = ensureProfile(agentType);
  p.totalExecutions++;
  p.failureCount++;
  p.consecutiveSuccesses = 0;
  if (rolledBack) p.rollbackCount++;
  p.lastExecutionAt = new Date().toISOString();
  p.trustScore = recalcTrustScore(p);
}

export function getAgentTrustProfiles(): AgentTrustProfile[] {
  return Array.from(trustProfiles.values());
}

export function getAgentTrustScore(agentType: string): number {
  return ensureProfile(agentType).trustScore;
}

// ─── Governance Status ───

export interface GovernanceStatus {
  circuitBreaker: CircuitBreakerState;
  circuitBreakerConfig: CircuitBreakerConfig;
  trustProfiles: AgentTrustProfile[];
}

export function getGovernanceStatus(): GovernanceStatus {
  return {
    circuitBreaker: getCircuitBreakerState(),
    circuitBreakerConfig: { ...cbConfig },
    trustProfiles: getAgentTrustProfiles(),
  };
}
