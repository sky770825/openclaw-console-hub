# 練習題 E1：建立任務完整資料流分析

## 1. 資料流路徑
HTTP POST /api/openclaw/tasks (Route) -> upsertOpenClawTask (Supabase Service) -> openclaw_tasks (Database)

## 2. 詳細步驟
1. *進入點 (Route)*: server/src/routes/openclaw-tasks.ts 中的 openclawTasksRouter.post('/') 接收請求。
2. *安全檢查*: 呼叫 scanTaskPayload(req.body) 進行 Prompt Injection 或惡意內容掃描。
3. *格式轉換*: 透過 taskToOpenClawTask(req.body) 將前端傳來的 Task 格式轉換為資料庫對應的 OpenClawTask 格式。
4. *持久化 (Supabase)*: 呼叫 upsertOpenClawTask(ocTask)。
5. *資料庫操作*: 在 server/src/openclawSupabase.ts 中，使用 supabase.from('openclaw_tasks').upsert() 寫入資料。
6. *回傳*: 成功後將結果再次映射回前端格式並回傳 201 狀態碼。

## 3. 關鍵函式
- openclawTasksRouter.post: 處理請求與安全驗證
- upsertOpenClawTask: 封裝 Supabase 的 upsert 邏輯
- taskToOpenClawTask: 確保欄位一致性