/**
 * Action Rate Limiter — 滑動窗口限速器（Sliding Window Log）
 *
 * 移植自 Moltbook @moltbook/rate-limiter 的核心算法。
 * 比簡單的 CircuitBreaker 更精確：
 *   - CircuitBreaker 只看「連續失敗 N 次」→ 斷路
 *   - RateLimiter 看「過去 T 時間內呼叫 N 次」→ 限速
 * 兩者互補，先過 CircuitBreaker（防死循環），再過 RateLimiter（防濫用）。
 *
 * 使用方式：
 *   const limiter = new ActionRateLimiter();
 *   if (!limiter.isAllowed('code_eval')) { /* 被限速 *\/ }
 *   limiter.record('code_eval'); // 記錄一次呼叫
 */

import { createLogger } from '../logger.js';

const log = createLogger('rate-limiter');

// ── 型別定義 ──

export interface RateLimitConfig {
  /** 時間窗口大小（毫秒） */
  windowMs: number;
  /** 窗口內允許的最大呼叫次數 */
  maxRequests: number;
}

export interface RateLimitStatus {
  /** action 名稱 */
  action: string;
  /** 當前窗口內已使用的次數 */
  used: number;
  /** 窗口內允許的最大次數 */
  limit: number;
  /** 剩餘可用次數 */
  remaining: number;
  /** 距離最早那筆紀錄過期的毫秒數（0 = 沒有紀錄） */
  resetInMs: number;
  /** 是否被限速中 */
  blocked: boolean;
}

// ── 預設配置 ──

const ONE_MINUTE = 60 * 1000;

/** 每個 action 的預設速率限制 */
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // 讀取類 — 寬鬆
  read_file:        { windowMs: ONE_MINUTE, maxRequests: 30 },
  semantic_search:  { windowMs: ONE_MINUTE, maxRequests: 20 },
  list_dir:         { windowMs: ONE_MINUTE, maxRequests: 30 },
  grep_project:     { windowMs: ONE_MINUTE, maxRequests: 20 },
  find_symbol:      { windowMs: ONE_MINUTE, maxRequests: 20 },

  // 寫入類 — 中等
  write_file:       { windowMs: ONE_MINUTE, maxRequests: 15 },
  patch_file:       { windowMs: ONE_MINUTE, maxRequests: 15 },
  index_file:       { windowMs: ONE_MINUTE, maxRequests: 20 },
  create_task:      { windowMs: ONE_MINUTE, maxRequests: 15 },

  // 執行類 — 嚴格
  code_eval:        { windowMs: ONE_MINUTE, maxRequests: 5 },
  run_script:       { windowMs: ONE_MINUTE, maxRequests: 10 },
  analyze_code:     { windowMs: ONE_MINUTE, maxRequests: 10 },
  analyze_symbol:   { windowMs: ONE_MINUTE, maxRequests: 10 },

  // 外部呼叫類 — 嚴格（避免打爆外部 API）
  proxy_fetch:      { windowMs: ONE_MINUTE, maxRequests: 10 },
  web_fetch:        { windowMs: ONE_MINUTE, maxRequests: 10 },
  web_browse:       { windowMs: ONE_MINUTE, maxRequests: 8 },
  web_search:       { windowMs: ONE_MINUTE, maxRequests: 10 },

  // AI 呼叫 — 中等（token 成本考量）
  ask_ai:           { windowMs: ONE_MINUTE, maxRequests: 10 },
  delegate_agents:  { windowMs: ONE_MINUTE, maxRequests: 5 },

  // 資料庫
  query_supabase:   { windowMs: ONE_MINUTE, maxRequests: 15 },

  // 規劃類
  plan_project:     { windowMs: ONE_MINUTE, maxRequests: 10 },
  reindex_knowledge:{ windowMs: ONE_MINUTE, maxRequests: 5 },
  read_task:        { windowMs: ONE_MINUTE, maxRequests: 20 },
};

/** 未列出的 action 用這個 */
const FALLBACK_LIMIT: RateLimitConfig = { windowMs: ONE_MINUTE, maxRequests: 20 };

// ── 核心實作：Sliding Window Log ──

/**
 * MemoryStore — 內存儲存每個 action 的呼叫時間戳
 *
 * 算法：Sliding Window Log
 *   1. 每次呼叫記錄一個 timestamp
 *   2. 查詢時，先清除窗口外的過期 timestamp
 *   3. 剩餘的 timestamp 數量 = 當前窗口內的呼叫次數
 *   4. 如果 >= maxRequests → 限速
 *
 * 優點：比固定窗口更精確，不會在窗口邊界出現突發流量
 * 缺點：記憶體使用隨呼叫頻率增長（但 action 有限，不是問題）
 */
class MemoryStore {
  /** action -> timestamp 陣列（升序排列） */
  private logs = new Map<string, number[]>();

