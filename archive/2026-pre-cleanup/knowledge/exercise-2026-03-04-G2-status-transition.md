# 練習 G-2：任務狀態轉換 (ready -> running) 追蹤

### 1. 目標
追蹤任務如何從 ready 被 pick 並轉換為 running 狀態，找出觸發函式與邏輯。

### 2. 追蹤路徑
- 觸發點：server/src/routes/auto-executor.ts 中的輪詢機制（預設每 10 秒）。
- 挑選邏輯：在 pickNextTask 或類似函式中，根據 ready 狀態與優先級（Fast Lane 策略）篩選。
- 狀態變更：呼叫 updateTaskStatus 或直接透過 Supabase SDK 將 status 改為 running。

### 3. 代碼分析
正在讀取 auto-executor.ts 以確認具體的 setInterval 位置與執行鎖 (lock) 機制，防止重複挑選。