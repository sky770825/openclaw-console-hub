# 練習 G-4：Auto-Executor 任務選取邏輯追蹤

### 1. 核心邏輯
透過 read_file 讀取 server/src/routes/auto-executor.ts，確認系統如何從資料庫中挑選 ready 任務。

### 2. 發現
Auto-Executor 使用輪詢機制（pollIntervalMs），並在 /run-next 或自動排程中呼叫 pickNextTask（或類似邏輯）。它會檢查並發槽位（slots）是否已滿。

### 3. 排序策略
通常會根據 priority 降序與 created_at 升序組合，確保高優先級且等待最久的任務先執行（Fast Lane 策略）。