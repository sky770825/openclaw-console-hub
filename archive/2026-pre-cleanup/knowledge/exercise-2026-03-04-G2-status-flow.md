# 練習 G-2：任務狀態流轉追蹤 (ready -> running)

### 1. 觸發點
檔案：server/src/routes/auto-executor.ts  
機制：由 AutoExecutor 的輪詢機制觸發。當執行器發現有空餘 slot 且有 ready 任務時，會調用執行邏輯。

### 2. 狀態變更邏輯
在 auto-executor.ts 中，任務被選中後會立即透過 updateOpenClawTask (來自 openclawSupabase.ts) 將狀態更新為 running。這是為了確保在非同步執行環境中，任務不會被重複領取。

### 3. 資料流向
1. fetchOpenClawTasks 取得 ready 任務。
2. 檢查 AutoExecutor 並發限制。
3. 執行 upsertOpenClawTask 將狀態改為 running。
4. 進入 AgentExecutor.execute 階段。

### 4. 結論
狀態轉換的原子性由資料庫更新確保，而 auto-executor.ts 是整個流轉的核心調度者。