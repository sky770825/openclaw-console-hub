# 練習 G-1：追蹤 create_task 呼叫鏈

### 1. 追蹤目標
追蹤 create_task action 從收到指令到寫入資料庫的過程。

### 2. 呼叫鏈分析
1. 進入點: server/src/telegram/action-handlers.ts 接收到 JSON action create_task。
2. 處理函式: handleCreateTask 解析參數後呼叫 createTask。
3. API 轉發: createTask 函式透過 fetch 發送 POST 請求至 http://localhost:3011/api/openclaw/tasks。
4. 路由處理: server/src/routes/openclaw-tasks.ts 接收請求，呼叫 insertTask。
5. 資料庫寫入: server/src/openclawSupabase.ts 中的 insertTask 使用 supabase.from('openclaw_tasks').insert() 完成寫入。

### 3. 結論
這是一個典型的「Action -> Internal API -> Route -> DB」流。透過 API 轉發確保了任務建立邏輯的統一，但也增加了一層 HTTP 開銷。