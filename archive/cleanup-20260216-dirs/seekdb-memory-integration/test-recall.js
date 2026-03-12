import { AgentMemory } from './src/memory/AgentMemory.js';
import { createClient } from './src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function runTest() {
  console.log("🚀 Starting SeekDB Memory Test...");

  const client = await createClient();
  const memory = new AgentMemory(client, 'test_memory'); // 使用一个独立的测试 collection
  await memory.init();

  console.log(`📊 Initial Memory Stats: ${await memory.stats().then(s => s.totalMessages)} messages stored`);

  // 1. 存储对话
  const userName = "老蔡";
  await memory.store('user', `你好，我叫${userName}`);
  console.log(`✅ Stored: 你好，我叫${userName}`);

  // 2. 召回相关记忆
  const query = "我全名叫什麼？";
  console.log(`🔍 Recalling memories for query: \"${query}\"...`);
  const relevant = await memory.recall(query, {
    strategy: 'threshold',
    threshold: 0.5
  });

  console.log("--- Recalled Memories ---");
  if (relevant.length > 0) {
    relevant.forEach(mem => {
      console.log(`[${mem.role}] ${mem.message} (Similarity: ${mem.similarity})`);
    });
  } else {
    console.log("No relevant memories found.");
  }
  console.log("-------------------------");

  // 清空测试数据
  await memory.clear();
  console.log("🧹 Test memory cleared.");

  console.log("✅ SeekDB Memory Test Finished.");
}

runTest().catch(console.error);