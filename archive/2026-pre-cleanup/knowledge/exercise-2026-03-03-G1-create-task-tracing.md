# 練習 G-1：追蹤 createTask 呼叫鏈

### 1. 呼叫鏈分析
- 入口: action-handlers.ts 中的 create_task action 處理器。
- 核心邏輯: 呼叫 openclawSupabase.ts 中的 createTask 函式。
- 資料庫操作: 使用 Supabase client 執行 from('openclaw_tasks').insert()。

### 2. 關鍵程式碼位置
- server/src/telegram/action-handlers.ts (處理指令解析)
- server/src/openclawSupabase.ts (負責與資料庫通訊)

### 3. 資料流
Telegram 指令 -> Action Handler (解析參數) -> Supabase Utility (封裝 INSERT) -> Supabase API。