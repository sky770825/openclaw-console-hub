# 練習 G1：追蹤 create_task 完整呼叫鏈

## 1. 入口點 (Telegram Action)
- *檔案*: server/src/telegram/action-handlers.ts
- *邏輯*: 在 switch (action) 中匹配 create_task。
- *處理*: 提取 name 和 description，呼叫 upsertOpenClawTask。

## 2. 資料庫操作層 (Supabase)
- *檔案*: server/src/openclawSupabase.ts
- *函式*: upsertOpenClawTask(task: Task)
- *邏輯*: 使用 Supabase client 對 openclaw_tasks 資料表進行 upsert 操作。

## 3. 資料流向
1. *用戶/AI 指令*: 觸發 create_task JSON。
2. *action-handlers.ts*: 解析參數，封裝成 Task 物件。
3. *openclawSupabase.ts*: 透過 REST API (PostgREST) 將資料寫入 Supabase。
4. *Supabase*: 存儲並回傳結果。
5. *action-handlers.ts*: 回報成功/失敗訊息給 Telegram。