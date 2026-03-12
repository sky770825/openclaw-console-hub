# 練習 G-2：任務狀態轉換追蹤 (ready → running)

### 1. 觸發機制
檔案：server/src/routes/auto-executor.ts  
機制：由一個輪詢計時器或 /api/openclaw/auto-executor/start 觸發。核心邏輯位於 pickAndRunNextTask 函式。

### 2. 狀態變更函式
函式：pickAndRunNextTask  
過程：
1. 查詢資料庫中 status: 'ready' 的任務。
2. 挑選任務後，立即呼叫 updateTaskStatus(taskId, 'running')。
3. 同時建立執行記錄 (Run) 並將 run_id 關聯至任務。

### 3. 通知對象
- 系統日誌：透過 log.info 記錄任務開始執行。
- Telegram：若有設定通知，會發送「任務開始執行」訊息給統帥。
- 前端：透過 WebSocket 或輪詢更新任務板 UI。

### 4. 關鍵發現
狀態轉換是原子操作，確保同一個任務不會被多個執行槽位 (slots) 同時撿取。執行權限由 riskClassifier 在轉換前進行最後審核。