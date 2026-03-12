# 練習 G-1：create_task Action 完整資料流追蹤

### 1. 起點：Telegram Action
檔案：server/src/telegram/action-handlers.ts  
函式：handleCreateTask  
過程：解析 JSON 指令後，呼叫同檔案內的 createTask 函式。

### 2. 中轉：API 封裝
函式：createTask(name, description, owner)  
過程：內部建構 task 物件（status 預設為 pending），並呼叫 upsertOpenClawTask。

### 3. 終點：資料庫操作
檔案：server/src/openclawSupabase.ts  
函式：upsertOpenClawTask(task)  
過程：使用 supabase.from('openclaw_tasks').upsert() 將資料寫入雲端資料庫。

### 4. 資料流向圖
Telegram (Action) -> action-handlers.ts:createTask -> openclawSupabase.ts:upsertOpenClawTask -> Supabase (DB)

### 5. 發現
所有從 Action 建立的任務預設 status 都是 pending，必須手動或由系統邏輯改為 ready 後，Auto-Executor 才會介入。