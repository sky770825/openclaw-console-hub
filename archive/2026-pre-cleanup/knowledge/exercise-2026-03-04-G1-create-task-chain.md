# 練習 G-1：create_task 完整呼叫鏈追蹤

### 1. 目標
追蹤 create_task action 從 Telegram 接收到寫入 Supabase 的完整路徑。

### 2. 追蹤路徑 (預計)
- 起點: server/src/telegram/action-handlers.ts -> createTask 函式。
- 中間層: 呼叫 server/src/openclawSupabase.ts 中的 upsertOpenClawTask 或相關 insert 函式。
- 終點: Supabase openclaw_tasks 資料表。

### 3. 詳細分析
正在讀取 openclawSupabase.ts 以確認具體的 SQL/SDK 呼叫方式。這有助於理解任務建立時的預設值填充（如 status 設為 queued）與欄位映射邏輯。

### 4. 結論
(待檔案讀取後補充於下一個心跳)