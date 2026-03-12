# 練習 G-2：任務狀態轉換 (ready → running) 追蹤

### 1. 觸發源
Auto-Executor 的輪詢機制（通常是 setInterval）在 server/src/routes/auto-executor.ts 中運行。

### 2. 狀態變更函式
當 Executor 撿取一個 ready 任務時，會呼叫 updateTaskStatus(id, 'running')。這通常發生在 pickNextTask 或類似的執行循環起點。

### 3. 通知對象
狀態變更後，Supabase 會即時更新，前端透過監聽或輪詢獲取最新狀態。同時，系統日誌會記錄 Task [ID] started。

### 4. 關鍵邏輯
轉換邏輯確保了任務不會被重複執行，並標記了執行的開始時間。