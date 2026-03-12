/**
 * Anti-Stuck System 使用範例
 * 
 * 展示如何整合 Circuit Breaker、Parallel Executor 和 Watchdog
 */

import {
  // Circuit Breaker
  circuitBreaker,
  withCircuitBreaker,
  CircuitState,
  
  // Parallel Executor
  parallelExecutor,
  executeParallel,
  
  // Watchdog
  watchdog,
  createTelegramNotifier,
  createLogNotifier,
  
  // 整合功能
  initializeAntiStuck,
  getHealthReport
} from './anti-stuck-index';

// ============================================================
// 範例 1: 基本初始化
// ============================================================

export function example1_BasicSetup() {
  // 初始化所有防卡機制
  const { circuitBreaker, parallelExecutor, watchdog } = initializeAntiStuck({
    circuitBreaker: {
      failureThreshold: 3,      // 連續失敗 3 次後斷路
      recoveryTimeout: 300000,  // 5 分鐘後嘗試恢復
    },
    watchdog: {
      checkIntervalMs: 30000,   // 每 30 秒檢查一次
      stuckThresholdMs: 300000, // 5 分鐘無回應視為卡住
      autoKillStuck: true,      // 自動終止卡住任務
      notifyOnStuck: true       // 發送通知
    }
  });

  // 啟動 Watchdog
  watchdog.start();

  // 註冊通知處理器
  watchdog.onAlert(createLogNotifier());
  
  return { circuitBreaker, parallelExecutor, watchdog };
}

// ============================================================
// 範例 2: Circuit Breaker 使用
// ============================================================

export async function example2_CircuitBreaker() {
  const agentId = 'cursor-agent';

  // 檢查是否可以執行
  const check = circuitBreaker.canExecute(agentId);
  if (!check.allowed) {
    console.log(`無法執行: ${check.reason}`);
    return;
  }

  try {
    // 執行任務
    await executeTask(agentId);
    
    // 記錄成功
    circuitBreaker.recordSuccess(agentId);
    console.log('任務執行成功');
    
  } catch (error) {
    // 記錄失敗
    circuitBreaker.recordFailure(agentId);
    console.error('任務執行失敗:', error);
  }
}

// 使用包裝函數簡化
export async function example2_CircuitBreakerSimple() {
  try {
    const result = await withCircuitBreaker('cursor-agent', async () => {
      // 這裡是實際的任務邏輯
      return await executeTask('cursor-agent');
    });
    console.log('結果:', result);
  } catch (error) {
    console.error('執行失敗或被斷路:', error);
  }
}

// 查看斷路器狀態
export function example2_CheckStatus() {
  // 獲取所有 Agent 狀態
  const allStates = circuitBreaker.getAllStates();
  console.log('所有 Agent 狀態:', allStates);

  // 獲取摘要
  const summary = circuitBreaker.getSummary();
  console.log('摘要:', summary);
  // 輸出: { totalAgents: 5, closed: 3, open: 1, halfOpen: 1 }
}

// ============================================================
// 範例 3: Parallel Executor 使用
// ============================================================

export async function example3_ParallelExecution() {
  // 定義子任務
  const subTasks = [
    { id: 'research-1', task: '研究競爭對手 A', agentId: 'research-agent' },
    { id: 'research-2', task: '研究競爭對手 B', agentId: 'research-agent' },
    { id: 'research-3', task: '研究競爭對手 C', agentId: 'research-agent' },
  ];

  // 平行執行
  const result = await parallelExecutor.execute('market-research', subTasks, {
    maxConcurrency: 2,      // 最多同時執行 2 個
    timeoutSeconds: 300,    // 每個任務 5 分鐘超時
    continueOnError: true   // 一個失敗不影響其他
  });

  console.log('執行結果:', result);
  // {
  //   taskId: 'market-research',
  //   totalTasks: 3,
  //   completedTasks: 3,
  //   failedTasks: 0,
  //   results: [...],
  //   totalExecutionTimeMs: 180000,
  //   allSuccessful: true
  // }
}

// 快速執行多個任務
export async function example3_QuickParallel() {
  const tasks = [
    '生成產品描述',
    '生成行銷文案',
    '生成社群貼文',
    '生成電子郵件內容'
  ];

  const result = await executeParallel('content-generation', tasks, {
    maxConcurrency: 4,
    timeoutSeconds: 180
  });

  // 處理結果
  for (const subResult of result.results) {
    if (subResult.success) {
      console.log(`✅ ${subResult.subTaskId}: 成功 (${subResult.executionTimeMs}ms)`);
    } else {
      console.log(`❌ ${subResult.subTaskId}: 失敗 - ${subResult.error}`);
    }
  }
}

// ============================================================
// 範例 4: Watchdog 使用
// ============================================================

