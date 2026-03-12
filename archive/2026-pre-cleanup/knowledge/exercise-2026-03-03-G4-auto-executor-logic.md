# 練習 G-4：追蹤 Auto-Executor 任務選取邏輯

### 1. 輪詢機制
Auto-Executor 在 server/src/routes/auto-executor.ts 中透過 setInterval 或遞迴調用 runNext 進行輪詢。

### 2. 任務挑選 (Pick Logic)
關鍵函式通常為 pickNextTask（或類似邏輯）：
- 狀態過濾：只選取 status = 'ready' 的任務。
- 排序策略：實作了 Fast Lane，優先級 (Priority) 高者優先，同優先級則按 created_at 排序（等待越久越優先）。
- 並發限制：檢查目前 running 的任務數是否小於 max_slots (預設 2)。

### 3. 結論
Auto-Executor 的決策核心在於狀態過濾與並發控制，確保系統不會超載且高優先級任務能被即時處理。