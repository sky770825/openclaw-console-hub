# 練習 G-4：Auto-Executor 任務選取邏輯追蹤

### 1. 輪詢機制
Auto-Executor 透過 setInterval 定期執行檢查，通常在 server/src/routes/auto-executor.ts 中啟動輪詢。

### 2. 任務選取 (Pick Logic)
系統查詢 Supabase 中狀態為 ready 的任務。根據 CODEBASE-INDEX.md，它採用 Fast Lane 排序策略，優先處理「優先級高」且「等待時間長」的任務。

### 3. 並發控制
在執行前會檢查「並發槽位」(Slots)，目前設定為 2，確保不會同時執行過多任務導致資源耗盡。

### 結論
選取流程：輪詢觸發 -> 查詢 ready 任務 -> Fast Lane 排序 -> 檢查並發槽位 -> 派發執行。