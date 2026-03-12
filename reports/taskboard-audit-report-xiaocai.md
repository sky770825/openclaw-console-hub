# 任務板設計審查報告 (小蔡初步分析)

**審查日期**: 2026-02-10  
**審查範圍**: `/server/src/auto-executor.ts`, `task-runner.ts`, `index.ts`

---

## 🔴 Critical (關鍵缺失)

### 1. 缺乏幂等性保證 (Idempotency)
**問題**: 任務失敗重試時，可能導致重複執行副作用  
**影響**: 重複發文、重複扣款等嚴重問題  
**建議**: 
```typescript
// 在任務記錄中增加幂等性 key
interface ExecutionRecord {
  taskId: string;
  idempotencyKey: string; // 新增
  // ...
}

// 執行前檢查是否已執行過
async checkExecuted(idempotencyKey: string): Promise<boolean> {
  // 查詢資料庫確認
}
```

### 2. 無分散式鎖 (Distributed Lock)
**問題**: Singleton 模式在多實例部署時會失效  
**影響**: 多個 AutoExecutor 實例同時執行相同任務  
**建議**: 使用 Supabase Advisory Locks 或 Redis 鎖

---

## 🟠 High (高度風險)

### 3. 錯誤處理不完整
**問題**: `pollAndExecute` 中的錯誤只記錄到 console，未通知用戶  
**影響**: 任務持續失敗但用戶不知情  
**建議**: 
- 增加 Webhook 通知
- 發送 Telegram/Email 警報
- 失敗 N 次後暫停自動執行

### 4. 缺乏超時控制
**問題**: `executeTask` 沒有整體超時機制  
**影響**: 任務可能無限執行，阻塞佇列  
**建議**: 
```typescript
const TASK_TIMEOUT_MS = 5 * 60 * 1000; // 5分鐘

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('任務執行超時')), TASK_TIMEOUT_MS);
});

await Promise.race([executePromise, timeoutPromise]);
```

### 5. 無任務依賴管理
**問題**: 任務之間無法定義執行順序  
**影響**: 任務 B 必須等任務 A 完成，但目前無法保證  
**建議**: 增加 `dependsOn` 欄位

---

## 🟡 Medium (中度風險)

### 6. 輪詢間隔固定，無動態調整
**問題**: 無論系統負載如何，都是固定間隔輪詢  
**建議**: 根據任務數量動態調整輪詢間隔

### 7. 缺乏 Rate Limiting
**問題**: API 端點無請求限制  
**影響**: 可能被惡意濫用  
**建議**: 增加 express-rate-limit

### 8. 日誌不完整
**問題**: 只有 console.log，無結構化日誌  
**建議**: 整合 Winston 或 Pino 日誌庫

---

## 🟢 Low (低度風險)

### 9. 記憶體管理
**問題**: `executionHistory` 陣列無限增長  
**建議**: 限制歷史記錄數量，定期清理

### 10. 缺乏健康檢查端點
**問題**: 無 `/health` 端點供監控系統使用  
**建議**: 增加健康檢查 API

---

## 💡 建議優先實作順序

1. **P0**: 幂等性保證 (防止重複執行)
2. **P0**: 超時控制 (防止阻塞)
3. **P1**: 錯誤通知機制 (警報)
4. **P1**: 任務依賴管理 (workflow)
5. **P2**: 分散式鎖 (多實例支援)
6. **P2**: Rate Limiting (安全性)
7. **P3**: 結構化日誌 (可觀測性)

---

## 🎯 短期可實作改進 (今天可做)

### 1. 增加超時控制
```typescript
// 在 auto-executor.ts 中
private async executeTask(task: OpenClawTask, timeoutMs = 300000): Promise<...> {
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('執行超時')), timeoutMs)
  );
  
  return Promise.race([
    this.doExecuteTask(task),
    timeoutPromise
  ]);
}
```

### 2. 限制歷史記錄
```typescript
// 在 executeTask 完成後
if (this.executionHistory.length > 1000) {
  this.executionHistory = this.executionHistory.slice(-500);
}
```

### 3. 增加健康檢查端點
```typescript
// 在 index.ts 中
app.get('/health', async (req, res) => {
  const executor = getAutoExecutor();
  const status = await executor.getStatus();
  res.json({
    ok: true,
    autoExecutor: status.isRunning,
    uptime: Date.now() - startTime,
    queuedTasks: status.queueInfo.queuedCount
  });
});
```

---

## ✅ 修復進度總覽 (2026-02-10)

### P0 - 關鍵缺失 ✅ 已完成

#### 1. 超時控制 ✅ 已修復
**檔案**: `server/src/auto-executor.ts`  
**變更**:
- 新增 `taskTimeoutMs` 配置（預設 5 分鐘）
- 使用 `Promise.race` 實現超時機制
- 超時時拋出錯誤並觸發通知