  /** 記錄一次呼叫 */
  record(action: string, now: number): void {
    const timestamps = this.logs.get(action) || [];
    timestamps.push(now);
    this.logs.set(action, timestamps);
  }

  /** 取得窗口內的呼叫次數，同時清除過期紀錄 */
  getCount(action: string, windowStart: number): number {
    const timestamps = this.logs.get(action);
    if (!timestamps || timestamps.length === 0) return 0;

    // 二分搜尋找到第一個 >= windowStart 的位置
    let lo = 0, hi = timestamps.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (timestamps[mid] < windowStart) lo = mid + 1;
      else hi = mid;
    }

    // 清除過期的紀錄（lo 之前的都過期了）
    if (lo > 0) {
      timestamps.splice(0, lo);
      this.logs.set(action, timestamps);
    }

    return timestamps.length;
  }

  /** 取得最早一筆紀錄的時間戳 */
  getOldest(action: string): number | null {
    const timestamps = this.logs.get(action);
    if (!timestamps || timestamps.length === 0) return null;
    return timestamps[0];
  }

  /** 清除某個 action 的所有紀錄 */
  clear(action: string): void {
    this.logs.delete(action);
  }

  /** 清除所有紀錄 */
  clearAll(): void {
    this.logs.clear();
  }
}

// ── 主類別 ──

export class ActionRateLimiter {
  private store = new MemoryStore();
  private limits: Record<string, RateLimitConfig>;
  private fallback: RateLimitConfig;

  constructor(
    customLimits?: Partial<Record<string, RateLimitConfig>>,
    fallback?: RateLimitConfig
  ) {
    // 合併自訂限制和預設限制
    this.limits = { ...DEFAULT_LIMITS, ...(customLimits as Record<string, RateLimitConfig> | undefined) };
    this.fallback = fallback || FALLBACK_LIMIT;
  }

  /** 取得某 action 的限制配置 */
  private getConfig(action: string): RateLimitConfig {
    return this.limits[action] || this.fallback;
  }

  /**
   * 檢查 action 是否被允許（不消耗配額）
   * @returns true = 放行，false = 限速
   */
  isAllowed(action: string): boolean {
    const config = this.getConfig(action);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const count = this.store.getCount(action, windowStart);
    return count < config.maxRequests;
  }

  /**
   * 記錄一次 action 呼叫（消耗配額）
   * 通常在 action 成功執行後呼叫。
   */
  record(action: string): void {
    this.store.record(action, Date.now());
  }

  /**
   * 檢查 + 記錄（合併操作）
   * @returns true = 放行並已記錄，false = 限速（未記錄）
   */
  tryAcquire(action: string): boolean {
    if (!this.isAllowed(action)) {
      return false;
    }
    this.record(action);
    return true;
  }

  /**
   * 取得某 action 的限速狀態
   */
  getStatus(action: string): RateLimitStatus {
    const config = this.getConfig(action);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const used = this.store.getCount(action, windowStart);
    const remaining = Math.max(0, config.maxRequests - used);
    const oldest = this.store.getOldest(action);
    const resetInMs = oldest !== null ? Math.max(0, oldest + config.windowMs - now) : 0;

    return {
      action,
      used,
      limit: config.maxRequests,
      remaining,
      resetInMs,
      blocked: used >= config.maxRequests,
    };
  }

  /**
   * 取得所有有紀錄的 action 的狀態摘要
   */
  getAllStatus(): RateLimitStatus[] {
    const actions = new Set<string>();
    // 收集所有已知的 action（不管有沒有紀錄）
    for (const action of Object.keys(this.limits)) {
      actions.add(action);
    }
    return Array.from(actions)
      .map(action => this.getStatus(action))
      .filter(s => s.used > 0); // 只返回有使用紀錄的
  }

  /** 重置某個 action 的限速 */
  reset(action: string): void {
    this.store.clear(action);
  }

  /** 重置所有限速 */
  resetAll(): void {
    this.store.clearAll();
  }

  /**
   * 生成限速阻擋訊息（給 Telegram 回覆用）
   */
  formatBlockMessage(action: string): string {
    const status = this.getStatus(action);
    const resetSec = Math.ceil(status.resetInMs / 1000);
    return `${action}: 速率限制 ${status.used}/${status.limit} 次/分鐘，${resetSec}s 後解除`;
  }
}

// ── 全域單例（整個 server 共享一個限速器）──

let _globalLimiter: ActionRateLimiter | null = null;

/**
 * 取得全域限速器（懶初始化、單例）
 * 所有 chain（對話 / selfDrive / heartbeat）共用同一個限速器，
 * 避免同一秒內不同 chain 各自打爆同一個 action。
 */
export function getGlobalRateLimiter(): ActionRateLimiter {
  if (!_globalLimiter) {
    _globalLimiter = new ActionRateLimiter();
    log.info('[RateLimiter] 全域限速器已初始化（Sliding Window Log）');
  }
  return _globalLimiter;
}
