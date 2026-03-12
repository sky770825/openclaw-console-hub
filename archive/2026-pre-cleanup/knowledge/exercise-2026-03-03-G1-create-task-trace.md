# 練習 G-1：追蹤 create_task Action 呼叫鏈

### 1. 入口點
檔案：server/src/telegram/action-handlers.ts  
邏輯：在 handleAction 函式中，當 action 為 create_task 時，觸發 handleCreateTask（或直接在 switch case 中處理）。它會解析 name 和 description。

### 2. 資料轉換與儲存
檔案：server/src/openclawSupabase.ts  
函式：upsertOpenClawTask  
呼叫鏈：action-handlers.ts 呼叫 upsertOpenClawTask，將 AI 生成的任務名稱對應到 title，描述對應到 thought，狀態預設為 ready（或根據邏輯設為 pending）。

### 3. 資料庫操作
最終透過 supabase.from('openclaw_tasks').upsert(...) 寫入雲端資料庫。

### 4. 結論
create_task 是從 Telegram AI 介面到 Supabase 任務板的核心橋樑，實現了從「想法」到「待辦任務」的自動化轉換。