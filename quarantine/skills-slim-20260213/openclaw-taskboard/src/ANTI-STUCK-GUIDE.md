# Anti-Stuck System (防卡機制) - 使用指南

## 概述

三層防護機制，確保 OpenClaw 任務板穩定運行：

1. **Circuit Breaker** - 斷路器模式，防止雪崩效應
2. **Parallel Executor** - 平行執行，提高效率並隔離故障
3. **Watchdog** - 看門狗監控，自動恢復機制

---

## 快速開始

```typescript
import { initAntiStuckSystem, withCircuitBreaker, executeInParallel } from './anti-stuck-index';

// 初始化防卡系統
const { circuitBreaker, watchdog, parallelExecutor } = initAntiStuckSystem({
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeout: 5 * 60 * 1000  // 5 分鐘
  },
  watchdog: {
    checkIntervalMs: 30 * 1000,     // 30 秒
    stuckThresholdMs: 5 * 60 * 1000, // 5 分鐘
    notifyTelegram: true,
    telegramChatId: 'your-chat-id'
  }
});
```

---

## 1. Circuit Breaker (斷路器)

### 基本概念

```
CLOSED (正常) → 連續失敗 → OPEN (斷路) → 冷卻時間 → HALF_OPEN (測試) → 成功 → CLOSED
                                                      ↓
                                                   失敗 → OPEN
```

### 使用方式

```typescript
import { withCircuitBreaker, circuitBreaker, CircuitState } from './anti-stuck-index';

// 方式一：使用包裝函數
async function executeTask() {
  try {
    const result = await withCircuitBreaker('agent-1', async () => {
      // 你的任務邏輯
      return await fetchData();
    });
    return result;
  } catch (error) {
    if (error.message.includes('斷路')) {
      console.log('Agent 目前不可用，請稍後再試');
    }
    throw error;
  }
}

// 方式二：手動控制
const check = circuitBreaker.canExecute('agent-1');
if (!check.allowed) {
  console.log(`無法執行: ${check.reason}`);
  return;
}

try {
  const result = await executeTask();
  circuitBreaker.recordSuccess('agent-1');
} catch (error) {
  circuitBreaker.recordFailure('agent-1');
}

// 查看斷路器狀態
const summary = circuitBreaker.getSummary();
console.log(`斷路器狀態: 正常 ${summary.closed}, 斷路 ${summary.open}, 測試 ${summary.halfOpen}`);

// 查看特定 Agent 狀態
const state = circuitBreaker.getState('agent-1');
if (state?.state === CircuitState.OPEN) {
  console.log('該 Agent 目前斷路中');
}

// 手動重置
circuitBreaker.reset('agent-1');
```

### 配置選項

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;    // 連續失敗多少次後斷路 (預設 3)
  recoveryTimeout: number;     // 冷卻時間 ms (預設 5 分鐘)
  halfOpenMaxCalls: number;    // 測試狀態最大請求數 (預設 1)
}
```

---

## 2. Parallel Executor (平行執行器)

### 使用方式

```typescript
import { executeInParallel, splitTask, parallelExecutor } from './anti-stuck-index';

// 定義子任務
const subTasks = [
  { id: 'research-1', task: '研究競品 A 的功能特點', agentId: 'researcher' },
  { id: 'research-2', task: '研究競品 B 的功能特點', agentId: 'researcher' },
  { id: 'research-3', task: '研究競品 C 的功能特點', agentId: 'researcher' }
];

// 平行執行
const result = await executeInParallel(subTasks, {
  maxConcurrency: 2,      // 最多同時執行 2 個
  timeoutSeconds: 300,    // 每個任務 5 分鐘超時
  continueOnError: true,  // 任一失敗繼續執行其他
  abortOnError: false     // 不要中止其他任務
});

// 處理結果
console.log(`成功: ${result.completedCount}, 失敗: ${result.failedCount}`);
console.log(`總耗時: ${result.totalExecutionTime}ms`);

result.results.forEach(r => {
  if (r.success) {
    console.log(`${r.taskId}: ${r.result}`);
  } else {
    console.error(`${r.taskId} 失敗: ${r.error}`);
  }
});

// 快速拆分任務
const tasks = splitTask(
  '請研究以下競品：',
  ['競品 A: Apple', '競品 B: Google', '競品 C: Microsoft'],
  'researcher'
);
```

### 配置選項

```typescript
interface ParallelExecutionConfig {
  maxConcurrency: number;    // 最大並行數量 (預設 3)
  timeoutSeconds: number;    // 單個任務超時 (預設 300)
  continueOnError: boolean;  // 任一失敗是否繼續 (預設 true)
  abortOnError: boolean;     // 是否中止其他任務 (預設 false)
}
```

### 中止任務

```typescript
// 中止特定任務
parallelExecutor.abort('research-1');

// 中止所有任務
parallelExecutor.abortAll();

// 查看正在執行的任務數
console.log(`執行中: ${parallelExecutor.getRunningCount()}`);
```

---

## 3. Watchdog (看門狗)

### 使用方式

```typescript
import { startWatchdog, watchdog, createHealthCheckEndpoint } from './anti-stuck-index';
import express from 'express';

// 啟動看門狗
startWatchdog({
  checkIntervalMs: 30 * 1000,      // 每 30 秒檢查
  stuckThresholdMs: 5 * 60 * 1000, // 5 分鐘無回應視為卡住
  maxRetries: 2,                    // 最多重試 2 次
  notifyTelegram: true,
  telegramChatId: '5819565005'
});