export function example4_Watchdog() {
  // 啟動看門狗
  watchdog.start();

  // 註冊新任務
  watchdog.registerTask('task-001', 'run-001', 'cursor-agent');

  // 在任務執行過程中定期發送心跳
  setInterval(() => {
    watchdog.heartbeat('run-001');
  }, 10000); // 每 10 秒一次

  // 任務完成時標記
  // watchdog.completeTask('run-001');
}

// 整合 Telegram 通知
export function example4_TelegramNotification() {
  // 模擬發送 Telegram 訊息的函數
  const sendTelegramMessage = async (message: string) => {
    // 實際實現會呼叫 Telegram Bot API
    console.log('發送 Telegram:', message);
  };

  // 創建 Telegram 通知處理器
  const telegramNotifier = createTelegramNotifier(sendTelegramMessage);

  // 註冊到 Watchdog
  watchdog.onAlert(telegramNotifier);

  // 啟動
  watchdog.start();
}

// 獲取健康狀態
export function example4_HealthCheck() {
  // 獲取當前健康狀態
  const health = watchdog.getHealthStatus();
  console.log('健康狀態:', health);
  // {
  //   status: 'healthy', // 'healthy' | 'degraded' | 'critical'
  //   totalTasks: 10,
  //   runningTasks: 5,
  //   stuckTasks: 0,
  //   killedTasks: 0,
  //   averageExecutionTime: 120000,
  //   lastCheckTime: 1234567890
  // }

  // 獲取歷史記錄
  const history = watchdog.getHealthHistory();
  console.log('歷史記錄數量:', history.length);
}

// ============================================================
// 範例 5: 整合到 Express API
// ============================================================

import { Router } from 'express';

export function example5_ExpressRoutes(): Router {
  const router = Router();

  // 健康檢查端點
  router.get('/health', (req, res) => {
    const report = getHealthReport();
    res.json(report);
  });

  // 斷路器狀態
  router.get('/circuit-breaker/status', (req, res) => {
    res.json({
      summary: circuitBreaker.getSummary(),
      agents: circuitBreaker.getAllStates()
    });
  });

  // 重置斷路器
  router.post('/circuit-breaker/reset/:agentId', (req, res) => {
    const { agentId } = req.params;
    circuitBreaker.reset(agentId);
    res.json({ message: `Agent ${agentId} 已重置` });
  });

  // Watchdog 狀態
  router.get('/watchdog/status', (req, res) => {
    res.json({
      health: watchdog.getHealthStatus(),
      tasks: watchdog.getAllTasks(),
      stuckTasks: watchdog.getStuckTasks()
    });
  });

  // 強制終止任務
  router.post('/watchdog/kill/:runId', async (req, res) => {
    const { runId } = req.params;
    const success = await watchdog.killTask(runId, '手動終止');
    res.json({ success, message: success ? '已終止' : '終止失敗' });
  });

  return router;
}

// ============================================================
// 範例 6: 完整整合到任務執行流程
// ============================================================

export async function example6_FullIntegration() {
  // 1. 初始化
  const { circuitBreaker, parallelExecutor, watchdog } = example1_BasicSetup();

  // 2. 設定 Telegram 通知
  example4_TelegramNotification();

  // 3. 定義任務
  const taskId = 'complex-analysis';
  const subTasks = [
    { id: 'step-1', task: '資料收集', agentId: 'data-agent' },
    { id: 'step-2', task: '資料分析', agentId: 'analysis-agent' },
    { id: 'step-3', task: '報告生成', agentId: 'report-agent' }
  ];

  // 4. 使用斷路器包裝執行
  await withCircuitBreaker('task-executor', async () => {
    // 註冊任務到 Watchdog
    const runId = `run-${Date.now()}`;
    watchdog.registerTask(taskId, runId, 'parallel-executor');

    try {
      // 執行平行子任務
      const result = await parallelExecutor.execute(taskId, subTasks, {
        maxConcurrency: 3,
        timeoutSeconds: 600,
        continueOnError: false // 一個失敗就全部停止
      });

      // 標記完成
      watchdog.completeTask(runId);

      return result;
    } catch (error) {
      // 發生錯誤也標記完成
      watchdog.completeTask(runId);
      throw error;
    }
  });
}

// ============================================================
// 輔助函數（模擬）
// ============================================================

async function executeTask(agentId: string): Promise<any> {
  // 模擬任務執行
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true, agentId }), 1000);
  });
}

// ============================================================
// 主入口
// ============================================================

if (require.main === module) {
  console.log('🚀 Anti-Stuck System 範例');
  console.log('========================');
  console.log('');
  console.log('可用的範例函數:');
  console.log('- example1_BasicSetup()');
  console.log('- example2_CircuitBreaker()');
  console.log('- example3_ParallelExecution()');
  console.log('- example4_Watchdog()');
  console.log('- example5_ExpressRoutes()');
  console.log('- example6_FullIntegration()');
}
