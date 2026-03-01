#!/usr/bin/env node
/**
 * Memory Recall using QMD
 * Replaces SeekDB-based recall with local QMD search
 */

import { execSync } from 'child_process';

const query = process.argv[2];

if (!query) {
  console.error("Error: Query text is required.");
  console.error("Usage: node memory_recall.js \"your query\"");
  process.exit(1);
}

try {
  console.log(`🔍 Searching memories for: "${query}"...`);
  
  // 使用 QMD hybrid search (BM25 + 向量搜尋)
  // 先搜 memory collection，再搜 docs collection
  const memoryResults = execSync(
    `qmd search "${query.replace(/"/g, '\\"')}" --collection memory`,
    { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
  ).trim();
  
  const docsResults = execSync(
    `qmd search "${query.replace(/"/g, '\\"')}" --collection docs`,
    { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
  ).trim();
  
  const results = {
    query: query,
    timestamp: new Date().toISOString(),
    sources: {
      memory: memoryResults ? memoryResults.split('\n') : [],
      docs: docsResults ? docsResults.split('\n') : []
    }
  };
  
  console.log(JSON.stringify(results, null, 2));
  
} catch (error) {
  console.error("❌ Memory recall failed:", error.message);
  console.error("\n💡 Tips:");
  console.error("  - Check QMD is installed: which qmd");
  console.error("  - List collections: qmd collection list");
  console.error("  - Update index: qmd update");
  process.exit(1);
}
