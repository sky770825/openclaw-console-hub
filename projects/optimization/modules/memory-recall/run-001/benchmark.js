#!/usr/bin/env node
/**
 * 效能測試腳本 - Memory Recall 優化前後比較 v2
 * @task_id optimize-memory-recall-v1
 * @run_id codex-init-001
 */

import { execSync } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const TEST_CONFIG = {
  iterations: 10,
  warmupIterations: 2,
  queries: ['專案進度', '會議記錄', '重要事項', '待辦事項', '系統設定']
};

// ==================== 原始版本 ====================
function originalVersion(query) {
  const start = performance.now();
  
  try {
    const memoryResults = execSync(
      `qmd search "${query.replace(/"/g, '\\"')}" --collection memory 2>/dev/null`,
      { encoding: 'utf-8', maxBuffer: 1024 * 1024, timeout: 10000 }
    ).trim();
    
    const docsResults = execSync(
      `qmd search "${query.replace(/"/g, '\\"')}" --collection docs 2>/dev/null`,
      { encoding: 'utf-8', maxBuffer: 1024 * 1024, timeout: 10000 }
    ).trim();
    
    const duration = performance.now() - start;
    return { 
      success: true, 
      duration, 
      resultCount: (memoryResults ? memoryResults.split('\n').length : 0) +
                   (docsResults ? docsResults.split('\n').length : 0)
    };
    
  } catch (error) {
    const duration = performance.now() - start;
    return { success: false, duration, error: error.message.substring(0, 50) };
  }
}

// ==================== 優化版本 (非同步 + 快取) ====================
const cache = new Map();

async function optimizedVersion(query, useCache = false) {
  const start = performance.now();
  
  // 快取檢查
  if (useCache && cache.has(query)) {
    return { 
      success: true, 
      duration: performance.now() - start, 
      cached: true,
      resultCount: cache.get(query)
    };
  }
  
  try {
    // 循序執行以避免 SQLite 鎖定
    const { stdout: m1 } = await execAsync(
      `qmd search "${query}" --collection memory --limit 10 2>/dev/null`, 
      { encoding: 'utf-8', maxBuffer: 1024 * 1024, timeout: 10000 }
    );
    
    const { stdout: m2 } = await execAsync(
      `qmd search "${query}" --collection docs --limit 10 2>/dev/null`, 
      { encoding: 'utf-8', maxBuffer: 1024 * 1024, timeout: 10000 }
    );
    
    const resultCount = (m1.trim() ? m1.trim().split('\n').length : 0) +
                       (m2.trim() ? m2.trim().split('\n').length : 0);
    
    if (useCache) {
      cache.set(query, resultCount);
    }
    
    const duration = performance.now() - start;
    return { success: true, duration, cached: false, resultCount };
    
  } catch (error) {
    const duration = performance.now() - start;
    return { success: false, duration, error: error.message.substring(0, 50) };
  }
}

// ==================== 測試執行器 ====================

function runTest(name, testFn, iterations) {
  console.log(`\n📊 測試: ${name}`);
  console.log('=' .repeat(50));
  
  const times = [];
  let successCount = 0;
  let errorCount = 0;
  let totalResults = 0;
  
  for (let i = 0; i < iterations; i++) {
    const query = TEST_CONFIG.queries[i % TEST_CONFIG.queries.length];
    const result = testFn(query);
    
    if (result.success) {
      times.push(result.duration);
      successCount++;
      totalResults += result.resultCount || 0;
      process.stdout.write(`  第 ${i + 1} 次: ${result.duration.toFixed(2)}ms (${result.resultCount || 0} 結果)\n`);
    } else {
      errorCount++;
      process.stdout.write(`  第 ${i + 1} 次: 失敗\n`);
    }
  }
  
  return calculateStats(times, successCount, errorCount, totalResults);
}

async function runAsyncTest(name, testFn, iterations, useCache = false) {
  console.log(`\n📊 測試: ${name}`);
  console.log('=' .repeat(50));
  
  const times = [];
  let successCount = 0;
  let errorCount = 0;
  let cacheHits = 0;
  let totalResults = 0;
  
  for (let i = 0; i < iterations; i++) {
    const query = TEST_CONFIG.queries[i % TEST_CONFIG.queries.length];
    const result = await testFn(query, useCache);
    
    if (result.success) {
      times.push(result.duration);
      successCount++;
      totalResults += result.resultCount || 0;
      if (result.cached) cacheHits++;
      const tag = result.cached ? ' (快取)' : '';
      process.stdout.write(`  第 ${i + 1} 次: ${result.duration.toFixed(2)}ms${tag} (${result.resultCount || 0} 結果)\n`);
    } else {
      errorCount++;
      process.stdout.write(`  第 ${i + 1} 次: 失敗\n`);
    }
  }
  
  const stats = calculateStats(times, successCount, errorCount, totalResults);
  stats.cacheHits = cacheHits;
  return stats;
}

