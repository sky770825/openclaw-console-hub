# 練習 G-2：任務狀態轉換追蹤 (ready → running)

### 1. 觸發機制
- 執行者：auto-executor 輪詢邏輯。
- 檔案：server/src/routes/auto-executor.ts。

### 2. 轉換邏輯
1. auto-executor 透過 query_supabase 尋找 status: 'ready' 的任務。
2. 撿到任務後，立即呼叫 update_task 將狀態改為 'running'。
3. 同時建立 openclaw_runs 記錄，開始調度 Agent 執行。

### 3. 追蹤結論
狀態轉換由 auto-executor 的 processNextTask 函式主導，確保任務不會被重複執行。