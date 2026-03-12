# 練習 G1：create_task 完整呼叫鏈追蹤

## 1. 入口點 (Action Handler)
- *檔案*: server/src/telegram/action-handlers.ts
- *邏輯*: 識別 action: "create_task"，提取 name 與 description。
- *呼叫*: 呼叫 openclawSupabase.ts 中的 insertTask (或 createTask) 函式。

## 2. 資料持久化 (Supabase Wrapper)
- *檔案*: server/src/openclawSupabase.ts
- *邏輯*: 封裝 Supabase SDK，執行 from('openclaw_tasks').insert(...)。
- *細節*: 將 title 映射至 name，初始化 status 為 ready 或 pending。

## 3. 終點 (Database)
- *目標*: Supabase openclaw_tasks 資料表。
- *觸發*: 寫入成功後，透過 WebSocket 或輪詢被 AutoExecutor 偵測。