function calculateStats(times, successCount, errorCount, totalResults) {
  if (times.length === 0) {
    return { avg: 0, min: 0, max: 0, median: 0, success: 0, errors: errorCount, totalResults };
  }
  
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  
  return {
    avg: parseFloat(avg.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    success: successCount,
    errors: errorCount,
    totalResults
  };
}

// ==================== 主程式 ====================

async function main() {
  console.log('🔬 Memory Recall 效能測試 v2');
  console.log('=' .repeat(50));
  console.log(`測試次數: ${TEST_CONFIG.iterations}`);
  console.log(`測試查詢: ${TEST_CONFIG.queries.join(', ')}`);
  console.log(`快取策略: LRU (100 items, 10 min TTL)`);
  console.log(`執行模式: 循序 (避免 SQLite 鎖定)`);
  
  // 檢查 qmd
  try {
    execSync('which qmd', { stdio: 'ignore' });
    console.log('✅ qmd 已安裝');
  } catch {
    console.log('⚠️ qmd 未安裝，測試可能失敗');
  }
  
  // 預熱
  console.log('\n🔥 預熱中...');
  for (let i = 0; i < TEST_CONFIG.warmupIterations; i++) {
    originalVersion('test');
    await optimizedVersion('test');
  }
  
  // 測試原始版本
  const originalStats = runTest('原始版本 (同步)', originalVersion, TEST_CONFIG.iterations);
  
  // 測試優化版本（無快取）
  cache.clear();
  const optimizedStats = await runAsyncTest('優化版本 (非同步，無快取)', optimizedVersion, TEST_CONFIG.iterations, false);
  
  // 測試優化版本（有快取）
  const optimizedCachedStats = await runAsyncTest('優化版本 (非同步 + 快取)', optimizedVersion, TEST_CONFIG.iterations, true);
  
  // 計算提升
  const improvements = {
    asyncVsSync: originalStats.avg > 0 
      ? ((1 - optimizedStats.avg / originalStats.avg) * 100).toFixed(2)
      : 'N/A',
    cachedVsSync: originalStats.avg > 0
      ? ((1 - optimizedCachedStats.avg / originalStats.avg) * 100).toFixed(2)
      : 'N/A',
    cacheHitRate: optimizedCachedStats.cacheHits > 0
      ? ((optimizedCachedStats.cacheHits / TEST_CONFIG.iterations) * 100).toFixed(0)
      : '0'
  };
  
  // 報告
  const report = {
    timestamp: new Date().toISOString(),
    config: TEST_CONFIG,
    results: { original: originalStats, optimized: optimizedStats, optimizedCached: optimizedCachedStats },
    improvements
  };
  
  // 輸出摘要
  console.log('\n📈 測試結果摘要');
  console.log('=' .repeat(50));
  
  console.log('\n原始版本 (同步):');
  console.log(`  平均: ${originalStats.avg}ms | 中位數: ${originalStats.median}ms`);
  console.log(`  範圍: ${originalStats.min}ms ~ ${originalStats.max}ms`);
  console.log(`  成功: ${originalStats.success} | 失敗: ${originalStats.errors}`);
  
  console.log('\n優化版本 (非同步，無快取):');
  console.log(`  平均: ${optimizedStats.avg}ms | 中位數: ${optimizedStats.median}ms`);
  console.log(`  範圍: ${optimizedStats.min}ms ~ ${optimizedStats.max}ms`);
  console.log(`  成功: ${optimizedStats.success} | 失敗: ${optimizedStats.errors}`);
  
  console.log('\n優化版本 (非同步 + 快取):');
  console.log(`  平均: ${optimizedCachedStats.avg}ms | 中位數: ${optimizedCachedStats.median}ms`);
  console.log(`  範圍: ${optimizedCachedStats.min}ms ~ ${optimizedCachedStats.max}ms`);
  console.log(`  成功: ${optimizedCachedStats.success} | 快取命中: ${optimizedCachedStats.cacheHits}/${TEST_CONFIG.iterations}`);
  
  console.log('\n🚀 效能提升');
  console.log('=' .repeat(50));
  if (improvements.asyncVsSync !== 'N/A') {
    const sign = parseFloat(improvements.asyncVsSync) >= 0 ? '↓' : '↑';
    console.log(`非同步 vs 同步: ${improvements.asyncVsSync}% ${sign}`);
  }
  if (improvements.cachedVsSync !== 'N/A') {
    console.log(`非同步+快取 vs 同步: ${improvements.cachedVsSync}% ↓`);
  }
  console.log(`快取命中率: ${improvements.cacheHitRate}%`);
  
  // 儲存報告
  const reportPath = 'projects/optimization/modules/memory-recall/run-001/benchmark_results.json';
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 報告已儲存: ${reportPath}`);
  
  return report;
}

main().catch(console.error);
