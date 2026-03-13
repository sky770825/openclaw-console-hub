# 練習 G-2：任務狀態轉換追蹤 (ready → running)

### 1. 觸發者
檔案：server/src/routes/auto-executor.ts  
組件：Auto-Executor 輪詢機制。

### 2. 核心函式
函式：pickNextTask 與 executeTask  
邏輯：Auto-Executor 每隔固定時間掃描資料庫中狀態為 ready 的任務。選中任務後，會立即呼叫 updateTaskStatus(id, 'running') 將其鎖定，防止重複執行。

### 3. 通知機制
狀態更改後，系統會透過 sendTelegramMessage 通知主人任務已開始執行，並啟動對應的 Agent 進行腳本生成與執行。

### 4. 結論
狀態轉換是由 Server 端的 Auto-Executor 主動輪詢並修改資料庫觸發的，確保了任務執行的有序性與排他性。