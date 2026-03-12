import fs from 'fs/promises';
import path from 'path';
import { AgentMemory } from '../src/memory/AgentMemory.js';
import { createClient } from '../src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const WORKSPACE_PATH = process.env.OPENCLAW_WORKSPACE || path.resolve(process.env.HOME || '', '.openclaw/workspace');
const MEMORY_DIR = path.join(WORKSPACE_PATH, 'memory');
const MAIN_MEMORY_FILE = path.join(WORKSPACE_PATH, 'MEMORY.md');

async function readMemoryFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Memory file not found: ${filePath}`);
      return null;
    }
    throw error;
  }
}

// 简单的文本分块函数，按段落和标题分块
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
      // 空行结束一个段落
      chunks.push({ ...currentChunk, content: currentChunk.content.join('\n') });
      currentChunk.content = [];
    } else if (line.startsWith('#') && currentChunk.content.length > 0) {
      // 遇到新标题，结束当前段落
      chunks.push({ ...currentChunk, content: currentChunk.content.join('\n') });
      currentChunk.content = [line]; // 新标题作为新块的开始
    } else {
      currentChunk.content.push(line);
    }
  }

  if (currentChunk.content.length > 0) {
    chunks.push({ ...currentChunk, content: currentChunk.content.join('\n') });
  }

  // 过滤掉空块
  return chunks.filter(chunk => chunk.content.trim() !== '');
}

async function importMemoryToSeekDB() {
  console.log("🚀 Starting memory import to SeekDB...");

  const client = await createClient();
  // 使用一个专门的 collection 存储 Agent 的记忆
  const memoryCollection = new AgentMemory(client, 'agent_long_term_memory');
  await memoryCollection.init();

  // 清空旧数据 (可选，测试阶段方便)
  // await memoryCollection.clear();

  let totalChunksImported = 0;

  // --- 导入 MEMORY.md ----
  console.log(`Importing ${MAIN_MEMORY_FILE}...`);
  const mainMemoryContent = await readMemoryFile(MAIN_MEMORY_FILE);
  if (mainMemoryContent) {
    const chunks = chunkText(mainMemoryContent, { source: 'MEMORY.md', type: 'summary', date: 'current' });
    for (const chunk of chunks) {
      if (chunk.content.length > 50) { // 过滤掉过短的片段
        await memoryCollection.store('system', chunk.content, { source: chunk.source, type: chunk.type, date: chunk.date });
        totalChunksImported++;
      }
    }
  }

  // --- 导入每日记忆 (memory/YYYY-MM-DD.md) ---
  console.log(`Importing daily memories from ${MEMORY_DIR}...`);
  const dailyMemoryFiles = await fs.readdir(MEMORY_DIR);
  for (const file of dailyMemoryFiles) {
    if (file.match(/^\\d{4}-\\d{2}-\\d{2}\\.md$/)) {
      const filePath = path.join(MEMORY_DIR, file);
      const date = file.split('.')[0];
      console.log(`  Processing daily memory: ${file}`);
      const dailyContent = await readMemoryFile(filePath);
      if (dailyContent) {
        const chunks = chunkText(dailyContent, { source: `daily_log/${file}`, type: 'daily_log', date });
        for (const chunk of chunks) {
          if (chunk.content.length > 50) {
            await memoryCollection.store('system', chunk.content, { source: chunk.source, type: chunk.type, date: chunk.date });
            totalChunksImported++;
          }
        }
      }
    }
  }

  // --- 导入锚点记忆 (memory/anchors/anchor-<task>.md) ---
  console.log(`Importing anchor memories from ${path.join(MEMORY_DIR, 'anchors')}...`);
  const anchorsDir = path.join(MEMORY_DIR, 'anchors');
  try {
    const anchorFiles = await fs.readdir(anchorsDir);
    for (const file of anchorFiles) {
      if (file.match(/^anchor-.+\\.md$/)) {
        const filePath = path.join(anchorsDir, file);
        const taskName = file.match(/^anchor-(.+)\\.md$/)[1];
        console.log(`  Processing anchor memory: ${file}`);
        const anchorContent = await readMemoryFile(filePath);
        if (anchorContent) {
          const chunks = chunkText(anchorContent, { source: `anchor/${file}`, type: 'task_anchor', task: taskName, date: 'current' });
          for (const chunk of chunks) {
            if (chunk.content.length > 50) {
              await memoryCollection.store('system', chunk.content, { source: chunk.source, type: chunk.type, task: chunk.task, date: chunk.date });
              totalChunksImported++;
            }
          }
        }
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Anchor directory not found: ${anchorsDir}. Skipping.`);
    } else {
      throw error;
    }
  }

  console.log(`
✅ Memory import to SeekDB finished! Total chunks imported: ${totalChunksImported}`);
  const stats = await memoryCollection.stats();
  console.log(`📊 Final SeekDB Memory Stats: ${stats.totalMessages} messages stored`);
}

importMemoryToSeekDB().catch(console.error);
