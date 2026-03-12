# 練習 G-1：追蹤 create_task 呼叫鏈

### 1. 追蹤目標
分析從 Telegram 接收 action 到寫入任務板的流程。

### 2. 呼叫路徑
- Entry: server/src/telegram/action-handlers.ts 中的 handleCreateTask 函式。
- Logic: 呼叫 createTask(name, description, owner)。
- Network: createTask 透過 fetch POST 到 http://localhost:3011/api/openclaw/tasks。
- Backend: server/src/routes/openclaw-tasks.ts 接收後呼叫 insertTask。
- DB: server/src/openclawSupabase.ts 執行 supabase.from('openclaw_tasks').insert()。

### 3. 結論
流程清晰但依賴內部 HTTP 轉發，確保了權限與邏輯的一致性。