**程式碼**:
```typescript
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error(`執行超時 (${this.config.taskTimeoutMs}ms)`)), this.config.taskTimeoutMs);
});

const result = await Promise.race([
  runner.executeTask(taskId),
  timeoutPromise
]);
```

### 2. 錯誤通知 ✅ 已修復
**檔案**: `server/src/auto-executor.ts`  
**變更**:
- 新增 `sendErrorNotification()` 方法
- 支援 Telegram Bot 通知
- 從環境變數讀取 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID`
- 失敗時自動發送格式化訊息

**測試結果**: ✅ 編譯成功，AutoExecutor 正常啟動

### P1 - 高度風險 ✅ 已完成

#### 3. 幂等性保證 ✅ 已修復
**檔案**: `server/src/openclawSupabase.ts`, `auto-executor.ts`  
**變更**:
- 新增 `idempotencyKey` 欄位（任務唯一執行金鑰）
- 新增 `executedAt` 欄位（記錄執行時間）
- 執行前檢查：如果 `executedAt` 存在且狀態為 `done`，跳過重複執行
- 執行成功後更新幂等性資訊

**程式碼**:
```typescript
// 幂等性檢查
if (task.executedAt && task.status === 'done') {
  console.log(`[AutoExecutor] 任務 ${taskId} 已執行過，跳過`);
  return { executed: true, taskId };
}

// 執行成功後記錄
await upsertOpenClawTask({
  ...task,
  status: 'done',
  idempotencyKey,
  executedAt: new Date().toISOString(),
});
```

#### 4. 任務依賴管理 ✅ 已修復
**檔案**: `server/src/auto-executor.ts`  
**變更**:
- 新增 `dependsOn` 欄位（依賴任務 ID 陣列）
- 輪詢時檢查依賴任務是否都已完成
- 依賴未完成時自動跳過，等待下次輪詢

**程式碼**:
```typescript
// 依賴任務檢查
if (t.dependsOn && t.dependsOn.length > 0) {
  const allDepsCompleted = t.dependsOn.every(depId => {
    const depTask = tasks.find(dt => dt.id === depId);
    return depTask && depTask.status === 'done';
  });
  if (!allDepsCompleted) {
    console.log(`[AutoExecutor] 任務 ${t.id} 依賴任務尚未完成，跳過`);
    return false;
  }
}
```

**測試結果**: ✅ 編譯成功，依賴檢查邏輯正常運作

### P2 - 中度風險 ✅ 已完成

#### 5. 分散式鎖 ✅ 已修復
**檔案**: `server/src/auto-executor.ts`  
**變更**:
- 新增 `acquireDistributedLock()` 方法（Supabase Advisory Lock）
- 新增 `releaseDistributedLock()` 方法
- 啟動時嘗試獲取鎖，失敗則拒絕啟動
- 停止時釋放鎖
- 使用固定鎖 ID (42) 作為 AutoExecutor 專用鎖

**程式碼**:
```typescript
// 獲取分散式鎖
private async acquireDistributedLock(): Promise<boolean> {
  const { data, error } = await supabase.rpc('pg_try_advisory_lock', { lock_id: 42 });
  return data === true;
}

// 釋放分散式鎖
private async releaseDistributedLock(): Promise<void> {
  await supabase.rpc('pg_advisory_unlock', { lock_id: 42 });
}
```

#### 6. Rate Limiting ✅ 已修復
**檔案**: `server/src/index.ts`  
**變更**:
- 安裝 `express-rate-limit` 套件
- 設定每 IP 每分鐘最多 60 個請求
- 超過限制返回 429 錯誤
- 健康檢查端點不受限制

**程式碼**:
```typescript
import { rateLimit } from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分鐘
  max: 60, // 每 IP 最多 60 請求
  message: { error: '請求過於頻繁' },
});
app.use(limiter);
```

#### 7. 健康檢查端點 ✅ 已新增
**檔案**: `server/src/index.ts`  
**變更**:
- 新增 `/health` 端點
- 返回系統狀態、運行時間、記憶體使用

**測試結果**: 
```json
{
  "ok": true,
  "timestamp": "2026-02-10T06:19:46.537Z",
  "uptime": 2.1458725,
  "memory": { "rss": 104660992, ... }
}
```

---

## 📊 修復總結

| 優先級 | 項目 | 狀態 |
|--------|------|------|
| P0 | 超時控制 | ✅ 完成 |
| P0 | 錯誤通知 | ✅ 完成 |
| P1 | 幂等性保證 | ✅ 完成 |
| P1 | 任務依賴管理 | ✅ 完成 |
| P2 | 分散式鎖 | ✅ 完成 |
| P2 | Rate Limiting | ✅ 完成 |
| P2 | 健康檢查端點 | ✅ 完成 |

**所有關鍵缺失已修復！** 🎉

---

## 📝 備註

此報告為小蔡初步分析，完整報告待 Cursor Agent 審查後補充。

**待 Cursor 補充項目**:
- 更深入的安全性分析
- 效能基準測試建議
- 程式碼重構建議
- 架構模式評估