// 註冊任務
watchdog.registerTask('task-123', 'agent-1', { 
  type: 'data-processing',
  priority: 'high'
});

// 定期發送心跳（在任務執行過程中）
function longRunningTask() {
  const interval = setInterval(() => {
    watchdog.heartbeat('task-123');
  }, 10000); // 每 10 秒心跳

  try {
    // 執行任務...
    processData();
    
    // 任務完成
    watchdog.completeTask('task-123');
  } catch (error) {
    watchdog.failTask('task-123', error.message);
  } finally {
    clearInterval(interval);
  }
}

// Express 健康檢查端點
const app = express();
app.get('/health', createHealthCheckEndpoint());
```

### 健康檢查 API 回應

```json
// 健康狀態 (HTTP 200)
{
  "status": "healthy",
  "timestamp": 1770763500000,
  "summary": {
    "totalTasks": 5,
    "running": 3,
    "stuck": 0,
    "failed": 0,
    "recovered": 0
  }
}

// 異常狀態 (HTTP 503)
{
  "status": "unhealthy",
  "timestamp": 1770763500000,
  "summary": {
    "totalTasks": 5,
    "running": 2,
    "stuck": 2,
    "failed": 1,
    "recovered": 0
  },
  "stuckTasks": [
    {
      "taskId": "task-123",
      "agentId": "agent-1",
      "stuckFor": 320000
    }
  ],
  "recentIssues": [
    "[2026-02-11T06:45:00Z] 任務 task-123 卡住，已進行第 1 次重試"
  ]
}
```

### 配置選項

```typescript
interface WatchdogConfig {
  checkIntervalMs: number;     // 檢查間隔 (預設 30 秒)
  stuckThresholdMs: number;    // 卡住閾值 (預設 5 分鐘)
  maxRetries: number;          // 最大重試次數
  notifyTelegram: boolean;     // 是否發送 Telegram 通知
  telegramChatId?: string;     // Telegram Chat ID
}
```

---

## 整合到現有任務板

### 1. 修改任務執行器

```typescript
// executor.ts
import { circuitBreaker, watchdog, withCircuitBreaker } from './anti-stuck-index';

export async function executeTask(task: Task) {
  // 註冊到看門狗
  watchdog.registerTask(task.id, task.agentId, task.metadata);
  
  // 設置心跳定時器
  const heartbeatInterval = setInterval(() => {
    watchdog.heartbeat(task.id);
  }, 10000);

  try {
    // 使用斷路器執行
    const result = await withCircuitBreaker(task.agentId, async () => {
      // 實際執行邏輯...
      return await runAgent(task);
    });
    
    // 標記完成
    watchdog.completeTask(task.id);
    return result;
    
  } catch (error) {
    // 標記失敗
    watchdog.failTask(task.id, error.message);
    throw error;
  } finally {
    clearInterval(heartbeatInterval);
  }
}
```

### 2. 添加 API 端點

```typescript
// server.ts
import express from 'express';
import { circuitBreaker, watchdog, createHealthCheckEndpoint } from './anti-stuck-index';

const app = express();

// 健康檢查
app.get('/health', createHealthCheckEndpoint());

// 斷路器狀態
app.get('/api/circuit-breaker/status', (req, res) => {
  res.json(circuitBreaker.getAllStates());
});

app.get('/api/circuit-breaker/summary', (req, res) => {
  res.json(circuitBreaker.getSummary());
});

// 重置特定 Agent 的斷路器
app.post('/api/circuit-breaker/reset/:agentId', (req, res) => {
  circuitBreaker.reset(req.params.agentId);
  res.json({ success: true });
});

// 看門狗狀態
app.get('/api/watchdog/status', (req, res) => {
  res.json(watchdog.getStatus());
});

app.get('/api/watchdog/tasks', (req, res) => {
  res.json(watchdog.getAllTasks());
});
```

### 3. 應用啟動時初始化

```typescript
// app.ts
import { initAntiStuckSystem } from './anti-stuck-index';

// 初始化防卡系統
initAntiStuckSystem({
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeout: 5 * 60 * 1000
  },
  watchdog: {
    checkIntervalMs: 30 * 1000,
    stuckThresholdMs: 5 * 60 * 1000,
    notifyTelegram: true,
    telegramChatId: process.env.TELEGRAM_CHAT_ID
  }
});

// 啟動服務...
app.listen(3011);
```

---

## 注意事項

1. **Circuit Breaker** 預設失敗 3 次後斷路，冷卻 5 分鐘後嘗試恢復
2. **Parallel Executor** 預設最多 3 個並行，避免過度佔用資源
3. **Watchdog** 預設每 30 秒檢查，5 分鐘無心跳視為卡住
4. 記得在任務執行過程中定期調用 `watchdog.heartbeat()`
5. 任務完成或失敗時務必調用 `completeTask()` 或 `failTask()`

---

## 監控指標

| 指標 | 說明 | 正常範圍 |
|------|------|----------|
| circuit_breaker_open | 斷路器 OPEN 狀態數 | 0 |
| watchdog_stuck_tasks | 卡住任務數 | 0 |
| parallel_executor_running | 執行中平行任務數 | < maxConcurrency |
| task_success_rate | 任務成功率 | > 95% |
