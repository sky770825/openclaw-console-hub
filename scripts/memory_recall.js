#!/usr/bin/env node
/**
 * Memory Recall using QMD - Optimized Version v2.1
 * 
 * 優化項目：
 * 1. LRU 快取機制 - 快取最近查詢結果 (最高效益)
 * 2. 非同步執行 - 非阻塞 I/O
 * 3. 資料庫鎖定處理 - 自動重試機制
 * 4. 連線池管理 - 循序執行避免 SQLite 鎖定
 * 5. 結果合併與去重 - 智慧排序與過濾
 * 6. 效能監測 - 內建指標收集
 * 
 * @version 2.1.0
 * @task_id optimize-memory-recall-v1
 * @run_id codex-init-001
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

// ==================== 配置區 ====================
const CONFIG = {
  // 快取配置
  cache: {
    enabled: true,
    maxSize: 100,          // 最大快取數量
    ttlMs: 10 * 60 * 1000, // 快取存活時間 (10分鐘)
  },
  // 搜尋配置
  search: {
    limit: 10,             // 每個 collection 結果數量
    threshold: 0.3,        // 相似度門檻 (降低以獲得更多結果)
    collections: ['memory', 'docs'],
    // 由於 SQLite 鎖定問題，改為循序執行
    parallel: false,
  },
  // 重試配置
  retry: {
    maxRetries: 3,
    baseDelayMs: 100,
    maxDelayMs: 1000,
  },
  // 效能配置
  performance: {
    timeoutMs: 15000,      // 搜尋超時時間
    enableMetrics: true,
  }
};

// ==================== LRU 快取實作 ====================
class LRUCache {
  constructor(maxSize = 100, ttlMs = 10 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  static generateKey(query, collections) {
    const data = `${query}|${collections.sort().join(',')}|${CONFIG.search.limit}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }
    
    const item = this.cache.get(key);
    if (Date.now() - item.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    // LRU: 移動到最新位置
    this.cache.delete(key);
    this.cache.set(key, item);
    this.hits++;
    
    return item.data;
  }

  set(key, data) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get hitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total * 100).toFixed(2);
  }

  get stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${this.hitRate}%`
    };
  }
}

// 全域快取實例
const globalCache = new LRUCache(CONFIG.cache.maxSize, CONFIG.cache.ttlMs);

// ==================== 重試機制 ====================
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, maxRetries = CONFIG.retry.maxRetries) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 檢查是否為資料庫鎖定錯誤
      const isDbLock = error.message && (
        error.message.includes('database is locked') ||
        error.message.includes('SQLITE_BUSY')
      );
      
      if (!isDbLock || attempt === maxRetries - 1) {
        throw error;
      }
      
      // 指數退避
      const delay = Math.min(
        CONFIG.retry.baseDelayMs * Math.pow(2, attempt),
        CONFIG.retry.maxDelayMs
      );
      await sleep(delay);
    }
  }
  
  throw lastError;
}

// ==================== 搜尋核心 ====================

function escapeShellArg(arg) {
  return arg.replace(/["\\$`]/g, '\\$&');
}

async function searchCollection(query, collection, limit = CONFIG.search.limit) {
  const cmd = `qmd search "${escapeShellArg(query)}" --collection ${collection} --limit ${limit} 2>/dev/null`;
  
  return withRetry(async () => {
    const { stdout } = await execAsync(cmd, { 
      timeout: CONFIG.performance.timeoutMs,
      maxBuffer: 1024 * 1024 * 10
    });
    
    const lines = stdout.trim().split('\n').filter(line => line.trim());
    return lines.map((line, idx) => ({
      content: line,
      collection,
      rank: idx,
      score: Math.max(0.1, 1 - (idx * 0.1)) // 簡易分數遞減
    }));
  });
}

// 循序搜尋以避免 SQLite 鎖定
async function searchCollectionsSequential(query, collections, limit) {
  const results = [];
  
  for (const collection of collections) {
    try {
      const result = await searchCollection(query, collection, limit);
      results.push(result);
    } catch (error) {
      console.warn(`⚠️ 搜尋 ${collection} 失敗:`, error.message);
      results.push([]);
    }
  }
  
  return results;
}

// 並行搜尋 (有風險，可能遇到 SQLite 鎖定)
async function searchCollectionsParallel(query, collections, limit) {
  const promises = collections.map(collection => 
    searchCollection(query, collection, limit).catch(error => {
      console.warn(`⚠️ 搜尋 ${collection} 失敗:`, error.message);
      return [];
    })
  );
  
  return Promise.all(promises);
}

function mergeResults(results, threshold = CONFIG.search.threshold) {
  const allResults = results.flat();
  
  // 過濾低分結果
  const filtered = allResults.filter(r => r.score >= threshold);
  
  // 依分數排序，相同分數依 rank
  filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.rank - b.rank;
  });
  
  // 去重 (依內容前100字)
  const seen = new Set();
  return filtered.filter(r => {
    const key = r.content.substring(0, 100);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ==================== 主搜尋函數 ====================

async function memoryRecall(query, options = {}) {
  const startTime = performance.now();
  
  const opts = {
    collections: options.collections || CONFIG.search.collections,
    limit: options.limit || CONFIG.search.limit,
    useCache: options.useCache !== false && CONFIG.cache.enabled,
    includeMetrics: options.includeMetrics !== false && CONFIG.performance.enableMetrics,
    parallel: options.parallel ?? CONFIG.search.parallel
  };

  // 檢查快取
  const cacheKey = LRUCache.generateKey(query, opts.collections);
  if (opts.useCache) {
    const cached = globalCache.get(cacheKey);
    if (cached) {
      const duration = performance.now() - startTime;
      return {
        ...cached,
        cached: true,
        queryTimeMs: duration.toFixed(2),
        ...(opts.includeMetrics && { cacheStats: globalCache.stats })
      };
    }
  }

  // 執行搜尋
  const searchFn = opts.parallel ? searchCollectionsParallel : searchCollectionsSequential;
  const results = await searchFn(query, opts.collections, opts.limit);
  
  // 合併結果
  const merged = mergeResults(results);
  
  const output = {
    query: query,
    timestamp: new Date().toISOString(),
    totalResults: merged.length,
    results: merged.slice(0, opts.limit),
    byCollection: opts.collections.reduce((acc, coll, idx) => {
      acc[coll] = results[idx]?.length || 0;
      return acc;
    }, {}),
    cached: false
  };

  // 存入快取
  if (opts.useCache) {
    globalCache.set(cacheKey, output);
  }

  const duration = performance.now() - startTime;

  if (opts.includeMetrics) {
    output.queryTimeMs = duration.toFixed(2);
    output.cacheStats = globalCache.stats;
  }

  return output;
}

// ==================== CLI 介面 ====================

function printUsage() {
  console.log(`
用法: node memory_recall_optimized.js [選項] "搜尋查詢"

選項:
  -l, --limit <n>       結果數量限制 (預設: 10)
  -c, --collections     指定 collections，用逗號分隔 (預設: memory,docs)
  --parallel           啟用並行搜尋 (有 SQLite 鎖定風險)
  --no-cache           停用快取
  --metrics            顯示效能指標
  --clear-cache        清除快取
  -h, --help           顯示說明

範例:
  node memory_recall_optimized.js "專案進度"
  node memory_recall_optimized.js --limit 5 "會議記錄"
  node memory_recall_optimized.js -c memory "重要事項"
  node memory_recall_optimized.js --metrics "測試查詢"
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  if (args.includes('--clear-cache')) {
    globalCache.clear();
    console.log('✅ 快取已清除');
    process.exit(0);
  }

  const options = {
    collections: CONFIG.search.collections,
    limit: CONFIG.search.limit,
    useCache: true,
    includeMetrics: args.includes('--metrics'),
    parallel: false
  };

  let query = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-l' || arg === '--limit') {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '-c' || arg === '--collections') {
      options.collections = args[++i].split(',').map(c => c.trim());
    } else if (arg === '--parallel') {
      options.parallel = true;
    } else if (arg === '--no-cache') {
      options.useCache = false;
    } else if (arg === '--metrics') {
      options.includeMetrics = true;
    } else if (!arg.startsWith('-')) {
      query = arg;
    }
  }

  if (!query) {
    console.error('❌ 錯誤: 請提供搜尋查詢');
    printUsage();
    process.exit(1);
  }

  try {
    console.log(`🔍 搜尋: "${query}"...\n`);
    
    const result = await memoryRecall(query, options);
    
    console.log(JSON.stringify(result, null, 2));
    
    console.log(`\n📊 摘要: 找到 ${result.totalResults} 個結果`);
    if (result.cached) {
      console.log('⚡ 快取命中');
    }
    
  } catch (error) {
    console.error('❌ 搜尋失敗:', error.message);
    console.error('\n💡 提示:');
    console.error('  - 確認 QMD 已安裝: which qmd');
    console.error('  - 列出 collections: qmd collection list');
    console.error('  - 更新索引: qmd update');
    process.exit(1);
  }
}

main();

export { memoryRecall, globalCache, CONFIG };
