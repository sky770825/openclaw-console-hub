/**
 * Action Rate Limiter — 滑動窗口限速器（Sliding Window Log）+ 成本權重
 *
 * 移植自 Moltbook @moltbook/rate-limiter 的核心算法。
 * 比簡單的 CircuitBreaker 更精確：
 *   - CircuitBreaker 只看「連續失敗 N 次」→ 斷路
 *   - RateLimiter 看「過去 T 時間內呼叫 N 次」→ 限速
 * 兩者互補，先過 CircuitBreaker（防死循環），再過 RateLimiter（防濫用）。
 *
 * v2: 支援成本消耗（cost-based consumption）
 *   - 不同 action 消耗不同的配額（cost 權重）
 *   - ask_ai/proxy_fetch 等重操作 cost=5，讀取操作 cost=1
 *   - 向後兼容：未指定 cost 時預設為 1
 *
 * 使用方式：
 *   const limiter = new ActionRateLimiter();
 *   if (!limiter.isAllowed('code_eval')) { /* 被限速 *\/ }
 *   limiter.record('code_eval'); // 記錄一次呼叫（消耗 cost 點配額）
 */

import { createLogger } from '../logger.js';

const log = createLogger('rate-limiter');

// ── 型別定義 ──

export interface RateLimitConfig {
  /** 時間窗口大小（毫秒） */
  windowMs: number;
  /** 窗口內允許的最大配額（成本單位） */
  maxRequests: number;
  /** 每次呼叫消耗的配額（預設 1，向後兼容） */
  cost?: number;
}

export interface RateLimitStatus {
  /** action 名稱 */
  action: string;
  /** 當前窗口內已消耗的配額（成本加權） */
  used: number;
  /** 窗口內允許的最大配額 */
  limit: number;
  /** 剩餘可用配額 */
  remaining: number;
  /** 距離最早那筆紀錄過期的毫秒數（0 = 沒有紀錄） */
  resetInMs: number;
  /** 是否被限速中 */
  blocked: boolean;
  /** 此 action 每次呼叫的成本 */
  cost: number;
  /** 當前窗口內的呼叫次數（不含權重） */
  callCount: number;
}

// ── 預設配置 ──

const ONE_MINUTE = 60 * 1000;

/** 每個 action 的預設速率限制（含成本權重） */
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // 讀取類 — 寬鬆，cost 1
  read_file:        { windowMs: ONE_MINUTE, maxRequests: 30, cost: 1 },
  semantic_search:  { windowMs: ONE_MINUTE, maxRequests: 20, cost: 1 },
  list_dir:         { windowMs: ONE_MINUTE, maxRequests: 30, cost: 1 },
  grep_project:     { windowMs: ONE_MINUTE, maxRequests: 20, cost: 1 },
  find_symbol:      { windowMs: ONE_MINUTE, maxRequests: 20, cost: 1 },

  // 寫入類 — 中等，cost 3
  write_file:       { windowMs: ONE_MINUTE, maxRequests: 15, cost: 3 },
  patch_file:       { windowMs: ONE_MINUTE, maxRequests: 15, cost: 3 },

  // 知識操作 — cost 2
  index_file:       { windowMs: ONE_MINUTE, maxRequests: 20, cost: 2 },
  reindex_knowledge:{ windowMs: ONE_MINUTE, maxRequests: 5,  cost: 2 },

  // 任務操作 — cost 1~2
  create_task:      { windowMs: ONE_MINUTE, maxRequests: 15, cost: 1 },
  update_task:      { windowMs: ONE_MINUTE, maxRequests: 10, cost: 2 },

  // 執行類 — 嚴格，cost 3
  code_eval:        { windowMs: ONE_MINUTE, maxRequests: 5,  cost: 3 },
  run_script:       { windowMs: ONE_MINUTE, maxRequests: 10, cost: 3 },

  // 分析類 — cost 2
  analyze_code:     { windowMs: ONE_MINUTE, maxRequests: 10, cost: 2 },
  analyze_symbol:   { windowMs: ONE_MINUTE, maxRequests: 10, cost: 2 },

  // 檔案操作 — cost 1~2
  mkdir:            { windowMs: ONE_MINUTE, maxRequests: 10, cost: 1 },
  move_file:        { windowMs: ONE_MINUTE, maxRequests: 5,  cost: 2 },

  // 外部呼叫類 — 嚴格，cost 3~5（避免打爆外部 API）
  crew_dispatch:    { windowMs: ONE_MINUTE, maxRequests: 3,  cost: 5 },
  send_group:       { windowMs: ONE_MINUTE, maxRequests: 5,  cost: 3 },
  proxy_fetch:      { windowMs: ONE_MINUTE, maxRequests: 10, cost: 5 },
  web_fetch:        { windowMs: ONE_MINUTE, maxRequests: 10, cost: 3 },
  web_browse:       { windowMs: ONE_MINUTE, maxRequests: 8,  cost: 3 },
  web_search:       { windowMs: ONE_MINUTE, maxRequests: 10, cost: 3 },

  // AI 呼叫 — 重操作，cost 5（token 成本考量）
  ask_ai:           { windowMs: ONE_MINUTE, maxRequests: 10, cost: 5 },
  delegate_agents:  { windowMs: ONE_MINUTE, maxRequests: 5,  cost: 5 },
  generate_site:    { windowMs: ONE_MINUTE, maxRequests: 3,  cost: 5 },

  // 資料庫 — cost 1
  query_supabase:   { windowMs: ONE_MINUTE, maxRequests: 15, cost: 1 },

  // 規劃類 — cost 2~3
  plan_project:     { windowMs: ONE_MINUTE, maxRequests: 10, cost: 2 },
  roadmap:          { windowMs: ONE_MINUTE, maxRequests: 3,  cost: 3 },
};

