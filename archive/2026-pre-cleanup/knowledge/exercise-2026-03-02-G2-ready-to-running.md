# 練習 G-2：追蹤 ready -> running 狀態轉換

### 1. 追蹤目標
找出系統中是哪個組件、哪個函式將任務從 ready 改為 running。

### 2. 發現路徑
- 核心組件：Auto-Executor (server/src/routes/auto-executor.ts)。
- 觸發點：processNextTask 函式。
- 邏輯：當輪詢偵測到 slot 有空位且有 ready 任務時，會呼叫 updateTaskStatus(taskId, 'running')。
- 資料庫層：透過 server/src/openclawSupabase.ts 的 updateTask 函式執行 Supabase PATCH。

### 3. 結論
狀態轉換由 Auto-Executor 集中管理，確保了執行鎖與並發控制。