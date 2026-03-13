# 練習 G-2：任務狀態流轉追蹤 (ready -> running)

### 1. 觸發者
由 server/src/routes/auto-executor.ts 中的 AutoExecutor 類別觸發。它透過 setInterval 定期執行輪詢任務。

### 2. 關鍵函式與檔案
- 定位任務：fetchOpenClawTasks (在 openclawSupabase.ts) 負責從資料庫找出 status = 'ready' 的任務。
- 變更狀態：在 auto-executor.ts 的執行循環中，一旦任務被 pick，會立即調用 upsertOpenClawTask 將狀態更新為 running。
- 通知機制：狀態變更後，系統會透過 notifyTaskResult (或相關 Telegram 工具) 準備通知，但正式的「執行中」通知通常在 action-handlers.ts 或執行器啟動時發送給主人。

### 3. 資料流
1. AutoExecutor 輪詢 -> 2. fetchOpenClawTasks (ready) -> 3. upsertOpenClawTask (改為 running) -> 4. AgentExecutor.execute 開始執行。

### 4. 結論
狀態轉換是為了防止多個執行器重複領取任務。轉換邏輯核心在 auto-executor.ts，資料持久化則靠 openclawSupabase.ts。