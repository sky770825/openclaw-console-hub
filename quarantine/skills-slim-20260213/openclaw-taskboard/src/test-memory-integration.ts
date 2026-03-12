/**
 * SeekDB 記憶整合測試腳本
 * 
 * 測試任務板與 SeekDB 記憶系統的整合
 */

import { getCenter } from './taskboard-center';
import { memoryIntegration } from './lib/memory-integration';

async function testMemoryIntegration() {
  console.log('🧪 開始測試 SeekDB 記憶整合\n');
  console.log('=' .repeat(50));

  // 1. 測試記憶系統初始化
  console.log('\n📌 測試 1: 記憶系統初始化');
  try {
    const initialized = await memoryIntegration.initialize();
    console.log(initialized ? '✅ 記憶系統初始化成功' : '⚠️ 記憶系統初始化失敗（可能 SeekDB 未運行）');
  } catch (error) {
    console.log('⚠️ 記憶系統初始化失敗:', error);
  }

  // 2. 測試中控台創建
  console.log('\n📌 測試 2: 中控台創建與初始化');
  const center = getCenter({
    memory: {
      enabled: true,
      recordFailures: true,
      similarityThreshold: 0.5
    }
  });
  center.initialize();
  console.log('✅ 中控台初始化成功');

  // 3. 測試任務指派（帶記憶查詢）
  console.log('\n📌 測試 3: 任務指派（帶記憶查詢）');
  try {
    const taskResult = await center.assignTask(
      '建立一個處理 JSON 資料的 Python 腳本',
      { useMemory: true }
    );
    console.log('✅ 任務指派成功');
    console.log('   Workflow ID:', taskResult.workflowId);
    console.log('   分析結果:', taskResult.analysis);
    if (taskResult.memoryContext) {
      console.log('   記憶上下文:', taskResult.memoryContext.summary);
    } else {
      console.log('   記憶上下文: 無');
    }
  } catch (error) {
    console.log('❌ 任務指派失敗:', error);
  }

  // 4. 測試記憶統計
  console.log('\n📌 測試 4: 記憶統計查詢');
  try {
    const stats = await center.getMemoryStats();
    console.log('✅ 記憶統計:', stats);
  } catch (error) {
    console.log('⚠️ 記憶統計查詢失敗:', error);
  }

  // 5. 測試記憶查詢 API
  console.log('\n📌 測試 5: 記憶查詢');
  try {
    const memories = await center.queryMemories('Python 腳本', { limit: 3 });
    console.log('✅ 查詢成功，找到', memories.length, '條記憶');
  } catch (error) {
    console.log('⚠️ 記憶查詢失敗:', error);
  }

  // 6. 測試手動記錄記憶
  console.log('\n📌 測試 6: 手動記錄記憶');
  try {
    const success = await center.recordMemory({
      id: `test-mem-${Date.now()}`,
      taskDescription: '測試任務：建立 API 端點',
      taskType: 'coding',
      complexity: 'medium',
      agentType: 'cursor',
      status: 'success',
      result: '成功建立 REST API',
      timestamp: Date.now()
    });
    console.log(success ? '✅ 記憶記錄成功' : '⚠️ 記憶記錄失敗');
  } catch (error) {
    console.log('⚠️ 記憶記錄失敗:', error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 測試完成！');
  
  // 關閉中控台
  center.shutdown();
}

// 執行測試
testMemoryIntegration().catch(console.error);
