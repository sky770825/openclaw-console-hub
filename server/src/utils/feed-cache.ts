/**
 * Feed Cache — 任務排名結果的 in-memory 快取層
 *
 * 避免每次 GET /tasks 都重新排序。
 * 當任務被 create / update / delete 時，呼叫 invalidateFeedCache() 清除全部快取。
 *
 * TTL 策略：
 *   hot / rising / controversial → 60s（排名頻繁變動）
 *   new                         → 30s（對新任務最敏感）
 *   top / best                  → 120s（排名相對穩定）
 */

import type { RankingSortMode } from './task-ranking.js';

// ── Types ──

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number; // Date.now() + ttlMs
}

// ── Cache Store ──

const cache = new Map<string, CacheEntry>();

// ── TTL Table ──

const TTL_BY_MODE: Record<RankingSortMode, number> = {
  hot: 60_000,
  rising: 60_000,
  controversial: 60_000,
  new: 30_000,
  top: 120_000,
  best: 120_000,
};

/**
 * 根據排序模式取得預設 TTL（毫秒）
 */
export function getDefaultTTL(mode: RankingSortMode): number {
  return TTL_BY_MODE[mode] ?? 60_000;
}

// ── Cache Key Builder ──

export interface CacheKeyParams {
  sort?: string;
  timeFilter?: string;
  [key: string]: unknown;
}

/**
 * 從查詢參數建構快取鍵
 *
 * 格式：`feed:<sort>:<timeFilter>:<其他 filter 的排序 JSON>`
 * 確保相同參數組合產生相同鍵。
 */
export function buildCacheKey(params: CacheKeyParams): string {
  const sort = (params.sort ?? '').toLowerCase() || 'default';
  const timeFilter = (params.timeFilter ?? 'all').toLowerCase();

  // 收集額外 filter（排除 sort 和 timeFilter 本身）
  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === 'sort' || k === 'timeFilter') continue;
    if (v !== undefined && v !== null && v !== '') {
      extras[k] = v;
    }
  }

  // 額外 filter 按 key 排序後 JSON 化，確保穩定
  const extraKeys = Object.keys(extras).sort();
  const extraStr = extraKeys.length > 0
    ? ':' + extraKeys.map((k) => `${k}=${JSON.stringify(extras[k])}`).join('&')
    : '';

  return `feed:${sort}:${timeFilter}${extraStr}`;
}

// ── Cache Operations ──

/**
 * 取得快取的 feed 資料。若不存在或已過期，回傳 null。
 */
export function getCachedFeed<T = unknown>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    // 已過期，清除
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * 將排名結果寫入快取
 *
 * @param key    - 快取鍵（由 buildCacheKey 產生）
 * @param data   - 排名後的任務陣列
 * @param ttlMs  - 存活時間（毫秒），可用 getDefaultTTL(mode) 取得
 */
export function setCachedFeed<T = unknown>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * 清除所有 feed 快取。
 * 在任務 create / update / delete 後呼叫。
 */
export function invalidateFeedCache(): void {
  cache.clear();
}

/**
 * 目前快取筆數（主要用於 debug / 健康檢查）
 */
export function feedCacheSize(): number {
  return cache.size;
}
