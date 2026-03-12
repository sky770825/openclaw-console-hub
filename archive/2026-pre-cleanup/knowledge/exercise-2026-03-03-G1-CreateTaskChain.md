# 練習 G1：追蹤 create_task 呼叫鏈

## 1. 呼叫鏈路徑
- 入口: server/src/telegram/action-handlers.ts 中的 create_task case。
- 處理函式: createTask(name, description, owner) (位於同一檔案)。
- 資料庫操作: 呼叫 server/src/openclawSupabase.ts 中的 upsertOpenClawTask。
- 最終落地: 透過 supabase.from('openclaw_tasks').upsert() 寫入 Supabase。

## 2. 關鍵程式碼位置
- action-handlers.ts: 處理 Telegram 指令並驗證參數。
- openclawSupabase.ts: 負責與 Supabase 通訊，處理資料映射。