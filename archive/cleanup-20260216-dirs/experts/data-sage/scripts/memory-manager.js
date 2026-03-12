#!/usr/bin/env node
// memory-manager.js - DataSage 核心記憶管理工具 v0.1
//
// 功能: 管理 SeekDB 向量記憶系統，提供記憶導入、查詢和維護功能。
//
// 用法: node memory-manager.js <指令> [選項]
// 指令:
//   status          檢查記憶系統狀態
//   import          導入現有記憶檔案到 SeekDB
//   search <query>  搜尋相關記憶
//   stats           顯示記憶統計資訊
//   help            顯示此說明

import { createClient } from '../../../seekdb-memory-integration/src/config/database.js';
import { AgentMemory } from '../../../seekdb-memory-integration/src/memory/AgentMemory.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_PATH = process.env.OPENCLAW_WORKSPACE || path.resolve(process.env.HOME || '', '.openclaw/workspace');
const MEMORY_DIR = path.join(WORKSPACE_PATH, 'memory');
const MAIN_MEMORY_FILE = path.join(WORKSPACE_PATH, 'MEMORY.md');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(level, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  let color = colors.reset;
  switch (level) {
    case 'INFO': color = colors.blue; break;
    case 'SUCCESS': color = colors.green; break;
    case 'WARN': color = colors.yellow; break;
    case 'ERROR': color = colors.red; break;
  }
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}[${level}]${colors.reset} ${message}`);
}

// 檢查系統狀態
async function checkStatus() {
  log('INFO', '檢查記憶系統狀態...');
  
  try {
    // 檢查 SeekDB 連接
    const client = await createClient();
    const memory = new AgentMemory(client, 'agent_long_term_memory');
    await memory.init();
    
    log('SUCCESS', 'SeekDB 連接正常');
    
    // 獲取統計
    const stats = await memory.stats();
    log('INFO', `記憶庫中已有 ${stats.totalMessages} 條記憶`);
    
    return true;
  } catch (error) {
    log('ERROR', `系統狀態異常: ${error.message}`);
    return false;
  }
}

// 簡單的文本分塊
function chunkText(text, metadata) {
  const chunks = [];
  const lines = text.split('\n');
  let currentChunk = {
    content: [],
    type: metadata.type,
    source: metadata.source,
    date: metadata.date,
  };

  for (const line of lines) {
    if (line.trim() === '' && currentChunk.content.length > 0) {
      chunks.push({ ...currentChunk, content: currentChunk.content.join('\n') });
      currentChunk.content = [];
    } else if (line.startsWith('#') && currentChunk.content.length > 0) {
      chunks.push({ ...currentChunk, content: currentChunk.content.join('\n') });
      currentChunk.content = [line];
    } else {
      currentChunk.content.push(line);
    }
  }

  if (currentChunk.content.length > 0) {
    chunks.push({ ...currentChunk, content: currentChunk.content.join('\n') });
  }

  return chunks.filter(chunk => chunk.content.trim() !== '');
}

// 導入現有記憶
async function importMemories() {
  log('INFO', '開始導入現有記憶...');
  
  let totalImported = 0;
  
  try {
    const client = await createClient();
    const memory = new AgentMemory(client, 'agent_long_term_memory');
    await memory.init();

    // 導入 MEMORY.md
    log('INFO', `導入 ${MAIN_MEMORY_FILE}...`);
    try {
      const mainContent = await fs.readFile(MAIN_MEMORY_FILE, 'utf8');
      const chunks = chunkText(mainContent, { source: 'MEMORY.md', type: 'summary', date: 'current' });
      for (const chunk of chunks) {
        if (chunk.content.length > 50) {
          await memory.store('system', chunk.content, { source: chunk.source, type: chunk.type });
          totalImported++;
        }
      }
      log('SUCCESS', `已導入 MEMORY.md`);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      log('WARN', 'MEMORY.md 不存在');
    }

    // 導入每日記憶
    log('INFO', `導入每日記憶...`);
    try {
      const files = await fs.readdir(MEMORY_DIR);
      const mdFiles = files.filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/));
      
      for (const file of mdFiles) {
        const filePath = path.join(MEMORY_DIR, file);
        const date = file.split('.')[0];
        const content = await fs.readFile(filePath, 'utf8');
        const chunks = chunkText(content, { source: `daily/${file}`, type: 'daily_log', date });
        
        for (const chunk of chunks) {
          if (chunk.content.length > 50) {
            await memory.store('system', chunk.content, { source: chunk.source, type: chunk.type, date: chunk.date });
            totalImported++;
          }
        }
      }
      log('SUCCESS', `已導入 ${mdFiles.length} 個每日記憶檔案`);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    log('SUCCESS', `總共導入 ${totalImported} 條記憶片段`);
    
    const stats = await memory.stats();
    log('INFO', `記憶庫現在共有 ${stats.totalMessages} 條記憶`);
    
    return totalImported;
  } catch (error) {
    log('ERROR', `導入失敗: ${error.message}`);
    return 0;
  }
}

// 搜尋記憶
async function searchMemories(query, limit = 5) {
  log('INFO', `搜尋記憶: "${query}"`);
  
  try {
    const client = await createClient();
    const memory = new AgentMemory(client, 'agent_long_term_memory');
    await memory.init();
    
    const results = await memory.recall(query, {
      strategy: 'limit',
      limit: limit,
    });
    
    if (results.length === 0) {
      log('INFO', '未找到相關記憶');
      return [];
    }
    
    log('SUCCESS', `找到 ${results.length} 條相關記憶`);
    
    results.forEach((result, index) => {
      const similarity = Math.round((result.similarity || result.score || 0) * 100);
      console.log(`\n${colors.cyan}[${index + 1}]${colors.reset} 相似度: ${similarity}% | 來源: ${result.metadata?.source || 'unknown'}`);
      console.log(`${colors.dim}${result.content.substring(0, 200)}...${colors.reset}`);
    });
    
    return results;
  } catch (error) {
    log('ERROR', `搜尋失敗: ${error.message}`);
    return [];
  }
}

// 顯示統計資訊
async function showStats() {
  log('INFO', '獲取記憶統計資訊...');
  
  try {
    const client = await createClient();
    const memory = new AgentMemory(client, 'agent_long_term_memory');
    await memory.init();
    
    const stats = await memory.stats();
    
    console.log(`\n${colors.bright}記憶系統統計${colors.reset}`);
    console.log(`==================`);
    console.log(`總記憶數: ${stats.totalMessages || 0}`);
    console.log(`集合名稱: ${stats.collection || 'agent_long_term_memory'}`);
    
  } catch (error) {
    log('ERROR', `獲取統計失敗: ${error.message}`);
  }
}

// 主程式
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'status':
      await checkStatus();
      break;
      
    case 'import':
      await importMemories();
      break;
      
    case 'search':
      if (!args[0]) {
        log('ERROR', '請提供搜尋關鍵字');
        process.exit(1);
      }
      await searchMemories(args[0], parseInt(args[1]) || 5);
      break;
      
    case 'stats':
      await showStats();
      break;
      
    case 'help':
    default:
      console.log(`
${colors.bright}DataSage 記憶管理工具 v0.1${colors.reset}

用法: node memory-manager.js <指令> [選項]

指令:
  status              檢查記憶系統狀態
  import              導入現有記憶檔案到 SeekDB
  search <query>      搜尋相關記憶 [數量限制]
  stats               顯示記憶統計資訊
  help                顯示此說明

範例:
  node memory-manager.js status
  node memory-manager.js import
  node memory-manager.js search "OpenClaw 設定" 10
  node memory-manager.js stats
`);
  }
}

main().catch(console.error);