/** 未列出的 action 用這個（cost 預設 1，向後兼容） */
const FALLBACK_LIMIT: RateLimitConfig = { windowMs: ONE_MINUTE, maxRequests: 20, cost: 1 };

// ── 核心實作：Sliding Window Log ──

/** 單筆呼叫紀錄（含時間戳 + 成本權重） */
interface CallEntry {
  /** 呼叫時間戳 */
  ts: number;
  /** 此次呼叫消耗的配額 */
  cost: number;
}

/**
 * MemoryStore — 內存儲存每個 action 的呼叫紀錄（時間戳 + 成本）
 *
 * 算法：Sliding Window Log + Cost-based Consumption
 *   1. 每次呼叫記錄一個 { ts, cost }
 *   2. 查詢時，先清除窗口外的過期紀錄
 *   3. 窗口內所有紀錄的 cost 加總 = 已消耗配額
 *   4. 如果已消耗配額 >= maxRequests → 限速
 *
 * 優點：比固定窗口更精確，不會在窗口邊界出現突發流量
 * 缺點：記憶體使用隨呼叫頻率增長（但 action 有限，不是問題）
 */
class MemoryStore {
  /** action -> 呼叫紀錄陣列（按 ts 升序排列） */
  private logs = new Map<string, CallEntry[]>();

  /** 記錄一次呼叫（含成本權重） */
  record(action: string, now: number, cost: number = 1): void {
    const entries = this.logs.get(action) || [];
    entries.push({ ts: now, cost });
    this.logs.set(action, entries);
  }

  /**
   * 取得窗口內的加權消耗總量，同時清除過期紀錄
   * @returns 窗口內所有呼叫的 cost 加總
   */
  getWeightedCount(action: string, windowStart: number): number {
    const entries = this.logs.get(action);
    if (!entries || entries.length === 0) return 0;

    // 二分搜尋找到第一個 ts >= windowStart 的位置
    let lo = 0, hi = entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (entries[mid].ts < windowStart) lo = mid + 1;
      else hi = mid;
    }

    // 清除過期的紀錄（lo 之前的都過期了）
    if (lo > 0) {
      entries.splice(0, lo);
      this.logs.set(action, entries);
    }

    // 加總窗口內所有紀錄的 cost
    let total = 0;
    for (const entry of entries) {
      total += entry.cost;
    }
    return total;
  }

  /**
   * 取得窗口內的原始呼叫次數（不含權重），同時清除過期紀錄
   */
  getRawCount(action: string, windowStart: number): number {
    const entries = this.logs.get(action);
    if (!entries || entries.length === 0) return 0;

    // 二分搜尋找到第一個 ts >= windowStart 的位置
    let lo = 0, hi = entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (entries[mid].ts < windowStart) lo = mid + 1;
      else hi = mid;
    }

    // 不在這裡 splice（避免重複清理，由 getWeightedCount 負責）
    return entries.length - lo;
  }

  /** 取得最早一筆紀錄的時間戳 */
  getOldest(action: string): number | null {
    const entries = this.logs.get(action);
    if (!entries || entries.length === 0) return null;
    return entries[0].ts;
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

  /** 取得某 action 的成本（向後兼容，未設定則為 1） */
  getCost(action: string): number {
    const config = this.getConfig(action);
    return config.cost ?? 1;
  }

  /**
   * 檢查 action 是否被允許（不消耗配額）
   * 使用成本加權：已消耗配額 + 本次成本 <= maxRequests 才放行
   * @returns true = 放行，false = 限速
   */
  isAllowed(action: string): boolean {
    const config = this.getConfig(action);
    const cost = config.cost ?? 1;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const usedQuota = this.store.getWeightedCount(action, windowStart);
    // 檢查加上本次成本後是否超限
    return (usedQuota + cost) <= config.maxRequests;
  }

  /**
   * 記錄一次 action 呼叫（消耗配額，以成本權重計）
   * 通常在 action 成功執行後呼叫。
   */
  record(action: string): void {
    const cost = this.getCost(action);
    this.store.record(action, Date.now(), cost);
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
   * 取得某 action 的限速狀態（含成本資訊）
   */
  getStatus(action: string): RateLimitStatus {
    const config = this.getConfig(action);
    const cost = config.cost ?? 1;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const used = this.store.getWeightedCount(action, windowStart);
    const callCount = this.store.getRawCount(action, windowStart);
    const remaining = Math.max(0, config.maxRequests - used);
    const oldest = this.store.getOldest(action);
    const resetInMs = oldest !== null ? Math.max(0, oldest + config.windowMs - now) : 0;

    return {
      action,
      used,
      limit: config.maxRequests,
      remaining,
      resetInMs,
      blocked: (used + cost) > config.maxRequests,
      cost,
      callCount,
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
   * 生成限速阻擋訊息（給 Telegram 回覆用，含成本資訊）
   */
  formatBlockMessage(action: string): string {
    const status = this.getStatus(action);
    const resetSec = Math.ceil(status.resetInMs / 1000);
    const costLabel = status.cost > 1 ? ` (cost=${status.cost})` : '';
    return `${action}${costLabel}: 配額用盡 ${status.used}/${status.limit}（${status.callCount} 次呼叫），${resetSec}s 後解除`;
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
